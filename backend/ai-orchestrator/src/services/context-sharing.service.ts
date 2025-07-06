import { EventEmitter } from 'events';
import {
  Context,
  ContextScope,
  ContextPermission,
  Permission,
  PrincipalType,
  SyncRequest,
  SyncResult,
  SyncStatus,
  SyncMode,
  ConflictResolution,
  SyncPriority,
  SyncError,
  SyncStatistics
} from '@/types/context.types';
import logger from '@/config/logger';
import { contextStorage } from './context-storage.service';
import { agentRegistry } from './agent-registry.service';
import { metricsService } from './metrics.service';

export interface ShareRequest {
  contextId: string;
  requesterId: string;
  targetId: string;
  targetType: PrincipalType;
  permissions: Permission[];
  expiresAt?: Date;
  message?: string;
}

export interface ShareResponse {
  success: boolean;
  shareId?: string;
  message: string;
  expiresAt?: Date;
}

export interface ContextBroadcast {
  contextId: string;
  senderId: string;
  targetAgents: string[];
  scope: ContextScope;
  priority: SyncPriority;
  includeHistory: boolean;
}

export interface SubscriptionFilter {
  agentId: string;
  contextTypes: string[];
  scopes: ContextScope[];
  tags: string[];
  keywords: string[];
}

export class ContextSharingService extends EventEmitter {
  private shareRequests: Map<string, ShareRequest> = new Map();
  private activeShares: Map<string, ContextPermission> = new Map();
  private subscriptions: Map<string, SubscriptionFilter[]> = new Map(); // agentId -> filters
  private syncQueue: Map<string, SyncRequest> = new Map();
  private activeSyncs: Map<string, SyncResult> = new Map();
  private broadcastHistory: Map<string, ContextBroadcast[]> = new Map();
  private readonly maxHistorySize = 1000;

  constructor() {
    super();
    this.setupEventHandlers();
    this.startSyncProcessor();
  }

  /**
   * Share a context with another agent or user
   */
  async shareContext(request: ShareRequest): Promise<ShareResponse> {
    try {
      // Validate request
      await this.validateShareRequest(request);

      // Get context
      const context = await contextStorage.getContext(request.contextId, request.requesterId);
      if (!context) {
        throw new Error(`Context ${request.contextId} not found`);
      }

      // Check if requester has share permission
      if (!this.hasPermission(context, request.requesterId, Permission.SHARE)) {
        throw new Error('Insufficient permissions to share context');
      }

      // Generate share ID
      const shareId = this.generateShareId();

      // Create permission
      const permission: ContextPermission = {
        principalId: request.targetId,
        principalType: request.targetType,
        permissions: request.permissions,
        grantedAt: new Date(),
        grantedBy: request.requesterId,
        expiresAt: request.expiresAt
      };

      // Update context permissions
      const updatedContext = { ...context };
      updatedContext.access.permissions.push(permission);

      // Store updated context
      await contextStorage.updateContext(
        request.contextId,
        { access: updatedContext.access },
        request.requesterId,
        `Shared with ${request.targetType} ${request.targetId}`
      );

      // Store share record
      this.shareRequests.set(shareId, request);
      this.activeShares.set(shareId, permission);

      // Notify target if it's an agent
      if (request.targetType === PrincipalType.AGENT) {
        await this.notifyAgentOfShare(request.targetId, context, permission);
      }

      // Emit share event
      this.emit('context:shared', {
        shareId,
        contextId: request.contextId,
        requesterId: request.requesterId,
        targetId: request.targetId,
        targetType: request.targetType,
        permissions: request.permissions
      });

      // Update metrics
      metricsService.incrementCounter(
        metricsService.queueJobsTotal,
        { queue_name: 'context-sharing', job_type: 'share', status: 'success' }
      );

      logger.info('Context shared successfully', {
        shareId,
        contextId: request.contextId,
        requesterId: request.requesterId,
        targetId: request.targetId,
        targetType: request.targetType,
        permissions: request.permissions
      });

      return {
        success: true,
        shareId,
        message: `Context shared with ${request.targetType} ${request.targetId}`,
        expiresAt: request.expiresAt
      };

    } catch (error) {
      logger.error('Failed to share context', {
        contextId: request.contextId,
        requesterId: request.requesterId,
        targetId: request.targetId,
        error: (error as Error).message
      });

      metricsService.incrementCounter(
        metricsService.queueJobsTotal,
        { queue_name: 'context-sharing', job_type: 'share', status: 'failed' }
      );

      return {
        success: false,
        message: `Failed to share context: ${(error as Error).message}`
      };
    }
  }

  /**
   * Revoke context sharing
   */
  async revokeShare(shareId: string, requesterId: string): Promise<boolean> {
    try {
      const shareRequest = this.shareRequests.get(shareId);
      const permission = this.activeShares.get(shareId);

      if (!shareRequest || !permission) {
        throw new Error(`Share ${shareId} not found`);
      }

      // Check if requester is the original sharer or context owner
      const context = await contextStorage.getContext(shareRequest.contextId, requesterId);
      if (!context) {
        throw new Error(`Context ${shareRequest.contextId} not found`);
      }

      if (context.access.ownerId !== requesterId && shareRequest.requesterId !== requesterId) {
        throw new Error('Insufficient permissions to revoke share');
      }

      // Remove permission from context
      const updatedContext = { ...context };
      updatedContext.access.permissions = updatedContext.access.permissions.filter(
        p => !(p.principalId === permission.principalId && 
               p.principalType === permission.principalType &&
               p.grantedAt.getTime() === permission.grantedAt.getTime())
      );

      // Update context
      await contextStorage.updateContext(
        shareRequest.contextId,
        { access: updatedContext.access },
        requesterId,
        `Revoked share for ${permission.principalType} ${permission.principalId}`
      );

      // Remove share records
      this.shareRequests.delete(shareId);
      this.activeShares.delete(shareId);

      // Notify target if it's an agent
      if (permission.principalType === PrincipalType.AGENT) {
        await this.notifyAgentOfShareRevocation(permission.principalId, shareRequest.contextId);
      }

      // Emit revocation event
      this.emit('context:share_revoked', {
        shareId,
        contextId: shareRequest.contextId,
        requesterId,
        targetId: permission.principalId,
        targetType: permission.principalType
      });

      logger.info('Context share revoked', {
        shareId,
        contextId: shareRequest.contextId,
        requesterId,
        targetId: permission.principalId
      });

      return true;

    } catch (error) {
      logger.error('Failed to revoke share', {
        shareId,
        requesterId,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Broadcast context to multiple agents
   */
  async broadcastContext(broadcast: ContextBroadcast): Promise<SyncResult[]> {
    try {
      // Validate broadcast
      await this.validateBroadcast(broadcast);

      const results: SyncResult[] = [];

      // Create sync requests for each target agent
      for (const targetAgent of broadcast.targetAgents) {
        const syncRequest: SyncRequest = {
          requestId: this.generateSyncRequestId(),
          sourceAgentId: broadcast.senderId,
          targetAgentIds: [targetAgent],
          contextIds: [broadcast.contextId],
          syncMode: SyncMode.SELECTIVE,
          conflictResolution: ConflictResolution.SOURCE_WINS,
          priority: broadcast.priority
        };

        const result = await this.synchronizeContext(syncRequest);
        results.push(result);
      }

      // Store broadcast history
      const history = this.broadcastHistory.get(broadcast.senderId) || [];
      history.push(broadcast);
      if (history.length > this.maxHistorySize) {
        history.shift();
      }
      this.broadcastHistory.set(broadcast.senderId, history);

      // Emit broadcast event
      this.emit('context:broadcast', {
        contextId: broadcast.contextId,
        senderId: broadcast.senderId,
        targetCount: broadcast.targetAgents.length,
        successCount: results.filter(r => r.status === SyncStatus.COMPLETED).length
      });

      logger.info('Context broadcast completed', {
        contextId: broadcast.contextId,
        senderId: broadcast.senderId,
        targetCount: broadcast.targetAgents.length,
        successCount: results.filter(r => r.status === SyncStatus.COMPLETED).length
      });

      return results;

    } catch (error) {
      logger.error('Failed to broadcast context', {
        contextId: broadcast.contextId,
        senderId: broadcast.senderId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Subscribe agent to context updates
   */
  async subscribeToContexts(agentId: string, filter: SubscriptionFilter): Promise<boolean> {
    try {
      const existingSubscriptions = this.subscriptions.get(agentId) || [];
      existingSubscriptions.push(filter);
      this.subscriptions.set(agentId, existingSubscriptions);

      // Emit subscription event
      this.emit('context:subscribed', {
        agentId,
        filter
      });

      logger.info('Agent subscribed to context updates', {
        agentId,
        filter
      });

      return true;

    } catch (error) {
      logger.error('Failed to subscribe to contexts', {
        agentId,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Unsubscribe agent from context updates
   */
  async unsubscribeFromContexts(agentId: string, filterId?: string): Promise<boolean> {
    try {
      if (filterId) {
        // Remove specific subscription
        const subscriptions = this.subscriptions.get(agentId) || [];
        const updatedSubscriptions = subscriptions.filter(sub => sub.agentId !== filterId);
        this.subscriptions.set(agentId, updatedSubscriptions);
      } else {
        // Remove all subscriptions for agent
        this.subscriptions.delete(agentId);
      }

      // Emit unsubscription event
      this.emit('context:unsubscribed', {
        agentId,
        filterId
      });

      logger.info('Agent unsubscribed from context updates', {
        agentId,
        filterId
      });

      return true;

    } catch (error) {
      logger.error('Failed to unsubscribe from contexts', {
        agentId,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Synchronize context between agents
   */
  async synchronizeContext(request: SyncRequest): Promise<SyncResult> {
    try {
      // Create sync result
      const result: SyncResult = {
        requestId: request.requestId,
        status: SyncStatus.PENDING,
        startedAt: new Date(),
        contextsSynced: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        errors: [],
        statistics: {
          totalContexts: request.contextIds.length,
          successfulSyncs: 0,
          failedSyncs: 0,
          averageSyncTime: 0,
          dataTransferred: 0,
          compressionRatio: 0
        }
      };

      // Store sync request and result
      this.syncQueue.set(request.requestId, request);
      this.activeSyncs.set(request.requestId, result);

      // Update status to in progress
      result.status = SyncStatus.IN_PROGRESS;
      this.activeSyncs.set(request.requestId, result);

      // Process each context
      for (const contextId of request.contextIds) {
        try {
          const success = await this.syncSingleContext(
            contextId,
            request.sourceAgentId,
            request.targetAgentIds,
            request.syncMode,
            request.conflictResolution
          );

          if (success) {
            result.contextsSynced++;
            result.statistics.successfulSyncs++;
          } else {
            result.statistics.failedSyncs++;
            result.errors.push({
              contextId,
              agentId: request.sourceAgentId,
              errorCode: 'SYNC_FAILED',
              message: 'Failed to sync context'
            });
          }

        } catch (error) {
          result.statistics.failedSyncs++;
          result.errors.push({
            contextId,
            agentId: request.sourceAgentId,
            errorCode: 'SYNC_ERROR',
            message: (error as Error).message
          });
        }
      }

      // Complete sync
      result.status = result.statistics.failedSyncs === 0 ? SyncStatus.COMPLETED : SyncStatus.PARTIAL;
      result.completedAt = new Date();
      result.statistics.averageSyncTime = result.completedAt.getTime() - result.startedAt.getTime();

      this.activeSyncs.set(request.requestId, result);

      // Clean up
      this.syncQueue.delete(request.requestId);

      // Emit sync completion event
      this.emit('context:sync_completed', {
        requestId: request.requestId,
        status: result.status,
        contextsSynced: result.contextsSynced,
        errors: result.errors.length
      });

      logger.info('Context synchronization completed', {
        requestId: request.requestId,
        status: result.status,
        contextsSynced: result.contextsSynced,
        errors: result.errors.length,
        duration: result.statistics.averageSyncTime
      });

      return result;

    } catch (error) {
      logger.error('Failed to synchronize context', {
        requestId: request.requestId,
        error: (error as Error).message
      });

      const errorResult: SyncResult = {
        requestId: request.requestId,
        status: SyncStatus.FAILED,
        startedAt: new Date(),
        completedAt: new Date(),
        contextsSynced: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        errors: [{
          contextId: '',
          agentId: request.sourceAgentId,
          errorCode: 'SYNC_FAILED',
          message: (error as Error).message
        }],
        statistics: {
          totalContexts: request.contextIds.length,
          successfulSyncs: 0,
          failedSyncs: request.contextIds.length,
          averageSyncTime: 0,
          dataTransferred: 0,
          compressionRatio: 0
        }
      };

      this.activeSyncs.set(request.requestId, errorResult);
      return errorResult;
    }
  }

  /**
   * Get sharing statistics
   */
  getSharingStats() {
    const activeSharesCount = this.activeShares.size;
    const totalSubscriptions = Array.from(this.subscriptions.values())
      .reduce((sum, subs) => sum + subs.length, 0);
    const activeSyncsCount = Array.from(this.activeSyncs.values())
      .filter(sync => sync.status === SyncStatus.IN_PROGRESS).length;

    const sharesByType = Array.from(this.activeShares.values())
      .reduce((acc, permission) => {
        acc[permission.principalType] = (acc[permission.principalType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const recentSyncs = Array.from(this.activeSyncs.values())
      .filter(sync => sync.completedAt && 
        (Date.now() - sync.completedAt.getTime()) < 24 * 60 * 60 * 1000) // Last 24 hours
      .length;

    return {
      activeShares: activeSharesCount,
      sharesByType,
      totalSubscriptions,
      activeSyncs: activeSyncsCount,
      recentSyncs,
      queuedSyncs: this.syncQueue.size,
      totalBroadcasts: Array.from(this.broadcastHistory.values())
        .reduce((sum, history) => sum + history.length, 0),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate share request
   */
  private async validateShareRequest(request: ShareRequest): Promise<void> {
    if (!request.contextId || !request.requesterId || !request.targetId) {
      throw new Error('Missing required fields in share request');
    }

    if (!request.permissions || request.permissions.length === 0) {
      throw new Error('At least one permission must be specified');
    }

    if (!Object.values(PrincipalType).includes(request.targetType)) {
      throw new Error('Invalid target type');
    }

    // Check if target exists (for agents)
    if (request.targetType === PrincipalType.AGENT) {
      const agent = agentRegistry.getAgent(request.targetId);
      if (!agent) {
        throw new Error(`Target agent ${request.targetId} not found`);
      }
    }
  }

  /**
   * Validate broadcast request
   */
  private async validateBroadcast(broadcast: ContextBroadcast): Promise<void> {
    if (!broadcast.contextId || !broadcast.senderId) {
      throw new Error('Missing required fields in broadcast request');
    }

    if (!broadcast.targetAgents || broadcast.targetAgents.length === 0) {
      throw new Error('At least one target agent must be specified');
    }

    // Check if all target agents exist
    for (const agentId of broadcast.targetAgents) {
      const agent = agentRegistry.getAgent(agentId);
      if (!agent) {
        throw new Error(`Target agent ${agentId} not found`);
      }
    }
  }

  /**
   * Check if user has permission
   */
  private hasPermission(context: Context, userId: string, permission: Permission): boolean {
    // Owner has all permissions
    if (context.access.ownerId === userId) {
      return true;
    }

    // Check explicit permissions
    const userPermission = context.access.permissions.find(p => 
      p.principalId === userId && p.principalType === PrincipalType.USER
    );

    if (userPermission && userPermission.permissions.includes(permission)) {
      // Check if permission has expired
      if (userPermission.expiresAt && userPermission.expiresAt < new Date()) {
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Notify agent of new share
   */
  private async notifyAgentOfShare(
    agentId: string, 
    context: Context, 
    permission: ContextPermission
  ): Promise<void> {
    // This would integrate with agent communication service
    // For now, just emit an event
    this.emit('agent:context_shared', {
      agentId,
      contextId: context.id,
      permissions: permission.permissions,
      sharedBy: permission.grantedBy
    });
  }

  /**
   * Notify agent of share revocation
   */
  private async notifyAgentOfShareRevocation(agentId: string, contextId: string): Promise<void> {
    this.emit('agent:context_share_revoked', {
      agentId,
      contextId
    });
  }

  /**
   * Sync single context
   */
  private async syncSingleContext(
    contextId: string,
    sourceAgentId: string,
    targetAgentIds: string[],
    syncMode: SyncMode,
    conflictResolution: ConflictResolution
  ): Promise<boolean> {
    try {
      // Get source context
      const sourceContext = await contextStorage.getContext(contextId, sourceAgentId);
      if (!sourceContext) {
        throw new Error(`Source context ${contextId} not found`);
      }

      // Sync to each target agent
      for (const targetAgentId of targetAgentIds) {
        // Check if target already has this context
        const targetContext = await contextStorage.getContext(contextId, targetAgentId);

        if (targetContext) {
          // Handle conflict resolution
          const resolvedContext = await this.resolveConflict(
            sourceContext,
            targetContext,
            conflictResolution
          );

          await contextStorage.updateContext(
            contextId,
            resolvedContext,
            sourceAgentId,
            `Synced from ${sourceAgentId}`
          );
        } else {
          // Create new context for target agent
          const newContext: Context = {
            ...sourceContext,
            id: contextId,
            access: {
              ...sourceContext.access,
              ownerId: targetAgentId,
              permissions: []
            }
          };

          await contextStorage.storeContext(newContext);
        }
      }

      return true;

    } catch (error) {
      logger.error('Failed to sync single context', {
        contextId,
        sourceAgentId,
        targetAgentIds,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Resolve context conflicts
   */
  private async resolveConflict(
    sourceContext: Context,
    targetContext: Context,
    resolution: ConflictResolution
  ): Promise<Partial<Context>> {
    switch (resolution) {
      case ConflictResolution.SOURCE_WINS:
        return sourceContext;
      case ConflictResolution.TARGET_WINS:
        return targetContext;
      case ConflictResolution.LATEST_WINS:
        return sourceContext.updatedAt > targetContext.updatedAt ? sourceContext : targetContext;
      case ConflictResolution.MERGE:
        // Simple merge - in production would be more sophisticated
        return {
          ...targetContext,
          data: {
            ...targetContext.data,
            ...sourceContext.data
          },
          updatedAt: new Date()
        };
      default:
        return sourceContext;
    }
  }

  /**
   * Generate share ID
   */
  private generateShareId(): string {
    return `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate sync request ID
   */
  private generateSyncRequestId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Listen to context updates for notifications
    contextStorage.on('context:updated', (event) => {
      this.handleContextUpdate(event);
    });

    contextStorage.on('context:stored', (event) => {
      this.handleNewContext(event);
    });
  }

  /**
   * Handle context updates for subscriptions
   */
  private handleContextUpdate(event: any): void {
    // Notify subscribed agents
    for (const [agentId, filters] of this.subscriptions) {
      for (const filter of filters) {
        if (this.matchesFilter(event, filter)) {
          this.emit('context:update_notification', {
            agentId,
            contextId: event.contextId,
            updateType: 'update'
          });
        }
      }
    }
  }

  /**
   * Handle new context for subscriptions
   */
  private handleNewContext(event: any): void {
    // Notify subscribed agents
    for (const [agentId, filters] of this.subscriptions) {
      for (const filter of filters) {
        if (this.matchesFilter(event, filter)) {
          this.emit('context:update_notification', {
            agentId,
            contextId: event.contextId,
            updateType: 'new'
          });
        }
      }
    }
  }

  /**
   * Check if event matches subscription filter
   */
  private matchesFilter(event: any, filter: SubscriptionFilter): boolean {
    // Simple implementation - could be enhanced
    return true;
  }

  /**
   * Start sync processor
   */
  private startSyncProcessor(): void {
    setInterval(() => {
      this.processSyncQueue();
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process sync queue
   */
  private processSyncQueue(): void {
    // Process pending sync requests
    // Implementation would handle queued syncs
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Context Sharing Service...');

    // Clear all data
    this.shareRequests.clear();
    this.activeShares.clear();
    this.subscriptions.clear();
    this.syncQueue.clear();
    this.activeSyncs.clear();
    this.broadcastHistory.clear();

    logger.info('Context Sharing Service shutdown complete');
  }
}

export const contextSharing = new ContextSharingService();