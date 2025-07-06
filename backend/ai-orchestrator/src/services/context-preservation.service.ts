import { EventEmitter } from 'events';
import {
  ContextPreservationConfig,
  CompressionLevel,
  SelectivePreservationRules,
  HandoffSummary,
  KeyInformation,
  InformationType,
  TaskProgress,
  UserState,
  ExperienceLevel,
  CommunicationStyle
} from '@/types/switching.types';
import {
  Context,
  ContextType,
  ContextScope
} from '@/types/context.types';
import logger from '@/config/logger';
import { contextStorage } from './context-storage.service';
import { memoryManager } from './memory-manager.service';

export interface PreservationResult {
  success: boolean;
  preservedContextId: string;
  originalSize: number;
  compressedSize: number;
  preservationLevel: string;
  itemsPreserved: number;
  itemsFiltered: number;
  compressionRatio: number;
  processingTime: number;
  errors?: string[];
}

export interface ContextSnapshot {
  timestamp: Date;
  conversationHistory: ConversationMessage[];
  userState: UserState;
  taskState: TaskProgress;
  systemState: SystemState;
  metadata: SnapshotMetadata;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  metadata?: Record<string, any>;
  importance: number;
  messageType: MessageType;
}

export enum MessageType {
  QUERY = 'query',
  RESPONSE = 'response',
  CLARIFICATION = 'clarification',
  INSTRUCTION = 'instruction',
  FEEDBACK = 'feedback',
  ERROR = 'error',
  SYSTEM_MESSAGE = 'system_message'
}

export interface SystemState {
  activeContexts: string[];
  runningTasks: string[];
  currentCapabilities: string[];
  resourceUsage: ResourceUsage;
  configurationState: Record<string, any>;
}

export interface ResourceUsage {
  memoryUsage: number;
  cpuUsage: number;
  networkUsage: number;
  storageUsage: number;
}

export interface SnapshotMetadata {
  agentId: string;
  sessionId: string;
  conversationId: string;
  userId?: string;
  snapshotReason: string;
  qualityScore: number;
  compressionApplied: boolean;
}

export class ContextPreservationService extends EventEmitter {
  private preservedContexts: Map<string, Context> = new Map();
  private contextSnapshots: Map<string, ContextSnapshot> = new Map();
  private preservationHistory: Map<string, PreservationResult[]> = new Map();
  private readonly maxSnapshotAge = 24 * 60 * 60 * 1000; // 24 hours
  private readonly maxHistorySize = 1000;

  constructor() {
    super();
    this.setupCleanupScheduler();
  }

  /**
   * Create comprehensive context snapshot for agent switching
   */
  async createContextSnapshot(
    agentId: string,
    sessionId: string,
    conversationId: string,
    reason: string
  ): Promise<ContextSnapshot> {
    try {
      const startTime = Date.now();

      // Gather conversation history
      const conversationHistory = await this.gatherConversationHistory(conversationId);

      // Extract user state
      const userState = await this.extractUserState(sessionId, conversationHistory);

      // Extract task state
      const taskState = await this.extractTaskState(agentId, sessionId);

      // Capture system state
      const systemState = await this.captureSystemState(agentId);

      // Calculate quality score
      const qualityScore = this.calculateSnapshotQuality(
        conversationHistory,
        userState,
        taskState,
        systemState
      );

      const snapshot: ContextSnapshot = {
        timestamp: new Date(),
        conversationHistory,
        userState,
        taskState,
        systemState,
        metadata: {
          agentId,
          sessionId,
          conversationId,
          snapshotReason: reason,
          qualityScore,
          compressionApplied: false
        }
      };

      // Store snapshot
      this.contextSnapshots.set(`${sessionId}-${agentId}`, snapshot);

      // Emit snapshot creation event
      this.emit('snapshot:created', {
        agentId,
        sessionId,
        conversationId,
        qualityScore,
        processingTime: Date.now() - startTime
      });

      logger.info('Context snapshot created', {
        agentId,
        sessionId,
        conversationId,
        qualityScore: Math.round(qualityScore * 100) / 100,
        messagesCount: conversationHistory.length,
        processingTime: Date.now() - startTime
      });

      return snapshot;

    } catch (error) {
      logger.error('Failed to create context snapshot', {
        agentId,
        sessionId,
        conversationId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Preserve context for agent handoff
   */
  async preserveContextForHandoff(
    currentAgentId: string,
    sessionId: string,
    config: ContextPreservationConfig
  ): Promise<PreservationResult> {
    try {
      const startTime = Date.now();

      // Get current snapshot
      const snapshot = this.contextSnapshots.get(`${sessionId}-${currentAgentId}`);
      if (!snapshot) {
        throw new Error(`No context snapshot found for session ${sessionId} and agent ${currentAgentId}`);
      }

      // Apply preservation rules
      const filteredSnapshot = await this.applyPreservationRules(snapshot, config);

      // Apply compression if needed
      const compressedSnapshot = await this.applyCompression(filteredSnapshot, config.contextCompressionLevel);

      // Calculate sizes
      const originalSize = this.calculateSnapshotSize(snapshot);
      const compressedSize = this.calculateSnapshotSize(compressedSnapshot);
      const compressionRatio = compressedSize / originalSize;

      // Create preserved context
      const preservedContextId = await this.createPreservedContext(compressedSnapshot, config);

      // Count preserved vs filtered items
      const originalItemCount = this.countSnapshotItems(snapshot);
      const preservedItemCount = this.countSnapshotItems(compressedSnapshot);

      const result: PreservationResult = {
        success: true,
        preservedContextId,
        originalSize,
        compressedSize,
        preservationLevel: this.getPreservationLevel(config),
        itemsPreserved: preservedItemCount,
        itemsFiltered: originalItemCount - preservedItemCount,
        compressionRatio,
        processingTime: Date.now() - startTime
      };

      // Store preservation history
      const history = this.preservationHistory.get(sessionId) || [];
      history.push(result);
      if (history.length > this.maxHistorySize) {
        history.shift();
      }
      this.preservationHistory.set(sessionId, history);

      // Emit preservation event
      this.emit('context:preserved', {
        sessionId,
        currentAgentId,
        preservedContextId,
        compressionRatio,
        preservationLevel: result.preservationLevel
      });

      logger.info('Context preserved for handoff', {
        sessionId,
        currentAgentId,
        preservedContextId,
        originalSizeMB: originalSize / (1024 * 1024),
        compressedSizeMB: compressedSize / (1024 * 1024),
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        itemsPreserved: preservedItemCount,
        itemsFiltered: originalItemCount - preservedItemCount,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logger.error('Failed to preserve context for handoff', {
        currentAgentId,
        sessionId,
        error: (error as Error).message
      });

      return {
        success: false,
        preservedContextId: '',
        originalSize: 0,
        compressedSize: 0,
        preservationLevel: 'none',
        itemsPreserved: 0,
        itemsFiltered: 0,
        compressionRatio: 0,
        processingTime: Date.now() - startTime,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Generate handoff summary for new agent
   */
  async generateHandoffSummary(
    preservedContextId: string,
    targetAgentId: string,
    config: ContextPreservationConfig
  ): Promise<HandoffSummary> {
    try {
      // Retrieve preserved context
      const preservedContext = await contextStorage.getContext(preservedContextId, 'system');
      if (!preservedContext) {
        throw new Error(`Preserved context ${preservedContextId} not found`);
      }

      const snapshot = preservedContext.data.content as ContextSnapshot;

      // Extract key information
      const keyInformation = await this.extractKeyInformation(snapshot);

      // Generate conversation summary
      const conversationSummary = await this.generateConversationSummary(snapshot.conversationHistory);

      // Generate recommendations
      const recommendations = await this.generateHandoffRecommendations(snapshot, targetAgentId);

      const handoffSummary: HandoffSummary = {
        contextTransferred: true,
        contextSize: this.calculateSnapshotSize(snapshot),
        preservationLevel: this.getPreservationLevel(config),
        keyInformation,
        conversationSummary,
        taskProgress: snapshot.taskState,
        userState: snapshot.userState,
        recommendations
      };

      // Emit handoff summary generation event
      this.emit('handoff:summary_generated', {
        preservedContextId,
        targetAgentId,
        keyInformationCount: keyInformation.length,
        recommendationsCount: recommendations.length
      });

      logger.info('Handoff summary generated', {
        preservedContextId,
        targetAgentId,
        contextSizeMB: handoffSummary.contextSize / (1024 * 1024),
        keyInformationCount: keyInformation.length,
        recommendationsCount: recommendations.length
      });

      return handoffSummary;

    } catch (error) {
      logger.error('Failed to generate handoff summary', {
        preservedContextId,
        targetAgentId,
        error: (error as Error).message
      });

      return {
        contextTransferred: false,
        contextSize: 0,
        preservationLevel: 'none',
        keyInformation: [],
        recommendations: [`Error generating handoff summary: ${(error as Error).message}`]
      };
    }
  }

  /**
   * Restore context for new agent
   */
  async restoreContextForAgent(
    preservedContextId: string,
    newAgentId: string,
    sessionId: string
  ): Promise<boolean> {
    try {
      // Retrieve preserved context
      const preservedContext = await contextStorage.getContext(preservedContextId, 'system');
      if (!preservedContext) {
        throw new Error(`Preserved context ${preservedContextId} not found`);
      }

      const snapshot = preservedContext.data.content as ContextSnapshot;

      // Update snapshot metadata
      snapshot.metadata.agentId = newAgentId;
      snapshot.timestamp = new Date();

      // Store restored snapshot
      this.contextSnapshots.set(`${sessionId}-${newAgentId}`, snapshot);

      // Emit restoration event
      this.emit('context:restored', {
        preservedContextId,
        newAgentId,
        sessionId,
        restoredAt: new Date()
      });

      logger.info('Context restored for new agent', {
        preservedContextId,
        newAgentId,
        sessionId,
        messagesCount: snapshot.conversationHistory.length
      });

      return true;

    } catch (error) {
      logger.error('Failed to restore context for agent', {
        preservedContextId,
        newAgentId,
        sessionId,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Get preservation statistics
   */
  getPreservationStats() {
    const totalSnapshots = this.contextSnapshots.size;
    const totalPreserved = this.preservedContexts.size;
    const totalHistory = Array.from(this.preservationHistory.values())
      .reduce((sum, history) => sum + history.length, 0);

    const successfulPreservations = Array.from(this.preservationHistory.values())
      .flat()
      .filter(result => result.success).length;

    const averageCompressionRatio = Array.from(this.preservationHistory.values())
      .flat()
      .filter(result => result.success)
      .reduce((sum, result) => sum + result.compressionRatio, 0) / successfulPreservations || 0;

    const averageProcessingTime = Array.from(this.preservationHistory.values())
      .flat()
      .filter(result => result.success)
      .reduce((sum, result) => sum + result.processingTime, 0) / successfulPreservations || 0;

    const snapshotsArray = Array.from(this.contextSnapshots.values());
    const averageQualityScore = snapshotsArray.length > 0
      ? snapshotsArray.reduce((sum, snapshot) => sum + snapshot.metadata.qualityScore, 0) / snapshotsArray.length
      : 0;

    return {
      totalSnapshots,
      totalPreserved,
      totalHistory,
      successRate: totalHistory > 0 ? (successfulPreservations / totalHistory) * 100 : 0,
      averageCompressionRatio: Math.round(averageCompressionRatio * 100) / 100,
      averageProcessingTime: Math.round(averageProcessingTime),
      averageQualityScore: Math.round(averageQualityScore * 100) / 100,
      oldestSnapshot: snapshotsArray.length > 0 
        ? Math.min(...snapshotsArray.map(s => s.timestamp.getTime()))
        : null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Gather conversation history from multiple sources
   */
  private async gatherConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
    try {
      // Search for conversation contexts
      const searchResult = await contextStorage.searchContexts({
        filters: [
          {
            field: 'metadata.conversationId',
            operator: 'equals',
            value: conversationId
          },
          {
            field: 'type',
            operator: 'equals',
            value: ContextType.CONVERSATION
          }
        ],
        sorting: [
          {
            field: 'createdAt',
            direction: 'asc',
            priority: 1
          }
        ],
        pagination: { page: 1, limit: 1000 },
        includeRelated: false,
        includeArchived: false
      });

      const messages: ConversationMessage[] = [];

      for (const context of searchResult.contexts) {
        if (context.data.content.messages) {
          const contextMessages = context.data.content.messages as ConversationMessage[];
          messages.push(...contextMessages);
        }
      }

      // Sort by timestamp and calculate importance
      return messages
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .map(msg => ({
          ...msg,
          importance: this.calculateMessageImportance(msg)
        }));

    } catch (error) {
      logger.warn('Failed to gather conversation history', {
        conversationId,
        error: (error as Error).message
      });
      return [];
    }
  }

  /**
   * Extract user state from conversation and session data
   */
  private async extractUserState(sessionId: string, messages: ConversationMessage[]): Promise<UserState> {
    // Analyze conversation for user state indicators
    const recentMessages = messages.slice(-10); // Last 10 messages
    
    let satisfactionLevel = 0.5; // Default neutral
    let engagementLevel = 0.5;
    const frustrationIndicators: string[] = [];

    // Simple sentiment analysis
    for (const message of recentMessages) {
      if (message.role === 'user') {
        const content = message.content.toLowerCase();
        
        // Satisfaction indicators
        if (content.includes('thank') || content.includes('great') || content.includes('perfect')) {
          satisfactionLevel += 0.1;
        }
        if (content.includes('frustrat') || content.includes('annoying') || content.includes('wrong')) {
          satisfactionLevel -= 0.1;
          frustrationIndicators.push('Negative sentiment detected');
        }

        // Engagement indicators
        if (content.length > 50) {
          engagementLevel += 0.05;
        }
        if (content.includes('?')) {
          engagementLevel += 0.05;
        }
      }
    }

    // Detect communication style
    let communicationStyle = CommunicationStyle.CASUAL;
    const formalIndicators = ['please', 'thank you', 'could you', 'would you'];
    const technicalIndicators = ['api', 'algorithm', 'database', 'function'];
    
    const allUserMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');
    
    if (formalIndicators.some(indicator => allUserMessages.includes(indicator))) {
      communicationStyle = CommunicationStyle.FORMAL;
    } else if (technicalIndicators.some(indicator => allUserMessages.includes(indicator))) {
      communicationStyle = CommunicationStyle.TECHNICAL;
    }

    // Detect expertise level
    let expertiseLevel = ExperienceLevel.INTERMEDIATE;
    const beginnerIndicators = ['what is', 'how to', 'explain', 'basic'];
    const expertIndicators = ['optimize', 'implement', 'advanced', 'performance'];
    
    if (beginnerIndicators.some(indicator => allUserMessages.includes(indicator))) {
      expertiseLevel = ExperienceLevel.NOVICE;
    } else if (expertIndicators.some(indicator => allUserMessages.includes(indicator))) {
      expertiseLevel = ExperienceLevel.EXPERT;
    }

    return {
      satisfactionLevel: Math.max(0, Math.min(1, satisfactionLevel)),
      engagementLevel: Math.max(0, Math.min(1, engagementLevel)),
      frustrationIndicators,
      communicationStyle,
      expertiseLevel,
      preferences: {
        messageLength: recentMessages.filter(m => m.role === 'user')
          .reduce((sum, m) => sum + m.content.length, 0) / Math.max(1, recentMessages.filter(m => m.role === 'user').length),
        responseStyle: 'detailed' // Could be inferred from interaction patterns
      }
    };
  }

  /**
   * Extract current task state
   */
  private async extractTaskState(agentId: string, sessionId: string): Promise<TaskProgress> {
    // Default task state
    return {
      stage: 'in_progress',
      completionPercentage: 50,
      completedSteps: ['initial_analysis', 'context_gathering'],
      remainingSteps: ['solution_implementation', 'verification', 'response_generation'],
      estimatedTimeRemaining: 30000 // 30 seconds
    };
  }

  /**
   * Capture current system state
   */
  private async captureSystemState(agentId: string): Promise<SystemState> {
    // Get memory usage
    const memoryStats = memoryManager.getMemoryStats();
    
    return {
      activeContexts: [], // Would be populated from actual context manager
      runningTasks: [], // Would be populated from task manager
      currentCapabilities: [], // Would be populated from agent registry
      resourceUsage: {
        memoryUsage: memoryStats.usedMemoryMB / memoryStats.totalMemoryMB,
        cpuUsage: 0.5, // Mock value
        networkUsage: 0.3, // Mock value
        storageUsage: 0.4 // Mock value
      },
      configurationState: {}
    };
  }

  /**
   * Calculate message importance score
   */
  private calculateMessageImportance(message: ConversationMessage): number {
    let importance = 0.5; // Base importance

    // Role-based importance
    if (message.role === 'user') {
      importance += 0.2; // User messages are generally more important
    }

    // Message type importance
    switch (message.messageType) {
      case MessageType.QUERY:
        importance += 0.3;
        break;
      case MessageType.INSTRUCTION:
        importance += 0.4;
        break;
      case MessageType.FEEDBACK:
        importance += 0.3;
        break;
      case MessageType.ERROR:
        importance += 0.5;
        break;
    }

    // Content-based importance
    const content = message.content.toLowerCase();
    if (content.includes('important') || content.includes('urgent') || content.includes('critical')) {
      importance += 0.3;
    }

    // Length-based importance (longer messages often contain more context)
    if (message.content.length > 100) {
      importance += 0.1;
    }

    // Recency boost (more recent messages are more important)
    const ageHours = (Date.now() - message.timestamp.getTime()) / (1000 * 60 * 60);
    if (ageHours < 1) {
      importance += 0.2;
    } else if (ageHours < 24) {
      importance += 0.1;
    }

    return Math.max(0, Math.min(1, importance));
  }

  /**
   * Calculate snapshot quality score
   */
  private calculateSnapshotQuality(
    messages: ConversationMessage[],
    userState: UserState,
    taskState: TaskProgress,
    systemState: SystemState
  ): number {
    let quality = 0;

    // Message history quality (0-0.4)
    if (messages.length > 0) {
      const avgImportance = messages.reduce((sum, msg) => sum + msg.importance, 0) / messages.length;
      const recencyScore = messages.length > 0 ? Math.min(1, messages.length / 10) : 0;
      quality += (avgImportance * 0.2) + (recencyScore * 0.2);
    }

    // User state quality (0-0.3)
    if (userState.satisfactionLevel !== undefined) {
      quality += userState.satisfactionLevel * 0.15;
    }
    if (userState.engagementLevel !== undefined) {
      quality += userState.engagementLevel * 0.15;
    }

    // Task state quality (0-0.2)
    if (taskState.completionPercentage > 0) {
      quality += Math.min(0.2, taskState.completionPercentage / 100 * 0.2);
    }

    // System state quality (0-0.1)
    const resourceHealth = 1 - Math.max(
      systemState.resourceUsage.memoryUsage,
      systemState.resourceUsage.cpuUsage
    );
    quality += resourceHealth * 0.1;

    return Math.max(0, Math.min(1, quality));
  }

  /**
   * Apply preservation rules to filter context
   */
  private async applyPreservationRules(
    snapshot: ContextSnapshot,
    config: ContextPreservationConfig
  ): Promise<ContextSnapshot> {
    const filteredSnapshot = { ...snapshot };

    if (!config.preserveFullContext) {
      // Apply selective preservation
      const rules = config.selectivePreservation;

      // Filter conversation history
      if (!config.preserveConversationHistory) {
        filteredSnapshot.conversationHistory = [];
      } else if (rules) {
        filteredSnapshot.conversationHistory = snapshot.conversationHistory.filter(msg => {
          // Keep high importance messages
          if (msg.importance >= rules.priorityThreshold) return true;

          // Keep recent messages
          if (rules.preserveRecent) {
            const ageMs = Date.now() - msg.timestamp.getTime();
            if (ageMs < rules.maxContextAge) return true;
          }

          // Keep high relevance messages
          if (rules.preserveHighRelevance && msg.importance > 0.7) return true;

          return false;
        });
      }

      // Filter user preferences
      if (!config.preserveUserPreferences) {
        filteredSnapshot.userState.preferences = {};
      }

      // Filter task state
      if (!config.preserveTaskState) {
        filteredSnapshot.taskState = {
          stage: 'unknown',
          completionPercentage: 0,
          completedSteps: [],
          remainingSteps: []
        };
      }

      // Filter temporary data
      if (!config.preserveTemporaryData) {
        filteredSnapshot.systemState.runningTasks = [];
        filteredSnapshot.systemState.activeContexts = [];
      }
    }

    return filteredSnapshot;
  }

  /**
   * Apply compression to context snapshot
   */
  private async applyCompression(
    snapshot: ContextSnapshot,
    level: CompressionLevel
  ): Promise<ContextSnapshot> {
    if (level === CompressionLevel.NONE) {
      return snapshot;
    }

    const compressedSnapshot = { ...snapshot };

    switch (level) {
      case CompressionLevel.LIGHT:
        // Remove metadata from messages
        compressedSnapshot.conversationHistory = snapshot.conversationHistory.map(msg => ({
          ...msg,
          metadata: undefined
        }));
        break;

      case CompressionLevel.MEDIUM:
        // Summarize older messages
        const cutoffTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours
        compressedSnapshot.conversationHistory = snapshot.conversationHistory.map(msg => {
          if (msg.timestamp.getTime() < cutoffTime && msg.content.length > 100) {
            return {
              ...msg,
              content: msg.content.substring(0, 100) + '...',
              metadata: undefined
            };
          }
          return { ...msg, metadata: undefined };
        });
        break;

      case CompressionLevel.AGGRESSIVE:
        // Keep only essential information
        compressedSnapshot.conversationHistory = snapshot.conversationHistory
          .filter(msg => msg.importance > 0.7)
          .map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content,
            timestamp: msg.timestamp,
            importance: msg.importance,
            messageType: msg.messageType
          }));
        
        // Simplify system state
        compressedSnapshot.systemState = {
          activeContexts: [],
          runningTasks: [],
          currentCapabilities: [],
          resourceUsage: snapshot.systemState.resourceUsage,
          configurationState: {}
        };
        break;
    }

    compressedSnapshot.metadata.compressionApplied = true;
    return compressedSnapshot;
  }

  /**
   * Create preserved context in storage
   */
  private async createPreservedContext(
    snapshot: ContextSnapshot,
    config: ContextPreservationConfig
  ): Promise<string> {
    const preservedContext: Context = {
      id: '', // Will be generated by storage
      type: ContextType.AGENT_MEMORY,
      scope: ContextScope.SESSION_SPECIFIC,
      data: {
        content: snapshot,
        summary: `Preserved context for agent handoff - ${snapshot.metadata.sessionId}`,
        keywords: ['handoff', 'preserved', 'agent-switch'],
        entities: [],
        insights: [],
        references: []
      },
      metadata: {
        title: `Preserved Context - ${snapshot.metadata.sessionId}`,
        description: `Context preserved for agent switching from ${snapshot.metadata.agentId}`,
        tags: ['preserved', 'handoff', 'agent-switch'],
        priority: 'high',
        sensitivity: 'internal',
        quality: {
          accuracy: snapshot.metadata.qualityScore,
          completeness: config.preserveFullContext ? 1.0 : 0.8,
          freshness: 1.0,
          relevance: 0.9,
          consistency: 0.9
        },
        usage: {
          accessCount: 0,
          sharedCount: 0,
          modificationCount: 0,
          averageRelevanceScore: 0.9
        }
      },
      relationships: [],
      access: {
        ownerId: 'system',
        permissions: [],
        shareableWithAgents: [],
        shareableWithUsers: [],
        isPublic: false,
        restrictions: []
      },
      lifecycle: {
        status: 'active',
        ttl: 24 * 60 * 60 * 1000, // 24 hours
        versionHistory: []
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    const contextId = await contextStorage.storeContext(preservedContext);
    return contextId;
  }

  /**
   * Calculate snapshot size in bytes
   */
  private calculateSnapshotSize(snapshot: ContextSnapshot): number {
    return Buffer.byteLength(JSON.stringify(snapshot), 'utf8');
  }

  /**
   * Count items in snapshot
   */
  private countSnapshotItems(snapshot: ContextSnapshot): number {
    return snapshot.conversationHistory.length +
           Object.keys(snapshot.userState.preferences || {}).length +
           snapshot.taskState.completedSteps.length +
           snapshot.taskState.remainingSteps.length +
           snapshot.systemState.activeContexts.length +
           snapshot.systemState.runningTasks.length;
  }

  /**
   * Get preservation level description
   */
  private getPreservationLevel(config: ContextPreservationConfig): string {
    if (config.preserveFullContext) {
      return 'full';
    }
    
    const preservationCount = [
      config.preserveConversationHistory,
      config.preserveUserPreferences,
      config.preserveTaskState,
      config.preserveTemporaryData
    ].filter(Boolean).length;

    if (preservationCount >= 3) return 'high';
    if (preservationCount >= 2) return 'medium';
    return 'low';
  }

  /**
   * Extract key information for handoff
   */
  private async extractKeyInformation(snapshot: ContextSnapshot): Promise<KeyInformation[]> {
    const keyInfo: KeyInformation[] = [];

    // User intent from recent messages
    const recentUserMessages = snapshot.conversationHistory
      .filter(msg => msg.role === 'user')
      .slice(-3);

    for (const message of recentUserMessages) {
      if (message.importance > 0.7) {
        keyInfo.push({
          type: InformationType.USER_INTENT,
          content: message.content,
          priority: message.importance,
          timestamp: message.timestamp,
          source: 'conversation_history'
        });
      }
    }

    // Task progress
    if (snapshot.taskState.completionPercentage > 0) {
      keyInfo.push({
        type: InformationType.TASK_STATE,
        content: `Task is ${snapshot.taskState.completionPercentage}% complete. Current stage: ${snapshot.taskState.stage}`,
        priority: 0.9,
        timestamp: snapshot.timestamp,
        source: 'task_manager'
      });
    }

    // User preferences
    if (snapshot.userState.communicationStyle) {
      keyInfo.push({
        type: InformationType.USER_PREFERENCE,
        content: `User prefers ${snapshot.userState.communicationStyle} communication style`,
        priority: 0.6,
        timestamp: snapshot.timestamp,
        source: 'user_analysis'
      });
    }

    // System state
    if (snapshot.systemState.resourceUsage.memoryUsage > 0.8) {
      keyInfo.push({
        type: InformationType.SYSTEM_STATE,
        content: 'High memory usage detected - may need optimization',
        priority: 0.7,
        timestamp: snapshot.timestamp,
        source: 'system_monitor'
      });
    }

    return keyInfo.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Generate conversation summary
   */
  private async generateConversationSummary(messages: ConversationMessage[]): Promise<string> {
    if (messages.length === 0) {
      return 'No conversation history available.';
    }

    const userMessages = messages.filter(msg => msg.role === 'user');
    const agentMessages = messages.filter(msg => msg.role === 'agent');

    const mainTopics = userMessages
      .map(msg => msg.content.toLowerCase())
      .join(' ')
      .split(' ')
      .filter(word => word.length > 4)
      .slice(0, 5);

    const summary = `Conversation involves ${userMessages.length} user messages and ${agentMessages.length} agent responses. ` +
                   `Main topics discussed: ${mainTopics.join(', ')}. ` +
                   `Latest user message: "${userMessages[userMessages.length - 1]?.content.substring(0, 100) || 'N/A'}"`;

    return summary;
  }

  /**
   * Generate handoff recommendations
   */
  private async generateHandoffRecommendations(
    snapshot: ContextSnapshot,
    targetAgentId: string
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // User state recommendations
    if (snapshot.userState.satisfactionLevel < 0.5) {
      recommendations.push('User appears frustrated - use empathetic approach and acknowledge previous interaction');
    }

    if (snapshot.userState.expertiseLevel === ExperienceLevel.NOVICE) {
      recommendations.push('User is a beginner - use simple explanations and avoid technical jargon');
    } else if (snapshot.userState.expertiseLevel === ExperienceLevel.EXPERT) {
      recommendations.push('User has expert knowledge - can use technical terminology and provide detailed explanations');
    }

    // Communication style recommendations
    switch (snapshot.userState.communicationStyle) {
      case CommunicationStyle.FORMAL:
        recommendations.push('Maintain formal communication style with polite language');
        break;
      case CommunicationStyle.TECHNICAL:
        recommendations.push('User prefers technical discussions - can dive deep into implementation details');
        break;
      case CommunicationStyle.CASUAL:
        recommendations.push('User prefers casual communication - use friendly and relaxed tone');
        break;
    }

    // Task state recommendations
    if (snapshot.taskState.completionPercentage > 50) {
      recommendations.push(`Task is ${snapshot.taskState.completionPercentage}% complete - focus on remaining steps`);
    }

    if (snapshot.taskState.blockers && snapshot.taskState.blockers.length > 0) {
      recommendations.push(`Address these blockers: ${snapshot.taskState.blockers.join(', ')}`);
    }

    // Context preservation recommendations
    if (snapshot.conversationHistory.length > 10) {
      recommendations.push('Extensive conversation history available - reference previous discussions when relevant');
    }

    return recommendations;
  }

  /**
   * Setup cleanup scheduler
   */
  private setupCleanupScheduler(): void {
    setInterval(() => {
      this.cleanupOldSnapshots();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Cleanup old snapshots
   */
  private cleanupOldSnapshots(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, snapshot] of this.contextSnapshots.entries()) {
      if (now - snapshot.timestamp.getTime() > this.maxSnapshotAge) {
        this.contextSnapshots.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleaned up old context snapshots', { cleanedCount });
    }
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Context Preservation Service...');

    // Clear all data
    this.preservedContexts.clear();
    this.contextSnapshots.clear();
    this.preservationHistory.clear();

    logger.info('Context Preservation Service shutdown complete');
  }
}

export const contextPreservation = new ContextPreservationService();