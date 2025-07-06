import { EventEmitter } from 'events';
import {
  Context,
  ContextType,
  ContextScope,
  MemoryProfile,
  MemoryPressure,
  MemoryOptimization,
  OptimizationStrategy,
  OptimizationRisk,
  RiskType,
  RiskSeverity,
  ContextStatus,
  CleanupAction
} from '@/types/context.types';
import logger from '@/config/logger';
import { contextStorage } from './context-storage.service';
import { metricsService } from './metrics.service';

export interface MemoryConfig {
  maxTotalMemoryMB: number;
  maxContextsPerAgent: number;
  lowMemoryThresholdPercent: number;
  highMemoryThresholdPercent: number;
  criticalMemoryThresholdPercent: number;
  compressionEnabled: boolean;
  autoCleanupEnabled: boolean;
  cleanupIntervalMs: number;
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
  processingTime: number;
}

export interface MemorySnapshot {
  timestamp: Date;
  totalMemoryMB: number;
  usedMemoryMB: number;
  agentProfiles: Map<string, MemoryProfile>;
  pressure: MemoryPressure;
  recommendedActions: MemoryOptimization[];
}

export class MemoryManagerService extends EventEmitter {
  private agentMemoryProfiles: Map<string, MemoryProfile> = new Map();
  private memorySnapshots: MemorySnapshot[] = [];
  private compressionCache: Map<string, CompressionResult> = new Map();
  private config: MemoryConfig;
  private monitoringInterval: NodeJS.Timeout;
  private readonly maxSnapshotHistory = 100;

  constructor(config?: Partial<MemoryConfig>) {
    super();
    
    this.config = {
      maxTotalMemoryMB: 1024, // 1GB default
      maxContextsPerAgent: 1000,
      lowMemoryThresholdPercent: 60,
      highMemoryThresholdPercent: 80,
      criticalMemoryThresholdPercent: 95,
      compressionEnabled: true,
      autoCleanupEnabled: true,
      cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
      ...config
    };

    this.setupEventHandlers();
    this.startMemoryMonitoring();
  }

  /**
   * Initialize memory profile for an agent
   */
  async initializeAgentMemory(agentId: string): Promise<MemoryProfile> {
    try {
      const profile: MemoryProfile = {
        agentId,
        totalMemoryMB: 0,
        usedMemoryMB: 0,
        contextCount: 0,
        fragmentationRatio: 0,
        compressionRatio: 0,
        lastCleanup: new Date(),
        memoryPressure: MemoryPressure.LOW
      };

      this.agentMemoryProfiles.set(agentId, profile);

      // Emit initialization event
      this.emit('memory:agent_initialized', { agentId, profile });

      logger.info('Agent memory profile initialized', { agentId });

      return profile;

    } catch (error) {
      logger.error('Failed to initialize agent memory', {
        agentId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Allocate memory for a context
   */
  async allocateMemory(agentId: string, contextId: string, size: number): Promise<boolean> {
    try {
      let profile = this.agentMemoryProfiles.get(agentId);
      
      if (!profile) {
        profile = await this.initializeAgentMemory(agentId);
      }

      // Check if allocation would exceed limits
      const newUsedMemory = profile.usedMemoryMB + (size / (1024 * 1024));
      const totalUsedMemory = this.calculateTotalUsedMemory() + (size / (1024 * 1024));

      if (newUsedMemory > this.config.maxTotalMemoryMB) {
        logger.warn('Agent memory limit would be exceeded', {
          agentId,
          currentUsed: profile.usedMemoryMB,
          requestedSize: size / (1024 * 1024),
          limit: this.config.maxTotalMemoryMB
        });
        return false;
      }

      if (totalUsedMemory > this.config.maxTotalMemoryMB) {
        logger.warn('Total memory limit would be exceeded', {
          agentId,
          currentTotal: this.calculateTotalUsedMemory(),
          requestedSize: size / (1024 * 1024),
          limit: this.config.maxTotalMemoryMB
        });
        
        // Try to free memory
        const freed = await this.performMemoryOptimization(agentId);
        if (!freed || totalUsedMemory > this.config.maxTotalMemoryMB) {
          return false;
        }
      }

      // Allocate memory
      profile.usedMemoryMB = newUsedMemory;
      profile.contextCount++;
      profile.totalMemoryMB = Math.max(profile.totalMemoryMB, newUsedMemory);

      // Update memory pressure
      profile.memoryPressure = this.calculateMemoryPressure(profile);

      this.agentMemoryProfiles.set(agentId, profile);

      // Update metrics
      metricsService.setGauge(
        metricsService.systemMemoryUsage,
        profile.usedMemoryMB,
        { agent_id: agentId, type: 'used' }
      );

      // Emit allocation event
      this.emit('memory:allocated', {
        agentId,
        contextId,
        size,
        totalUsed: profile.usedMemoryMB,
        pressure: profile.memoryPressure
      });

      logger.debug('Memory allocated', {
        agentId,
        contextId,
        sizeMB: size / (1024 * 1024),
        totalUsedMB: profile.usedMemoryMB,
        pressure: profile.memoryPressure
      });

      return true;

    } catch (error) {
      logger.error('Failed to allocate memory', {
        agentId,
        contextId,
        size,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Deallocate memory for a context
   */
  async deallocateMemory(agentId: string, contextId: string, size: number): Promise<void> {
    try {
      const profile = this.agentMemoryProfiles.get(agentId);
      
      if (!profile) {
        logger.warn('No memory profile found for agent', { agentId });
        return;
      }

      // Deallocate memory
      profile.usedMemoryMB = Math.max(0, profile.usedMemoryMB - (size / (1024 * 1024)));
      profile.contextCount = Math.max(0, profile.contextCount - 1);

      // Update memory pressure
      profile.memoryPressure = this.calculateMemoryPressure(profile);

      this.agentMemoryProfiles.set(agentId, profile);

      // Update metrics
      metricsService.setGauge(
        metricsService.systemMemoryUsage,
        profile.usedMemoryMB,
        { agent_id: agentId, type: 'used' }
      );

      // Emit deallocation event
      this.emit('memory:deallocated', {
        agentId,
        contextId,
        size,
        totalUsed: profile.usedMemoryMB,
        pressure: profile.memoryPressure
      });

      logger.debug('Memory deallocated', {
        agentId,
        contextId,
        sizeMB: size / (1024 * 1024),
        totalUsedMB: profile.usedMemoryMB
      });

    } catch (error) {
      logger.error('Failed to deallocate memory', {
        agentId,
        contextId,
        size,
        error: (error as Error).message
      });
    }
  }

  /**
   * Compress context data
   */
  async compressContext(contextId: string): Promise<CompressionResult | null> {
    if (!this.config.compressionEnabled) {
      return null;
    }

    try {
      const context = await contextStorage.getContext(contextId);
      if (!context) {
        throw new Error(`Context ${contextId} not found`);
      }

      const startTime = Date.now();
      const originalData = JSON.stringify(context.data);
      const originalSize = Buffer.byteLength(originalData, 'utf8');

      // Use zlib compression
      const zlib = require('zlib');
      const compressed = zlib.gzipSync(originalData);
      const compressedSize = compressed.length;

      const compressionRatio = compressedSize / originalSize;
      const processingTime = Date.now() - startTime;

      const result: CompressionResult = {
        originalSize,
        compressedSize,
        compressionRatio,
        algorithm: 'gzip',
        processingTime
      };

      // Cache compression result
      this.compressionCache.set(contextId, result);

      // Update context with compressed data flag
      await contextStorage.updateContext(contextId, {
        metadata: {
          ...context.metadata,
          quality: {
            ...context.metadata.quality,
            // Add compression info to metadata
          }
        }
      }, 'memory-manager', 'Context compressed');

      // Emit compression event
      this.emit('memory:compressed', {
        contextId,
        originalSize,
        compressedSize,
        compressionRatio,
        processingTime
      });

      logger.info('Context compressed', {
        contextId,
        originalSizeMB: originalSize / (1024 * 1024),
        compressedSizeMB: compressedSize / (1024 * 1024),
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        processingTimeMs: processingTime
      });

      return result;

    } catch (error) {
      logger.error('Failed to compress context', {
        contextId,
        error: (error as Error).message
      });
      return null;
    }
  }

  /**
   * Perform memory optimization for an agent
   */
  async performMemoryOptimization(agentId: string): Promise<boolean> {
    try {
      const profile = this.agentMemoryProfiles.get(agentId);
      if (!profile) {
        return false;
      }

      const optimization = await this.generateMemoryOptimization(agentId);
      if (!optimization) {
        return false;
      }

      let memoryFreed = 0;

      switch (optimization.strategy) {
        case OptimizationStrategy.COMPRESSION:
          memoryFreed = await this.performCompression(agentId);
          break;
        case OptimizationStrategy.ARCHIVAL:
          memoryFreed = await this.performArchival(agentId);
          break;
        case OptimizationStrategy.DEDUPLICATION:
          memoryFreed = await this.performDeduplication(agentId);
          break;
        case OptimizationStrategy.SUMMARIZATION:
          memoryFreed = await this.performSummarization(agentId);
          break;
        case OptimizationStrategy.SELECTIVE_DELETION:
          memoryFreed = await this.performSelectiveDeletion(agentId);
          break;
      }

      // Update profile
      profile.usedMemoryMB = Math.max(0, profile.usedMemoryMB - memoryFreed);
      profile.memoryPressure = this.calculateMemoryPressure(profile);
      profile.lastCleanup = new Date();

      this.agentMemoryProfiles.set(agentId, profile);

      // Emit optimization event
      this.emit('memory:optimized', {
        agentId,
        strategy: optimization.strategy,
        memoryFreedMB: memoryFreed,
        newPressure: profile.memoryPressure
      });

      logger.info('Memory optimization completed', {
        agentId,
        strategy: optimization.strategy,
        memoryFreedMB: memoryFreed,
        newUsedMB: profile.usedMemoryMB,
        newPressure: profile.memoryPressure
      });

      return memoryFreed > 0;

    } catch (error) {
      logger.error('Failed to perform memory optimization', {
        agentId,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Generate memory optimization recommendations
   */
  async generateMemoryOptimization(agentId: string): Promise<MemoryOptimization | null> {
    try {
      const profile = this.agentMemoryProfiles.get(agentId);
      if (!profile) {
        return null;
      }

      // Analyze memory usage patterns
      const contexts = await this.getAgentContexts(agentId);
      const totalSize = contexts.reduce((sum, ctx) => sum + this.calculateContextSize(ctx), 0);

      let strategy: OptimizationStrategy;
      let targetReduction: number;
      let estimatedSavings: number;
      const risks: OptimizationRisk[] = [];

      if (profile.memoryPressure === MemoryPressure.CRITICAL) {
        strategy = OptimizationStrategy.SELECTIVE_DELETION;
        targetReduction = 0.3; // 30% reduction
        estimatedSavings = totalSize * 0.3;
        risks.push({
          type: RiskType.DATA_LOSS,
          severity: RiskSeverity.HIGH,
          description: 'Some context data may be permanently lost',
          mitigation: 'Backup important contexts before deletion'
        });
      } else if (profile.memoryPressure === MemoryPressure.HIGH) {
        strategy = OptimizationStrategy.COMPRESSION;
        targetReduction = 0.2; // 20% reduction
        estimatedSavings = totalSize * 0.5; // Compression typically achieves 50% reduction
        risks.push({
          type: RiskType.PERFORMANCE_IMPACT,
          severity: RiskSeverity.MEDIUM,
          description: 'Compression/decompression may add latency',
          mitigation: 'Use async compression for non-critical contexts'
        });
      } else {
        strategy = OptimizationStrategy.ARCHIVAL;
        targetReduction = 0.1; // 10% reduction
        estimatedSavings = totalSize * 0.1;
        risks.push({
          type: RiskType.ACCURACY_DEGRADATION,
          severity: RiskSeverity.LOW,
          description: 'Archived contexts may have slower access times',
          mitigation: 'Keep frequently accessed contexts active'
        });
      }

      return {
        strategy,
        targetReduction,
        estimatedSavings,
        risks
      };

    } catch (error) {
      logger.error('Failed to generate memory optimization', {
        agentId,
        error: (error as Error).message
      });
      return null;
    }
  }

  /**
   * Get memory snapshot
   */
  getMemorySnapshot(): MemorySnapshot {
    const totalUsed = this.calculateTotalUsedMemory();
    const systemPressure = this.calculateSystemMemoryPressure();

    const snapshot: MemorySnapshot = {
      timestamp: new Date(),
      totalMemoryMB: this.config.maxTotalMemoryMB,
      usedMemoryMB: totalUsed,
      agentProfiles: new Map(this.agentMemoryProfiles),
      pressure: systemPressure,
      recommendedActions: []
    };

    // Generate recommendations
    if (systemPressure === MemoryPressure.HIGH || systemPressure === MemoryPressure.CRITICAL) {
      for (const [agentId] of this.agentMemoryProfiles) {
        const optimization = this.generateMemoryOptimization(agentId);
        if (optimization) {
          snapshot.recommendedActions.push(optimization as any);
        }
      }
    }

    // Store snapshot
    this.memorySnapshots.push(snapshot);
    if (this.memorySnapshots.length > this.maxSnapshotHistory) {
      this.memorySnapshots.shift();
    }

    return snapshot;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    const totalUsed = this.calculateTotalUsedMemory();
    const usagePercent = (totalUsed / this.config.maxTotalMemoryMB) * 100;
    const systemPressure = this.calculateSystemMemoryPressure();

    const agentStats = Array.from(this.agentMemoryProfiles.entries()).map(([agentId, profile]) => ({
      agentId,
      usedMemoryMB: profile.usedMemoryMB,
      contextCount: profile.contextCount,
      memoryPressure: profile.memoryPressure,
      fragmentationRatio: profile.fragmentationRatio,
      compressionRatio: profile.compressionRatio
    }));

    const compressionStats = {
      totalCompressed: this.compressionCache.size,
      averageCompressionRatio: Array.from(this.compressionCache.values())
        .reduce((sum, result) => sum + result.compressionRatio, 0) / this.compressionCache.size || 0,
      totalSavedBytes: Array.from(this.compressionCache.values())
        .reduce((sum, result) => sum + (result.originalSize - result.compressedSize), 0)
    };

    return {
      totalMemoryMB: this.config.maxTotalMemoryMB,
      usedMemoryMB: totalUsed,
      availableMemoryMB: this.config.maxTotalMemoryMB - totalUsed,
      usagePercent: Math.round(usagePercent * 100) / 100,
      systemPressure,
      agentCount: this.agentMemoryProfiles.size,
      agentStats,
      compressionStats,
      config: this.config,
      snapshotCount: this.memorySnapshots.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate total used memory across all agents
   */
  private calculateTotalUsedMemory(): number {
    return Array.from(this.agentMemoryProfiles.values())
      .reduce((sum, profile) => sum + profile.usedMemoryMB, 0);
  }

  /**
   * Calculate memory pressure for an agent
   */
  private calculateMemoryPressure(profile: MemoryProfile): MemoryPressure {
    const usagePercent = (profile.usedMemoryMB / this.config.maxTotalMemoryMB) * 100;

    if (usagePercent >= this.config.criticalMemoryThresholdPercent) {
      return MemoryPressure.CRITICAL;
    } else if (usagePercent >= this.config.highMemoryThresholdPercent) {
      return MemoryPressure.HIGH;
    } else if (usagePercent >= this.config.lowMemoryThresholdPercent) {
      return MemoryPressure.MEDIUM;
    } else {
      return MemoryPressure.LOW;
    }
  }

  /**
   * Calculate system-wide memory pressure
   */
  private calculateSystemMemoryPressure(): MemoryPressure {
    const totalUsed = this.calculateTotalUsedMemory();
    const usagePercent = (totalUsed / this.config.maxTotalMemoryMB) * 100;

    if (usagePercent >= this.config.criticalMemoryThresholdPercent) {
      return MemoryPressure.CRITICAL;
    } else if (usagePercent >= this.config.highMemoryThresholdPercent) {
      return MemoryPressure.HIGH;
    } else if (usagePercent >= this.config.lowMemoryThresholdPercent) {
      return MemoryPressure.MEDIUM;
    } else {
      return MemoryPressure.LOW;
    }
  }

  /**
   * Get contexts for an agent
   */
  private async getAgentContexts(agentId: string): Promise<Context[]> {
    try {
      const searchResult = await contextStorage.searchContexts({
        filters: [{
          field: 'access.ownerId',
          operator: 'equals',
          value: agentId
        }],
        sorting: [{
          field: 'updatedAt',
          direction: 'desc',
          priority: 1
        }],
        pagination: { page: 1, limit: 1000 },
        includeRelated: false,
        includeArchived: false
      });

      return searchResult.contexts;
    } catch (error) {
      logger.error('Failed to get agent contexts', {
        agentId,
        error: (error as Error).message
      });
      return [];
    }
  }

  /**
   * Calculate context size
   */
  private calculateContextSize(context: Context): number {
    return Buffer.byteLength(JSON.stringify(context), 'utf8');
  }

  /**
   * Perform compression optimization
   */
  private async performCompression(agentId: string): Promise<number> {
    const contexts = await this.getAgentContexts(agentId);
    let totalSaved = 0;

    for (const context of contexts) {
      if (context.metadata.priority !== 'critical') {
        const result = await this.compressContext(context.id);
        if (result) {
          totalSaved += (result.originalSize - result.compressedSize) / (1024 * 1024);
        }
      }
    }

    return totalSaved;
  }

  /**
   * Perform archival optimization
   */
  private async performArchival(agentId: string): Promise<number> {
    const contexts = await this.getAgentContexts(agentId);
    let totalFreed = 0;

    const now = new Date();
    const archiveThreshold = 30 * 24 * 60 * 60 * 1000; // 30 days

    for (const context of contexts) {
      if ((now.getTime() - context.updatedAt.getTime()) > archiveThreshold &&
          context.metadata.priority === 'low') {
        
        await contextStorage.updateContext(context.id, {
          lifecycle: {
            ...context.lifecycle,
            status: ContextStatus.ARCHIVED,
            archiveAt: now
          }
        }, agentId, 'Archived due to memory pressure');

        totalFreed += this.calculateContextSize(context) / (1024 * 1024);
      }
    }

    return totalFreed;
  }

  /**
   * Perform deduplication optimization
   */
  private async performDeduplication(agentId: string): Promise<number> {
    // Simple implementation - in production would use more sophisticated deduplication
    return 0;
  }

  /**
   * Perform summarization optimization
   */
  private async performSummarization(agentId: string): Promise<number> {
    // Implementation would summarize large contexts
    return 0;
  }

  /**
   * Perform selective deletion optimization
   */
  private async performSelectiveDeletion(agentId: string): Promise<number> {
    const contexts = await this.getAgentContexts(agentId);
    let totalFreed = 0;

    const now = new Date();
    const deleteThreshold = 90 * 24 * 60 * 60 * 1000; // 90 days

    for (const context of contexts) {
      if ((now.getTime() - context.updatedAt.getTime()) > deleteThreshold &&
          context.metadata.priority === 'low' &&
          context.metadata.usage.accessCount < 5) {
        
        await contextStorage.deleteContext(context.id, agentId, false);
        totalFreed += this.calculateContextSize(context) / (1024 * 1024);
      }
    }

    return totalFreed;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Listen to context storage events
    contextStorage.on('context:stored', (event) => {
      this.allocateMemory(event.agentId || 'system', event.contextId, event.size);
    });

    contextStorage.on('context:deleted', (event) => {
      // Memory will be deallocated when context is actually removed
    });

    this.on('memory:pressure_high', (event) => {
      logger.warn('High memory pressure detected', event);
      if (this.config.autoCleanupEnabled) {
        this.performMemoryOptimization(event.agentId);
      }
    });

    this.on('memory:pressure_critical', (event) => {
      logger.error('Critical memory pressure detected', event);
      if (this.config.autoCleanupEnabled) {
        this.performMemoryOptimization(event.agentId);
      }
    });
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.performMemoryCheck();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Perform periodic memory check
   */
  private performMemoryCheck(): void {
    try {
      const snapshot = this.getMemorySnapshot();

      // Check for pressure changes and emit events
      for (const [agentId, profile] of this.agentMemoryProfiles) {
        const previousSnapshot = this.memorySnapshots[this.memorySnapshots.length - 2];
        const previousProfile = previousSnapshot?.agentProfiles.get(agentId);

        if (previousProfile && previousProfile.memoryPressure !== profile.memoryPressure) {
          switch (profile.memoryPressure) {
            case MemoryPressure.HIGH:
              this.emit('memory:pressure_high', { agentId, profile });
              break;
            case MemoryPressure.CRITICAL:
              this.emit('memory:pressure_critical', { agentId, profile });
              break;
          }
        }
      }

      // Update metrics
      metricsService.setGauge(
        metricsService.systemMemoryUsage,
        snapshot.usedMemoryMB,
        { type: 'total_used' }
      );

    } catch (error) {
      logger.error('Memory check failed', { error: (error as Error).message });
    }
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Memory Manager Service...');

    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Clear all data
    this.agentMemoryProfiles.clear();
    this.memorySnapshots.length = 0;
    this.compressionCache.clear();

    logger.info('Memory Manager Service shutdown complete');
  }
}

export const memoryManager = new MemoryManagerService();