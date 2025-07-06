import { EventEmitter } from 'events';
import {
  Task,
  TaskStatus,
  TaskType,
  TaskPriority,
  Agent,
  AgentStatus,
  AgentSelection,
  OrchestrationStrategy,
  WorkflowExecution,
  WorkflowStep,
  WorkflowStatus
} from '@/types/agent.types';
import logger from '@/config/logger';
import { agentRegistry } from './agent-registry.service';
import { queueService } from './queue.service';
import { metricsService } from './metrics.service';

export class TaskDistributionService extends EventEmitter {
  private tasks: Map<string, Task> = new Map();
  private workflows: Map<string, WorkflowExecution> = new Map();
  private taskQueue: Task[] = [];
  private processingTasks: Set<string> = new Set();
  private orchestrationStrategies: Map<string, OrchestrationStrategy> = new Map();
  private readonly maxRetries = 3;
  private readonly taskTimeoutMs = 300000; // 5 minutes

  constructor() {
    super();
    this.setupDefaultStrategies();
    this.setupEventHandlers();
    this.startTaskProcessor();
  }

  /**
   * Submit a new task for processing
   */
  async submitTask(task: Task): Promise<string> {
    try {
      // Validate task
      this.validateTask(task);

      // Set initial status
      task.status = TaskStatus.PENDING;
      task.createdAt = new Date();
      task.updatedAt = new Date();

      // Store task
      this.tasks.set(task.id, task);

      // Add to queue based on priority
      this.addToQueue(task);

      // Emit task submitted event
      this.emit('task:submitted', task);

      // Update metrics
      metricsService.incrementCounter(
        metricsService.queueJobsTotal,
        { queue_name: 'task-distribution', job_type: task.type, status: 'submitted' }
      );

      logger.info('Task submitted successfully', {
        taskId: task.id,
        taskType: task.type,
        priority: task.priority,
        queuePosition: this.taskQueue.length
      });

      return task.id;

    } catch (error) {
      logger.error('Failed to submit task', {
        taskId: task.id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return Array.from(this.tasks.values()).filter(task => task.status === status);
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string, reason?: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) {
      throw new Error(`Cannot cancel task ${taskId} with status ${task.status}`);
    }

    // Update task status
    task.status = TaskStatus.CANCELLED;
    task.updatedAt = new Date();
    task.error = {
      code: 'TASK_CANCELLED',
      message: reason || 'Task cancelled by user',
      details: { cancelledAt: new Date() },
      retryable: false,
      timestamp: new Date()
    };

    this.tasks.set(taskId, task);

    // Remove from processing if applicable
    this.processingTasks.delete(taskId);

    // Remove from queue if still queued
    this.taskQueue = this.taskQueue.filter(t => t.id !== taskId);

    // Emit cancellation event
    this.emit('task:cancelled', task);

    logger.info('Task cancelled', {
      taskId,
      reason: reason || 'No reason provided'
    });
  }

  /**
   * Retry a failed task
   */
  async retryTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    if (task.status !== TaskStatus.FAILED) {
      throw new Error(`Cannot retry task ${taskId} with status ${task.status}`);
    }

    // Reset task for retry
    task.status = TaskStatus.PENDING;
    task.updatedAt = new Date();
    task.assignedAgentId = undefined;
    task.startedAt = undefined;
    task.error = undefined;

    this.tasks.set(taskId, task);

    // Add back to queue
    this.addToQueue(task);

    // Emit retry event
    this.emit('task:retried', task);

    logger.info('Task queued for retry', { taskId });
  }

  /**
   * Get task distribution statistics
   */
  getDistributionStats() {
    const tasks = Array.from(this.tasks.values());
    
    const statsByStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<TaskStatus, number>);

    const statsByType = tasks.reduce((acc, task) => {
      acc[task.type] = (acc[task.type] || 0) + 1;
      return acc;
    }, {} as Record<TaskType, number>);

    const statsByPriority = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<TaskPriority, number>);

    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED);
    const averageProcessingTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, task) => {
          const startTime = task.startedAt?.getTime() || 0;
          const endTime = task.completedAt?.getTime() || 0;
          return sum + (endTime - startTime);
        }, 0) / completedTasks.length
      : 0;

    return {
      totalTasks: tasks.length,
      queuedTasks: this.taskQueue.length,
      processingTasks: this.processingTasks.size,
      statsByStatus,
      statsByType,
      statsByPriority,
      averageProcessingTimeMs: Math.round(averageProcessingTime),
      activeWorkflows: this.workflows.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Process multi-agent workflow
   */
  async processWorkflow(workflowTask: Task): Promise<WorkflowExecution> {
    const workflowId = `workflow-${workflowTask.id}`;
    
    // Create workflow execution
    const workflow: WorkflowExecution = {
      id: workflowId,
      taskId: workflowTask.id,
      steps: [],
      currentStepIndex: 0,
      status: WorkflowStatus.PENDING,
      startedAt: new Date()
    };

    // Generate workflow steps based on task requirements
    workflow.steps = await this.generateWorkflowSteps(workflowTask);
    
    this.workflows.set(workflowId, workflow);

    // Start workflow execution
    await this.executeWorkflow(workflowId);

    return workflow;
  }

  /**
   * Validate task before processing
   */
  private validateTask(task: Task): void {
    if (!task.id || !task.type) {
      throw new Error('Task must have id and type');
    }

    if (!task.requirements?.requiredCapabilities?.length) {
      throw new Error('Task must specify required capabilities');
    }

    if (!task.priority) {
      task.priority = TaskPriority.MEDIUM;
    }
  }

  /**
   * Add task to priority queue
   */
  private addToQueue(task: Task): void {
    // Insert task based on priority
    const priorityOrder = {
      [TaskPriority.CRITICAL]: 0,
      [TaskPriority.URGENT]: 1,
      [TaskPriority.HIGH]: 2,
      [TaskPriority.MEDIUM]: 3,
      [TaskPriority.LOW]: 4
    };

    const insertIndex = this.taskQueue.findIndex(queuedTask => 
      priorityOrder[task.priority] < priorityOrder[queuedTask.priority]
    );

    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }

    task.status = TaskStatus.QUEUED;
    task.updatedAt = new Date();
    this.tasks.set(task.id, task);
  }

  /**
   * Start the task processor
   */
  private startTaskProcessor(): void {
    setInterval(async () => {
      await this.processNextTask();
    }, 1000); // Process every second
  }

  /**
   * Process the next task in queue
   */
  private async processNextTask(): Promise<void> {
    if (this.taskQueue.length === 0) {
      return;
    }

    const task = this.taskQueue.shift();
    if (!task) return;

    try {
      await this.processTask(task);
    } catch (error) {
      logger.error('Failed to process task', {
        taskId: task.id,
        error: (error as Error).message
      });

      await this.handleTaskFailure(task, error as Error);
    }
  }

  /**
   * Process a single task
   */
  private async processTask(task: Task): Promise<void> {
    // Mark as processing
    this.processingTasks.add(task.id);

    try {
      // Update task status
      task.status = TaskStatus.ASSIGNED;
      task.startedAt = new Date();
      task.updatedAt = new Date();

      // Check if this is a multi-agent workflow
      if (task.type === TaskType.MULTI_AGENT_WORKFLOW) {
        await this.processWorkflow(task);
        return;
      }

      // Find suitable agents
      const suitableAgents = agentRegistry.findSuitableAgents(task.requirements);
      
      if (suitableAgents.length === 0) {
        throw new Error('No suitable agents available for task');
      }

      // Select best agent using orchestration strategy
      const selectedAgent = await this.selectAgent(task, suitableAgents);
      
      // Assign task to agent
      await this.assignTaskToAgent(task, selectedAgent);

    } catch (error) {
      this.processingTasks.delete(task.id);
      throw error;
    }
  }

  /**
   * Select the best agent for a task
   */
  private async selectAgent(task: Task, candidates: AgentSelection[]): Promise<AgentSelection> {
    // Use orchestration strategy if available
    const strategy = this.orchestrationStrategies.get('default');
    
    if (strategy) {
      // Apply orchestration rules
      for (const rule of strategy.rules) {
        if (this.evaluateRule(rule.condition, task, candidates)) {
          return this.applyOrchestrationAction(rule.action, task, candidates);
        }
      }
    }

    // Default selection: highest score
    return candidates[0];
  }

  /**
   * Assign task to agent
   */
  private async assignTaskToAgent(task: Task, agentSelection: AgentSelection): Promise<void> {
    const agent = agentRegistry.getAgent(agentSelection.agentId);
    if (!agent) {
      throw new Error(`Agent ${agentSelection.agentId} not found`);
    }

    if (agent.status !== AgentStatus.ACTIVE && agent.status !== AgentStatus.IDLE) {
      throw new Error(`Agent ${agentSelection.agentId} is not available (status: ${agent.status})`);
    }

    try {
      // Update task
      task.assignedAgentId = agentSelection.agentId;
      task.status = TaskStatus.IN_PROGRESS;
      task.updatedAt = new Date();
      this.tasks.set(task.id, task);

      // Update agent status
      agentRegistry.updateAgentStatus(agentSelection.agentId, AgentStatus.BUSY);

      // Send task to agent via queue
      await queueService.addJob('ai-processing', 'agent_request', {
        taskId: task.id,
        agentId: agentSelection.agentId,
        input: task.input,
        requirements: task.requirements,
        timeout: task.requirements.maxResponseTimeMs || this.taskTimeoutMs
      });

      // Set timeout for task
      this.setTaskTimeout(task.id);

      // Emit assignment event
      this.emit('task:assigned', { task, agent, selection: agentSelection });

      // Update metrics
      metricsService.incrementCounter(
        metricsService.agentSwitches,
        { from_agent: 'none', to_agent: agentSelection.agentId }
      );

      logger.info('Task assigned to agent', {
        taskId: task.id,
        agentId: agentSelection.agentId,
        agentName: agent.name,
        score: agentSelection.score,
        estimatedTime: agentSelection.estimatedCompletionTime
      });

    } catch (error) {
      this.processingTasks.delete(task.id);
      throw error;
    }
  }

  /**
   * Handle task completion
   */
  async handleTaskCompletion(taskId: string, result: any): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn('Task completion received for unknown task', { taskId });
      return;
    }

    // Update task
    task.status = TaskStatus.COMPLETED;
    task.result = result;
    task.completedAt = new Date();
    task.updatedAt = new Date();
    this.tasks.set(taskId, task);

    // Update agent status back to idle
    if (task.assignedAgentId) {
      agentRegistry.updateAgentStatus(task.assignedAgentId, AgentStatus.IDLE);
      
      // Update agent performance
      const processingTime = task.completedAt.getTime() - (task.startedAt?.getTime() || 0);
      const agent = agentRegistry.getAgent(task.assignedAgentId);
      if (agent) {
        agentRegistry.updateAgentPerformance(task.assignedAgentId, {
          totalTasks: agent.performance.totalTasks + 1,
          completedTasks: agent.performance.completedTasks + 1,
          averageResponseTimeMs: this.calculateNewAverage(
            agent.performance.averageResponseTimeMs,
            agent.performance.totalTasks,
            processingTime
          ),
          successRate: (agent.performance.completedTasks + 1) / (agent.performance.totalTasks + 1),
          currentLoad: Math.max(0, agent.performance.currentLoad - 0.1)
        });
      }
    }

    // Remove from processing
    this.processingTasks.delete(taskId);

    // Emit completion event
    this.emit('task:completed', task);

    // Update metrics
    metricsService.incrementCounter(
      metricsService.queueJobsTotal,
      { queue_name: 'task-distribution', job_type: task.type, status: 'completed' }
    );

    logger.info('Task completed successfully', {
      taskId,
      agentId: task.assignedAgentId,
      processingTimeMs: task.completedAt.getTime() - (task.startedAt?.getTime() || 0)
    });
  }

  /**
   * Handle task failure
   */
  private async handleTaskFailure(task: Task, error: Error): Promise<void> {
    task.status = TaskStatus.FAILED;
    task.error = {
      code: 'TASK_FAILED',
      message: error.message,
      details: { stack: error.stack },
      retryable: true,
      timestamp: new Date()
    };
    task.updatedAt = new Date();

    // Update agent performance if task was assigned
    if (task.assignedAgentId) {
      agentRegistry.updateAgentStatus(task.assignedAgentId, AgentStatus.IDLE);
      
      const agent = agentRegistry.getAgent(task.assignedAgentId);
      if (agent) {
        agentRegistry.updateAgentPerformance(task.assignedAgentId, {
          totalTasks: agent.performance.totalTasks + 1,
          failedTasks: agent.performance.failedTasks + 1,
          successRate: agent.performance.completedTasks / (agent.performance.totalTasks + 1),
          currentLoad: Math.max(0, agent.performance.currentLoad - 0.1)
        });
      }
    }

    this.tasks.set(task.id, task);
    this.processingTasks.delete(task.id);

    // Emit failure event
    this.emit('task:failed', task);

    // Update metrics
    metricsService.incrementCounter(
      metricsService.queueJobsTotal,
      { queue_name: 'task-distribution', job_type: task.type, status: 'failed' }
    );

    logger.error('Task failed', {
      taskId: task.id,
      agentId: task.assignedAgentId,
      error: error.message
    });
  }

  /**
   * Set task timeout
   */
  private setTaskTimeout(taskId: string): void {
    setTimeout(async () => {
      const task = this.tasks.get(taskId);
      if (task && task.status === TaskStatus.IN_PROGRESS) {
        await this.handleTaskFailure(task, new Error('Task timeout'));
      }
    }, this.taskTimeoutMs);
  }

  /**
   * Generate workflow steps for multi-agent tasks
   */
  private async generateWorkflowSteps(task: Task): Promise<WorkflowStep[]> {
    // This is a simplified implementation
    // In a real scenario, this would analyze the task and create appropriate steps
    
    const steps: WorkflowStep[] = [];
    const requiredCapabilities = task.requirements.requiredCapabilities;

    for (let i = 0; i < requiredCapabilities.length; i++) {
      const capability = requiredCapabilities[i];
      const suitableAgents = agentRegistry.getAgentsByCapability(capability);
      
      if (suitableAgents.length > 0) {
        steps.push({
          id: `step-${i + 1}`,
          agentId: suitableAgents[0].id,
          input: { capability, data: task.input },
          status: TaskStatus.PENDING
        });
      }
    }

    return steps;
  }

  /**
   * Execute workflow
   */
  private async executeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    workflow.status = WorkflowStatus.RUNNING;

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      workflow.currentStepIndex = i;

      try {
        step.status = TaskStatus.IN_PROGRESS;
        step.startedAt = new Date();

        // Execute step (simplified)
        await new Promise(resolve => setTimeout(resolve, 1000));

        step.status = TaskStatus.COMPLETED;
        step.completedAt = new Date();
        step.output = { success: true, stepIndex: i };

      } catch (error) {
        step.status = TaskStatus.FAILED;
        step.error = {
          code: 'WORKFLOW_STEP_FAILED',
          message: (error as Error).message,
          details: {},
          retryable: true,
          timestamp: new Date()
        };

        workflow.status = WorkflowStatus.FAILED;
        break;
      }
    }

    if (workflow.status === WorkflowStatus.RUNNING) {
      workflow.status = WorkflowStatus.COMPLETED;
      workflow.completedAt = new Date();
    }

    this.workflows.set(workflowId, workflow);
  }

  /**
   * Calculate new average
   */
  private calculateNewAverage(currentAvg: number, count: number, newValue: number): number {
    return (currentAvg * count + newValue) / (count + 1);
  }

  /**
   * Evaluate orchestration rule condition
   */
  private evaluateRule(condition: string, task: Task, candidates: AgentSelection[]): boolean {
    // Simplified rule evaluation
    // In a real implementation, this would parse and evaluate complex conditions
    return true;
  }

  /**
   * Apply orchestration action
   */
  private applyOrchestrationAction(
    action: any,
    task: Task,
    candidates: AgentSelection[]
  ): AgentSelection {
    // Simplified action application
    return candidates[0];
  }

  /**
   * Setup default orchestration strategies
   */
  private setupDefaultStrategies(): void {
    const defaultStrategy: OrchestrationStrategy = {
      name: 'default',
      description: 'Default task distribution strategy',
      rules: [
        {
          condition: 'task.priority === "critical"',
          action: {
            type: 'assign',
            parameters: { strategy: 'best_performance' }
          },
          priority: 1
        },
        {
          condition: 'task.type === "multi_agent_workflow"',
          action: {
            type: 'chain',
            parameters: { strategy: 'sequential' }
          },
          priority: 2
        }
      ]
    };

    this.orchestrationStrategies.set('default', defaultStrategy);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('task:submitted', (task: Task) => {
      logger.debug('Task submitted event', { taskId: task.id });
    });

    this.on('task:assigned', (event) => {
      logger.debug('Task assigned event', { 
        taskId: event.task.id,
        agentId: event.agent.id 
      });
    });

    this.on('task:completed', (task: Task) => {
      logger.debug('Task completed event', { taskId: task.id });
    });

    this.on('task:failed', (task: Task) => {
      logger.debug('Task failed event', { taskId: task.id });
    });
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Task Distribution Service...');

    // Cancel all processing tasks
    for (const taskId of this.processingTasks) {
      await this.cancelTask(taskId, 'Service shutdown');
    }

    // Clear all data
    this.tasks.clear();
    this.workflows.clear();
    this.taskQueue.length = 0;
    this.processingTasks.clear();

    logger.info('Task Distribution Service shutdown complete');
  }
}

export const taskDistribution = new TaskDistributionService();