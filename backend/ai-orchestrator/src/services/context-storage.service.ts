import { EventEmitter } from 'events';
import {
  Context,
  ContextType,
  ContextScope,
  ContextQuery,
  ContextSearchResult,
  ContextFilter,
  ContextVersion,
  ContextChange,
  ChangeOperation,
  ContextStatus,
  ContextPermission,
  Permission,
  PrincipalType
} from '@/types/context.types';
import logger from '@/config/logger';
import { metricsService } from './metrics.service';

export class ContextStorageService extends EventEmitter {
  private contexts: Map<string, Context> = new Map();
  private contextIndex: Map<string, Set<string>> = new Map(); // field -> context IDs
  private versionStore: Map<string, ContextVersion[]> = new Map();
  private accessLog: Map<string, { contextId: string; accessedAt: Date; accessedBy: string }[]> = new Map();
  private readonly maxCacheSize = 10000;
  private readonly maxVersions = 50;

  constructor() {
    super();
    this.setupIndexes();
    this.startCleanupScheduler();
  }

  /**
   * Store a new context
   */
  async storeContext(context: Context): Promise<string> {
    try {
      // Validate context
      this.validateContext(context);

      // Generate ID if not provided
      if (!context.id) {
        context.id = this.generateContextId();
      }

      // Set initial lifecycle properties
      context.createdAt = new Date();
      context.updatedAt = new Date();
      context.version = 1;
      context.lifecycle.status = ContextStatus.ACTIVE;

      // Initialize version history
      context.lifecycle.versionHistory = [{
        version: 1,
        changes: [{
          operation: ChangeOperation.CREATE,
          path: '/',
          newValue: context,
          reason: 'Initial context creation'
        }],
        createdAt: new Date(),
        createdBy: context.access.ownerId,
        checksum: this.calculateChecksum(context),
        size: this.calculateSize(context)
      }];

      // Store context
      this.contexts.set(context.id, context);

      // Update indexes
      this.updateIndexes(context);

      // Store version
      this.versionStore.set(context.id, [...context.lifecycle.versionHistory]);

      // Check cache size limit
      await this.enforceMemoryLimits();

      // Emit storage event
      this.emit('context:stored', {
        contextId: context.id,
        type: context.type,
        scope: context.scope,
        size: this.calculateSize(context)
      });

      // Update metrics
      metricsService.incrementCounter(
        metricsService.queueJobsTotal,
        { queue_name: 'context-storage', job_type: 'store', status: 'success' }
      );

      logger.info('Context stored successfully', {
        contextId: context.id,
        type: context.type,
        scope: context.scope,
        version: context.version
      });

      return context.id;

    } catch (error) {
      logger.error('Failed to store context', {
        contextId: context.id,
        error: (error as Error).message
      });

      metricsService.incrementCounter(
        metricsService.queueJobsTotal,
        { queue_name: 'context-storage', job_type: 'store', status: 'failed' }
      );

      throw error;
    }
  }

  /**
   * Retrieve a context by ID
   */
  async getContext(contextId: string, requesterId?: string): Promise<Context | null> {
    try {
      const context = this.contexts.get(contextId);
      
      if (!context) {
        return null;
      }

      // Check access permissions
      if (requesterId && !this.hasPermission(context, requesterId, Permission.READ)) {
        throw new Error(`Access denied to context ${contextId}`);
      }

      // Log access
      this.logAccess(contextId, requesterId || 'system');

      // Update usage statistics
      context.metadata.usage.accessCount++;
      context.metadata.usage.lastAccessed = new Date();

      // Update context in storage
      this.contexts.set(contextId, context);

      // Emit access event
      this.emit('context:accessed', {
        contextId,
        requesterId,
        timestamp: new Date()
      });

      logger.debug('Context retrieved', {
        contextId,
        requesterId,
        accessCount: context.metadata.usage.accessCount
      });

      return context;

    } catch (error) {
      logger.error('Failed to retrieve context', {
        contextId,
        requesterId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Update an existing context
   */
  async updateContext(
    contextId: string, 
    updates: Partial<Context>, 
    requesterId: string,
    reason?: string
  ): Promise<Context> {
    try {
      const existingContext = this.contexts.get(contextId);
      
      if (!existingContext) {
        throw new Error(`Context ${contextId} not found`);
      }

      // Check write permission
      if (!this.hasPermission(existingContext, requesterId, Permission.WRITE)) {
        throw new Error(`Write access denied to context ${contextId}`);
      }

      // Create new version
      const newVersion = existingContext.version + 1;
      const changes = this.calculateChanges(existingContext, updates);

      // Update context
      const updatedContext: Context = {
        ...existingContext,
        ...updates,
        id: contextId, // Ensure ID doesn't change
        version: newVersion,
        updatedAt: new Date(),
        metadata: {
          ...existingContext.metadata,
          ...updates.metadata,
          usage: {
            ...existingContext.metadata.usage,
            modificationCount: existingContext.metadata.usage.modificationCount + 1,
            ...updates.metadata?.usage
          }
        }
      };

      // Add version to history
      const versionEntry: ContextVersion = {
        version: newVersion,
        changes,
        createdAt: new Date(),
        createdBy: requesterId,
        checksum: this.calculateChecksum(updatedContext),
        size: this.calculateSize(updatedContext)
      };

      updatedContext.lifecycle.versionHistory.push(versionEntry);

      // Limit version history
      if (updatedContext.lifecycle.versionHistory.length > this.maxVersions) {
        updatedContext.lifecycle.versionHistory = updatedContext.lifecycle.versionHistory.slice(-this.maxVersions);
      }

      // Store updated context
      this.contexts.set(contextId, updatedContext);

      // Update indexes
      this.updateIndexes(updatedContext);

      // Update version store
      this.versionStore.set(contextId, [...updatedContext.lifecycle.versionHistory]);

      // Emit update event
      this.emit('context:updated', {
        contextId,
        version: newVersion,
        requesterId,
        changes,
        reason
      });

      logger.info('Context updated successfully', {
        contextId,
        version: newVersion,
        requesterId,
        changesCount: changes.length
      });

      return updatedContext;

    } catch (error) {
      logger.error('Failed to update context', {
        contextId,
        requesterId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Delete a context
   */
  async deleteContext(contextId: string, requesterId: string, force = false): Promise<void> {
    try {
      const context = this.contexts.get(contextId);
      
      if (!context) {
        throw new Error(`Context ${contextId} not found`);
      }

      // Check delete permission
      if (!this.hasPermission(context, requesterId, Permission.DELETE)) {
        throw new Error(`Delete access denied to context ${contextId}`);
      }

      if (force) {
        // Hard delete
        this.contexts.delete(contextId);
        this.versionStore.delete(contextId);
        this.removeFromIndexes(context);
      } else {
        // Soft delete - mark as deleted
        context.lifecycle.status = ContextStatus.DELETED;
        context.lifecycle.deleteAt = new Date();
        context.updatedAt = new Date();
        this.contexts.set(contextId, context);
      }

      // Emit delete event
      this.emit('context:deleted', {
        contextId,
        requesterId,
        force,
        timestamp: new Date()
      });

      logger.info('Context deleted', {
        contextId,
        requesterId,
        force
      });

    } catch (error) {
      logger.error('Failed to delete context', {
        contextId,
        requesterId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Search contexts
   */
  async searchContexts(query: ContextQuery, requesterId?: string): Promise<ContextSearchResult> {
    const startTime = Date.now();

    try {
      let candidateContexts = Array.from(this.contexts.values());

      // Filter by permissions if requester specified
      if (requesterId) {
        candidateContexts = candidateContexts.filter(context =>
          this.hasPermission(context, requesterId, Permission.READ)
        );
      }

      // Apply filters
      for (const filter of query.filters) {
        candidateContexts = this.applyFilter(candidateContexts, filter);
      }

      // Apply sorting
      if (query.sorting.length > 0) {
        candidateContexts = this.applySorting(candidateContexts, query.sorting);
      }

      // Calculate total count before pagination
      const totalCount = candidateContexts.length;

      // Apply pagination
      const { page, limit } = query.pagination;
      const offset = (page - 1) * limit;
      const paginatedContexts = candidateContexts.slice(offset, offset + limit);

      // Generate suggestions
      const suggestions = this.generateSearchSuggestions(query, candidateContexts);

      // Generate facets
      const facets = this.generateSearchFacets(candidateContexts);

      const searchTime = Date.now() - startTime;

      logger.debug('Context search completed', {
        requesterId,
        totalCount,
        returnedCount: paginatedContexts.length,
        searchTime,
        filtersCount: query.filters.length
      });

      return {
        contexts: paginatedContexts,
        totalCount,
        searchTime,
        suggestions,
        facets
      };

    } catch (error) {
      logger.error('Context search failed', {
        requesterId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get context versions
   */
  async getContextVersions(contextId: string, requesterId?: string): Promise<ContextVersion[]> {
    try {
      const context = this.contexts.get(contextId);
      
      if (!context) {
        throw new Error(`Context ${contextId} not found`);
      }

      // Check read permission
      if (requesterId && !this.hasPermission(context, requesterId, Permission.READ)) {
        throw new Error(`Access denied to context ${contextId}`);
      }

      const versions = this.versionStore.get(contextId) || [];

      logger.debug('Context versions retrieved', {
        contextId,
        requesterId,
        versionsCount: versions.length
      });

      return versions;

    } catch (error) {
      logger.error('Failed to get context versions', {
        contextId,
        requesterId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats() {
    const contexts = Array.from(this.contexts.values());
    
    const statsByType = contexts.reduce((acc, context) => {
      acc[context.type] = (acc[context.type] || 0) + 1;
      return acc;
    }, {} as Record<ContextType, number>);

    const statsByScope = contexts.reduce((acc, context) => {
      acc[context.scope] = (acc[context.scope] || 0) + 1;
      return acc;
    }, {} as Record<ContextScope, number>);

    const statsByStatus = contexts.reduce((acc, context) => {
      acc[context.lifecycle.status] = (acc[context.lifecycle.status] || 0) + 1;
      return acc;
    }, {} as Record<ContextStatus, number>);

    const totalSize = contexts.reduce((sum, context) => sum + this.calculateSize(context), 0);
    const totalVersions = Array.from(this.versionStore.values()).reduce((sum, versions) => sum + versions.length, 0);

    return {
      totalContexts: contexts.length,
      totalSize,
      totalVersions,
      cacheSize: this.contexts.size,
      statsByType,
      statsByScope,
      statsByStatus,
      indexesCount: this.contextIndex.size,
      averageSize: contexts.length > 0 ? Math.round(totalSize / contexts.length) : 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate context structure
   */
  private validateContext(context: Context): void {
    if (!context.type || !Object.values(ContextType).includes(context.type)) {
      throw new Error('Invalid context type');
    }

    if (!context.scope || !Object.values(ContextScope).includes(context.scope)) {
      throw new Error('Invalid context scope');
    }

    if (!context.data || typeof context.data !== 'object') {
      throw new Error('Context data is required');
    }

    if (!context.access || !context.access.ownerId) {
      throw new Error('Context access control is required');
    }

    if (!context.metadata) {
      throw new Error('Context metadata is required');
    }
  }

  /**
   * Generate unique context ID
   */
  private generateContextId(): string {
    return `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if user has permission to access context
   */
  private hasPermission(context: Context, requesterId: string, permission: Permission): boolean {
    // Owner has all permissions
    if (context.access.ownerId === requesterId) {
      return true;
    }

    // Check if context is public and permission is read
    if (context.access.isPublic && permission === Permission.READ) {
      return true;
    }

    // Check explicit permissions
    const userPermission = context.access.permissions.find(p => 
      p.principalId === requesterId && p.principalType === PrincipalType.USER
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
   * Log context access
   */
  private logAccess(contextId: string, requesterId: string): void {
    const accessEntry = {
      contextId,
      accessedAt: new Date(),
      accessedBy: requesterId
    };

    const existingLog = this.accessLog.get(contextId) || [];
    existingLog.push(accessEntry);

    // Keep only recent accesses
    if (existingLog.length > 100) {
      existingLog.splice(0, existingLog.length - 100);
    }

    this.accessLog.set(contextId, existingLog);
  }

  /**
   * Calculate changes between contexts
   */
  private calculateChanges(oldContext: Context, updates: Partial<Context>): ContextChange[] {
    const changes: ContextChange[] = [];

    // Simple implementation - in production, this would be more sophisticated
    for (const [key, newValue] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'version' && key !== 'updatedAt') {
        const oldValue = (oldContext as any)[key];
        
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes.push({
            operation: ChangeOperation.UPDATE,
            path: `/${key}`,
            oldValue,
            newValue,
            reason: 'Field updated'
          });
        }
      }
    }

    return changes;
  }

  /**
   * Calculate context size in bytes
   */
  private calculateSize(context: Context): number {
    return Buffer.byteLength(JSON.stringify(context), 'utf8');
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
   * Setup search indexes
   */
  private setupIndexes(): void {
    // Initialize common indexes
    this.contextIndex.set('type', new Set());
    this.contextIndex.set('scope', new Set());
    this.contextIndex.set('status', new Set());
    this.contextIndex.set('ownerId', new Set());
    this.contextIndex.set('tags', new Set());
  }

  /**
   * Update indexes when context is stored/updated
   */
  private updateIndexes(context: Context): void {
    this.contextIndex.get('type')?.add(context.id);
    this.contextIndex.get('scope')?.add(context.id);
    this.contextIndex.get('status')?.add(context.id);
    this.contextIndex.get('ownerId')?.add(context.id);
    
    // Index tags
    for (const tag of context.metadata.tags) {
      if (!this.contextIndex.has(`tag:${tag}`)) {
        this.contextIndex.set(`tag:${tag}`, new Set());
      }
      this.contextIndex.get(`tag:${tag}`)?.add(context.id);
    }
  }

  /**
   * Remove context from indexes
   */
  private removeFromIndexes(context: Context): void {
    for (const index of this.contextIndex.values()) {
      index.delete(context.id);
    }
  }

  /**
   * Apply filter to context list
   */
  private applyFilter(contexts: Context[], filter: ContextFilter): Context[] {
    return contexts.filter(context => {
      const fieldValue = this.getFieldValue(context, filter.field);
      return this.evaluateFilter(fieldValue, filter);
    });
  }

  /**
   * Get field value from context
   */
  private getFieldValue(context: Context, fieldPath: string): any {
    const parts = fieldPath.split('.');
    let value: any = context;
    
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    
    return value;
  }

  /**
   * Evaluate filter condition
   */
  private evaluateFilter(value: any, filter: ContextFilter): boolean {
    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'not_equals':
        return value !== filter.value;
      case 'contains':
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'not_contains':
        return !String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'starts_with':
        return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
      case 'ends_with':
        return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
      case 'greater_than':
        return value > filter.value;
      case 'less_than':
        return value < filter.value;
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value);
      case 'not_in':
        return Array.isArray(filter.value) && !filter.value.includes(value);
      case 'regex':
        try {
          const regex = new RegExp(filter.value, 'i');
          return regex.test(String(value));
        } catch {
          return false;
        }
      default:
        return true;
    }
  }

  /**
   * Apply sorting to context list
   */
  private applySorting(contexts: Context[], criteria: any[]): Context[] {
    return contexts.sort((a, b) => {
      for (const criterion of criteria) {
        const aValue = this.getFieldValue(a, criterion.field);
        const bValue = this.getFieldValue(b, criterion.field);
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
        
        if (criterion.direction === 'desc') {
          comparison = -comparison;
        }
        
        if (comparison !== 0) return comparison;
      }
      return 0;
    });
  }

  /**
   * Generate search suggestions
   */
  private generateSearchSuggestions(query: ContextQuery, results: Context[]): any[] {
    // Simple implementation - could be enhanced with ML
    const suggestions = [];
    
    // Suggest popular tags
    const tagCounts = new Map<string, number>();
    for (const context of results) {
      for (const tag of context.metadata.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    
    const popularTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => ({
        type: 'keyword',
        text: tag,
        confidence: 0.8
      }));
    
    suggestions.push(...popularTags);
    return suggestions;
  }

  /**
   * Generate search facets
   */
  private generateSearchFacets(results: Context[]): any[] {
    const facets = [];
    
    // Type facet
    const typeCounts = new Map<string, number>();
    for (const context of results) {
      typeCounts.set(context.type, (typeCounts.get(context.type) || 0) + 1);
    }
    
    facets.push({
      field: 'type',
      values: Array.from(typeCounts.entries()).map(([value, count]) => ({
        value,
        count,
        selected: false
      }))
    });
    
    return facets;
  }

  /**
   * Enforce memory limits
   */
  private async enforceMemoryLimits(): Promise<void> {
    if (this.contexts.size > this.maxCacheSize) {
      // Remove oldest contexts
      const contextsArray = Array.from(this.contexts.values());
      contextsArray.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
      
      const toRemove = contextsArray.slice(0, Math.floor(this.maxCacheSize * 0.1));
      
      for (const context of toRemove) {
        this.contexts.delete(context.id);
        this.removeFromIndexes(context);
      }
      
      logger.info('Memory limit enforced', {
        removedContexts: toRemove.length,
        remainingContexts: this.contexts.size
      });
    }
  }

  /**
   * Start cleanup scheduler
   */
  private startCleanupScheduler(): void {
    setInterval(async () => {
      await this.performCleanup();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Perform scheduled cleanup
   */
  private async performCleanup(): Promise<void> {
    try {
      const now = new Date();
      let cleanupCount = 0;

      for (const [contextId, context] of this.contexts.entries()) {
        // Clean up deleted contexts
        if (context.lifecycle.status === ContextStatus.DELETED && 
            context.lifecycle.deleteAt && 
            (now.getTime() - context.lifecycle.deleteAt.getTime()) > 7 * 24 * 60 * 60 * 1000) { // 7 days
          this.contexts.delete(contextId);
          this.versionStore.delete(contextId);
          this.removeFromIndexes(context);
          cleanupCount++;
        }
        
        // Clean up expired contexts
        if (context.lifecycle.ttl && 
            (now.getTime() - context.createdAt.getTime()) > context.lifecycle.ttl) {
          context.lifecycle.status = ContextStatus.ARCHIVED;
          context.lifecycle.archiveAt = now;
        }
      }

      // Clean up access logs
      for (const [contextId, accessLog] of this.accessLog.entries()) {
        const recentAccesses = accessLog.filter(
          access => (now.getTime() - access.accessedAt.getTime()) < 30 * 24 * 60 * 60 * 1000 // 30 days
        );
        
        if (recentAccesses.length !== accessLog.length) {
          this.accessLog.set(contextId, recentAccesses);
        }
      }

      if (cleanupCount > 0) {
        logger.info('Cleanup completed', { cleanupCount });
      }

    } catch (error) {
      logger.error('Cleanup failed', { error: (error as Error).message });
    }
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Context Storage Service...');

    // Clear all data
    this.contexts.clear();
    this.contextIndex.clear();
    this.versionStore.clear();
    this.accessLog.clear();

    logger.info('Context Storage Service shutdown complete');
  }
}

export const contextStorage = new ContextStorageService();