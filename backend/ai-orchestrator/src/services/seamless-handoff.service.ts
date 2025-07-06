import { EventEmitter } from 'events';
import {
  SwitchRequest,
  SwitchResult,
  SwitchPerformanceMetrics,
  SwitchError,
  HandoffSummary,
  AgentSwitchProfile,
  SwitchUrgency
} from '@/types/switching.types';
import { Agent, AgentStatus } from '@/types/agent.types';
import logger from '@/config/logger';
import { contextPreservation } from './context-preservation.service';
import { smartAgentSelection } from './smart-agent-selection.service';
import { agentRegistry } from './agent-registry.service';
import { taskDistribution } from './task-distribution.service';
import { metricsService } from './metrics.service';

export interface HandoffPhase {
  name: string;
  description: string;
  estimatedDuration: number;
  critical: boolean;
  rollbackPossible: boolean;
}

export interface HandoffProgress {
  switchRequestId: string;
  currentPhase: string;
  totalPhases: number;
  completedPhases: number;
  startTime: Date;
  estimatedCompletion?: Date;
  errors: SwitchError[];
  warnings: string[];
}

export interface HandoffState {
  requestId: string;
  status: HandoffStatus;
  currentAgentId: string;
  targetAgentId: string;
  preservedContextId?: string;
  progress: HandoffProgress;
  rollbackInfo?: RollbackInfo;
  metrics: Partial<SwitchPerformanceMetrics>;
}

export enum HandoffStatus {
  INITIATED = 'initiated',
  CONTEXT_PRESERVING = 'context_preserving',
  AGENT_SELECTING = 'agent_selecting',
  AGENT_PREPARING = 'agent_preparing',
  CONTEXT_TRANSFERRING = 'context_transferring',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLING_BACK = 'rolling_back',
  ROLLED_BACK = 'rolled_back'
}

export interface RollbackInfo {
  reason: string;
  rollbackPoint: string;
  preservedState: any;
  canRetry: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface HandoffConfiguration {
  enableRollback: boolean;
  maxRollbackRetries: number;
  timeoutMs: number;
  enableParallelPreparation: boolean;
  requireExplicitConfirmation: boolean;
  preserveDetailedLogs: boolean;
  enablePerformanceOptimization: boolean;
}

export class SeamlessHandoffService extends EventEmitter {
  private activeHandoffs: Map<string, HandoffState> = new Map();
  private handoffHistory: Map<string, SwitchResult[]> = new Map();
  private readonly handoffPhases: HandoffPhase[] = [];
  private readonly defaultTimeout = 30000; // 30 seconds
  private readonly maxHistorySize = 1000;
  
  private config: HandoffConfiguration = {
    enableRollback: true,
    maxRollbackRetries: 3,
    timeoutMs: 30000,
    enableParallelPreparation: true,
    requireExplicitConfirmation: false,
    preserveDetailedLogs: true,
    enablePerformanceOptimization: true
  };

  constructor() {
    super();
    this.setupHandoffPhases();
    this.setupEventHandlers();
    this.startProgressMonitoring();
  }

  /**
   * Initiate seamless agent handoff
   */
  async initiateHandoff(request: SwitchRequest): Promise<SwitchResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Initiating seamless agent handoff', {
        requestId: request.id,
        currentAgentId: request.currentAgentId,
        reason: request.reason,
        urgency: request.urgency
      });

      // Create handoff state
      const handoffState = await this.createHandoffState(request);
      this.activeHandoffs.set(request.id, handoffState);

      // Execute handoff phases
      const result = await this.executeHandoffPhases(request, handoffState);

      // Store result in history
      this.storeHandoffResult(request.currentAgentId, result);

      // Cleanup active handoff
      this.activeHandoffs.delete(request.id);

      // Emit completion event
      this.emit('handoff:completed', {
        requestId: request.id,
        success: result.success,
        duration: result.duration,
        newAgentId: result.newAgentId
      });

      logger.info('Seamless handoff completed', {
        requestId: request.id,
        success: result.success,
        duration: result.duration,
        newAgentId: result.newAgentId
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Seamless handoff failed', {
        requestId: request.id,
        error: (error as Error).message,
        duration
      });

      // Cleanup on failure
      this.activeHandoffs.delete(request.id);

      return {
        id: `result-${Date.now()}`,
        requestId: request.id,
        success: false,
        performanceMetrics: {
          switchLatency: duration,
          contextTransferTime: 0,
          agentSelectionTime: 0,
          handoffPreparationTime: 0,
          totalSwitchTime: duration,
          contextPreservationRate: 0,
          seamlessnessScore: 0
        },
        errors: [{
          code: 'HANDOFF_FAILED',
          message: (error as Error).message,
          recoverable: true,
          timestamp: new Date()
        }],
        completedAt: new Date(),
        duration
      };
    }
  }

  /**
   * Get handoff progress
   */
  getHandoffProgress(requestId: string): HandoffProgress | null {
    const handoffState = this.activeHandoffs.get(requestId);
    return handoffState?.progress || null;
  }

  /**
   * Cancel active handoff
   */
  async cancelHandoff(requestId: string, reason: string): Promise<boolean> {
    try {
      const handoffState = this.activeHandoffs.get(requestId);
      if (!handoffState) {
        logger.warn('Attempted to cancel non-existent handoff', { requestId });
        return false;
      }

      logger.info('Cancelling handoff', { requestId, reason, currentPhase: handoffState.progress.currentPhase });

      // Attempt rollback if possible
      if (this.config.enableRollback && handoffState.rollbackInfo?.canRetry) {
        await this.performRollback(handoffState, reason);
      }

      // Update state
      handoffState.status = HandoffStatus.ROLLED_BACK;
      handoffState.progress.errors.push({
        code: 'HANDOFF_CANCELLED',
        message: reason,
        recoverable: false,
        timestamp: new Date()
      });

      // Emit cancellation event
      this.emit('handoff:cancelled', {
        requestId,
        reason,
        phase: handoffState.progress.currentPhase
      });

      // Cleanup
      this.activeHandoffs.delete(requestId);

      return true;

    } catch (error) {
      logger.error('Failed to cancel handoff', {
        requestId,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Get handoff statistics
   */
  getHandoffStats() {
    const activeHandoffsCount = this.activeHandoffs.size;
    const totalHistory = Array.from(this.handoffHistory.values())
      .reduce((sum, history) => sum + history.length, 0);

    const allResults = Array.from(this.handoffHistory.values()).flat();
    const successfulHandoffs = allResults.filter(r => r.success).length;
    const successRate = totalHistory > 0 ? (successfulHandoffs / totalHistory) * 100 : 0;

    const averageDuration = allResults.length > 0
      ? allResults.reduce((sum, r) => sum + r.duration, 0) / allResults.length
      : 0;

    const averageSeamlessnessScore = allResults.length > 0
      ? allResults.reduce((sum, r) => sum + r.performanceMetrics.seamlessnessScore, 0) / allResults.length
      : 0;

    const phaseStats = this.handoffPhases.map(phase => ({
      name: phase.name,
      avgDuration: phase.estimatedDuration,
      critical: phase.critical,
      rollbackPossible: phase.rollbackPossible
    }));

    return {
      activeHandoffs: activeHandoffsCount,
      totalHandoffs: totalHistory,
      successRate: Math.round(successRate * 100) / 100,
      averageDuration: Math.round(averageDuration),
      averageSeamlessnessScore: Math.round(averageSeamlessnessScore * 100) / 100,
      phaseStats,
      configuredTimeout: this.config.timeoutMs,
      rollbackEnabled: this.config.enableRollback,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute handoff phases
   */
  private async executeHandoffPhases(request: SwitchRequest, handoffState: HandoffState): Promise<SwitchResult> {
    const startTime = Date.now();
    const metrics: Partial<SwitchPerformanceMetrics> = {};

    try {
      // Phase 1: Context Preservation
      handoffState.status = HandoffStatus.CONTEXT_PRESERVING;
      await this.updateHandoffProgress(handoffState, 'context_preservation');

      const contextStartTime = Date.now();
      const preservationResult = await contextPreservation.preserveContextForHandoff(
        request.currentAgentId,
        request.metadata.sessionId || '',
        request.contextPreservation
      );

      if (!preservationResult.success) {
        throw new Error(`Context preservation failed: ${preservationResult.errors?.join(', ')}`);
      }

      handoffState.preservedContextId = preservationResult.preservedContextId;
      metrics.contextTransferTime = Date.now() - contextStartTime;

      // Phase 2: Agent Selection
      handoffState.status = HandoffStatus.AGENT_SELECTING;
      await this.updateHandoffProgress(handoffState, 'agent_selection');

      const selectionStartTime = Date.now();
      const recommendation = await smartAgentSelection.selectBestAgent(request);
      handoffState.targetAgentId = recommendation.suggestedAgent.agentId;
      metrics.agentSelectionTime = Date.now() - selectionStartTime;

      // Phase 3: Agent Preparation
      handoffState.status = HandoffStatus.AGENT_PREPARING;
      await this.updateHandoffProgress(handoffState, 'agent_preparation');

      const preparationStartTime = Date.now();
      await this.prepareTargetAgent(recommendation.suggestedAgent, request);
      metrics.handoffPreparationTime = Date.now() - preparationStartTime;

      // Phase 4: Context Transfer
      handoffState.status = HandoffStatus.CONTEXT_TRANSFERRING;
      await this.updateHandoffProgress(handoffState, 'context_transfer');

      const handoffSummary = await contextPreservation.generateHandoffSummary(
        preservationResult.preservedContextId,
        recommendation.suggestedAgent.agentId,
        request.contextPreservation
      );

      await contextPreservation.restoreContextForAgent(
        preservationResult.preservedContextId,
        recommendation.suggestedAgent.agentId,
        request.metadata.sessionId || ''
      );

      // Phase 5: Finalization
      handoffState.status = HandoffStatus.FINALIZING;
      await this.updateHandoffProgress(handoffState, 'finalization');

      await this.finalizeHandoff(request, recommendation.suggestedAgent);

      // Phase 6: Completion
      handoffState.status = HandoffStatus.COMPLETED;
      await this.updateHandoffProgress(handoffState, 'completed');

      const totalDuration = Date.now() - startTime;

      // Calculate final metrics
      const finalMetrics: SwitchPerformanceMetrics = {
        switchLatency: recommendation.suggestedAgent.estimatedHandoffTime,
        contextTransferTime: metrics.contextTransferTime || 0,
        agentSelectionTime: metrics.agentSelectionTime || 0,
        handoffPreparationTime: metrics.handoffPreparationTime || 0,
        totalSwitchTime: totalDuration,
        contextPreservationRate: preservationResult.compressionRatio,
        seamlessnessScore: this.calculateSeamlessnessScore(handoffState, totalDuration)
      };

      // Create successful result
      const result: SwitchResult = {
        id: `result-${Date.now()}`,
        requestId: request.id,
        success: true,
        newTaskId: await this.createContinuationTask(request, recommendation.suggestedAgent),
        newAgentId: recommendation.suggestedAgent.agentId,
        selectedAgent: recommendation.suggestedAgent,
        preservedContextId: preservationResult.preservedContextId,
        handoffSummary,
        performanceMetrics: finalMetrics,
        completedAt: new Date(),
        duration: totalDuration
      };

      return result;

    } catch (error) {
      // Handle failure with potential rollback
      if (this.config.enableRollback && handoffState.rollbackInfo?.canRetry) {
        await this.performRollback(handoffState, (error as Error).message);
      }

      handoffState.status = HandoffStatus.FAILED;
      handoffState.progress.errors.push({
        code: 'PHASE_EXECUTION_FAILED',
        message: (error as Error).message,
        recoverable: true,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * Create handoff state
   */
  private async createHandoffState(request: SwitchRequest): Promise<HandoffState> {
    const progress: HandoffProgress = {
      switchRequestId: request.id,
      currentPhase: 'initiated',
      totalPhases: this.handoffPhases.length,
      completedPhases: 0,
      startTime: new Date(),
      errors: [],
      warnings: []
    };

    const rollbackInfo: RollbackInfo = {
      reason: '',
      rollbackPoint: 'initiated',
      preservedState: { currentAgentId: request.currentAgentId },
      canRetry: true,
      retryCount: 0,
      maxRetries: this.config.maxRollbackRetries
    };

    return {
      requestId: request.id,
      status: HandoffStatus.INITIATED,
      currentAgentId: request.currentAgentId,
      targetAgentId: '',
      progress,
      rollbackInfo,
      metrics: {}
    };
  }

  /**
   * Update handoff progress
   */
  private async updateHandoffProgress(handoffState: HandoffState, phaseName: string): Promise<void> {
    const phase = this.handoffPhases.find(p => p.name === phaseName);
    if (!phase) return;

    handoffState.progress.currentPhase = phaseName;
    handoffState.progress.completedPhases++;

    // Calculate estimated completion
    const elapsedTime = Date.now() - handoffState.progress.startTime.getTime();
    const remainingPhases = handoffState.progress.totalPhases - handoffState.progress.completedPhases;
    const avgPhaseTime = elapsedTime / handoffState.progress.completedPhases;
    
    handoffState.progress.estimatedCompletion = new Date(
      Date.now() + (remainingPhases * avgPhaseTime)
    );

    // Update rollback info
    if (handoffState.rollbackInfo) {
      handoffState.rollbackInfo.rollbackPoint = phaseName;
      handoffState.rollbackInfo.canRetry = phase.rollbackPossible;
    }

    // Emit progress event
    this.emit('handoff:progress', {
      requestId: handoffState.requestId,
      phase: phaseName,
      completedPhases: handoffState.progress.completedPhases,
      totalPhases: handoffState.progress.totalPhases,
      estimatedCompletion: handoffState.progress.estimatedCompletion
    });

    logger.debug('Handoff progress updated', {
      requestId: handoffState.requestId,
      phase: phaseName,
      progress: `${handoffState.progress.completedPhases}/${handoffState.progress.totalPhases}`
    });
  }

  /**
   * Prepare target agent
   */
  private async prepareTargetAgent(agent: AgentSwitchProfile, request: SwitchRequest): Promise<void> {
    try {
      // Get agent from registry
      const targetAgent = agentRegistry.getAgent(agent.agentId);
      if (!targetAgent) {
        throw new Error(`Target agent ${agent.agentId} not found in registry`);
      }

      // Check agent availability
      if (targetAgent.status !== AgentStatus.ACTIVE) {
        throw new Error(`Target agent ${agent.agentId} is not active (status: ${targetAgent.status})`);
      }

      // Check agent capacity
      if (targetAgent.performance.currentLoad > 0.9) {
        logger.warn('Target agent has high load', {
          agentId: agent.agentId,
          currentLoad: targetAgent.performance.currentLoad
        });
      }

      // Notify agent of incoming handoff
      await this.notifyAgentOfHandoff(targetAgent, request);

      // Pre-load necessary resources
      await this.preloadAgentResources(targetAgent, request);

      logger.info('Target agent prepared for handoff', {
        agentId: agent.agentId,
        agentType: targetAgent.type,
        capabilities: targetAgent.capabilities.length
      });

    } catch (error) {
      logger.error('Failed to prepare target agent', {
        agentId: agent.agentId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Notify agent of incoming handoff
   */
  private async notifyAgentOfHandoff(agent: Agent, request: SwitchRequest): Promise<void> {
    // Implementation would send notification to agent
    logger.debug('Notifying agent of incoming handoff', {
      agentId: agent.id,
      requestId: request.id,
      reason: request.reason
    });
  }

  /**
   * Preload agent resources
   */
  private async preloadAgentResources(agent: Agent, request: SwitchRequest): Promise<void> {
    // Implementation would preload necessary resources for the agent
    logger.debug('Preloading agent resources', {
      agentId: agent.id,
      requestId: request.id
    });
  }

  /**
   * Finalize handoff
   */
  private async finalizeHandoff(request: SwitchRequest, selectedAgent: AgentSwitchProfile): Promise<void> {
    try {
      // Update agent registry
      await agentRegistry.updateAgentStatus(request.currentAgentId, AgentStatus.IDLE);
      await agentRegistry.updateAgentStatus(selectedAgent.agentId, AgentStatus.ACTIVE);

      // Update task assignment
      // Implementation would update task assignments

      // Record metrics
      metricsService.incrementCounter(
        metricsService.agentSwitches,
        {
          from_agent: request.currentAgentId,
          to_agent: selectedAgent.agentId,
          reason: request.reason
        }
      );

      logger.info('Handoff finalized', {
        fromAgent: request.currentAgentId,
        toAgent: selectedAgent.agentId,
        requestId: request.id
      });

    } catch (error) {
      logger.error('Failed to finalize handoff', {
        requestId: request.id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Create continuation task
   */
  private async createContinuationTask(request: SwitchRequest, selectedAgent: AgentSwitchProfile): Promise<string> {
    // Implementation would create a new task for the selected agent
    const taskId = `task-continuation-${Date.now()}`;
    
    logger.debug('Created continuation task', {
      taskId,
      agentId: selectedAgent.agentId,
      originalTaskId: request.currentTaskId
    });

    return taskId;
  }

  /**
   * Perform rollback
   */
  private async performRollback(handoffState: HandoffState, reason: string): Promise<void> {
    try {
      if (!handoffState.rollbackInfo) {
        throw new Error('No rollback information available');
      }

      handoffState.status = HandoffStatus.ROLLING_BACK;
      handoffState.rollbackInfo.reason = reason;
      handoffState.rollbackInfo.retryCount++;

      logger.info('Performing handoff rollback', {
        requestId: handoffState.requestId,
        rollbackPoint: handoffState.rollbackInfo.rollbackPoint,
        retryCount: handoffState.rollbackInfo.retryCount,
        reason
      });

      // Restore original agent state
      if (handoffState.rollbackInfo.preservedState.currentAgentId) {
        await agentRegistry.updateAgentStatus(
          handoffState.rollbackInfo.preservedState.currentAgentId,
          AgentStatus.ACTIVE
        );
      }

      // Cleanup any partial state
      if (handoffState.preservedContextId) {
        // Implementation would cleanup preserved context if needed
      }

      handoffState.status = HandoffStatus.ROLLED_BACK;

      this.emit('handoff:rolled_back', {
        requestId: handoffState.requestId,
        reason,
        rollbackPoint: handoffState.rollbackInfo.rollbackPoint,
        retryCount: handoffState.rollbackInfo.retryCount
      });

    } catch (error) {
      logger.error('Failed to perform rollback', {
        requestId: handoffState.requestId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Calculate seamlessness score
   */
  private calculateSeamlessnessScore(handoffState: HandoffState, totalDuration: number): number {
    let score = 1.0;

    // Penalize for errors
    if (handoffState.progress.errors.length > 0) {
      score -= handoffState.progress.errors.length * 0.2;
    }

    // Penalize for warnings
    if (handoffState.progress.warnings.length > 0) {
      score -= handoffState.progress.warnings.length * 0.1;
    }

    // Penalize for excessive duration
    const expectedDuration = this.handoffPhases.reduce((sum, phase) => sum + phase.estimatedDuration, 0);
    if (totalDuration > expectedDuration * 1.5) {
      score -= 0.3;
    }

    // Bonus for quick completion
    if (totalDuration < expectedDuration * 0.8) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Store handoff result in history
   */
  private storeHandoffResult(agentId: string, result: SwitchResult): void {
    const history = this.handoffHistory.get(agentId) || [];
    history.push(result);

    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    this.handoffHistory.set(agentId, history);
  }

  /**
   * Setup handoff phases
   */
  private setupHandoffPhases(): void {
    this.handoffPhases.push(
      {
        name: 'context_preservation',
        description: 'Preserve current context and state',
        estimatedDuration: 2000,
        critical: true,
        rollbackPossible: true
      },
      {
        name: 'agent_selection',
        description: 'Select optimal target agent',
        estimatedDuration: 1500,
        critical: true,
        rollbackPossible: true
      },
      {
        name: 'agent_preparation',
        description: 'Prepare target agent for handoff',
        estimatedDuration: 3000,
        critical: true,
        rollbackPossible: true
      },
      {
        name: 'context_transfer',
        description: 'Transfer context to target agent',
        estimatedDuration: 2500,
        critical: true,
        rollbackPossible: false
      },
      {
        name: 'finalization',
        description: 'Finalize handoff and update system state',
        estimatedDuration: 1000,
        critical: true,
        rollbackPossible: false
      },
      {
        name: 'completed',
        description: 'Handoff completed successfully',
        estimatedDuration: 0,
        critical: false,
        rollbackPossible: false
      }
    );
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('handoff:progress', (event) => {
      logger.debug('Handoff progress event', event);
    });

    this.on('handoff:completed', (event) => {
      logger.info('Handoff completed event', event);
    });

    this.on('handoff:cancelled', (event) => {
      logger.warn('Handoff cancelled event', event);
    });
  }

  /**
   * Start progress monitoring
   */
  private startProgressMonitoring(): void {
    setInterval(() => {
      for (const [requestId, handoffState] of this.activeHandoffs) {
        const elapsedTime = Date.now() - handoffState.progress.startTime.getTime();
        
        // Check for timeout
        if (elapsedTime > this.config.timeoutMs) {
          logger.warn('Handoff timeout detected', {
            requestId,
            elapsedTime,
            timeoutMs: this.config.timeoutMs,
            currentPhase: handoffState.progress.currentPhase
          });

          this.cancelHandoff(requestId, 'Timeout exceeded').catch(error => {
            logger.error('Failed to cancel timed out handoff', {
              requestId,
              error: error.message
            });
          });
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Seamless Handoff Service...');

    // Cancel all active handoffs
    const cancelPromises = Array.from(this.activeHandoffs.keys()).map(requestId =>
      this.cancelHandoff(requestId, 'Service shutting down')
    );

    await Promise.allSettled(cancelPromises);

    // Clear all data
    this.activeHandoffs.clear();
    this.handoffHistory.clear();

    logger.info('Seamless Handoff Service shutdown complete');
  }
}

export const seamlessHandoff = new SeamlessHandoffService();