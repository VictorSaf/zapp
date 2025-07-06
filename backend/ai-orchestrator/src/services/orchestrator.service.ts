import { EventEmitter } from 'events';
import {
  Agent,
  Task,
  TaskType,
  TaskStatus,
  TaskPriority,
  AgentType,
  AgentCapability,
  TaskResult,
  WorkflowExecution
} from '@/types/agent.types';
import logger from '@/config/logger';
import { agentRegistry } from './agent-registry.service';
import { taskDistribution } from './task-distribution.service';
import { agentCommunication } from './agent-communication.service';
import { loadBalancer } from './load-balancer.service';
import { metricsService } from './metrics.service';

export interface OrchestrationRequest {
  type: TaskType;
  input: any;
  userId?: string;
  sessionId?: string;
  priority?: TaskPriority;
  requirements?: {
    requiredCapabilities?: AgentCapability[];
    preferredAgentTypes?: AgentType[];
    maxResponseTimeMs?: number;
    qualityThreshold?: number;
  };
  context?: {
    conversationId?: string;
    previousTasks?: string[];
    userPreferences?: any;
  };
}

export interface OrchestrationResponse {
  taskId: string;
  status: TaskStatus;
  estimatedCompletionTime?: number;
  assignedAgentId?: string;
  queuePosition?: number;
  message: string;
}

export interface AgentSwitchRequest {
  currentTaskId: string;
  targetAgentType?: AgentType;
  targetCapabilities?: AgentCapability[];
  reason: string;
  preserveContext: boolean;
}

export interface AgentSwitchResponse {
  success: boolean;
  newTaskId?: string;
  newAgentId?: string;
  message: string;
}

export class OrchestratorService extends EventEmitter {
  private activeTasks: Map<string, Task> = new Map();
  private taskResults: Map<string, TaskResult> = new Map();
  private agentSessions: Map<string, string[]> = new Map(); // sessionId -> taskIds
  private orchestrationMetrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    agentSwitches: number;
  } = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    agentSwitches: 0
  };

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Process an orchestration request
   */
  async processRequest(request: OrchestrationRequest): Promise<OrchestrationResponse> {
    const startTime = Date.now();

    try {
      this.orchestrationMetrics.totalRequests++;

      // Validate request
      this.validateRequest(request);

      // Create task
      const task = await this.createTask(request);

      // Find suitable agents
      const candidates = await this.findSuitableAgents(task);

      if (candidates.length === 0) {
        throw new Error('No suitable agents available for this request');
      }

      // Use load balancer to select best agent
      const loadBalancingResult = await loadBalancer.selectAgent(task, candidates);
      const selectedAgent = agentRegistry.getAgent(loadBalancingResult.selectedAgent.agentId);

      if (!selectedAgent) {
        throw new Error('Selected agent not found');
      }

      // Submit task for processing
      const taskId = await taskDistribution.submitTask(task);

      // Connect to agent if not already connected
      if (!agentCommunication.getCommunicationStats().totalConnections) {
        await agentCommunication.connectToAgent(selectedAgent);
      }

      // Track active task
      this.activeTasks.set(taskId, task);

      // Update session tracking
      if (request.sessionId) {
        const sessionTasks = this.agentSessions.get(request.sessionId) || [];
        sessionTasks.push(taskId);
        this.agentSessions.set(request.sessionId, sessionTasks);
      }

      // Update metrics
      this.orchestrationMetrics.successfulRequests++;
      this.updateAverageResponseTime(Date.now() - startTime);

      // Emit orchestration event
      this.emit('request:processed', {
        taskId,
        agentId: selectedAgent.id,
        type: request.type,
        responseTime: Date.now() - startTime
      });

      logger.info('Orchestration request processed successfully', {
        taskId,
        requestType: request.type,
        selectedAgentId: selectedAgent.id,
        agentName: selectedAgent.name,
        estimatedTime: loadBalancingResult.selectedAgent.estimatedCompletionTime,
        responseTime: Date.now() - startTime
      });

      return {
        taskId,
        status: task.status,
        estimatedCompletionTime: loadBalancingResult.selectedAgent.estimatedCompletionTime,
        assignedAgentId: selectedAgent.id,
        queuePosition: taskDistribution.getDistributionStats().queuedTasks,
        message: `Task assigned to ${selectedAgent.name} (${selectedAgent.type})`
      };

    } catch (error) {
      this.orchestrationMetrics.failedRequests++;
      
      logger.error('Failed to process orchestration request', {
        requestType: request.type,
        error: (error as Error).message,
        responseTime: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Switch agent for a task
   */
  async switchAgent(request: AgentSwitchRequest): Promise<AgentSwitchResponse> {
    try {
      // Get current task
      const currentTask = this.activeTasks.get(request.currentTaskId);
      if (!currentTask) {
        throw new Error(`Task ${request.currentTaskId} not found or not active`);
      }

      // Find new suitable agents
      let newCandidates: Agent[];

      if (request.targetAgentType) {
        newCandidates = agentRegistry.getAgentsByType(request.targetAgentType);
      } else if (request.targetCapabilities) {
        newCandidates = request.targetCapabilities.reduce((agents, capability) => {
          return agents.concat(agentRegistry.getAgentsByCapability(capability));
        }, [] as Agent[]);
        // Remove duplicates
        newCandidates = Array.from(new Map(newCandidates.map(agent => [agent.id, agent])).values());
      } else {
        // Use same requirements as original task
        newCandidates = await this.findSuitableAgents(currentTask);
      }

      // Remove current agent from candidates
      if (currentTask.assignedAgentId) {
        newCandidates = newCandidates.filter(agent => agent.id !== currentTask.assignedAgentId);
      }

      if (newCandidates.length === 0) {
        return {
          success: false,
          message: 'No suitable alternative agents available'
        };
      }

      // Select best new agent
      const loadBalancingResult = await loadBalancer.selectAgent(currentTask, newCandidates);
      const newAgent = agentRegistry.getAgent(loadBalancingResult.selectedAgent.agentId);

      if (!newAgent) {
        throw new Error('Selected new agent not found');
      }

      // Create new task for the new agent
      const newTask: Task = {
        ...currentTask,
        id: `${currentTask.id}-switch-${Date.now()}`,
        assignedAgentId: undefined,
        status: TaskStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: undefined,
        completedAt: undefined,
        result: undefined,
        error: undefined
      };

      // Preserve context if requested
      if (request.preserveContext) {
        newTask.input.context = {
          ...newTask.input.context,
          previousTaskId: currentTask.id,
          switchReason: request.reason,
          preservedContext: currentTask.result?.data || {}
        };
      }

      // Cancel current task
      await taskDistribution.cancelTask(currentTask.id, `Switched to agent ${newAgent.name}: ${request.reason}`);

      // Submit new task
      const newTaskId = await taskDistribution.submitTask(newTask);

      // Connect to new agent if needed
      const commStats = agentCommunication.getCommunicationStats();
      if (!commStats.activeConnections) {
        await agentCommunication.connectToAgent(newAgent);
      }

      // Update tracking
      this.activeTasks.delete(currentTask.id);
      this.activeTasks.set(newTaskId, newTask);

      // Update metrics
      this.orchestrationMetrics.agentSwitches++;
      metricsService.incrementCounter(
        metricsService.agentSwitches,
        { 
          from_agent: currentTask.assignedAgentId || 'none',
          to_agent: newAgent.id,
          reason: request.reason
        }
      );

      // Emit switch event
      this.emit('agent:switched', {
        originalTaskId: currentTask.id,
        newTaskId,
        fromAgentId: currentTask.assignedAgentId,
        toAgentId: newAgent.id,
        reason: request.reason
      });

      logger.info('Agent switch completed successfully', {
        originalTaskId: currentTask.id,
        newTaskId,
        fromAgentId: currentTask.assignedAgentId,
        fromAgentName: currentTask.assignedAgentId ? agentRegistry.getAgent(currentTask.assignedAgentId)?.name : 'unknown',
        toAgentId: newAgent.id,
        toAgentName: newAgent.name,
        reason: request.reason,
        preserveContext: request.preserveContext
      });

      return {
        success: true,
        newTaskId,
        newAgentId: newAgent.id,
        message: `Successfully switched to ${newAgent.name} (${newAgent.type})`
      };

    } catch (error) {
      logger.error('Failed to switch agent', {
        currentTaskId: request.currentTaskId,
        error: (error as Error).message
      });

      return {
        success: false,
        message: `Failed to switch agent: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get active agents with their current status
   */
  getActiveAgents(filter?: { type?: AgentType; capability?: AgentCapability }): Agent[] {
    let agents = agentRegistry.getActiveAgents();

    if (filter?.type) {
      agents = agents.filter(agent => agent.type === filter.type);
    }

    if (filter?.capability) {
      agents = agents.filter(agent => agent.capabilities.includes(filter.capability));
    }

    return agents;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): {
    task?: Task;
    result?: TaskResult;
    status: TaskStatus;
    message: string;
  } {
    // Check active tasks first
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      return {
        task: activeTask,
        status: activeTask.status,
        message: this.getStatusMessage(activeTask.status)
      };
    }

    // Check completed tasks
    const result = this.taskResults.get(taskId);
    if (result) {
      return {
        result,
        status: TaskStatus.COMPLETED,
        message: 'Task completed successfully'
      };
    }

    // Check task distribution service
    const distributedTask = taskDistribution.getTask(taskId);
    if (distributedTask) {
      return {
        task: distributedTask,
        status: distributedTask.status,
        message: this.getStatusMessage(distributedTask.status)
      };
    }

    return {
      status: TaskStatus.FAILED,
      message: 'Task not found'
    };
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string, reason?: string): Promise<void> {
    try {
      // Remove from active tasks
      this.activeTasks.delete(taskId);

      // Cancel in task distribution service
      await taskDistribution.cancelTask(taskId, reason);

      // Emit cancellation event
      this.emit('task:cancelled', { taskId, reason });

      logger.info('Task cancelled through orchestrator', { taskId, reason });

    } catch (error) {
      logger.error('Failed to cancel task', {
        taskId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get orchestration statistics
   */
  getOrchestrationStats() {
    const distributionStats = taskDistribution.getDistributionStats();
    const loadBalancingStats = loadBalancer.getLoadBalancingStats();
    const communicationStats = agentCommunication.getCommunicationStats();
    const registryStats = agentRegistry.getRegistryStats();

    return {
      orchestration: this.orchestrationMetrics,
      taskDistribution: distributionStats,
      loadBalancing: loadBalancingStats,
      communication: communicationStats,
      agentRegistry: registryStats,
      activeTasks: this.activeTasks.size,
      completedTasks: this.taskResults.size,
      activeSessions: this.agentSessions.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create task from orchestration request
   */
  private async createTask(request: OrchestrationRequest): Promise<Task> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const task: Task = {
      id: taskId,
      type: request.type,
      priority: request.priority || TaskPriority.MEDIUM,
      input: {
        query: request.input.query,
        data: request.input.data,
        context: request.context,
        userPreferences: request.input.userPreferences,
        sessionId: request.sessionId
      },
      requirements: {
        requiredCapabilities: request.requirements?.requiredCapabilities || this.getDefaultCapabilities(request.type),
        preferredAgentTypes: request.requirements?.preferredAgentTypes,
        maxResponseTimeMs: request.requirements?.maxResponseTimeMs || 30000,
        qualityThreshold: request.requirements?.qualityThreshold || 0.8
      },
      status: TaskStatus.PENDING,
      metadata: {
        source: 'user',
        requestId: taskId,
        userId: request.userId,
        sessionId: request.sessionId,
        tags: [request.type, `priority:${request.priority || 'medium'}`]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return task;
  }

  /**
   * Find suitable agents for a task
   */
  private async findSuitableAgents(task: Task): Promise<Agent[]> {
    const allAgents = agentRegistry.getActiveAgents();
    const suitableAgents: Agent[] = [];

    for (const agent of allAgents) {
      // Check if agent has required capabilities
      const hasRequiredCapabilities = task.requirements.requiredCapabilities.every(
        capability => agent.capabilities.includes(capability)
      );

      if (!hasRequiredCapabilities) {
        continue;
      }

      // Check preferred agent types
      if (task.requirements.preferredAgentTypes?.length && 
          !task.requirements.preferredAgentTypes.includes(agent.type)) {
        continue;
      }

      // Check if agent is available (not overloaded)
      const loadStats = loadBalancer.getLoadBalancingStats();
      const agentLoad = loadStats.loadDistribution[agent.id] || 0;
      
      if (agentLoad >= 1.0) { // 100% loaded
        continue;
      }

      suitableAgents.push(agent);
    }

    return suitableAgents;
  }

  /**
   * Get default capabilities for task type
   */
  private getDefaultCapabilities(taskType: TaskType): AgentCapability[] {
    const capabilityMap: Record<TaskType, AgentCapability[]> = {
      [TaskType.EDUCATION_QUERY]: [AgentCapability.EDUCATION, AgentCapability.NATURAL_LANGUAGE],
      [TaskType.MARKET_ANALYSIS]: [AgentCapability.MARKET_PREDICTION, AgentCapability.DATA_ANALYSIS],
      [TaskType.RISK_ASSESSMENT]: [AgentCapability.RISK_ASSESSMENT, AgentCapability.DATA_ANALYSIS],
      [TaskType.PORTFOLIO_REVIEW]: [AgentCapability.PORTFOLIO_OPTIMIZATION, AgentCapability.RISK_ASSESSMENT],
      [TaskType.STRATEGY_BACKTEST]: [AgentCapability.BACKTESTING, AgentCapability.DATA_ANALYSIS],
      [TaskType.NEWS_ANALYSIS]: [AgentCapability.DATA_COLLECTION, AgentCapability.SENTIMENT_ANALYSIS],
      [TaskType.SENTIMENT_CHECK]: [AgentCapability.SENTIMENT_ANALYSIS, AgentCapability.NATURAL_LANGUAGE],
      [TaskType.TECHNICAL_SCAN]: [AgentCapability.TECHNICAL_ANALYSIS, AgentCapability.PATTERN_RECOGNITION],
      [TaskType.FUNDAMENTAL_REVIEW]: [AgentCapability.FUNDAMENTAL_ANALYSIS, AgentCapability.DATA_ANALYSIS],
      [TaskType.MULTI_AGENT_WORKFLOW]: [AgentCapability.DATA_ANALYSIS, AgentCapability.NATURAL_LANGUAGE]
    };

    return capabilityMap[taskType] || [AgentCapability.NATURAL_LANGUAGE];
  }

  /**
   * Validate orchestration request
   */
  private validateRequest(request: OrchestrationRequest): void {
    if (!request.type) {
      throw new Error('Request type is required');
    }

    if (!request.input) {
      throw new Error('Request input is required');
    }

    if (!Object.values(TaskType).includes(request.type)) {
      throw new Error(`Invalid task type: ${request.type}`);
    }

    if (request.priority && !Object.values(TaskPriority).includes(request.priority)) {
      throw new Error(`Invalid priority: ${request.priority}`);
    }
  }

  /**
   * Get status message for task status
   */
  private getStatusMessage(status: TaskStatus): string {
    const messages: Record<TaskStatus, string> = {
      [TaskStatus.PENDING]: 'Task is waiting to be processed',
      [TaskStatus.QUEUED]: 'Task is in queue for processing',
      [TaskStatus.ASSIGNED]: 'Task has been assigned to an agent',
      [TaskStatus.IN_PROGRESS]: 'Task is currently being processed',
      [TaskStatus.COMPLETED]: 'Task has been completed successfully',
      [TaskStatus.FAILED]: 'Task processing failed',
      [TaskStatus.CANCELLED]: 'Task was cancelled',
      [TaskStatus.TIMEOUT]: 'Task processing timed out'
    };

    return messages[status] || 'Unknown status';
  }

  /**
   * Update average response time metric
   */
  private updateAverageResponseTime(responseTime: number): void {
    const total = this.orchestrationMetrics.totalRequests;
    const currentAvg = this.orchestrationMetrics.averageResponseTime;
    
    this.orchestrationMetrics.averageResponseTime = 
      (currentAvg * (total - 1) + responseTime) / total;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Listen to task completion events
    taskDistribution.on('task:completed', (task: Task) => {
      if (this.activeTasks.has(task.id)) {
        this.activeTasks.delete(task.id);
        
        if (task.result) {
          this.taskResults.set(task.id, task.result);
        }

        this.emit('task:completed', task);
      }
    });

    // Listen to task failure events
    taskDistribution.on('task:failed', (task: Task) => {
      if (this.activeTasks.has(task.id)) {
        this.activeTasks.delete(task.id);
        this.emit('task:failed', task);
      }
    });

    // Listen to agent connection events
    agentCommunication.on('agent:connected', (event) => {
      this.emit('agent:connected', event);
    });

    agentCommunication.on('agent:disconnected', (event) => {
      this.emit('agent:disconnected', event);
    });

    // Listen to load balancing events
    loadBalancer.on('load:imbalance_detected', (event) => {
      this.emit('load:imbalance_detected', event);
    });
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Orchestrator Service...');

    // Cancel all active tasks
    const cancelPromises = Array.from(this.activeTasks.keys())
      .map(taskId => this.cancelTask(taskId, 'Service shutdown'));
    
    await Promise.all(cancelPromises);

    // Clear all data
    this.activeTasks.clear();
    this.taskResults.clear();
    this.agentSessions.clear();

    logger.info('Orchestrator Service shutdown complete');
  }
}

export const orchestrator = new OrchestratorService();