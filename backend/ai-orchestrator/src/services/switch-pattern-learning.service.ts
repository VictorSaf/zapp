import { EventEmitter } from 'events';
import {
  SwitchPattern,
  PatternType,
  PatternCondition,
  PatternOutcome,
  ConditionOperator,
  SwitchResult,
  SwitchRequest,
  SwitchReason,
  SwitchAnalytics,
  SatisfactionTrend,
  PatternInsight,
  AnalyticsMetrics
} from '@/types/switching.types';
import logger from '@/config/logger';
import { metricsService } from './metrics.service';

export interface LearningConfiguration {
  enablePatternDetection: boolean;
  minimumOccurrences: number;
  confidenceThreshold: number;
  patternRetentionDays: number;
  enablePredictiveAnalysis: boolean;
  enableAutoOptimization: boolean;
  learningRate: number;
  maxPatternsPerType: number;
}

export interface PatternDetectionResult {
  patternsDetected: number;
  newPatterns: SwitchPattern[];
  updatedPatterns: SwitchPattern[];
  obsoletePatterns: string[];
  confidenceImprovement: number;
}

export interface PredictionResult {
  suggestedAgent: string;
  confidence: number;
  reasoning: string[];
  basedOnPatterns: string[];
  expectedOutcome: PatternOutcome;
  riskFactors: string[];
}

export interface LearningInsight {
  type: 'optimization' | 'warning' | 'recommendation' | 'trend';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionable: boolean;
  suggestedActions: string[];
  confidence: number;
  supportingData: Record<string, any>;
  discoveredAt: Date;
}

export interface PatternEvolution {
  patternId: string;
  evolutionSteps: PatternEvolutionStep[];
  currentConfidence: number;
  trend: 'improving' | 'stable' | 'degrading';
  lastEvolution: Date;
}

export interface PatternEvolutionStep {
  timestamp: Date;
  confidence: number;
  frequency: number;
  successRate: number;
  changes: string[];
  triggerEvent: string;
}

export class SwitchPatternLearningService extends EventEmitter {
  private detectedPatterns: Map<string, SwitchPattern> = new Map();
  private patternEvolutions: Map<string, PatternEvolution> = new Map();
  private switchHistory: SwitchResult[] = [];
  private learningInsights: LearningInsight[] = [];
  private readonly maxHistorySize = 10000;
  private readonly maxInsightsSize = 1000;

  private config: LearningConfiguration = {
    enablePatternDetection: true,
    minimumOccurrences: 5,
    confidenceThreshold: 0.7,
    patternRetentionDays: 30,
    enablePredictiveAnalysis: true,
    enableAutoOptimization: true,
    learningRate: 0.1,
    maxPatternsPerType: 50
  };

  constructor() {
    super();
    this.setupLearningScheduler();
    this.setupEventHandlers();
  }

  /**
   * Learn from switch outcome
   */
  async learnFromSwitchResult(result: SwitchResult, request: SwitchRequest): Promise<void> {
    try {
      // Store switch result in history
      this.switchHistory.push(result);
      if (this.switchHistory.length > this.maxHistorySize) {
        this.switchHistory.shift();
      }

      // Update existing patterns
      await this.updateExistingPatterns(result, request);

      // Detect new patterns
      await this.detectNewPatterns();

      // Generate insights
      await this.generateLearningInsights(result, request);

      // Emit learning event
      this.emit('pattern:learned', {
        resultId: result.id,
        requestId: request.id,
        success: result.success,
        patternsUpdated: await this.countRecentPatternUpdates()
      });

      logger.debug('Learned from switch result', {
        resultId: result.id,
        success: result.success,
        totalPatterns: this.detectedPatterns.size,
        historySize: this.switchHistory.length
      });

    } catch (error) {
      logger.error('Failed to learn from switch result', {
        resultId: result.id,
        error: (error as Error).message
      });
    }
  }

  /**
   * Predict optimal agent for switch request
   */
  async predictOptimalAgent(request: SwitchRequest): Promise<PredictionResult | null> {
    if (!this.config.enablePredictiveAnalysis) {
      return null;
    }

    try {
      // Find matching patterns
      const matchingPatterns = this.findMatchingPatterns(request);
      
      if (matchingPatterns.length === 0) {
        logger.debug('No matching patterns found for prediction', {
          requestId: request.id,
          reason: request.reason
        });
        return null;
      }

      // Calculate weighted prediction
      const prediction = this.calculateWeightedPrediction(matchingPatterns);

      // Generate reasoning
      const reasoning = this.generatePredictionReasoning(matchingPatterns, prediction);

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(matchingPatterns, request);

      const result: PredictionResult = {
        suggestedAgent: prediction.targetAgentType,
        confidence: prediction.successProbability,
        reasoning,
        basedOnPatterns: matchingPatterns.map(p => p.id),
        expectedOutcome: prediction,
        riskFactors
      };

      logger.info('Generated switch prediction', {
        requestId: request.id,
        suggestedAgent: result.suggestedAgent,
        confidence: Math.round(result.confidence * 100),
        basedOnPatterns: result.basedOnPatterns.length
      });

      return result;

    } catch (error) {
      logger.error('Failed to predict optimal agent', {
        requestId: request.id,
        error: (error as Error).message
      });
      return null;
    }
  }

  /**
   * Get pattern analytics
   */
  getPatternAnalytics(): SwitchAnalytics {
    const totalSwitches = this.switchHistory.length;
    const successfulSwitches = this.switchHistory.filter(r => r.success).length;
    const failedSwitches = totalSwitches - successfulSwitches;

    const averageSwitchTime = totalSwitches > 0
      ? this.switchHistory.reduce((sum, r) => sum + r.duration, 0) / totalSwitches
      : 0;

    // Count switches by reason
    const mostCommonReasons = this.switchHistory.reduce((acc, result) => {
      // Get reason from result metadata or default
      const reason = (result as any).reason || SwitchReason.USER_REQUEST;
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<SwitchReason, number>);

    // Build agent switch matrix
    const agentSwitchMatrix = this.buildAgentSwitchMatrix();

    // Calculate satisfaction trends
    const satisfactionTrends = this.calculateSatisfactionTrends();

    // Generate pattern insights
    const patternInsights = this.generatePatternInsights();

    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics();

    return {
      totalSwitches,
      successfulSwitches,
      failedSwitches,
      averageSwitchTime: Math.round(averageSwitchTime),
      mostCommonReasons,
      agentSwitchMatrix,
      userSatisfactionTrends: satisfactionTrends,
      patternInsights,
      performanceMetrics
    };
  }

  /**
   * Get detected patterns by type
   */
  getPatternsByType(type: PatternType): SwitchPattern[] {
    return Array.from(this.detectedPatterns.values())
      .filter(pattern => pattern.pattern === type)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get learning insights
   */
  getLearningInsights(): LearningInsight[] {
    return this.learningInsights
      .sort((a, b) => {
        // Sort by priority, then by confidence
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        return priorityDiff !== 0 ? priorityDiff : b.confidence - a.confidence;
      })
      .slice(0, 20); // Return top 20 insights
  }

  /**
   * Optimize patterns based on learning
   */
  async optimizePatterns(): Promise<PatternDetectionResult> {
    if (!this.config.enableAutoOptimization) {
      logger.info('Pattern optimization disabled');
      return {
        patternsDetected: 0,
        newPatterns: [],
        updatedPatterns: [],
        obsoletePatterns: [],
        confidenceImprovement: 0
      };
    }

    try {
      const startTime = Date.now();
      let confidenceImprovement = 0;
      const newPatterns: SwitchPattern[] = [];
      const updatedPatterns: SwitchPattern[] = [];
      const obsoletePatterns: string[] = [];

      // Remove obsolete patterns
      const cutoffDate = new Date(Date.now() - (this.config.patternRetentionDays * 24 * 60 * 60 * 1000));
      
      for (const [patternId, pattern] of this.detectedPatterns) {
        if (pattern.lastObserved < cutoffDate || pattern.confidence < this.config.confidenceThreshold) {
          this.detectedPatterns.delete(patternId);
          obsoletePatterns.push(patternId);
        }
      }

      // Detect new patterns
      const detectionResult = await this.detectNewPatterns();
      newPatterns.push(...detectionResult.newPatterns);

      // Update existing patterns with new data
      for (const pattern of this.detectedPatterns.values()) {
        const oldConfidence = pattern.confidence;
        await this.updatePatternWithRecentData(pattern);
        
        if (pattern.confidence !== oldConfidence) {
          updatedPatterns.push(pattern);
          confidenceImprovement += pattern.confidence - oldConfidence;
        }
      }

      const result: PatternDetectionResult = {
        patternsDetected: newPatterns.length,
        newPatterns,
        updatedPatterns,
        obsoletePatterns,
        confidenceImprovement: Math.round(confidenceImprovement * 100) / 100
      };

      this.emit('patterns:optimized', {
        newPatterns: newPatterns.length,
        updatedPatterns: updatedPatterns.length,
        removedPatterns: obsoletePatterns.length,
        optimizationTime: Date.now() - startTime
      });

      logger.info('Pattern optimization completed', {
        newPatterns: newPatterns.length,
        updatedPatterns: updatedPatterns.length,
        removedPatterns: obsoletePatterns.length,
        totalPatterns: this.detectedPatterns.size,
        optimizationTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logger.error('Failed to optimize patterns', {
        error: (error as Error).message
      });
      
      return {
        patternsDetected: 0,
        newPatterns: [],
        updatedPatterns: [],
        obsoletePatterns: [],
        confidenceImprovement: 0
      };
    }
  }

  /**
   * Update existing patterns with new data
   */
  private async updateExistingPatterns(result: SwitchResult, request: SwitchRequest): Promise<void> {
    for (const pattern of this.detectedPatterns.values()) {
      if (this.doesSwitchMatchPattern(result, request, pattern)) {
        // Update pattern frequency and confidence
        pattern.frequency++;
        pattern.lastObserved = new Date();
        
        // Update success rate
        const totalOutcomes = pattern.outcomes.reduce((sum, outcome) => sum + (outcome as any).count || 1, 0);
        const successfulOutcomes = result.success ? 1 : 0;
        pattern.successRate = (pattern.successRate * totalOutcomes + successfulOutcomes) / (totalOutcomes + 1);
        
        // Update confidence using exponential smoothing
        const learningRate = this.config.learningRate;
        const outcomeConfidence = result.success ? 1.0 : 0.5;
        pattern.confidence = pattern.confidence * (1 - learningRate) + outcomeConfidence * learningRate;
        
        // Track evolution
        this.trackPatternEvolution(pattern, result, 'pattern_matched');
      }
    }
  }

  /**
   * Detect new patterns in switch history
   */
  private async detectNewPatterns(): Promise<PatternDetectionResult> {
    const newPatterns: SwitchPattern[] = [];
    
    // Group switches by different criteria to find patterns
    const recentSwitches = this.switchHistory.slice(-1000); // Last 1000 switches
    
    // Detect sequential switch patterns
    const sequentialPatterns = await this.detectSequentialPatterns(recentSwitches);
    newPatterns.push(...sequentialPatterns);
    
    // Detect time-based patterns
    const timeBasedPatterns = await this.detectTimeBasedPatterns(recentSwitches);
    newPatterns.push(...timeBasedPatterns);
    
    // Detect load-based patterns
    const loadBasedPatterns = await this.detectLoadBasedPatterns(recentSwitches);
    newPatterns.push(...loadBasedPatterns);
    
    // Store new patterns
    for (const pattern of newPatterns) {
      if (pattern.frequency >= this.config.minimumOccurrences && 
          pattern.confidence >= this.config.confidenceThreshold) {
        this.detectedPatterns.set(pattern.id, pattern);
      }
    }
    
    return {
      patternsDetected: newPatterns.length,
      newPatterns,
      updatedPatterns: [],
      obsoletePatterns: [],
      confidenceImprovement: 0
    };
  }

  /**
   * Detect sequential switch patterns
   */
  private async detectSequentialPatterns(switches: SwitchResult[]): Promise<SwitchPattern[]> {
    const patterns: SwitchPattern[] = [];
    const sequences = new Map<string, { count: number; successes: number; switches: SwitchResult[] }>();
    
    // Look for sequences of 2-3 agent switches
    for (let i = 0; i < switches.length - 1; i++) {
      const current = switches[i];
      const next = switches[i + 1];
      
      if (current.newAgentId && next.newAgentId) {
        const sequenceKey = `${current.newAgentId}->${next.newAgentId}`;
        
        if (!sequences.has(sequenceKey)) {
          sequences.set(sequenceKey, { count: 0, successes: 0, switches: [] });
        }
        
        const sequence = sequences.get(sequenceKey)!;
        sequence.count++;
        sequence.switches.push(current, next);
        if (current.success && next.success) {
          sequence.successes++;
        }
      }
    }
    
    // Create patterns from frequent sequences
    for (const [sequenceKey, data] of sequences) {
      if (data.count >= this.config.minimumOccurrences) {
        const [fromAgent, toAgent] = sequenceKey.split('->');
        
        const pattern: SwitchPattern = {
          id: `seq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          pattern: PatternType.SEQUENTIAL_SWITCH,
          frequency: data.count,
          conditions: [
            {
              field: 'currentAgentId',
              operator: ConditionOperator.EQUALS,
              value: fromAgent,
              weight: 1.0
            }
          ],
          outcomes: [
            {
              targetAgentType: toAgent,
              successProbability: data.successes / data.count,
              averageUserSatisfaction: 0.8, // Mock value
              averageCompletionTime: data.switches.reduce((sum, s) => sum + s.duration, 0) / data.switches.length,
              commonIssues: []
            }
          ],
          confidence: Math.min(0.9, data.successes / data.count),
          learnedAt: new Date(),
          lastObserved: new Date(),
          successRate: data.successes / data.count
        };
        
        patterns.push(pattern);
      }
    }
    
    return patterns;
  }

  /**
   * Detect time-based patterns
   */
  private async detectTimeBasedPatterns(switches: SwitchResult[]): Promise<SwitchPattern[]> {
    const patterns: SwitchPattern[] = [];
    const hourlyStats = new Map<number, { count: number; successes: number; agents: Set<string> }>();
    
    // Analyze switches by hour of day
    for (const switchResult of switches) {
      const hour = switchResult.completedAt.getHours();
      
      if (!hourlyStats.has(hour)) {
        hourlyStats.set(hour, { count: 0, successes: 0, agents: new Set() });
      }
      
      const stats = hourlyStats.get(hour)!;
      stats.count++;
      if (switchResult.success) stats.successes++;
      if (switchResult.newAgentId) stats.agents.add(switchResult.newAgentId);
    }
    
    // Find peak hours with specific agent preferences
    for (const [hour, stats] of hourlyStats) {
      if (stats.count >= this.config.minimumOccurrences && stats.agents.size > 0) {
        const mostCommonAgent = Array.from(stats.agents)[0]; // Simplified
        
        const pattern: SwitchPattern = {
          id: `time-${hour}-${Date.now()}`,
          pattern: PatternType.TIME_BASED_PATTERN,
          frequency: stats.count,
          conditions: [
            {
              field: 'time.hour',
              operator: ConditionOperator.IN_RANGE,
              value: [hour, hour + 1],
              weight: 0.8
            }
          ],
          outcomes: [
            {
              targetAgentType: mostCommonAgent,
              successProbability: stats.successes / stats.count,
              averageUserSatisfaction: 0.75,
              averageCompletionTime: 5000, // Mock value
              commonIssues: []
            }
          ],
          confidence: Math.min(0.8, stats.successes / stats.count),
          learnedAt: new Date(),
          lastObserved: new Date(),
          successRate: stats.successes / stats.count
        };
        
        patterns.push(pattern);
      }
    }
    
    return patterns;
  }

  /**
   * Detect load-based patterns
   */
  private async detectLoadBasedPatterns(switches: SwitchResult[]): Promise<SwitchPattern[]> {
    // Implementation would analyze switches based on system load
    // For now, return empty array
    return [];
  }

  /**
   * Find patterns matching a switch request
   */
  private findMatchingPatterns(request: SwitchRequest): SwitchPattern[] {
    const matchingPatterns: SwitchPattern[] = [];
    
    for (const pattern of this.detectedPatterns.values()) {
      let matchScore = 0;
      let totalWeight = 0;
      
      for (const condition of pattern.conditions) {
        totalWeight += condition.weight;
        
        if (this.evaluateCondition(condition, request)) {
          matchScore += condition.weight;
        }
      }
      
      const matchPercentage = totalWeight > 0 ? matchScore / totalWeight : 0;
      
      if (matchPercentage >= 0.6) { // 60% match threshold
        matchingPatterns.push(pattern);
      }
    }
    
    return matchingPatterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate weighted prediction from patterns
   */
  private calculateWeightedPrediction(patterns: SwitchPattern[]): PatternOutcome {
    let totalWeight = 0;
    let weightedSuccessProbability = 0;
    let weightedSatisfaction = 0;
    let weightedCompletionTime = 0;
    const targetAgents = new Map<string, number>();
    
    for (const pattern of patterns) {
      const weight = pattern.confidence * pattern.frequency;
      totalWeight += weight;
      
      for (const outcome of pattern.outcomes) {
        weightedSuccessProbability += outcome.successProbability * weight;
        weightedSatisfaction += outcome.averageUserSatisfaction * weight;
        weightedCompletionTime += outcome.averageCompletionTime * weight;
        
        const currentWeight = targetAgents.get(outcome.targetAgentType) || 0;
        targetAgents.set(outcome.targetAgentType, currentWeight + weight);
      }
    }
    
    // Find most weighted target agent
    let bestAgent = '';
    let maxWeight = 0;
    for (const [agent, weight] of targetAgents) {
      if (weight > maxWeight) {
        maxWeight = weight;
        bestAgent = agent;
      }
    }
    
    return {
      targetAgentType: bestAgent,
      successProbability: totalWeight > 0 ? weightedSuccessProbability / totalWeight : 0.5,
      averageUserSatisfaction: totalWeight > 0 ? weightedSatisfaction / totalWeight : 0.5,
      averageCompletionTime: totalWeight > 0 ? weightedCompletionTime / totalWeight : 5000,
      commonIssues: []
    };
  }

  /**
   * Generate prediction reasoning
   */
  private generatePredictionReasoning(patterns: SwitchPattern[], prediction: PatternOutcome): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`Based on ${patterns.length} matching patterns`);
    reasoning.push(`Predicted success probability: ${Math.round(prediction.successProbability * 100)}%`);
    
    const topPattern = patterns[0];
    if (topPattern) {
      reasoning.push(`Primary pattern: ${topPattern.pattern} (confidence: ${Math.round(topPattern.confidence * 100)}%)`);
      reasoning.push(`Pattern frequency: ${topPattern.frequency} occurrences`);
    }
    
    if (prediction.averageCompletionTime < 3000) {
      reasoning.push('Fast completion time expected');
    }
    
    return reasoning;
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(patterns: SwitchPattern[], request: SwitchRequest): string[] {
    const riskFactors: string[] = [];
    
    // Check for low confidence patterns
    const lowConfidencePatterns = patterns.filter(p => p.confidence < 0.7);
    if (lowConfidencePatterns.length > 0) {
      riskFactors.push(`${lowConfidencePatterns.length} patterns have low confidence`);
    }
    
    // Check for urgent requests
    if (request.urgency === 'critical' || request.urgency === 'high') {
      riskFactors.push('High urgency may affect pattern reliability');
    }
    
    // Check for pattern age
    const oldPatterns = patterns.filter(p => 
      Date.now() - p.lastObserved.getTime() > 7 * 24 * 60 * 60 * 1000 // 7 days
    );
    if (oldPatterns.length > 0) {
      riskFactors.push('Some patterns are based on old data');
    }
    
    return riskFactors;
  }

  /**
   * Generate learning insights
   */
  private async generateLearningInsights(result: SwitchResult, request: SwitchRequest): Promise<void> {
    // Success rate insight
    const recentResults = this.switchHistory.slice(-100);
    const successRate = recentResults.filter(r => r.success).length / recentResults.length;
    
    if (successRate < 0.8) {
      this.addLearningInsight({
        type: 'warning',
        priority: 'high',
        title: 'Declining Success Rate',
        description: `Recent switch success rate is ${Math.round(successRate * 100)}%, below the 80% threshold`,
        actionable: true,
        suggestedActions: [
          'Review agent selection criteria',
          'Improve context preservation',
          'Analyze failed switch patterns'
        ],
        confidence: 0.9,
        supportingData: { successRate, sampleSize: recentResults.length },
        discoveredAt: new Date()
      });
    }
    
    // Performance insight
    const avgDuration = recentResults.reduce((sum, r) => sum + r.duration, 0) / recentResults.length;
    if (avgDuration > 10000) { // 10 seconds
      this.addLearningInsight({
        type: 'optimization',
        priority: 'medium',
        title: 'Slow Switch Performance',
        description: `Average switch duration is ${Math.round(avgDuration)}ms, consider optimization`,
        actionable: true,
        suggestedActions: [
          'Optimize context transfer',
          'Pre-warm target agents',
          'Implement parallel processing'
        ],
        confidence: 0.8,
        supportingData: { avgDuration, threshold: 10000 },
        discoveredAt: new Date()
      });
    }
  }

  /**
   * Add learning insight
   */
  private addLearningInsight(insight: LearningInsight): void {
    this.learningInsights.push(insight);
    
    if (this.learningInsights.length > this.maxInsightsSize) {
      this.learningInsights.shift();
    }
    
    this.emit('insight:generated', insight);
  }

  /**
   * Check if switch matches pattern
   */
  private doesSwitchMatchPattern(result: SwitchResult, request: SwitchRequest, pattern: SwitchPattern): boolean {
    let matchScore = 0;
    let totalWeight = 0;
    
    for (const condition of pattern.conditions) {
      totalWeight += condition.weight;
      if (this.evaluateCondition(condition, request)) {
        matchScore += condition.weight;
      }
    }
    
    return totalWeight > 0 && (matchScore / totalWeight) >= 0.8;
  }

  /**
   * Evaluate pattern condition
   */
  private evaluateCondition(condition: PatternCondition, request: SwitchRequest): boolean {
    const value = this.getFieldValue(condition.field, request);
    
    switch (condition.operator) {
      case ConditionOperator.EQUALS:
        return value === condition.value;
      case ConditionOperator.NOT_EQUALS:
        return value !== condition.value;
      case ConditionOperator.GREATER_THAN:
        return typeof value === 'number' && value > condition.value;
      case ConditionOperator.LESS_THAN:
        return typeof value === 'number' && value < condition.value;
      case ConditionOperator.CONTAINS:
        return typeof value === 'string' && value.includes(condition.value);
      case ConditionOperator.IN_RANGE:
        if (Array.isArray(condition.value) && typeof value === 'number') {
          return value >= condition.value[0] && value <= condition.value[1];
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * Get field value from request
   */
  private getFieldValue(field: string, request: SwitchRequest): any {
    const parts = field.split('.');
    let value: any = request;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Track pattern evolution
   */
  private trackPatternEvolution(pattern: SwitchPattern, result: SwitchResult, triggerEvent: string): void {
    let evolution = this.patternEvolutions.get(pattern.id);
    
    if (!evolution) {
      evolution = {
        patternId: pattern.id,
        evolutionSteps: [],
        currentConfidence: pattern.confidence,
        trend: 'stable',
        lastEvolution: new Date()
      };
      this.patternEvolutions.set(pattern.id, evolution);
    }
    
    // Add evolution step
    evolution.evolutionSteps.push({
      timestamp: new Date(),
      confidence: pattern.confidence,
      frequency: pattern.frequency,
      successRate: pattern.successRate,
      changes: [`Updated from ${triggerEvent}`],
      triggerEvent
    });
    
    // Determine trend
    if (evolution.evolutionSteps.length >= 3) {
      const recent = evolution.evolutionSteps.slice(-3);
      const confidenceTrend = recent[2].confidence - recent[0].confidence;
      
      if (confidenceTrend > 0.1) {
        evolution.trend = 'improving';
      } else if (confidenceTrend < -0.1) {
        evolution.trend = 'degrading';
      } else {
        evolution.trend = 'stable';
      }
    }
    
    evolution.currentConfidence = pattern.confidence;
    evolution.lastEvolution = new Date();
  }

  /**
   * Build agent switch matrix
   */
  private buildAgentSwitchMatrix(): Record<string, Record<string, number>> {
    const matrix: Record<string, Record<string, number>> = {};
    
    for (const result of this.switchHistory) {
      const fromAgent = (result as any).fromAgentId || 'unknown';
      const toAgent = result.newAgentId || 'unknown';
      
      if (!matrix[fromAgent]) {
        matrix[fromAgent] = {};
      }
      
      matrix[fromAgent][toAgent] = (matrix[fromAgent][toAgent] || 0) + 1;
    }
    
    return matrix;
  }

  /**
   * Calculate satisfaction trends
   */
  private calculateSatisfactionTrends(): SatisfactionTrend[] {
    // Mock implementation - would calculate actual trends from user satisfaction data
    return [
      {
        period: 'last_24h',
        averageScore: 0.85,
        sampleSize: 50,
        trend: 'increasing'
      },
      {
        period: 'last_7d',
        averageScore: 0.78,
        sampleSize: 200,
        trend: 'stable'
      }
    ];
  }

  /**
   * Generate pattern insights
   */
  private generatePatternInsights(): PatternInsight[] {
    const insights: PatternInsight[] = [];
    
    // Most successful pattern
    const patterns = Array.from(this.detectedPatterns.values());
    if (patterns.length > 0) {
      const bestPattern = patterns.sort((a, b) => b.successRate - a.successRate)[0];
      
      insights.push({
        insight: `Sequential switch pattern shows highest success rate (${Math.round(bestPattern.successRate * 100)}%)`,
        supportingData: {
          patternType: bestPattern.pattern,
          successRate: bestPattern.successRate,
          frequency: bestPattern.frequency
        },
        actionRecommendation: 'Prioritize this pattern in agent selection algorithm',
        priority: 0.9
      });
    }
    
    return insights;
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(): AnalyticsMetrics {
    const totalSwitches = this.switchHistory.length;
    const successfulSwitches = this.switchHistory.filter(r => r.success).length;
    
    return {
      switchSuccessRate: totalSwitches > 0 ? successfulSwitches / totalSwitches : 0,
      averageHandoffTime: totalSwitches > 0 
        ? this.switchHistory.reduce((sum, r) => sum + r.duration, 0) / totalSwitches 
        : 0,
      contextPreservationRate: 0.95, // Mock value
      userRetentionAfterSwitch: 0.88, // Mock value
      agentUtilizationBalance: 0.75, // Mock value
      costEfficiencyScore: 0.82 // Mock value
    };
  }

  /**
   * Update pattern with recent data
   */
  private async updatePatternWithRecentData(pattern: SwitchPattern): Promise<void> {
    // Find recent switches matching this pattern
    const recentSwitches = this.switchHistory.slice(-100);
    const matchingSwitches = recentSwitches.filter(result => {
      // Simple matching logic - in production would be more sophisticated
      return result.success; // Mock condition
    });
    
    if (matchingSwitches.length > 0) {
      const recentSuccessRate = matchingSwitches.filter(s => s.success).length / matchingSwitches.length;
      
      // Update confidence using exponential smoothing
      const alpha = 0.1; // Learning rate
      pattern.confidence = pattern.confidence * (1 - alpha) + recentSuccessRate * alpha;
      pattern.lastObserved = new Date();
    }
  }

  /**
   * Count recent pattern updates
   */
  private async countRecentPatternUpdates(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return Array.from(this.detectedPatterns.values())
      .filter(pattern => pattern.lastObserved > oneHourAgo)
      .length;
  }

  /**
   * Setup learning scheduler
   */
  private setupLearningScheduler(): void {
    // Run pattern optimization every hour
    setInterval(async () => {
      if (this.config.enableAutoOptimization) {
        await this.optimizePatterns();
      }
    }, 60 * 60 * 1000);
    
    // Clean old insights every day
    setInterval(() => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      this.learningInsights = this.learningInsights.filter(
        insight => insight.discoveredAt > oneWeekAgo
      );
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('pattern:learned', (event) => {
      logger.debug('Pattern learning event', event);
    });
    
    this.on('patterns:optimized', (event) => {
      logger.info('Patterns optimized event', event);
    });
    
    this.on('insight:generated', (insight) => {
      logger.info('New learning insight generated', {
        type: insight.type,
        priority: insight.priority,
        title: insight.title
      });
    });
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Switch Pattern Learning Service...');
    
    // Clear all data
    this.detectedPatterns.clear();
    this.patternEvolutions.clear();
    this.switchHistory.length = 0;
    this.learningInsights.length = 0;
    
    logger.info('Switch Pattern Learning Service shutdown complete');
  }
}

export const switchPatternLearning = new SwitchPatternLearningService();