import { EventEmitter } from 'events';
import {
  SwitchRequest,
  AgentSelectionCriteria,
  AgentSwitchProfile,
  SwitchRecommendation,
  ExpectedBenefit,
  PotentialRisk,
  EstimatedImpact,
  BenefitType,
  RiskType,
  RiskSeverity,
  WorkloadPreference,
  ExperienceLevel,
  CommunicationStyle
} from '@/types/switching.types';
import { Agent, AgentCapability, AgentStatus } from '@/types/agent.types';
import logger from '@/config/logger';
import { agentRegistry } from './agent-registry.service';
import { loadBalancer } from './load-balancer.service';
import { contextStorage } from './context-storage.service';
import { metricsService } from './metrics.service';

export interface SelectionAlgorithm {
  name: string;
  description: string;
  weight: number;
  evaluator: (agent: Agent, request: SwitchRequest, context: SelectionContext) => Promise<number>;
}

export interface SelectionContext {
  currentPerformance: Map<string, AgentPerformanceSnapshot>;
  historicalData: Map<string, HistoricalPerformance>;
  userHistory: UserInteractionHistory;
  systemState: SystemSnapshot;
  similarSwitches: SimilarSwitch[];
}

export interface AgentPerformanceSnapshot {
  agentId: string;
  currentLoad: number;
  avgResponseTime: number;
  successRate: number;
  userSatisfactionScore: number;
  errorRate: number;
  uptime: number;
  lastUpdated: Date;
}

export interface HistoricalPerformance {
  agentId: string;
  totalSwitches: number;
  successfulSwitches: number;
  averageSwitchTime: number;
  userSatisfactionAfterSwitch: number;
  commonSwitchReasons: string[];
  performanceTrends: PerformanceTrend[];
}

export interface PerformanceTrend {
  period: string;
  metric: string;
  value: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface UserInteractionHistory {
  userId?: string;
  sessionId: string;
  previousAgents: string[];
  preferredAgentTypes: string[];
  communicationStyle: CommunicationStyle;
  expertiseLevel: ExperienceLevel;
  satisfactionHistory: SatisfactionDataPoint[];
  interactionPatterns: InteractionPattern[];
}

export interface SatisfactionDataPoint {
  agentId: string;
  score: number;
  timestamp: Date;
  context: string;
}

export interface InteractionPattern {
  pattern: string;
  frequency: number;
  successRate: number;
  avgDuration: number;
}

export interface SystemSnapshot {
  totalLoad: number;
  availableAgents: number;
  queueLength: number;
  systemHealth: number;
  resourcePressure: number;
  activeUsers: number;
}

export interface SimilarSwitch {
  fromAgentId: string;
  toAgentId: string;
  reason: string;
  success: boolean;
  userSatisfaction: number;
  similarity: number;
  timestamp: Date;
}

export class SmartAgentSelectionService extends EventEmitter {
  private selectionAlgorithms: Map<string, SelectionAlgorithm> = new Map();
  private performanceCache: Map<string, AgentPerformanceSnapshot> = new Map();
  private historicalData: Map<string, HistoricalPerformance> = new Map();
  private userHistories: Map<string, UserInteractionHistory> = new Map();
  private selectionHistory: SwitchRecommendation[] = [];
  private readonly maxHistorySize = 10000;

  constructor() {
    super();
    this.setupDefaultAlgorithms();
    this.startPerformanceMonitoring();
  }

  /**
   * Select best agent for switching based on comprehensive analysis
   */
  async selectBestAgent(request: SwitchRequest): Promise<SwitchRecommendation> {
    try {
      const startTime = Date.now();

      // Build selection context
      const context = await this.buildSelectionContext(request);

      // Get candidate agents
      const candidates = await this.getCandidateAgents(request.targetCriteria);

      if (candidates.length === 0) {
        throw new Error('No suitable agent candidates found');
      }

      // Evaluate all candidates
      const evaluatedAgents = await this.evaluateAgents(candidates, request, context);

      // Select best agent
      const bestAgent = evaluatedAgents[0];

      // Generate recommendation
      const recommendation = await this.generateRecommendation(
        bestAgent,
        evaluatedAgents.slice(1, 4), // Top 3 alternatives
        request,
        context
      );

      // Store selection history
      this.selectionHistory.push(recommendation);
      if (this.selectionHistory.length > this.maxHistorySize) {
        this.selectionHistory.shift();
      }

      // Update performance cache
      await this.updatePerformanceCache();

      // Emit selection event
      this.emit('agent:selected', {
        requestId: request.id,
        selectedAgentId: bestAgent.agentId,
        confidence: recommendation.confidence,
        selectionTime: Date.now() - startTime
      });

      // Update metrics
      metricsService.incrementCounter(
        metricsService.agentSwitches,
        { 
          from_agent: request.currentAgentId,
          to_agent: bestAgent.agentId,
          reason: request.reason
        }
      );

      logger.info('Smart agent selection completed', {
        requestId: request.id,
        currentAgentId: request.currentAgentId,
        selectedAgentId: bestAgent.agentId,
        selectionScore: bestAgent.selectionScore,
        confidence: recommendation.confidence,
        candidatesEvaluated: candidates.length,
        selectionTime: Date.now() - startTime
      });

      return recommendation;

    } catch (error) {
      logger.error('Failed to select best agent', {
        requestId: request.id,
        currentAgentId: request.currentAgentId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get selection recommendations without committing to a switch
   */
  async getSelectionRecommendations(
    criteria: AgentSelectionCriteria,
    sessionId: string,
    limit = 3
  ): Promise<AgentSwitchProfile[]> {
    try {
      // Create mock switch request for evaluation
      const mockRequest: SwitchRequest = {
        id: `mock-${Date.now()}`,
        currentTaskId: '',
        currentAgentId: '',
        reason: 'quality_improvement',
        requesterId: 'system',
        requestType: 'conditional',
        targetCriteria: criteria,
        contextPreservation: {
          preserveFullContext: true,
          preserveConversationHistory: true,
          preserveUserPreferences: true,
          preserveTaskState: true,
          preserveTemporaryData: false,
          contextCompressionLevel: 'light',
          selectivePreservation: {
            priorityThreshold: 0.5,
            preserveRecent: true,
            preserveFrequentlyAccessed: true,
            preserveHighRelevance: true,
            maxContextAge: 24 * 60 * 60 * 1000,
            maxContextSize: 1024 * 1024
          }
        },
        urgency: 'medium',
        metadata: { sessionId },
        createdAt: new Date()
      };

      const context = await this.buildSelectionContext(mockRequest);
      const candidates = await this.getCandidateAgents(criteria);
      const evaluatedAgents = await this.evaluateAgents(candidates, mockRequest, context);

      return evaluatedAgents.slice(0, limit);

    } catch (error) {
      logger.error('Failed to get selection recommendations', {
        criteria,
        sessionId,
        error: (error as Error).message
      });
      return [];
    }
  }

  /**
   * Learn from switch outcomes to improve future selections
   */
  async learnFromSwitchOutcome(
    requestId: string,
    selectedAgentId: string,
    outcome: SwitchOutcome
  ): Promise<void> {
    try {
      // Find the original recommendation
      const recommendation = this.selectionHistory.find(r => r.recommendationId === requestId);
      if (!recommendation) {
        logger.warn('No recommendation found for learning', { requestId });
        return;
      }

      // Update historical data
      await this.updateHistoricalPerformance(selectedAgentId, outcome);

      // Update user interaction history
      if (outcome.sessionId) {
        await this.updateUserHistory(outcome.sessionId, selectedAgentId, outcome);
      }

      // Adjust algorithm weights based on outcome
      await this.adjustAlgorithmWeights(recommendation, outcome);

      // Emit learning event
      this.emit('learning:outcome_processed', {
        requestId,
        selectedAgentId,
        success: outcome.success,
        userSatisfaction: outcome.userSatisfaction
      });

      logger.info('Learned from switch outcome', {
        requestId,
        selectedAgentId,
        success: outcome.success,
        userSatisfaction: outcome.userSatisfaction,
        completionTime: outcome.completionTime
      });

    } catch (error) {
      logger.error('Failed to learn from switch outcome', {
        requestId,
        selectedAgentId,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get selection analytics and insights
   */
  getSelectionAnalytics() {
    const totalSelections = this.selectionHistory.length;
    const recentSelections = this.selectionHistory.slice(-100); // Last 100

    const averageConfidence = recentSelections.length > 0
      ? recentSelections.reduce((sum, rec) => sum + rec.confidence, 0) / recentSelections.length
      : 0;

    const agentSelectionCounts = recentSelections.reduce((acc, rec) => {
      const agentId = rec.suggestedAgent.agentId;
      acc[agentId] = (acc[agentId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSelectedAgents = Object.entries(agentSelectionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([agentId, count]) => ({ agentId, count }));

    const algorithmPerformance = Array.from(this.selectionAlgorithms.entries()).map(([name, algorithm]) => ({
      name,
      weight: algorithm.weight,
      description: algorithm.description
    }));

    const performanceSnapshot = Array.from(this.performanceCache.values()).map(perf => ({
      agentId: perf.agentId,
      currentLoad: Math.round(perf.currentLoad * 100) / 100,
      avgResponseTime: Math.round(perf.avgResponseTime),
      successRate: Math.round(perf.successRate * 100) / 100,
      userSatisfactionScore: Math.round(perf.userSatisfactionScore * 100) / 100
    }));

    return {
      totalSelections,
      recentSelections: recentSelections.length,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      topSelectedAgents,
      algorithmPerformance,
      performanceSnapshot,
      historicalDataPoints: this.historicalData.size,
      userHistories: this.userHistories.size,
      cacheSize: this.performanceCache.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Build comprehensive selection context
   */
  private async buildSelectionContext(request: SwitchRequest): Promise<SelectionContext> {
    // Get current performance data
    const currentPerformance = new Map(this.performanceCache);

    // Get historical data
    const historicalData = new Map(this.historicalData);

    // Get user history
    const userHistory = this.userHistories.get(request.metadata.sessionId || '') || {
      sessionId: request.metadata.sessionId || '',
      previousAgents: [],
      preferredAgentTypes: [],
      communicationStyle: CommunicationStyle.CASUAL,
      expertiseLevel: ExperienceLevel.INTERMEDIATE,
      satisfactionHistory: [],
      interactionPatterns: []
    };

    // Get system state
    const systemState = await this.getSystemSnapshot();

    // Find similar switches
    const similarSwitches = await this.findSimilarSwitches(request);

    return {
      currentPerformance,
      historicalData,
      userHistory,
      systemState,
      similarSwitches
    };
  }

  /**
   * Get candidate agents based on criteria
   */
  private async getCandidateAgents(criteria: AgentSelectionCriteria): Promise<Agent[]> {
    let candidates = agentRegistry.getActiveAgents();

    // Filter by required capabilities
    if (criteria.requiredCapabilities.length > 0) {
      candidates = candidates.filter(agent =>
        criteria.requiredCapabilities.every(capability =>
          agent.capabilities.includes(capability as AgentCapability)
        )
      );
    }

    // Filter by preferred agent types
    if (criteria.preferredAgentTypes.length > 0) {
      candidates = candidates.filter(agent =>
        criteria.preferredAgentTypes.includes(agent.type)
      );
    }

    // Exclude specific agents
    if (criteria.excludedAgentIds.length > 0) {
      candidates = candidates.filter(agent =>
        !criteria.excludedAgentIds.includes(agent.id)
      );
    }

    // Filter by performance criteria
    if (criteria.minimumSuccessRate !== undefined) {
      candidates = candidates.filter(agent =>
        agent.performance.successRate >= criteria.minimumSuccessRate!
      );
    }

    if (criteria.maximumResponseTime !== undefined) {
      candidates = candidates.filter(agent =>
        agent.performance.averageResponseTimeMs <= criteria.maximumResponseTime!
      );
    }

    // Apply workload preference
    if (criteria.workloadPreference) {
      candidates = this.filterByWorkloadPreference(candidates, criteria.workloadPreference);
    }

    return candidates;
  }

  /**
   * Evaluate agents using all selection algorithms
   */
  private async evaluateAgents(
    candidates: Agent[],
    request: SwitchRequest,
    context: SelectionContext
  ): Promise<AgentSwitchProfile[]> {
    const evaluatedAgents: AgentSwitchProfile[] = [];

    for (const agent of candidates) {
      let totalScore = 0;
      let totalWeight = 0;
      const reasoning: string[] = [];

      // Apply all algorithms
      for (const [name, algorithm] of this.selectionAlgorithms) {
        try {
          const score = await algorithm.evaluator(agent, request, context);
          totalScore += score * algorithm.weight;
          totalWeight += algorithm.weight;

          if (score > 0.7) {
            reasoning.push(`High ${name} score (${Math.round(score * 100)}%)`);
          }
        } catch (error) {
          logger.warn('Algorithm evaluation failed', {
            algorithmName: name,
            agentId: agent.id,
            error: (error as Error).message
          });
        }
      }

      // Normalize score
      const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

      // Estimate handoff time
      const estimatedHandoffTime = this.estimateHandoffTime(agent, request, context);

      // Calculate confidence level
      const confidenceLevel = this.calculateConfidenceLevel(agent, finalScore, context);

      evaluatedAgents.push({
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.type,
        capabilities: agent.capabilities,
        selectionScore: Math.round(finalScore * 1000) / 1000,
        selectionReasoning: reasoning,
        estimatedHandoffTime,
        confidenceLevel,
        specializations: this.getAgentSpecializations(agent),
        currentLoad: agent.performance.currentLoad,
        avgResponseTime: agent.performance.averageResponseTimeMs,
        successRate: agent.performance.successRate
      });
    }

    // Sort by selection score (descending)
    return evaluatedAgents.sort((a, b) => b.selectionScore - a.selectionScore);
  }

  /**
   * Generate comprehensive recommendation
   */
  private async generateRecommendation(
    suggestedAgent: AgentSwitchProfile,
    alternatives: AgentSwitchProfile[],
    request: SwitchRequest,
    context: SelectionContext
  ): Promise<SwitchRecommendation> {
    // Generate reasoning
    const reasoning = [
      `Agent selected with score ${suggestedAgent.selectionScore}`,
      ...suggestedAgent.selectionReasoning,
      `Estimated handoff time: ${suggestedAgent.estimatedHandoffTime}ms`
    ];

    // Calculate expected benefits
    const expectedBenefits = this.calculateExpectedBenefits(suggestedAgent, request, context);

    // Calculate potential risks
    const potentialRisks = this.calculatePotentialRisks(suggestedAgent, request, context);

    // Estimate impact
    const estimatedImpact = this.estimateImpact(suggestedAgent, request, context);

    return {
      recommendationId: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      confidence: suggestedAgent.confidenceLevel,
      reasoning,
      suggestedAgent,
      expectedBenefits,
      potentialRisks,
      alternativeOptions: alternatives,
      estimatedImpact
    };
  }

  /**
   * Setup default selection algorithms
   */
  private setupDefaultAlgorithms(): void {
    // Performance Algorithm
    this.selectionAlgorithms.set('performance', {
      name: 'performance',
      description: 'Evaluates agent based on historical performance metrics',
      weight: 25,
      evaluator: async (agent: Agent, request: SwitchRequest, context: SelectionContext) => {
        const perf = context.currentPerformance.get(agent.id);
        if (!perf) return 0.5;

        return (perf.successRate * 0.4) + 
               ((1 - perf.currentLoad) * 0.3) + 
               (Math.max(0, 1 - perf.avgResponseTime / 10000) * 0.3);
      }
    });

    // Capability Match Algorithm
    this.selectionAlgorithms.set('capability_match', {
      name: 'capability_match',
      description: 'Evaluates how well agent capabilities match requirements',
      weight: 30,
      evaluator: async (agent: Agent, request: SwitchRequest) => {
        const required = request.targetCriteria.requiredCapabilities;
        const agentCaps = agent.capabilities.map(cap => cap.toString());
        const matchCount = required.filter(cap => agentCaps.includes(cap)).length;
        return matchCount / Math.max(required.length, 1);
      }
    });

    // User Preference Algorithm
    this.selectionAlgorithms.set('user_preference', {
      name: 'user_preference',
      description: 'Considers user interaction history and preferences',
      weight: 20,
      evaluator: async (agent: Agent, request: SwitchRequest, context: SelectionContext) => {
        const userHistory = context.userHistory;
        let score = 0.5; // Base score

        // Prefer agents user has had good experiences with
        const previousSatisfaction = userHistory.satisfactionHistory
          .filter(sat => sat.agentId === agent.id)
          .map(sat => sat.score);

        if (previousSatisfaction.length > 0) {
          score = previousSatisfaction.reduce((sum, s) => sum + s, 0) / previousSatisfaction.length;
        }

        // Prefer agent types user has shown preference for
        if (userHistory.preferredAgentTypes.includes(agent.type)) {
          score += 0.2;
        }

        return Math.min(1, score);
      }
    });

    // Load Balancing Algorithm
    this.selectionAlgorithms.set('load_balancing', {
      name: 'load_balancing',
      description: 'Promotes even distribution of work across agents',
      weight: 15,
      evaluator: async (agent: Agent, request: SwitchRequest, context: SelectionContext) => {
        const perf = context.currentPerformance.get(agent.id);
        if (!perf) return 0.5;

        // Prefer agents with lower current load
        return Math.max(0, 1 - perf.currentLoad);
      }
    });

    // Context Similarity Algorithm
    this.selectionAlgorithms.set('context_similarity', {
      name: 'context_similarity',
      description: 'Evaluates agent suitability based on similar past switches',
      weight: 10,
      evaluator: async (agent: Agent, request: SwitchRequest, context: SelectionContext) => {
        const similarSwitches = context.similarSwitches.filter(sw => sw.toAgentId === agent.id);
        
        if (similarSwitches.length === 0) return 0.5;

        const avgSatisfaction = similarSwitches.reduce((sum, sw) => sum + sw.userSatisfaction, 0) / similarSwitches.length;
        const successRate = similarSwitches.filter(sw => sw.success).length / similarSwitches.length;

        return (avgSatisfaction * 0.6) + (successRate * 0.4);
      }
    });
  }

  /**
   * Filter agents by workload preference
   */
  private filterByWorkloadPreference(agents: Agent[], preference: WorkloadPreference): Agent[] {
    switch (preference) {
      case WorkloadPreference.LOW_LOAD:
        return agents.filter(agent => agent.performance.currentLoad < 0.3);
      case WorkloadPreference.HIGH_CAPACITY:
        return agents.filter(agent => agent.configuration.maxConcurrentTasks > 5);
      case WorkloadPreference.OPTIMAL_PERFORMANCE:
        return agents.filter(agent => agent.performance.successRate > 0.8);
      case WorkloadPreference.BALANCED:
      default:
        return agents;
    }
  }

  /**
   * Estimate handoff time
   */
  private estimateHandoffTime(agent: Agent, request: SwitchRequest, context: SelectionContext): number {
    let baseTime = agent.performance.averageResponseTimeMs || 3000;

    // Adjust for current load
    const load = context.currentPerformance.get(agent.id)?.currentLoad || 0;
    baseTime *= (1 + load);

    // Adjust for context preservation complexity
    if (request.contextPreservation.preserveFullContext) {
      baseTime *= 1.3;
    }

    // Adjust for urgency
    switch (request.urgency) {
      case 'critical':
        baseTime *= 0.8; // Prioritized
        break;
      case 'low':
        baseTime *= 1.2; // Can wait
        break;
    }

    return Math.round(baseTime);
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidenceLevel(agent: Agent, score: number, context: SelectionContext): number {
    let confidence = score; // Base on selection score

    // Boost confidence for agents with historical data
    const historical = context.historicalData.get(agent.id);
    if (historical && historical.totalSwitches > 10) {
      confidence += 0.1;
    }

    // Reduce confidence for overloaded agents
    const perf = context.currentPerformance.get(agent.id);
    if (perf && perf.currentLoad > 0.8) {
      confidence -= 0.2;
    }

    // Boost confidence for high-performing agents
    if (agent.performance.successRate > 0.9) {
      confidence += 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Get agent specializations
   */
  private getAgentSpecializations(agent: Agent): string[] {
    // This would analyze the agent's capabilities and performance to identify specializations
    const specializations: string[] = [];

    if (agent.capabilities.includes(AgentCapability.TECHNICAL_ANALYSIS)) {
      specializations.push('Technical Analysis');
    }
    if (agent.capabilities.includes(AgentCapability.RISK_ASSESSMENT)) {
      specializations.push('Risk Management');
    }
    if (agent.capabilities.includes(AgentCapability.EDUCATION)) {
      specializations.push('Education & Training');
    }

    return specializations;
  }

  /**
   * Calculate expected benefits
   */
  private calculateExpectedBenefits(
    agent: AgentSwitchProfile,
    request: SwitchRequest,
    context: SelectionContext
  ): ExpectedBenefit[] {
    const benefits: ExpectedBenefit[] = [];

    // Performance improvement
    if (agent.successRate > 0.9) {
      benefits.push({
        type: BenefitType.IMPROVED_PERFORMANCE,
        description: `High success rate of ${Math.round(agent.successRate * 100)}%`,
        quantifiedValue: agent.successRate,
        probability: 0.8
      });
    }

    // Faster response
    if (agent.avgResponseTime < 3000) {
      benefits.push({
        type: BenefitType.FASTER_RESPONSE,
        description: `Fast average response time of ${agent.avgResponseTime}ms`,
        quantifiedValue: agent.avgResponseTime,
        probability: 0.9
      });
    }

    // Load optimization
    if (agent.currentLoad < 0.5) {
      benefits.push({
        type: BenefitType.LOAD_OPTIMIZATION,
        description: `Low current load of ${Math.round(agent.currentLoad * 100)}%`,
        quantifiedValue: agent.currentLoad,
        probability: 0.7
      });
    }

    return benefits;
  }

  /**
   * Calculate potential risks
   */
  private calculatePotentialRisks(
    agent: AgentSwitchProfile,
    request: SwitchRequest,
    context: SelectionContext
  ): PotentialRisk[] {
    const risks: PotentialRisk[] = [];

    // High load risk
    if (agent.currentLoad > 0.8) {
      risks.push({
        type: RiskType.INCREASED_LATENCY,
        description: 'Agent has high current load which may increase response time',
        severity: RiskSeverity.MEDIUM,
        probability: 0.6,
        mitigation: 'Monitor performance and consider load balancing'
      });
    }

    // Context loss risk
    if (!request.contextPreservation.preserveFullContext) {
      risks.push({
        type: RiskType.CONTEXT_LOSS,
        description: 'Limited context preservation may affect conversation continuity',
        severity: RiskSeverity.LOW,
        probability: 0.3,
        mitigation: 'Ensure key information is summarized in handoff'
      });
    }

    // User confusion risk for frequent switches
    const userHistory = context.userHistory;
    if (userHistory.previousAgents.length > 3) {
      risks.push({
        type: RiskType.USER_CONFUSION,
        description: 'Multiple agent switches in session may confuse user',
        severity: RiskSeverity.MEDIUM,
        probability: 0.4,
        mitigation: 'Provide clear explanation of switch reason'
      });
    }

    return risks;
  }

  /**
   * Estimate impact of agent switch
   */
  private estimateImpact(
    agent: AgentSwitchProfile,
    request: SwitchRequest,
    context: SelectionContext
  ): EstimatedImpact {
    // Calculate estimated changes
    const currentPerf = context.currentPerformance.get(request.currentAgentId);
    const newPerf = context.currentPerformance.get(agent.agentId);

    const performanceChange = newPerf && currentPerf 
      ? newPerf.successRate - currentPerf.successRate
      : 0;

    const userSatisfactionChange = context.userHistory.satisfactionHistory
      .filter(sat => sat.agentId === agent.agentId)
      .map(sat => sat.score)
      .reduce((sum, score) => sum + score, 0.5) / Math.max(context.userHistory.satisfactionHistory.length, 1) - 0.5;

    return {
      userSatisfactionChange: Math.round(userSatisfactionChange * 100) / 100,
      performanceChange: Math.round(performanceChange * 100) / 100,
      costChange: 0, // Would calculate based on resource usage
      timeToCompletion: agent.estimatedHandoffTime,
      confidenceInterval: [
        Math.max(0, agent.confidenceLevel - 0.2),
        Math.min(1, agent.confidenceLevel + 0.2)
      ]
    };
  }

  /**
   * Get system snapshot
   */
  private async getSystemSnapshot(): Promise<SystemSnapshot> {
    const loadStats = loadBalancer.getLoadBalancingStats();
    const registryStats = agentRegistry.getRegistryStats();

    return {
      totalLoad: loadStats.averageLoad,
      availableAgents: registryStats.statsByStatus.active || 0,
      queueLength: 0, // Would get from task distribution
      systemHealth: 0.8, // Mock value
      resourcePressure: loadStats.averageLoad,
      activeUsers: 100 // Mock value
    };
  }

  /**
   * Find similar switches in history
   */
  private async findSimilarSwitches(request: SwitchRequest): Promise<SimilarSwitch[]> {
    // Mock implementation - would search historical data
    return [
      {
        fromAgentId: request.currentAgentId,
        toAgentId: 'agent-002',
        reason: request.reason,
        success: true,
        userSatisfaction: 0.8,
        similarity: 0.9,
        timestamp: new Date(Date.now() - 86400000) // 1 day ago
      }
    ];
  }

  /**
   * Update performance cache
   */
  private async updatePerformanceCache(): Promise<void> {
    const agents = agentRegistry.getAllAgents();
    
    for (const agent of agents) {
      this.performanceCache.set(agent.id, {
        agentId: agent.id,
        currentLoad: agent.performance.currentLoad,
        avgResponseTime: agent.performance.averageResponseTimeMs,
        successRate: agent.performance.successRate,
        userSatisfactionScore: 0.75, // Mock value
        errorRate: 1 - agent.performance.successRate,
        uptime: 0.99, // Mock value
        lastUpdated: new Date()
      });
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(async () => {
      await this.updatePerformanceCache();
    }, 30000); // Every 30 seconds
  }

  /**
   * Update historical performance data
   */
  private async updateHistoricalPerformance(agentId: string, outcome: SwitchOutcome): Promise<void> {
    let historical = this.historicalData.get(agentId);
    
    if (!historical) {
      historical = {
        agentId,
        totalSwitches: 0,
        successfulSwitches: 0,
        averageSwitchTime: 0,
        userSatisfactionAfterSwitch: 0,
        commonSwitchReasons: [],
        performanceTrends: []
      };
    }

    historical.totalSwitches++;
    if (outcome.success) {
      historical.successfulSwitches++;
    }

    // Update averages
    historical.averageSwitchTime = (historical.averageSwitchTime * (historical.totalSwitches - 1) + outcome.completionTime) / historical.totalSwitches;
    historical.userSatisfactionAfterSwitch = (historical.userSatisfactionAfterSwitch * (historical.totalSwitches - 1) + outcome.userSatisfaction) / historical.totalSwitches;

    this.historicalData.set(agentId, historical);
  }

  /**
   * Update user interaction history
   */
  private async updateUserHistory(sessionId: string, agentId: string, outcome: SwitchOutcome): Promise<void> {
    let userHistory = this.userHistories.get(sessionId);
    
    if (!userHistory) {
      userHistory = {
        sessionId,
        previousAgents: [],
        preferredAgentTypes: [],
        communicationStyle: CommunicationStyle.CASUAL,
        expertiseLevel: ExperienceLevel.INTERMEDIATE,
        satisfactionHistory: [],
        interactionPatterns: []
      };
    }

    if (!userHistory.previousAgents.includes(agentId)) {
      userHistory.previousAgents.push(agentId);
    }

    userHistory.satisfactionHistory.push({
      agentId,
      score: outcome.userSatisfaction,
      timestamp: new Date(),
      context: outcome.switchReason || 'unknown'
    });

    this.userHistories.set(sessionId, userHistory);
  }

  /**
   * Adjust algorithm weights based on outcomes
   */
  private async adjustAlgorithmWeights(recommendation: SwitchRecommendation, outcome: SwitchOutcome): Promise<void> {
    // Simple learning: increase weights of algorithms that led to successful outcomes
    const adjustment = outcome.success ? 1.02 : 0.98; // 2% adjustment

    for (const [name, algorithm] of this.selectionAlgorithms) {
      // This is a simplified approach - in production would be more sophisticated
      algorithm.weight *= adjustment;
      algorithm.weight = Math.max(0.1, Math.min(50, algorithm.weight)); // Clamp weights
    }
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Smart Agent Selection Service...');

    // Clear all data
    this.selectionAlgorithms.clear();
    this.performanceCache.clear();
    this.historicalData.clear();
    this.userHistories.clear();
    this.selectionHistory.length = 0;

    logger.info('Smart Agent Selection Service shutdown complete');
  }
}

interface SwitchOutcome {
  success: boolean;
  userSatisfaction: number;
  completionTime: number;
  switchReason?: string;
  sessionId?: string;
}

export const smartAgentSelection = new SmartAgentSelectionService();