import { EventEmitter } from 'events';
import {
  Agent,
  AgentStatus,
  Task,
  TaskPriority,
  AgentSelection,
  AgentPerformance
} from '@/types/agent.types';
import logger from '@/config/logger';
import { agentRegistry } from './agent-registry.service';
import { metricsService } from './metrics.service';

export interface LoadBalancingStrategy {
  name: string;
  description: string;
  weight: number;
  evaluator: (agent: Agent, task: Task, context: LoadBalancingContext) => number;
}

export interface LoadBalancingContext {
  currentLoad: Map<string, number>;
  recentPerformance: Map<string, AgentPerformance[]>;
  taskHistory: Map<string, Task[]>;
  systemMetrics: SystemMetrics;
}

export interface SystemMetrics {
  totalAgents: number;
  activeAgents: number;
  averageLoad: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageResponseTime: number;
}

export interface LoadBalancingResult {
  selectedAgent: AgentSelection;
  strategy: string;
  score: number;
  alternatives: AgentSelection[];
  reasoning: string[];
  loadDistribution: Map<string, number>;
}

export class LoadBalancerService extends EventEmitter {
  private strategies: Map<string, LoadBalancingStrategy> = new Map();
  private loadMetrics: Map<string, number> = new Map();
  private taskAssignments: Map<string, string[]> = new Map(); // agentId -> taskIds
  private performanceHistory: Map<string, AgentPerformance[]> = new Map();
  private loadBalancingHistory: LoadBalancingResult[] = [];
  private readonly maxHistorySize = 1000;

  constructor() {
    super();
    this.setupDefaultStrategies();
    this.startLoadMonitoring();
  }

  /**
   * Select best agent for task using load balancing
   */
  async selectAgent(task: Task, candidates: Agent[]): Promise<LoadBalancingResult> {
    try {
      if (candidates.length === 0) {
        throw new Error('No candidate agents provided');
      }

      // Build context
      const context = await this.buildLoadBalancingContext();

      // Evaluate all candidates using all strategies
      const evaluatedCandidates = await this.evaluateCandidates(task, candidates, context);

      // Select best candidate
      const selectedAgent = evaluatedCandidates[0];

      // Get alternatives
      const alternatives = evaluatedCandidates.slice(1, 5); // Top 5 alternatives

      // Build reasoning
      const reasoning = this.buildReasoning(selectedAgent, task, context);

      // Get current load distribution
      const loadDistribution = this.getCurrentLoadDistribution();

      const result: LoadBalancingResult = {
        selectedAgent,
        strategy: 'composite',
        score: selectedAgent.score,
        alternatives,
        reasoning,
        loadDistribution
      };

      // Store result in history
      this.loadBalancingHistory.push(result);
      if (this.loadBalancingHistory.length > this.maxHistorySize) {
        this.loadBalancingHistory.shift();
      }

      // Update load metrics
      this.updateLoadMetrics(selectedAgent.agentId, task);

      // Emit selection event
      this.emit('agent:selected', {
        taskId: task.id,
        agentId: selectedAgent.agentId,
        score: selectedAgent.score,
        strategy: 'composite'
      });

      logger.info('Agent selected using load balancing', {
        taskId: task.id,
        selectedAgentId: selectedAgent.agentId,
        score: selectedAgent.score,
        totalCandidates: candidates.length,
        strategy: 'composite'
      });

      return result;

    } catch (error) {
      logger.error('Failed to select agent', {
        taskId: task.id,
        candidateCount: candidates.length,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get current load distribution across agents
   */
  getCurrentLoadDistribution(): Map<string, number> {
    const distribution = new Map<string, number>();
    
    for (const agent of agentRegistry.getAllAgents()) {
      const assignments = this.taskAssignments.get(agent.id) || [];
      const loadPercentage = assignments.length / agent.configuration.maxConcurrentTasks;
      distribution.set(agent.id, Math.min(loadPercentage, 1.0));
    }

    return distribution;
  }

  /**
   * Get load balancing statistics
   */
  getLoadBalancingStats() {
    const agents = agentRegistry.getAllAgents();
    const loadDistribution = this.getCurrentLoadDistribution();
    
    const totalLoad = Array.from(loadDistribution.values()).reduce((sum, load) => sum + load, 0);
    const averageLoad = agents.length > 0 ? totalLoad / agents.length : 0;
    
    const loadVariance = agents.length > 0
      ? Array.from(loadDistribution.values())
          .reduce((sum, load) => sum + Math.pow(load - averageLoad, 2), 0) / agents.length
      : 0;

    const overloadedAgents = Array.from(loadDistribution.entries())
      .filter(([_, load]) => load > 0.8).length;

    const idleAgents = Array.from(loadDistribution.entries())
      .filter(([_, load]) => load === 0).length;

    return {
      totalAgents: agents.length,
      averageLoad: Math.round(averageLoad * 100) / 100,
      loadVariance: Math.round(loadVariance * 10000) / 10000,
      overloadedAgents,
      idleAgents,
      loadDistribution: Object.fromEntries(loadDistribution),
      recentSelections: this.loadBalancingHistory.slice(-10).map(result => ({
        agentId: result.selectedAgent.agentId,
        score: result.selectedAgent.score,
        strategy: result.strategy
      })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Rebalance load across agents
   */
  async rebalanceLoad(): Promise<void> {
    try {
      logger.info('Starting load rebalancing...');

      const agents = agentRegistry.getActiveAgents();
      const loadDistribution = this.getCurrentLoadDistribution();

      // Find overloaded and underloaded agents
      const overloadedAgents = agents.filter(agent => {
        const load = loadDistribution.get(agent.id) || 0;
        return load > 0.8; // Over 80% capacity
      });

      const underloadedAgents = agents.filter(agent => {
        const load = loadDistribution.get(agent.id) || 0;
        return load < 0.3; // Under 30% capacity
      });

      if (overloadedAgents.length === 0 || underloadedAgents.length === 0) {
        logger.info('No rebalancing needed', {
          overloadedCount: overloadedAgents.length,
          underloadedCount: underloadedAgents.length
        });
        return;
      }

      // Implement rebalancing logic
      for (const overloadedAgent of overloadedAgents) {
        const assignments = this.taskAssignments.get(overloadedAgent.id) || [];
        const tasksToMove = Math.ceil(assignments.length * 0.2); // Move 20% of tasks

        for (let i = 0; i < tasksToMove && underloadedAgents.length > 0; i++) {
          const taskId = assignments[i];
          const targetAgent = underloadedAgents[0];

          // Move task (in a real implementation, this would involve more complex logic)
          await this.moveTask(taskId, overloadedAgent.id, targetAgent.id);

          // Update load distribution
          const targetLoad = loadDistribution.get(targetAgent.id) || 0;
          if (targetLoad > 0.7) {
            underloadedAgents.shift(); // Remove from underloaded list
          }
        }
      }

      // Emit rebalancing event
      this.emit('load:rebalanced', {
        overloadedAgents: overloadedAgents.length,
        underloadedAgents: underloadedAgents.length,
        timestamp: new Date()
      });

      logger.info('Load rebalancing completed', {
        overloadedAgents: overloadedAgents.length,
        underloadedAgents: underloadedAgents.length
      });

    } catch (error) {
      logger.error('Failed to rebalance load', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Add custom load balancing strategy
   */
  addStrategy(strategy: LoadBalancingStrategy): void {
    this.strategies.set(strategy.name, strategy);
    
    logger.info('Load balancing strategy added', {
      strategyName: strategy.name,
      weight: strategy.weight
    });
  }

  /**
   * Remove load balancing strategy
   */
  removeStrategy(strategyName: string): void {
    this.strategies.delete(strategyName);
    
    logger.info('Load balancing strategy removed', {
      strategyName
    });
  }

  /**
   * Update agent load when task is assigned
   */
  updateAgentLoad(agentId: string, taskId: string, operation: 'assign' | 'complete' | 'fail'): void {
    const assignments = this.taskAssignments.get(agentId) || [];

    switch (operation) {
      case 'assign':
        assignments.push(taskId);
        break;
      case 'complete':
      case 'fail':
        const index = assignments.indexOf(taskId);
        if (index !== -1) {
          assignments.splice(index, 1);
        }
        break;
    }

    this.taskAssignments.set(agentId, assignments);

    // Update load metric
    const agent = agentRegistry.getAgent(agentId);
    if (agent) {
      const loadPercentage = assignments.length / agent.configuration.maxConcurrentTasks;
      this.loadMetrics.set(agentId, loadPercentage);

      // Update agent performance
      agentRegistry.updateAgentPerformance(agentId, {
        currentLoad: loadPercentage
      });

      // Update metrics
      metricsService.setGauge(
        metricsService.activeAgents,
        assignments.length,
        { agent_id: agentId }
      );
    }
  }

  /**
   * Evaluate candidates using all strategies
   */
  private async evaluateCandidates(
    task: Task, 
    candidates: Agent[], 
    context: LoadBalancingContext
  ): Promise<AgentSelection[]> {
    const evaluatedCandidates: AgentSelection[] = [];

    for (const agent of candidates) {
      let totalScore = 0;
      let weightSum = 0;

      // Apply all strategies
      for (const strategy of this.strategies.values()) {
        const strategyScore = strategy.evaluator(agent, task, context);
        totalScore += strategyScore * strategy.weight;
        weightSum += strategy.weight;
      }

      // Normalize score
      const finalScore = weightSum > 0 ? totalScore / weightSum : 0;

      evaluatedCandidates.push({
        agentId: agent.id,
        score: Math.round(finalScore * 100) / 100,
        reasoning: this.generateSelectionReasoning(agent, task, finalScore),
        estimatedCompletionTime: this.estimateCompletionTime(agent, task, context)
      });
    }

    // Sort by score (descending)
    return evaluatedCandidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Build load balancing context
   */
  private async buildLoadBalancingContext(): Promise<LoadBalancingContext> {
    const agents = agentRegistry.getAllAgents();
    const currentLoad = this.getCurrentLoadDistribution();
    
    // Calculate system metrics
    const systemMetrics: SystemMetrics = {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === AgentStatus.ACTIVE).length,
      averageLoad: Array.from(currentLoad.values()).reduce((sum, load) => sum + load, 0) / agents.length,
      totalTasks: agents.reduce((sum, agent) => sum + agent.performance.totalTasks, 0),
      completedTasks: agents.reduce((sum, agent) => sum + agent.performance.completedTasks, 0),
      failedTasks: agents.reduce((sum, agent) => sum + agent.performance.failedTasks, 0),
      averageResponseTime: agents.length > 0 
        ? agents.reduce((sum, agent) => sum + agent.performance.averageResponseTimeMs, 0) / agents.length 
        : 0
    };

    return {
      currentLoad,
      recentPerformance: this.performanceHistory,
      taskHistory: new Map(),
      systemMetrics
    };
  }

  /**
   * Generate selection reasoning
   */
  private generateSelectionReasoning(agent: Agent, task: Task, score: number): string {
    const reasons = [];
    const currentLoad = this.loadMetrics.get(agent.id) || 0;

    if (currentLoad < 0.3) {
      reasons.push('low load');
    } else if (currentLoad < 0.7) {
      reasons.push('moderate load');
    } else {
      reasons.push('high load');
    }

    if (agent.performance.successRate > 0.9) {
      reasons.push('high success rate');
    }

    if (agent.performance.averageResponseTimeMs < 3000) {
      reasons.push('fast response time');
    }

    if (task.priority === TaskPriority.CRITICAL || task.priority === TaskPriority.URGENT) {
      reasons.push('priority task');
    }

    return `Selected for: ${reasons.join(', ')} (score: ${score})`;
  }

  /**
   * Estimate completion time
   */
  private estimateCompletionTime(agent: Agent, task: Task, context: LoadBalancingContext): number {
    let baseTime = agent.performance.averageResponseTimeMs || 5000;

    // Adjust for current load
    const currentLoad = context.currentLoad.get(agent.id) || 0;
    const loadMultiplier = 1 + currentLoad;
    baseTime *= loadMultiplier;

    // Adjust for task priority
    const priorityMultiplier = this.getPriorityMultiplier(task.priority);
    baseTime *= priorityMultiplier;

    // Adjust for system load
    const systemLoadMultiplier = 1 + (context.systemMetrics.averageLoad * 0.5);
    baseTime *= systemLoadMultiplier;

    return Math.round(baseTime);
  }

  /**
   * Get priority multiplier
   */
  private getPriorityMultiplier(priority: TaskPriority): number {
    switch (priority) {
      case TaskPriority.CRITICAL:
        return 0.8; // Faster processing for critical tasks
      case TaskPriority.URGENT:
        return 0.9;
      case TaskPriority.HIGH:
        return 1.0;
      case TaskPriority.MEDIUM:
        return 1.1;
      case TaskPriority.LOW:
        return 1.2;
      default:
        return 1.0;
    }
  }

  /**
   * Build reasoning for selection
   */
  private buildReasoning(selection: AgentSelection, task: Task, context: LoadBalancingContext): string[] {
    const reasoning = [];
    const agent = agentRegistry.getAgent(selection.agentId);
    
    if (!agent) {
      return ['Agent not found'];
    }

    const currentLoad = context.currentLoad.get(selection.agentId) || 0;

    // Load-based reasoning
    if (currentLoad < 0.3) {
      reasoning.push('Agent has low current load, ensuring fast processing');
    } else if (currentLoad < 0.7) {
      reasoning.push('Agent has moderate load, good balance of availability and experience');
    } else {
      reasoning.push('Agent selected despite high load due to superior capabilities');
    }

    // Performance-based reasoning
    if (agent.performance.successRate > 0.95) {
      reasoning.push('Excellent success rate indicates high reliability');
    } else if (agent.performance.successRate > 0.8) {
      reasoning.push('Good success rate provides confidence in task completion');
    }

    // Response time reasoning
    if (agent.performance.averageResponseTimeMs < 2000) {
      reasoning.push('Very fast average response time');
    } else if (agent.performance.averageResponseTimeMs < 5000) {
      reasoning.push('Good average response time');
    }

    // Task priority reasoning
    if (task.priority === TaskPriority.CRITICAL) {
      reasoning.push('Critical task priority requires most capable agent');
    } else if (task.priority === TaskPriority.URGENT) {
      reasoning.push('Urgent task priority favors immediate availability');
    }

    return reasoning;
  }

  /**
   * Update load metrics
   */
  private updateLoadMetrics(agentId: string, task: Task): void {
    this.updateAgentLoad(agentId, task.id, 'assign');
  }

  /**
   * Move task from one agent to another
   */
  private async moveTask(taskId: string, fromAgentId: string, toAgentId: string): Promise<void> {
    // Update load for both agents
    this.updateAgentLoad(fromAgentId, taskId, 'complete');
    this.updateAgentLoad(toAgentId, taskId, 'assign');

    logger.info('Task moved between agents', {
      taskId,
      fromAgentId,
      toAgentId
    });
  }

  /**
   * Setup default load balancing strategies
   */
  private setupDefaultStrategies(): void {
    // Current Load Strategy
    this.addStrategy({
      name: 'current_load',
      description: 'Prefers agents with lower current load',
      weight: 30,
      evaluator: (agent: Agent, task: Task, context: LoadBalancingContext) => {
        const currentLoad = context.currentLoad.get(agent.id) || 0;
        return Math.max(0, (1 - currentLoad) * 100);
      }
    });

    // Performance Strategy
    this.addStrategy({
      name: 'performance',
      description: 'Prefers agents with better performance metrics',
      weight: 25,
      evaluator: (agent: Agent, task: Task, context: LoadBalancingContext) => {
        return agent.performance.successRate * 100;
      }
    });

    // Response Time Strategy
    this.addStrategy({
      name: 'response_time',
      description: 'Prefers agents with faster response times',
      weight: 20,
      evaluator: (agent: Agent, task: Task, context: LoadBalancingContext) => {
        const maxAcceptableTime = 10000; // 10 seconds
        const responseTime = agent.performance.averageResponseTimeMs;
        return Math.max(0, (1 - (responseTime / maxAcceptableTime)) * 100);
      }
    });

    // Capability Match Strategy
    this.addStrategy({
      name: 'capability_match',
      description: 'Prefers agents with exact capability matches',
      weight: 15,
      evaluator: (agent: Agent, task: Task, context: LoadBalancingContext) => {
        const requiredCaps = task.requirements.requiredCapabilities;
        const agentCaps = agent.capabilities;
        const matchCount = requiredCaps.filter(cap => agentCaps.includes(cap)).length;
        return (matchCount / requiredCaps.length) * 100;
      }
    });

    // System Balance Strategy
    this.addStrategy({
      name: 'system_balance',
      description: 'Promotes overall system load balance',
      weight: 10,
      evaluator: (agent: Agent, task: Task, context: LoadBalancingContext) => {
        const currentLoad = context.currentLoad.get(agent.id) || 0;
        const systemAverage = context.systemMetrics.averageLoad;
        const deviation = Math.abs(currentLoad - systemAverage);
        return Math.max(0, (1 - deviation) * 100);
      }
    });
  }

  /**
   * Start load monitoring
   */
  private startLoadMonitoring(): void {
    setInterval(() => {
      this.updateSystemMetrics();
      this.checkLoadBalance();
    }, 30000); // Every 30 seconds
  }

  /**
   * Update system metrics
   */
  private updateSystemMetrics(): void {
    const agents = agentRegistry.getAllAgents();
    const loadDistribution = this.getCurrentLoadDistribution();

    // Update individual agent metrics
    for (const agent of agents) {
      const load = loadDistribution.get(agent.id) || 0;
      
      metricsService.setGauge(
        metricsService.activeAgents,
        load,
        { agent_id: agent.id, agent_type: agent.type }
      );
    }

    // Update system-wide metrics
    const totalLoad = Array.from(loadDistribution.values()).reduce((sum, load) => sum + load, 0);
    const averageLoad = agents.length > 0 ? totalLoad / agents.length : 0;

    metricsService.setGauge(
      metricsService.systemCpuUsage,
      averageLoad,
      { component: 'load_balancer' }
    );
  }

  /**
   * Check load balance and trigger rebalancing if needed
   */
  private checkLoadBalance(): void {
    const loadDistribution = this.getCurrentLoadDistribution();
    const loads = Array.from(loadDistribution.values());
    
    if (loads.length < 2) return;

    const maxLoad = Math.max(...loads);
    const minLoad = Math.min(...loads);
    const loadImbalance = maxLoad - minLoad;

    // Trigger rebalancing if imbalance is significant
    if (loadImbalance > 0.5) { // 50% difference
      logger.warn('Load imbalance detected', {
        maxLoad,
        minLoad,
        imbalance: loadImbalance
      });

      this.emit('load:imbalance_detected', {
        maxLoad,
        minLoad,
        imbalance: loadImbalance,
        timestamp: new Date()
      });

      // Auto-rebalance if enabled
      // this.rebalanceLoad();
    }
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Load Balancer Service...');

    // Clear all data
    this.strategies.clear();
    this.loadMetrics.clear();
    this.taskAssignments.clear();
    this.performanceHistory.clear();
    this.loadBalancingHistory.length = 0;

    logger.info('Load Balancer Service shutdown complete');
  }
}

export const loadBalancer = new LoadBalancerService();