import { EventEmitter } from 'events';
import {
  Context,
  ContextVersion,
  ContextChange,
  ChangeOperation,
  SyncRequest,
  SyncResult,
  SyncStatus,
  ConflictResolution
} from '@/types/context.types';
import logger from '@/config/logger';
import { contextStorage } from './context-storage.service';
import { metricsService } from './metrics.service';

export interface VersionDiff {
  contextId: string;
  fromVersion: number;
  toVersion: number;
  changes: ContextChange[];
  insertions: number;
  deletions: number;
  modifications: number;
}

export interface MergeRequest {
  contextId: string;
  baseVersion: number;
  sourceVersion: number;
  targetVersion: number;
  requesterId: string;
  conflictResolution: ConflictResolution;
}

export interface MergeResult {
  success: boolean;
  newVersion?: number;
  conflicts: MergeConflict[];
  resolvedChanges: ContextChange[];
  message: string;
}

export interface MergeConflict {
  path: string;
  baseValue: any;
  sourceValue: any;
  targetValue: any;
  resolution?: any;
  resolutionStrategy: string;
}

export interface VersionBranch {
  branchId: string;
  branchName: string;
  contextId: string;
  parentVersion: number;
  versions: ContextVersion[];
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
}

export class ContextVersioningService extends EventEmitter {
  private versionBranches: Map<string, VersionBranch> = new Map();
  private mergeHistory: Map<string, MergeResult[]> = new Map();
  private versionDiffs: Map<string, VersionDiff> = new Map(); // cached diffs
  private readonly maxDiffCacheSize = 1000;

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Create a new version branch
   */
  async createBranch(
    contextId: string,
    branchName: string,
    parentVersion: number,
    createdBy: string
  ): Promise<string> {
    try {
      // Get context
      const context = await contextStorage.getContext(contextId, createdBy);
      if (!context) {
        throw new Error(`Context ${contextId} not found`);
      }

      // Validate parent version
      const parentVersionExists = context.lifecycle.versionHistory.some(v => v.version === parentVersion);
      if (!parentVersionExists) {
        throw new Error(`Parent version ${parentVersion} not found`);
      }

      // Generate branch ID
      const branchId = this.generateBranchId();

      // Create branch
      const branch: VersionBranch = {
        branchId,
        branchName,
        contextId,
        parentVersion,
        versions: [],
        isActive: true,
        createdAt: new Date(),
        createdBy
      };

      this.versionBranches.set(branchId, branch);

      // Emit branch creation event
      this.emit('version:branch_created', {
        branchId,
        branchName,
        contextId,
        parentVersion,
        createdBy
      });

      logger.info('Version branch created', {
        branchId,
        branchName,
        contextId,
        parentVersion,
        createdBy
      });

      return branchId;

    } catch (error) {
      logger.error('Failed to create version branch', {
        contextId,
        branchName,
        parentVersion,
        createdBy,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Merge branches
   */
  async mergeBranches(request: MergeRequest): Promise<MergeResult> {
    try {
      // Get context
      const context = await contextStorage.getContext(request.contextId, request.requesterId);
      if (!context) {
        throw new Error(`Context ${request.contextId} not found`);
      }

      // Get versions
      const baseVersion = this.getVersionByNumber(context, request.baseVersion);
      const sourceVersion = this.getVersionByNumber(context, request.sourceVersion);
      const targetVersion = this.getVersionByNumber(context, request.targetVersion);

      if (!baseVersion || !sourceVersion || !targetVersion) {
        throw new Error('One or more specified versions not found');
      }

      // Calculate diffs
      const sourceDiff = await this.calculateVersionDiff(
        request.contextId,
        request.baseVersion,
        request.sourceVersion
      );
      const targetDiff = await this.calculateVersionDiff(
        request.contextId,
        request.baseVersion,
        request.targetVersion
      );

      // Detect conflicts
      const conflicts = this.detectConflicts(sourceDiff, targetDiff);

      // Resolve conflicts
      const resolvedChanges: ContextChange[] = [];
      const resolvedConflicts: MergeConflict[] = [];

      for (const conflict of conflicts) {
        const resolution = await this.resolveConflict(conflict, request.conflictResolution);
        resolvedConflicts.push(resolution);

        if (resolution.resolution !== undefined) {
          resolvedChanges.push({
            operation: ChangeOperation.UPDATE,
            path: conflict.path,
            oldValue: conflict.baseValue,
            newValue: resolution.resolution,
            reason: `Merge conflict resolved using ${resolution.resolutionStrategy}`
          });
        }
      }

      // Apply non-conflicting changes
      const nonConflictingChanges = [
        ...sourceDiff.changes.filter(change => 
          !conflicts.some(conflict => conflict.path === change.path)
        ),
        ...targetDiff.changes.filter(change => 
          !conflicts.some(conflict => conflict.path === change.path)
        )
      ];

      resolvedChanges.push(...nonConflictingChanges);

      // Create merged version
      const newVersion = context.version + 1;
      const mergedContext = await this.applyChanges(context, resolvedChanges);

      // Create version entry
      const versionEntry: ContextVersion = {
        version: newVersion,
        changes: resolvedChanges,
        createdAt: new Date(),
        createdBy: request.requesterId,
        checksum: this.calculateChecksum(mergedContext),
        size: this.calculateSize(mergedContext)
      };

      // Update context
      mergedContext.version = newVersion;
      mergedContext.lifecycle.versionHistory.push(versionEntry);

      await contextStorage.updateContext(
        request.contextId,
        mergedContext,
        request.requesterId,
        `Merged versions ${request.sourceVersion} and ${request.targetVersion}`
      );

      const result: MergeResult = {
        success: true,
        newVersion,
        conflicts: resolvedConflicts,
        resolvedChanges,
        message: `Successfully merged versions ${request.sourceVersion} and ${request.targetVersion} into version ${newVersion}`
      };

      // Store merge history
      const history = this.mergeHistory.get(request.contextId) || [];
      history.push(result);
      this.mergeHistory.set(request.contextId, history);

      // Emit merge event
      this.emit('version:merged', {
        contextId: request.contextId,
        newVersion,
        sourceVersion: request.sourceVersion,
        targetVersion: request.targetVersion,
        conflicts: conflicts.length,
        resolvedChanges: resolvedChanges.length
      });

      logger.info('Version merge completed', {
        contextId: request.contextId,
        newVersion,
        sourceVersion: request.sourceVersion,
        targetVersion: request.targetVersion,
        conflicts: conflicts.length,
        resolvedChanges: resolvedChanges.length
      });

      return result;

    } catch (error) {
      logger.error('Failed to merge versions', {
        contextId: request.contextId,
        error: (error as Error).message
      });

      return {
        success: false,
        conflicts: [],
        resolvedChanges: [],
        message: `Failed to merge versions: ${(error as Error).message}`
      };
    }
  }

  /**
   * Calculate diff between two versions
   */
  async calculateVersionDiff(
    contextId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<VersionDiff> {
    try {
      const diffKey = `${contextId}:${fromVersion}:${toVersion}`;

      // Check cache first
      const cachedDiff = this.versionDiffs.get(diffKey);
      if (cachedDiff) {
        return cachedDiff;
      }

      // Get context versions
      const versions = await contextStorage.getContextVersions(contextId);
      const fromVersionObj = versions.find(v => v.version === fromVersion);
      const toVersionObj = versions.find(v => v.version === toVersion);

      if (!fromVersionObj || !toVersionObj) {
        throw new Error(`Version ${fromVersion} or ${toVersion} not found`);
      }

      // Calculate changes between versions
      const changes: ContextChange[] = [];
      let insertions = 0;
      let deletions = 0;
      let modifications = 0;

      // Simple implementation - in production would use more sophisticated diff algorithm
      for (const change of toVersionObj.changes) {
        if (change.operation === ChangeOperation.CREATE) {
          insertions++;
        } else if (change.operation === ChangeOperation.DELETE) {
          deletions++;
        } else if (change.operation === ChangeOperation.UPDATE) {
          modifications++;
        }
        changes.push(change);
      }

      const diff: VersionDiff = {
        contextId,
        fromVersion,
        toVersion,
        changes,
        insertions,
        deletions,
        modifications
      };

      // Cache the diff
      this.versionDiffs.set(diffKey, diff);

      // Manage cache size
      if (this.versionDiffs.size > this.maxDiffCacheSize) {
        const firstKey = this.versionDiffs.keys().next().value;
        this.versionDiffs.delete(firstKey);
      }

      return diff;

    } catch (error) {
      logger.error('Failed to calculate version diff', {
        contextId,
        fromVersion,
        toVersion,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Revert context to a previous version
   */
  async revertToVersion(
    contextId: string,
    targetVersion: number,
    requesterId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      // Get context
      const context = await contextStorage.getContext(contextId, requesterId);
      if (!context) {
        throw new Error(`Context ${contextId} not found`);
      }

      // Find target version
      const targetVersionObj = context.lifecycle.versionHistory.find(v => v.version === targetVersion);
      if (!targetVersionObj) {
        throw new Error(`Version ${targetVersion} not found`);
      }

      // Reconstruct context at target version
      const revertedContext = await this.reconstructContextAtVersion(context, targetVersion);

      // Create new version for the revert
      const newVersion = context.version + 1;
      const revertChanges: ContextChange[] = [{
        operation: ChangeOperation.UPDATE,
        path: '/',
        oldValue: context,
        newValue: revertedContext,
        reason: reason || `Reverted to version ${targetVersion}`
      }];

      const versionEntry: ContextVersion = {
        version: newVersion,
        changes: revertChanges,
        createdAt: new Date(),
        createdBy: requesterId,
        checksum: this.calculateChecksum(revertedContext),
        size: this.calculateSize(revertedContext)
      };

      // Update context
      revertedContext.version = newVersion;
      revertedContext.lifecycle.versionHistory.push(versionEntry);

      await contextStorage.updateContext(
        contextId,
        revertedContext,
        requesterId,
        `Reverted to version ${targetVersion}`
      );

      // Emit revert event
      this.emit('version:reverted', {
        contextId,
        targetVersion,
        newVersion,
        requesterId,
        reason
      });

      logger.info('Context reverted to previous version', {
        contextId,
        targetVersion,
        newVersion,
        requesterId
      });

      return true;

    } catch (error) {
      logger.error('Failed to revert context version', {
        contextId,
        targetVersion,
        requesterId,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    contextId: string,
    version1: number,
    version2: number
  ): Promise<VersionDiff> {
    return this.calculateVersionDiff(contextId, version1, version2);
  }

  /**
   * Get version history
   */
  async getVersionHistory(contextId: string, requesterId?: string): Promise<ContextVersion[]> {
    try {
      return await contextStorage.getContextVersions(contextId, requesterId);
    } catch (error) {
      logger.error('Failed to get version history', {
        contextId,
        requesterId,
        error: (error as Error).message
      });
      return [];
    }
  }

  /**
   * Get versioning statistics
   */
  getVersioningStats() {
    const totalBranches = this.versionBranches.size;
    const activeBranches = Array.from(this.versionBranches.values()).filter(b => b.isActive).length;
    const totalMerges = Array.from(this.mergeHistory.values())
      .reduce((sum, history) => sum + history.length, 0);
    const cachedDiffs = this.versionDiffs.size;

    const branchStats = Array.from(this.versionBranches.values()).reduce((acc, branch) => {
      const contextId = branch.contextId;
      if (!acc[contextId]) {
        acc[contextId] = { branches: 0, versions: 0 };
      }
      acc[contextId].branches++;
      acc[contextId].versions += branch.versions.length;
      return acc;
    }, {} as Record<string, { branches: number; versions: number }>);

    return {
      totalBranches,
      activeBranches,
      totalMerges,
      cachedDiffs,
      branchStats,
      maxDiffCacheSize: this.maxDiffCacheSize,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get version by number
   */
  private getVersionByNumber(context: Context, versionNumber: number): ContextVersion | undefined {
    return context.lifecycle.versionHistory.find(v => v.version === versionNumber);
  }

  /**
   * Detect conflicts between two diffs
   */
  private detectConflicts(sourceDiff: VersionDiff, targetDiff: VersionDiff): MergeConflict[] {
    const conflicts: MergeConflict[] = [];

    // Find changes that affect the same path
    for (const sourceChange of sourceDiff.changes) {
      for (const targetChange of targetDiff.changes) {
        if (sourceChange.path === targetChange.path &&
            JSON.stringify(sourceChange.newValue) !== JSON.stringify(targetChange.newValue)) {
          
          conflicts.push({
            path: sourceChange.path,
            baseValue: sourceChange.oldValue,
            sourceValue: sourceChange.newValue,
            targetValue: targetChange.newValue,
            resolutionStrategy: 'unresolved'
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve a merge conflict
   */
  private async resolveConflict(
    conflict: MergeConflict,
    resolution: ConflictResolution
  ): Promise<MergeConflict> {
    const resolvedConflict = { ...conflict };

    switch (resolution) {
      case ConflictResolution.SOURCE_WINS:
        resolvedConflict.resolution = conflict.sourceValue;
        resolvedConflict.resolutionStrategy = 'source_wins';
        break;
      
      case ConflictResolution.TARGET_WINS:
        resolvedConflict.resolution = conflict.targetValue;
        resolvedConflict.resolutionStrategy = 'target_wins';
        break;
      
      case ConflictResolution.MERGE:
        // Simple merge - in production would be more sophisticated
        if (typeof conflict.sourceValue === 'object' && typeof conflict.targetValue === 'object') {
          resolvedConflict.resolution = { ...conflict.sourceValue, ...conflict.targetValue };
          resolvedConflict.resolutionStrategy = 'automatic_merge';
        } else {
          resolvedConflict.resolution = conflict.sourceValue;
          resolvedConflict.resolutionStrategy = 'merge_fallback_to_source';
        }
        break;
      
      case ConflictResolution.MANUAL:
        // Would require human intervention
        resolvedConflict.resolutionStrategy = 'manual_required';
        break;
      
      default:
        resolvedConflict.resolution = conflict.sourceValue;
        resolvedConflict.resolutionStrategy = 'default_to_source';
        break;
    }

    return resolvedConflict;
  }

  /**
   * Apply changes to context
   */
  private async applyChanges(context: Context, changes: ContextChange[]): Promise<Context> {
    let modifiedContext = { ...context };

    for (const change of changes) {
      switch (change.operation) {
        case ChangeOperation.UPDATE:
          modifiedContext = this.applyUpdateChange(modifiedContext, change);
          break;
        case ChangeOperation.CREATE:
          modifiedContext = this.applyCreateChange(modifiedContext, change);
          break;
        case ChangeOperation.DELETE:
          modifiedContext = this.applyDeleteChange(modifiedContext, change);
          break;
      }
    }

    modifiedContext.updatedAt = new Date();
    return modifiedContext;
  }

  /**
   * Apply update change
   */
  private applyUpdateChange(context: Context, change: ContextChange): Context {
    const pathParts = change.path.split('/').filter(p => p !== '');
    
    if (pathParts.length === 0) {
      // Root level update
      return { ...context, ...change.newValue };
    }

    // Navigate to the target location and update
    const updatedContext = { ...context };
    let current: any = updatedContext;

    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]];
    }

    current[pathParts[pathParts.length - 1]] = change.newValue;
    return updatedContext;
  }

  /**
   * Apply create change
   */
  private applyCreateChange(context: Context, change: ContextChange): Context {
    return this.applyUpdateChange(context, change);
  }

  /**
   * Apply delete change
   */
  private applyDeleteChange(context: Context, change: ContextChange): Context {
    const pathParts = change.path.split('/').filter(p => p !== '');
    
    if (pathParts.length === 0) {
      return context; // Can't delete root
    }

    const updatedContext = { ...context };
    let current: any = updatedContext;

    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        return updatedContext; // Path doesn't exist
      }
      current = current[pathParts[i]];
    }

    delete current[pathParts[pathParts.length - 1]];
    return updatedContext;
  }

  /**
   * Reconstruct context at specific version
   */
  private async reconstructContextAtVersion(context: Context, targetVersion: number): Promise<Context> {
    // Start with base context and apply changes up to target version
    let reconstructedContext = { ...context };

    // Find all versions up to target
    const versionsToApply = context.lifecycle.versionHistory
      .filter(v => v.version <= targetVersion)
      .sort((a, b) => a.version - b.version);

    // Apply changes in order
    for (const version of versionsToApply) {
      reconstructedContext = await this.applyChanges(reconstructedContext, version.changes);
    }

    return reconstructedContext;
  }

  /**
   * Calculate context checksum
   */
  private calculateChecksum(context: Context): string {
    const crypto = require('crypto');
    const content = JSON.stringify(context, Object.keys(context).sort());
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Calculate context size
   */
  private calculateSize(context: Context): number {
    return Buffer.byteLength(JSON.stringify(context), 'utf8');
  }

  /**
   * Generate branch ID
   */
  private generateBranchId(): string {
    return `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Listen to context update events
    contextStorage.on('context:updated', (event) => {
      // Clear relevant diff cache entries
      const keysToDelete = Array.from(this.versionDiffs.keys())
        .filter(key => key.startsWith(`${event.contextId}:`));
      
      for (const key of keysToDelete) {
        this.versionDiffs.delete(key);
      }
    });

    this.on('version:merged', (event) => {
      logger.debug('Version merged event', event);
    });

    this.on('version:reverted', (event) => {
      logger.debug('Version reverted event', event);
    });
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Context Versioning Service...');

    // Clear all data
    this.versionBranches.clear();
    this.mergeHistory.clear();
    this.versionDiffs.clear();

    logger.info('Context Versioning Service shutdown complete');
  }
}

export const contextVersioning = new ContextVersioningService();