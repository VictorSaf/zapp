import { EventEmitter } from 'events';
import {
  Agent,
  AgentType,
  AgentStatus,
  AgentCapability,
  AgentPerformance,
  Task,
  TaskRequirements,
  AgentSelection
} from '@/types/agent.types';
import logger from '@/config/logger';
import { serviceDiscovery } from './service-discovery';
import { metricsService } from './metrics.service';

export class AgentRegistryService extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private agentHealthChecks: Map<string, NodeJS.Timeout> = new Map();
  private performanceHistory: Map<string, AgentPerformance[]> = new Map();
  private readonly healthCheckIntervalMs = 30000; // 30 seconds
  private readonly maxPerformanceHistorySize = 100;

  constructor() {
    super();
    this.setupEventHandlers();
    this.startPeriodicCleanup();
  }

  /**
   * Register a new agent in the registry
   */
  async registerAgent(agent: Agent): Promise<void> {
    try {
      // Validate agent configuration
      this.validateAgent(agent);

      // Store agent
      this.agents.set(agent.id, {
        ...agent,
        status: AgentStatus.IDLE,
        updatedAt: new Date(),
        lastActiveAt: new Date()
      });

      // Start health monitoring
      this.startHealthMonitoring(agent.id);

      // Register with service discovery
      await this.registerWithServiceDiscovery(agent);

      // Initialize performance history
      this.performanceHistory.set(agent.id, []);

      // Emit registration event
      this.emit('agent:registered', agent);

      // Update metrics
      metricsService.incrementCounter(
        metricsService.serviceInstancesTotal,
        { service_name: agent.name, agent_type: agent.type }
      );

      logger.info('Agent registered successfully', {
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.type,
        capabilities: agent.capabilities
      });

    } catch (error) {
      logger.error('Failed to register agent', { 
        agentId: agent.id, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Deregister an agent from the registry
   */
  async deregisterAgent(agentId: string): Promise<void> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Stop health monitoring
      this.stopHealthMonitoring(agentId);

      // Deregister from service discovery
      await this.deregisterFromServiceDiscovery(agent);

      // Remove agent data
      this.agents.delete(agentId);
      this.performanceHistory.delete(agentId);

      // Emit deregistration event
      this.emit('agent:deregistered', agent);

      logger.info('Agent deregistered successfully', {
        agentId,
        agentName: agent.name
      });

    } catch (error) {
      logger.error('Failed to deregister agent', { 
        agentId, 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId: string, status: AgentStatus): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const previousStatus = agent.status;
    agent.status = status;
    agent.updatedAt = new Date();
    
    if (status !== AgentStatus.OFFLINE && status !== AgentStatus.ERROR) {
      agent.lastActiveAt = new Date();
    }

    this.agents.set(agentId, agent);

    // Emit status change event
    this.emit('agent:status_changed', {
      agentId,
      previousStatus,
      currentStatus: status,
      timestamp: new Date()
    });

    logger.debug('Agent status updated', {
      agentId,
      agentName: agent.name,
      previousStatus,
      currentStatus: status
    });
  }

  /**
   * Update agent performance metrics
   */
  updateAgentPerformance(agentId: string, performance: Partial<AgentPerformance>): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Update performance
    agent.performance = {
      ...agent.performance,
      ...performance,
      lastPerformanceUpdate: new Date()
    };

    // Store performance history
    const history = this.performanceHistory.get(agentId) || [];
    history.push({ ...agent.performance });
    
    // Keep only recent history
    if (history.length > this.maxPerformanceHistorySize) {
      history.shift();
    }
    
    this.performanceHistory.set(agentId, history);

    this.agents.set(agentId, agent);

    // Update metrics
    metricsService.setGauge(
      metricsService.agentResponseTime,
      agent.performance.averageResponseTimeMs,
      { agent_id: agentId, agent_type: agent.type }
    );

    logger.debug('Agent performance updated', {
      agentId,
      performance: agent.performance
    });
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: AgentType): Agent[] {
    return Array.from(this.agents.values()).filter(agent => agent.type === type);
  }

  /**
   * Get agents by capability
   */
  getAgentsByCapability(capability: AgentCapability): Agent[] {
    return Array.from(this.agents.values()).filter(agent =>
      agent.capabilities.includes(capability)
    );
  }

  /**
   * Get active agents
   */
  getActiveAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(agent =>
      agent.status === AgentStatus.ACTIVE || agent.status === AgentStatus.IDLE
    );
  }

  /**
   * Find best agents for a task
   */
  findSuitableAgents(requirements: TaskRequirements): AgentSelection[] {
    const suitableAgents: AgentSelection[] = [];

    for (const agent of this.agents.values()) {
      // Skip offline or error agents
      if (agent.status === AgentStatus.OFFLINE || agent.status === AgentStatus.ERROR) {
        continue;
      }

      // Check required capabilities
      const hasRequiredCapabilities = requirements.requiredCapabilities.every(
        capability => agent.capabilities.includes(capability)
      );

      if (!hasRequiredCapabilities) {
        continue;
      }

      // Check preferred agent types
      if (requirements.preferredAgentTypes?.length && 
          !requirements.preferredAgentTypes.includes(agent.type)) {
        continue;
      }

      // Check resource requirements
      if (!this.meetsResourceRequirements(agent, requirements)) {
        continue;
      }

      // Calculate suitability score
      const score = this.calculateSuitabilityScore(agent, requirements);
      const estimatedTime = this.estimateCompletionTime(agent, requirements);

      suitableAgents.push({
        agentId: agent.id,
        score,
        reasoning: this.generateSelectionReasoning(agent, requirements, score),
        estimatedCompletionTime: estimatedTime
      });
    }

    // Sort by score (descending)
    return suitableAgents.sort((a, b) => b.score - a.score);
  }

  /**
   * Get agent performance history
   */
  getAgentPerformanceHistory(agentId: string): AgentPerformance[] {
    return this.performanceHistory.get(agentId) || [];
  }

  /**
   * Get registry statistics
   */
  getRegistryStats() {
    const agents = Array.from(this.agents.values());
    
    const statsByStatus = agents.reduce((acc, agent) => {
      acc[agent.status] = (acc[agent.status] || 0) + 1;
      return acc;
    }, {} as Record<AgentStatus, number>);

    const statsByType = agents.reduce((acc, agent) => {
      acc[agent.type] = (acc[agent.type] || 0) + 1;
      return acc;
    }, {} as Record<AgentType, number>);

    const totalTasks = agents.reduce((sum, agent) => sum + agent.performance.totalTasks, 0);
    const completedTasks = agents.reduce((sum, agent) => sum + agent.performance.completedTasks, 0);
    const averageSuccessRate = agents.length > 0 
      ? agents.reduce((sum, agent) => sum + agent.performance.successRate, 0) / agents.length 
      : 0;

    return {
      totalAgents: agents.length,
      statsByStatus,
      statsByType,
      totalTasks,
      completedTasks,
      averageSuccessRate: Math.round(averageSuccessRate * 100) / 100,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate agent configuration
   */
  private validateAgent(agent: Agent): void {
    if (!agent.id || !agent.name || !agent.type) {
      throw new Error('Agent must have id, name, and type');
    }

    if (!agent.capabilities || agent.capabilities.length === 0) {
      throw new Error('Agent must have at least one capability');
    }

    if (!agent.configuration.endpoints.primary) {
      throw new Error('Agent must have primary endpoint');
    }

    if (agent.configuration.maxConcurrentTasks <= 0) {
      throw new Error('Agent maxConcurrentTasks must be greater than 0');
    }
  }

  /**
   * Check if agent meets resource requirements
   */
  private meetsResourceRequirements(agent: Agent, requirements: TaskRequirements): boolean {
    const resourceReqs = requirements.resourceRequirements;
    if (!resourceReqs) return true;

    const agentLimits = agent.configuration.resourceLimits;

    if (resourceReqs.minMemoryMB && agentLimits.maxMemoryMB < resourceReqs.minMemoryMB) {
      return false;
    }

    // Add more resource checks as needed
    return true;
  }

  /**
   * Calculate agent suitability score for a task
   */
  private calculateSuitabilityScore(agent: Agent, requirements: TaskRequirements): number {
    let score = 0;

    // Base score from capabilities match
    const capabilityScore = requirements.requiredCapabilities.length > 0
      ? (requirements.requiredCapabilities.filter(cap => 
          agent.capabilities.includes(cap)
        ).length / requirements.requiredCapabilities.length) * 40
      : 0;

    // Performance score
    const performanceScore = agent.performance.successRate * 30;

    // Load score (prefer less loaded agents)
    const loadScore = Math.max(0, (1 - agent.performance.currentLoad) * 20);

    // Response time score (prefer faster agents)
    const responseTimeScore = Math.max(0, 
      (1 - Math.min(agent.performance.averageResponseTimeMs / 10000, 1)) * 10
    );

    score = capabilityScore + performanceScore + loadScore + responseTimeScore;

    return Math.round(score * 100) / 100;
  }

  /**
   * Estimate task completion time
   */
  private estimateCompletionTime(agent: Agent, requirements: TaskRequirements): number {
    let baseTime = agent.performance.averageResponseTimeMs || 5000;

    // Adjust for current load
    const loadMultiplier = 1 + agent.performance.currentLoad;
    baseTime *= loadMultiplier;

    // Adjust for complexity (based on required capabilities)
    const complexityMultiplier = 1 + (requirements.requiredCapabilities.length - 1) * 0.2;
    baseTime *= complexityMultiplier;

    return Math.round(baseTime);
  }

  /**
   * Generate reasoning for agent selection
   */
  private generateSelectionReasoning(
    agent: Agent, 
    requirements: TaskRequirements, 
    score: number
  ): string {
    const reasons = [];

    if (agent.performance.successRate > 0.9) {
      reasons.push('high success rate');
    }

    if (agent.performance.currentLoad < 0.5) {
      reasons.push('low current load');
    }

    if (agent.performance.averageResponseTimeMs < 3000) {
      reasons.push('fast response time');
    }

    const capabilityMatch = requirements.requiredCapabilities.every(cap => 
      agent.capabilities.includes(cap)
    );
    if (capabilityMatch) {
      reasons.push('all required capabilities');
    }

    return reasons.length > 0 
      ? `Selected for: ${reasons.join(', ')} (score: ${score})`
      : `Selected with score: ${score}`;
  }

  /**
   * Start health monitoring for an agent
   */
  private startHealthMonitoring(agentId: string): void {
    const interval = setInterval(async () => {
      await this.checkAgentHealth(agentId);
    }, this.healthCheckIntervalMs);

    this.agentHealthChecks.set(agentId, interval);
  }

  /**
   * Stop health monitoring for an agent
   */
  private stopHealthMonitoring(agentId: string): void {
    const interval = this.agentHealthChecks.get(agentId);
    if (interval) {
      clearInterval(interval);
      this.agentHealthChecks.delete(agentId);
    }
  }

  /**
   * Check agent health
   */
  private async checkAgentHealth(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    try {
      // Implement health check logic here
      // For now, just update last active time if agent is responding
      
      // Update metrics
      metricsService.incrementCounter(
        metricsService.serviceHealthChecks,
        { service_name: agent.name, status: 'success' }
      );

    } catch (error) {
      logger.warn('Agent health check failed', {
        agentId,
        agentName: agent.name,
        error: (error as Error).message
      });

      // Update agent status to error if health check fails
      this.updateAgentStatus(agentId, AgentStatus.ERROR);

      // Update metrics
      metricsService.incrementCounter(
        metricsService.serviceHealthChecks,
        { service_name: agent.name, status: 'failure' }
      );
    }
  }

  /**
   * Register agent with service discovery
   */
  private async registerWithServiceDiscovery(agent: Agent): Promise<void> {
    try {
      await serviceDiscovery.registerService({
        serviceName: `agent-${agent.type}`,
        serviceId: agent.id,
        port: parseInt(agent.configuration.endpoints.primary.split(':').pop() || '80'),
        tags: [
          `agent-id:${agent.id}`,
          `agent-type:${agent.type}`,
          `agent-name:${agent.name}`,
          ...agent.capabilities.map(cap => `capability:${cap}`),
          ...agent.metadata.tags.map(tag => `tag:${tag}`)
        ],
        meta: {
          version: agent.metadata.version,
          description: agent.metadata.description,
          capabilities: agent.capabilities.join(','),
          maxConcurrentTasks: agent.configuration.maxConcurrentTasks.toString()
        },
        healthCheck: {
          http: agent.configuration.endpoints.health,
          interval: '30s',
          timeout: '10s',
          deregisterCriticalServiceAfter: '5m'
        }
      });
    } catch (error) {
      logger.warn('Failed to register agent with service discovery', {
        agentId: agent.id,
        error: (error as Error).message
      });
    }
  }

  /**
   * Deregister agent from service discovery
   */
  private async deregisterFromServiceDiscovery(agent: Agent): Promise<void> {
    try {
      await serviceDiscovery.deregisterService(agent.id);
    } catch (error) {
      logger.warn('Failed to deregister agent from service discovery', {
        agentId: agent.id,
        error: (error as Error).message
      });
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('agent:registered', (agent: Agent) => {
      logger.info('Agent registered event', { agentId: agent.id });
    });

    this.on('agent:deregistered', (agent: Agent) => {
      logger.info('Agent deregistered event', { agentId: agent.id });
    });

    this.on('agent:status_changed', (event) => {
      logger.debug('Agent status changed event', event);
    });
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupInactiveAgents();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Cleanup inactive agents
   */
  private cleanupInactiveAgents(): void {
    const now = new Date();
    const inactiveThreshold = 10 * 60 * 1000; // 10 minutes

    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.lastActiveAt && 
          (now.getTime() - agent.lastActiveAt.getTime()) > inactiveThreshold &&
          agent.status !== AgentStatus.OFFLINE) {
        
        logger.info('Marking inactive agent as offline', {
          agentId,
          agentName: agent.name,
          lastActiveAt: agent.lastActiveAt
        });

        this.updateAgentStatus(agentId, AgentStatus.OFFLINE);
      }
    }
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Agent Registry Service...');

    // Stop all health checks
    for (const [agentId] of this.agentHealthChecks) {
      this.stopHealthMonitoring(agentId);
    }

    // Clear all data
    this.agents.clear();
    this.performanceHistory.clear();

    logger.info('Agent Registry Service shutdown complete');
  }
}

export const agentRegistry = new AgentRegistryService();