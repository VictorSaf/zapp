import { Server } from 'socket.io';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { agentService } from './agent.service.js';
import type { Express } from 'express';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
}

export interface SocketUser {
  userId: string;
  email: string;
  socketId: string;
  currentConversationId?: string;
  isTyping: boolean;
  lastActivity: Date;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number;
  lastPing: Date;
  connectionStartTime: Date;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  userId?: string;
  agentId?: string;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

import { Socket } from 'socket.io';

export class SocketService {
  private io: Server | null = null;
  private httpServer: any = null;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private conversationRooms: Map<string, Set<string>> = new Map(); // conversationId -> Set of socketIds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionMonitorInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize Socket.io server
   */
  initialize(app: Express): void {
    this.httpServer = createServer(app);
    
    this.io = new Server(this.httpServer, {
      cors: {
        origin: config.cors.allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startHeartbeat();
    this.startConnectionMonitoring();

    console.log('🔌 Socket.io server initialized with health monitoring');
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        
        if (!decoded.userId || !decoded.email) {
          return next(new Error('Invalid token payload'));
        }

        // Attach user info to socket
        (socket as AuthenticatedSocket).userId = decoded.userId;
        (socket as AuthenticatedSocket).userEmail = decoded.email;

        next();
      } catch (error) {
        console.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;
      
      console.log(`👤 User ${authSocket.userEmail} connected (${socket.id})`);

      // Register user
      this.registerUser(authSocket);

      // Handle joining conversation rooms
      socket.on('join-conversation', (conversationId: string) => {
        this.handleJoinConversation(authSocket, conversationId);
      });

      // Handle leaving conversation rooms
      socket.on('leave-conversation', (conversationId: string) => {
        this.handleLeaveConversation(authSocket, conversationId);
      });

      // Handle sending messages
      socket.on('send-message', async (data: {
        conversationId: string;
        content: string;
        agentId?: string;
      }) => {
        await this.handleSendMessage(authSocket, data);
      });

      // Handle typing indicators
      socket.on('typing-start', (data: { conversationId: string }) => {
        this.handleTypingStart(authSocket, data.conversationId);
      });

      socket.on('typing-stop', (data: { conversationId: string }) => {
        this.handleTypingStop(authSocket, data.conversationId);
      });

      // Handle agent responses
      socket.on('request-agent-response', async (data: {
        conversationId: string;
        agentId: string;
        messages: any[];
      }) => {
        await this.handleAgentResponse(authSocket, data);
      });

      // Handle conversation management
      socket.on('create-conversation', async (data: {
        title?: string;
        agentId?: string;
        conversationType?: string;
      }) => {
        await this.handleCreateConversation(authSocket, data);
      });

      socket.on('load-conversation-messages', async (data: {
        conversationId: string;
        limit?: number;
        offset?: number;
      }) => {
        await this.handleLoadConversationMessages(authSocket, data);
      });

      socket.on('load-user-conversations', async (data: {
        limit?: number;
      }) => {
        await this.handleLoadUserConversations(authSocket, data);
      });

      socket.on('update-conversation', async (data: {
        conversationId: string;
        title?: string;
        isArchived?: boolean;
      }) => {
        await this.handleUpdateConversation(authSocket, data);
      });

      // Handle connection health monitoring
      socket.on('ping-health', (data: { timestamp: number }) => {
        this.handlePingHealth(authSocket, data);
      });

      socket.on('connection-quality-report', (data: { 
        latency: number; 
        quality: string;
        networkType?: string;
      }) => {
        this.handleConnectionQualityReport(authSocket, data);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`👤 User ${authSocket.userEmail} disconnected: ${reason}`);
        this.unregisterUser(authSocket);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`Socket error for user ${authSocket.userEmail}:`, error);
      });

      // Send welcome message
      socket.emit('connection-established', {
        message: 'Connected to ZAEUS chat server',
        userId: authSocket.userId,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Register connected user
   */
  private registerUser(socket: AuthenticatedSocket): void {
    const now = new Date();
    const user: SocketUser = {
      userId: socket.userId,
      email: socket.userEmail,
      socketId: socket.id,
      isTyping: false,
      lastActivity: now,
      connectionQuality: 'good',
      latency: 0,
      lastPing: now,
      connectionStartTime: now,
    };

    this.connectedUsers.set(socket.id, user);
    
    // Notify about user connection with connection info
    this.io?.emit('user-connected', {
      userId: socket.userId,
      connectionTime: now.toISOString(),
      timestamp: new Date().toISOString(),
    });

    console.log(`👤 User ${socket.userEmail} connected at ${now.toISOString()}`);
  }

  /**
   * Unregister disconnected user
   */
  private unregisterUser(socket: AuthenticatedSocket): void {
    const user = this.connectedUsers.get(socket.id);
    
    if (user) {
      // Leave all conversation rooms
      this.conversationRooms.forEach((socketIds, conversationId) => {
        if (socketIds.has(socket.id)) {
          socketIds.delete(socket.id);
          if (socketIds.size === 0) {
            this.conversationRooms.delete(conversationId);
          }
        }
      });

      this.connectedUsers.delete(socket.id);

      // Notify about user disconnection
      this.io?.emit('user-disconnected', {
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle joining a conversation room
   */
  private handleJoinConversation(socket: AuthenticatedSocket, conversationId: string): void {
    socket.join(conversationId);
    
    // Track room membership
    if (!this.conversationRooms.has(conversationId)) {
      this.conversationRooms.set(conversationId, new Set());
    }
    this.conversationRooms.get(conversationId)!.add(socket.id);

    // Update user's current conversation
    const user = this.connectedUsers.get(socket.id);
    if (user) {
      user.currentConversationId = conversationId;
    }

    console.log(`👤 User ${socket.userEmail} joined conversation ${conversationId}`);

    // Notify others in the room
    socket.to(conversationId).emit('user-joined-conversation', {
      userId: socket.userId,
      conversationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle leaving a conversation room
   */
  private handleLeaveConversation(socket: AuthenticatedSocket, conversationId: string): void {
    socket.leave(conversationId);

    // Remove from room tracking
    const room = this.conversationRooms.get(conversationId);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) {
        this.conversationRooms.delete(conversationId);
      }
    }

    // Update user's current conversation
    const user = this.connectedUsers.get(socket.id);
    if (user && user.currentConversationId === conversationId) {
      delete user.currentConversationId;
    }

    console.log(`👤 User ${socket.userEmail} left conversation ${conversationId}`);

    // Notify others in the room
    socket.to(conversationId).emit('user-left-conversation', {
      userId: socket.userId,
      conversationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle sending a message
   */
  private async handleSendMessage(
    socket: AuthenticatedSocket, 
    data: { conversationId: string; content: string; agentId?: string }
  ): Promise<void> {
    try {
      const { conversationId, content, agentId } = data;

      // Save user message to database
      const userMessage = await agentService.saveMessage({
        conversationId,
        content,
        messageType: 'user',
        role: 'user',
        userId: socket.userId,
      });

      // Broadcast user message to conversation room
      const messageData: ChatMessage = {
        id: userMessage.id,
        conversationId,
        content,
        role: 'user',
        timestamp: new Date(),
        userId: socket.userId,
      };

      this.io?.to(conversationId).emit('message-received', messageData);

      console.log(`💬 Message from ${socket.userEmail} in conversation ${conversationId}`);

    } catch (error) {
      console.error('Failed to handle send message:', error);
      socket.emit('message-error', {
        error: 'Failed to send message',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle agent response generation
   */
  private async handleAgentResponse(
    socket: AuthenticatedSocket,
    data: { conversationId: string; agentId: string; messages: any[] }
  ): Promise<void> {
    try {
      const { conversationId, agentId, messages } = data;

      // Emit typing indicator for agent
      this.io?.to(conversationId).emit('agent-typing', {
        conversationId,
        agentId,
        isTyping: true,
        timestamp: new Date().toISOString(),
      });

      // Generate agent response
      const response = await agentService.generateAgentResponse({
        agentId,
        messages,
        conversationId,
        userId: socket.userId,
      });

      // Save agent message to database
      const agentMessage = await agentService.saveMessage({
        conversationId,
        content: response.content,
        messageType: 'agent',
        role: 'assistant',
        agentId,
        ...(response.model_used && { modelUsed: response.model_used }),
        ...(response.provider && { modelProvider: response.provider }),
        ...(response.processing_time_ms && { processingTimeMs: response.processing_time_ms }),
        ...(response.token_count && { tokenCount: response.token_count }),
        ...(response.cost_usd && { costUsd: response.cost_usd }),
      });

      // Stop typing indicator
      this.io?.to(conversationId).emit('agent-typing', {
        conversationId,
        agentId,
        isTyping: false,
        timestamp: new Date().toISOString(),
      });

      // Broadcast agent response to conversation room
      const messageData: ChatMessage = {
        id: agentMessage.id,
        conversationId,
        content: response.content,
        role: 'assistant',
        timestamp: new Date(),
        agentId,
      };

      this.io?.to(conversationId).emit('message-received', messageData);

      console.log(`🤖 Agent response in conversation ${conversationId}`);

    } catch (error) {
      console.error('Failed to handle agent response:', error);
      
      // Stop typing indicator on error
      this.io?.to(data.conversationId).emit('agent-typing', {
        conversationId: data.conversationId,
        agentId: data.agentId,
        isTyping: false,
        timestamp: new Date().toISOString(),
      });

      socket.emit('agent-error', {
        error: 'Failed to generate agent response',
        conversationId: data.conversationId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle typing start
   */
  private handleTypingStart(socket: AuthenticatedSocket, conversationId: string): void {
    const user = this.connectedUsers.get(socket.id);
    if (user) {
      user.isTyping = true;
      user.lastActivity = new Date();
    }

    // Broadcast typing indicator to others in the room
    socket.to(conversationId).emit('user-typing', {
      userId: socket.userId,
      conversationId,
      isTyping: true,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle typing stop
   */
  private handleTypingStop(socket: AuthenticatedSocket, conversationId: string): void {
    const user = this.connectedUsers.get(socket.id);
    if (user) {
      user.isTyping = false;
      user.lastActivity = new Date();
    }

    // Broadcast typing stop to others in the room
    socket.to(conversationId).emit('user-typing', {
      userId: socket.userId,
      conversationId,
      isTyping: false,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send message to specific conversation
   */
  public sendToConversation(conversationId: string, event: string, data: any): void {
    this.io?.to(conversationId).emit(event, data);
  }

  /**
   * Send message to specific user
   */
  public sendToUser(userId: string, event: string, data: any): void {
    const userSockets = Array.from(this.connectedUsers.values())
      .filter(user => user.userId === userId);

    userSockets.forEach(user => {
      this.io?.to(user.socketId).emit(event, data);
    });
  }

  /**
   * Get connected users in a conversation
   */
  public getConversationUsers(conversationId: string): SocketUser[] {
    const socketIds = this.conversationRooms.get(conversationId) || new Set();
    return Array.from(socketIds)
      .map(socketId => this.connectedUsers.get(socketId))
      .filter(user => user !== undefined) as SocketUser[];
  }

  /**
   * Get server instance for HTTP server setup
   */
  public getHttpServer(): any {
    return this.httpServer;
  }

  /**
   * Get Socket.io instance
   */
  public getIo(): Server | null {
    return this.io;
  }

  /**
   * Handle creating a new conversation
   */
  private async handleCreateConversation(
    socket: AuthenticatedSocket,
    data: { title?: string; agentId?: string; conversationType?: string }
  ): Promise<void> {
    try {
      const { title, agentId, conversationType } = data;

      const conversationParams: any = {
        userId: socket.userId,
        conversationType: conversationType as any || 'general',
      };
      
      if (title) conversationParams.title = title;
      if (agentId) conversationParams.agentId = agentId;
      
      const conversation = await agentService.createConversation(conversationParams);

      // Send conversation data back to client
      socket.emit('conversation-created', {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          agentId: conversation.active_agent_id,
          conversationType: conversation.conversation_type,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
        },
        timestamp: new Date().toISOString(),
      });

      console.log(`📝 Conversation created for user ${socket.userEmail}: ${conversation.id}`);

    } catch (error) {
      console.error('Failed to create conversation:', error);
      socket.emit('conversation-error', {
        error: 'Failed to create conversation',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle loading conversation messages
   */
  private async handleLoadConversationMessages(
    socket: AuthenticatedSocket,
    data: { conversationId: string; limit?: number; offset?: number }
  ): Promise<void> {
    try {
      const { conversationId, limit = 50, offset = 0 } = data;

      // Get messages with pagination
      const result = await agentService.getConversationMessagesPaginated(conversationId, limit, offset);

      // Send messages back to client
      socket.emit('conversation-messages-loaded', {
        conversationId,
        messages: result.messages.map(msg => ({
          id: msg.id,
          conversationId: msg.conversation_id,
          content: msg.content,
          role: msg.role,
          messageType: msg.message_type,
          timestamp: msg.created_at,
          userId: msg.user_id,
          agentId: msg.agent_id,
          modelUsed: msg.model_used,
          provider: msg.model_provider,
          processingTimeMs: msg.processing_time_ms,
          tokenCount: msg.token_count,
          costUsd: msg.cost_usd,
        })),
        pagination: {
          limit,
          offset,
          totalCount: result.totalCount,
          hasMore: result.hasMore,
        },
        timestamp: new Date().toISOString(),
      });

      console.log(`📄 Loaded ${result.messages.length} messages for conversation ${conversationId} (${offset}-${offset + result.messages.length}/${result.totalCount})`);

    } catch (error) {
      console.error('Failed to load conversation messages:', error);
      socket.emit('conversation-error', {
        error: 'Failed to load messages',
        conversationId: data.conversationId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle loading user conversations
   */
  private async handleLoadUserConversations(
    socket: AuthenticatedSocket,
    data: { limit?: number }
  ): Promise<void> {
    try {
      const { limit = 50 } = data;

      const conversations = await agentService.getUserConversations(socket.userId, limit);

      // Send conversations back to client
      socket.emit('user-conversations-loaded', {
        conversations: conversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          agentId: conv.active_agent_id,
          conversationType: conv.conversation_type,
          contextSummary: conv.context_summary,
          isArchived: conv.is_archived,
          createdAt: conv.created_at,
          updatedAt: conv.updated_at,
          lastActivityAt: conv.last_activity_at,
        })),
        timestamp: new Date().toISOString(),
      });

      console.log(`📋 Loaded ${conversations.length} conversations for user ${socket.userEmail}`);

    } catch (error) {
      console.error('Failed to load user conversations:', error);
      socket.emit('conversation-error', {
        error: 'Failed to load conversations',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle updating conversation
   */
  private async handleUpdateConversation(
    socket: AuthenticatedSocket,
    data: { conversationId: string; title?: string; isArchived?: boolean }
  ): Promise<void> {
    try {
      const { conversationId, title, isArchived } = data;

      // Update conversation in database
      const updateQuery = `
        UPDATE zaeus_core.conversations 
        SET 
          ${title ? 'title = $2,' : ''}
          ${isArchived !== undefined ? 'is_archived = $' + (title ? '3' : '2') + ',' : ''}
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $${title && isArchived !== undefined ? '4' : title || isArchived !== undefined ? '3' : '2'}
        RETURNING *
      `;

      const queryParams = [conversationId];
      if (title) queryParams.push(title);
      if (isArchived !== undefined) queryParams.push(isArchived.toString());
      queryParams.push(socket.userId);

      const result = await agentService['db'].query(updateQuery, queryParams);
      const updatedConversation = result.rows[0];

      if (updatedConversation) {
        // Broadcast update to all users in conversation room
        this.io?.to(conversationId).emit('conversation-updated', {
          conversation: {
            id: updatedConversation.id,
            title: updatedConversation.title,
            isArchived: updatedConversation.is_archived,
            updatedAt: updatedConversation.updated_at,
          },
          timestamp: new Date().toISOString(),
        });

        console.log(`📝 Conversation ${conversationId} updated by user ${socket.userEmail}`);
      } else {
        socket.emit('conversation-error', {
          error: 'Conversation not found or access denied',
          conversationId,
          timestamp: new Date().toISOString(),
        });
      }

    } catch (error) {
      console.error('Failed to update conversation:', error);
      socket.emit('conversation-error', {
        error: 'Failed to update conversation',
        conversationId: data.conversationId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle ping health check
   */
  private handlePingHealth(socket: AuthenticatedSocket, data: { timestamp: number }): void {
    const now = new Date();
    const user = this.connectedUsers.get(socket.id);
    
    if (user) {
      const latency = now.getTime() - data.timestamp;
      user.latency = latency;
      user.lastPing = now;
      user.lastActivity = now;
      
      // Determine connection quality based on latency
      if (latency < 100) {
        user.connectionQuality = 'excellent';
      } else if (latency < 300) {
        user.connectionQuality = 'good';
      } else if (latency < 800) {
        user.connectionQuality = 'fair';
      } else {
        user.connectionQuality = 'poor';
      }
    }

    // Send pong response
    socket.emit('pong-health', {
      timestamp: data.timestamp,
      serverTime: now.getTime(),
      latency: user?.latency || 0,
      quality: user?.connectionQuality || 'unknown',
    });
  }

  /**
   * Handle connection quality report from client
   */
  private handleConnectionQualityReport(
    socket: AuthenticatedSocket, 
    data: { latency: number; quality: string; networkType?: string }
  ): void {
    const user = this.connectedUsers.get(socket.id);
    
    if (user) {
      user.latency = data.latency;
      user.connectionQuality = data.quality as any;
      user.lastActivity = new Date();
      
      console.log(`📊 Connection quality for ${socket.userEmail}: ${data.quality} (${data.latency}ms)`);
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.io) {
        this.io.emit('heartbeat', {
          timestamp: new Date().getTime(),
          serverUptime: process.uptime(),
        });
      }
    }, 30000); // Every 30 seconds

    console.log('💓 Heartbeat monitoring started');
  }

  /**
   * Start connection monitoring
   */
  private startConnectionMonitoring(): void {
    this.connectionMonitorInterval = setInterval(() => {
      this.monitorConnections();
    }, 60000); // Every 60 seconds

    console.log('🔍 Connection monitoring started');
  }

  /**
   * Monitor all connections for health
   */
  private monitorConnections(): void {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    const disconnectedUsers: string[] = [];

    this.connectedUsers.forEach((user, socketId) => {
      const timeSinceLastActivity = now.getTime() - user.lastActivity.getTime();
      
      if (timeSinceLastActivity > staleThreshold) {
        console.warn(`🚨 Stale connection detected for user ${user.email} (${timeSinceLastActivity}ms ago)`);
        disconnectedUsers.push(socketId);
      }
    });

    // Clean up stale connections
    disconnectedUsers.forEach(socketId => {
      const user = this.connectedUsers.get(socketId);
      if (user) {
        console.log(`🧹 Cleaning up stale connection for user ${user.email}`);
        this.connectedUsers.delete(socketId);
      }
    });

    // Emit connection statistics
    if (this.io) {
      this.io.emit('connection-stats', {
        connectedUsers: this.connectedUsers.size,
        activeConversations: this.conversationRooms.size,
        averageLatency: this.getAverageLatency(),
        connectionQualityDistribution: this.getConnectionQualityDistribution(),
        timestamp: now.toISOString(),
      });
    }
  }

  /**
   * Get average latency across all connections
   */
  private getAverageLatency(): number {
    if (this.connectedUsers.size === 0) return 0;
    
    const totalLatency = Array.from(this.connectedUsers.values())
      .reduce((sum, user) => sum + user.latency, 0);
    
    return Math.round(totalLatency / this.connectedUsers.size);
  }

  /**
   * Get connection quality distribution
   */
  private getConnectionQualityDistribution(): Record<string, number> {
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
    
    this.connectedUsers.forEach(user => {
      distribution[user.connectionQuality]++;
    });
    
    return distribution;
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    connectedUsers: number;
    activeConversations: number;
    totalConnections: number;
    averageLatency: number;
    connectionQuality: Record<string, number>;
  } {
    return {
      connectedUsers: this.connectedUsers.size,
      activeConversations: this.conversationRooms.size,
      totalConnections: this.io?.engine.clientsCount || 0,
      averageLatency: this.getAverageLatency(),
      connectionQuality: this.getConnectionQualityDistribution(),
    };
  }

  /**
   * Cleanup method
   */
  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }
    
    console.log('🧹 Socket service cleanup completed');
  }
}

// Singleton instance
export const socketService = new SocketService();