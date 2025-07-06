import { io, Socket } from 'socket.io-client';
import { networkMonitorService } from './network-monitor.service';

export interface SocketUser {
  userId: string;
  email: string;
  socketId: string;
  currentConversationId?: string;
  isTyping: boolean;
  lastActivity: Date;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  timestamp: string;
}

export interface ConnectionEstablishedEvent {
  message: string;
  userId: string;
  timestamp: string;
}

export interface AgentTypingEvent {
  conversationId: string;
  agentId: string;
  isTyping: boolean;
  timestamp: string;
}

export interface UserJoinedEvent {
  userId: string;
  conversationId: string;
  timestamp: string;
}

export interface UserLeftEvent {
  userId: string;
  conversationId: string;
  timestamp: string;
}

export interface MessageErrorEvent {
  error: string;
  timestamp: string;
}

export interface AgentErrorEvent {
  error: string;
  conversationId: string;
  timestamp: string;
}

export type WebSocketEventHandler<T = any> = (data: T) => void;

export interface ConnectionQuality {
  latency: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  networkType?: string;
  connectionStability: number; // 0-1 scale
  lastPingTime: Date;
}

export interface NetworkState {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private isConnecting = false;
  private currentConversationId: string | null = null;
  
  // Connection quality monitoring
  private connectionQuality: ConnectionQuality = {
    latency: 0,
    quality: 'good',
    connectionStability: 1.0,
    lastPingTime: new Date(),
  };
  
  // Network state detection
  private networkState: NetworkState = {
    isOnline: navigator.onLine,
  };
  
  // Health monitoring
  private pingInterval: any = null;
  private reconnectTimeout: any = null;
  private heartbeatInterval: any = null;
  private connectionStartTime: Date | null = null;
  private disconnectionCount = 0;
  
  // Event handlers
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();

  constructor() {
    this.setupDefaultHandlers();
    this.setupNetworkStateMonitoring();
    this.setupNetworkMonitorIntegration();
    this.startHeartbeat();
  }

  /**
   * Connect to WebSocket server with automatic reconnection
   */
  async connect(token: string): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      console.log('Already connected or connecting');
      return;
    }

    // Check network state before attempting connection
    if (!this.networkState.isOnline) {
      console.warn('Device is offline, delaying connection attempt');
      this.scheduleReconnect();
      return;
    }

    this.isConnecting = true;
    this.connectionStartTime = new Date();

    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      
      this.socket = io(API_BASE_URL, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: false, // We handle reconnection manually
        timeout: 10000,
        forceNew: true,
      });

      this.setupSocketHandlers();
      this.startPingMonitoring();
      
    } catch (error) {
      this.isConnecting = false;
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.clearAllTimers();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.currentConversationId = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.connectionStartTime = null;
    
    console.log('🔌 WebSocket service disconnected and cleaned up');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' | 'error' {
    if (this.socket?.connected) return 'connected';
    if (this.isConnecting) return 'connecting';
    if (this.socket?.disconnected) return 'disconnected';
    return 'error';
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    if (!this.socket?.connected) {
      console.warn('Not connected to WebSocket server');
      return;
    }

    // Leave current conversation if any
    if (this.currentConversationId && this.currentConversationId !== conversationId) {
      this.leaveConversation(this.currentConversationId);
    }

    this.currentConversationId = conversationId;
    this.socket.emit('join-conversation', conversationId);
    console.log(`📥 Joining conversation: ${conversationId}`);
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId?: string): void {
    if (!this.socket?.connected) return;

    const roomToLeave = conversationId || this.currentConversationId;
    if (!roomToLeave) return;

    this.socket.emit('leave-conversation', roomToLeave);
    console.log(`📤 Leaving conversation: ${roomToLeave}`);

    if (roomToLeave === this.currentConversationId) {
      this.currentConversationId = null;
    }
  }

  /**
   * Send a message
   */
  sendMessage(conversationId: string, content: string, agentId?: string): void {
    if (!this.socket?.connected) {
      console.warn('Not connected to WebSocket server');
      return;
    }

    const messageData = {
      conversationId,
      content,
      agentId: agentId || 'agent_00z'
    };

    this.socket.emit('send-message', messageData);
    console.log(`📤 Sending message to conversation ${conversationId}`);
  }

  /**
   * Request agent response
   */
  requestAgentResponse(conversationId: string, agentId: string, messages: any[]): void {
    if (!this.socket?.connected) {
      console.warn('Not connected to WebSocket server');
      return;
    }

    const requestData = {
      conversationId,
      agentId,
      messages
    };

    this.socket.emit('request-agent-response', requestData);
    console.log(`🤖 Requesting agent response for conversation ${conversationId}`);
  }

  /**
   * Create a new conversation
   */
  createConversation(title?: string, agentId?: string, conversationType?: string): void {
    if (!this.socket?.connected) {
      console.warn('Not connected to WebSocket server');
      return;
    }

    const conversationData = {
      title,
      agentId,
      conversationType
    };

    this.socket.emit('create-conversation', conversationData);
    console.log(`📝 Creating new conversation: ${title || 'Untitled'}`);
  }

  /**
   * Load conversation messages
   */
  loadConversationMessages(conversationId: string, limit?: number, offset?: number): void {
    if (!this.socket?.connected) {
      console.warn('Not connected to WebSocket server');
      return;
    }

    const requestData = {
      conversationId,
      limit,
      offset
    };

    this.socket.emit('load-conversation-messages', requestData);
    console.log(`📄 Loading messages for conversation ${conversationId}`);
  }

  /**
   * Load user conversations
   */
  loadUserConversations(limit?: number): void {
    if (!this.socket?.connected) {
      console.warn('Not connected to WebSocket server');
      return;
    }

    const requestData = { limit };

    this.socket.emit('load-user-conversations', requestData);
    console.log(`📋 Loading user conversations`);
  }

  /**
   * Update conversation
   */
  updateConversation(conversationId: string, title?: string, isArchived?: boolean): void {
    if (!this.socket?.connected) {
      console.warn('Not connected to WebSocket server');
      return;
    }

    const updateData = {
      conversationId,
      title,
      isArchived
    };

    this.socket.emit('update-conversation', updateData);
    console.log(`📝 Updating conversation ${conversationId}`);
  }

  /**
   * Start typing indicator
   */
  startTyping(conversationId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('typing-start', { conversationId });
  }

  /**
   * Stop typing indicator
   */
  stopTyping(conversationId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('typing-stop', { conversationId });
  }

  /**
   * Add event listener
   */
  on<T = any>(event: string, handler: WebSocketEventHandler<T>): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler?: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) return;

    if (handler) {
      const handlers = this.eventHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.eventHandlers.delete(event);
    }
  }

  /**
   * Emit custom event to handlers
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Setup default event handlers
   */
  private setupDefaultHandlers(): void {
    // Default handlers can be added here
    this.on('connection-established', (data: ConnectionEstablishedEvent) => {
      console.log('🎉 WebSocket connection established:', data);
    });

    this.on('message-received', (data: any) => {
      console.log('💬 Real-time message received:', data);
    });

    this.on('user-typing', (data: TypingEvent) => {
      console.log('⌨️ User typing event:', data);
    });

    this.on('agent-typing', (data: AgentTypingEvent) => {
      console.log('🤖 Agent typing event:', data);
    });
  }

  /**
   * Setup Socket.io event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to ZAEUS WebSocket server');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.connectionStartTime = new Date();
      
      // Reset connection quality
      this.connectionQuality = {
        latency: 0,
        quality: 'good',
        connectionStability: 1.0,
        lastPingTime: new Date(),
      };
      
      this.emit('connected', { 
        timestamp: new Date().toISOString(),
        reconnectAttempts: this.reconnectAttempts
      });
      
      // Start monitoring
      this.startPingMonitoring();
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`❌ Disconnected from WebSocket server: ${reason}`);
      this.isConnecting = false;
      this.disconnectionCount++;
      
      // Clear monitoring timers
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
      
      this.emit('disconnected', { 
        reason, 
        timestamp: new Date().toISOString(),
        disconnectionCount: this.disconnectionCount
      });
      
      // Auto-reconnect if not intentional disconnect
      if (reason !== 'io client disconnect' && this.networkState.isOnline) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      this.isConnecting = false;
      
      this.emit('connection-error', { 
        error: error.message, 
        timestamp: new Date().toISOString(),
        reconnectAttempts: this.reconnectAttempts
      });
      
      // Schedule reconnection on connection error
      this.scheduleReconnect();
    });

    // Custom application events
    this.socket.on('connection-established', (data: ConnectionEstablishedEvent) => {
      this.emit('connection-established', data);
    });

    this.socket.on('message-received', (data: any) => {
      this.emit('message-received', data);
    });

    this.socket.on('user-typing', (data: TypingEvent) => {
      this.emit('user-typing', data);
    });

    this.socket.on('agent-typing', (data: AgentTypingEvent) => {
      this.emit('agent-typing', data);
    });

    this.socket.on('user-joined-conversation', (data: UserJoinedEvent) => {
      this.emit('user-joined-conversation', data);
    });

    this.socket.on('user-left-conversation', (data: UserLeftEvent) => {
      this.emit('user-left-conversation', data);
    });

    this.socket.on('message-error', (data: MessageErrorEvent) => {
      console.error('❌ Message error:', data);
      this.emit('message-error', data);
    });

    this.socket.on('agent-error', (data: AgentErrorEvent) => {
      console.error('❌ Agent error:', data);
      this.emit('agent-error', data);
    });

    this.socket.on('user-connected', (data: any) => {
      this.emit('user-connected', data);
    });

    this.socket.on('user-disconnected', (data: any) => {
      this.emit('user-disconnected', data);
    });

    // Conversation management events
    this.socket.on('conversation-created', (data: any) => {
      this.emit('conversation-created', data);
    });

    this.socket.on('conversation-messages-loaded', (data: any) => {
      this.emit('conversation-messages-loaded', data);
    });

    this.socket.on('user-conversations-loaded', (data: any) => {
      this.emit('user-conversations-loaded', data);
    });

    this.socket.on('conversation-updated', (data: any) => {
      this.emit('conversation-updated', data);
    });

    this.socket.on('conversation-error', (data: any) => {
      this.emit('conversation-error', data);
    });
  }

  /**
   * Get current conversation ID
   */
  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }

  /**
   * Force reconnection
   */
  reconnect(): void {
    console.log('🔄 Manual reconnection requested');
    this.clearReconnectTimeout();
    this.reconnectAttempts = 0;
    this.attemptReconnection();
  }

  /**
   * Schedule automatic reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached. Manual reconnection required.');
        this.emit('max-reconnect-attempts-reached', {
          attempts: this.reconnectAttempts,
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      this.maxReconnectDelay
    );

    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts + 1} in ${Math.round(delay)}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.attemptReconnection();
    }, delay);
  }

  /**
   * Attempt reconnection
   */
  private async attemptReconnection(): Promise<void> {
    if (!this.networkState.isOnline) {
      console.log('🌐 Device is offline, delaying reconnection');
      this.scheduleReconnect();
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    this.emit('reconnect-attempt', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      timestamp: new Date().toISOString()
    });

    try {
      // Get current auth token
      const authState = localStorage.getItem('zaeus-auth-storage');
      const token = authState ? JSON.parse(authState).state.token : null;
      
      if (!token) {
        console.error('❌ No auth token available for reconnection');
        this.emit('reconnect-auth-error', { timestamp: new Date().toISOString() });
        return;
      }

      await this.connect(token);
      
    } catch (error) {
      console.error(`❌ Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      this.scheduleReconnect();
    }
  }

  /**
   * Clear reconnection timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Clear all timers
   */
  private clearAllTimers(): void {
    this.clearReconnectTimeout();
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Setup integration with network monitor service
   */
  private setupNetworkMonitorIntegration(): void {
    // Listen to network quality changes
    networkMonitorService.on('quality-change', (event) => {
      const quality = event.quality;
      if (quality) {
        // Adjust connection behavior based on network quality
        this.adaptToNetworkQuality(quality);
        
        // Emit network quality update
        this.emit('network-quality-changed', {
          quality,
          timestamp: event.timestamp.toISOString(),
        });
      }
    });

    // Listen to network state changes
    networkMonitorService.on('network-change', (event) => {
      console.log(`🌐 Network state changed: ${event.type}`);
      
      if (event.type === 'online') {
        // Network came back online - attempt reconnection
        if (!this.isConnected() && !this.isConnecting) {
          console.log('🔄 Network recovered, attempting reconnection');
          this.reconnectAttempts = 0; // Reset attempts on network recovery
          setTimeout(() => this.attemptReconnection(), 1000);
        }
      } else if (event.type === 'offline') {
        // Network went offline - stop reconnection attempts
        this.clearReconnectTimeout();
        console.log('📴 Network offline, pausing reconnection attempts');
      }
    });

    // Get initial optimization suggestions
    this.applyNetworkOptimizations();
  }

  /**
   * Adapt connection behavior based on network quality
   */
  private adaptToNetworkQuality(quality: any): void {
    const suggestions = networkMonitorService.getOptimizationSuggestions();
    
    // Adjust reconnection strategy based on network quality
    if (quality.recommendation === 'minimal' || quality.recommendation === 'offline') {
      this.baseReconnectDelay = 5000; // Slower reconnection
      this.maxReconnectAttempts = 5;  // Fewer attempts
    } else if (quality.recommendation === 'reduced') {
      this.baseReconnectDelay = 2000; // Moderate reconnection
      this.maxReconnectAttempts = 7;
    } else {
      this.baseReconnectDelay = 1000; // Fast reconnection
      this.maxReconnectAttempts = 10;
    }

    // Adjust ping interval based on network quality
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      
      const pingIntervalMs = suggestions.recommendedUpdateInterval * 2; // Double the update interval for pings
      this.pingInterval = setInterval(() => {
        this.sendPing();
      }, pingIntervalMs);
    }

    console.log(`🎛️ Adapted to network quality: ${quality.recommendation} (ping: ${suggestions.recommendedUpdateInterval * 2}ms, reconnect: ${this.baseReconnectDelay}ms)`);
  }

  /**
   * Apply network optimizations
   */
  private applyNetworkOptimizations(): void {
    const suggestions = networkMonitorService.getOptimizationSuggestions();
    
    // Log optimization suggestions for debugging
    console.log('🎛️ Network optimization suggestions:', suggestions);
    
    // Emit suggestions so UI can adapt
    this.emit('network-optimization-suggestions', {
      suggestions,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Setup network state monitoring
   */
  private setupNetworkStateMonitoring(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 Network came back online');
      this.networkState.isOnline = true;
      this.emit('network-online', { timestamp: new Date().toISOString() });
      
      // Attempt reconnection if disconnected
      if (!this.isConnected() && !this.isConnecting) {
        this.reconnectAttempts = 0; // Reset attempts on network recovery
        this.attemptReconnection();
      }
    });

    window.addEventListener('offline', () => {
      console.log('🌐 Network went offline');
      this.networkState.isOnline = false;
      this.emit('network-offline', { timestamp: new Date().toISOString() });
    });

    // Detect connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateConnectionInfo = () => {
        this.networkState.effectiveType = connection.effectiveType;
        this.networkState.downlink = connection.downlink;
        this.networkState.rtt = connection.rtt;
        
        this.updateConnectionQuality();
      };
      
      connection.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo();
    }
  }

  /**
   * Start ping monitoring for connection quality
   */
  private startPingMonitoring(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Send ping to measure latency
   */
  private sendPing(): void {
    if (!this.socket?.connected) return;

    const pingStart = performance.now();
    const pingData = {
      timestamp: Date.now(),
      clientTime: pingStart
    };

    this.socket.emit('ping-health', pingData);
    
    // Set timeout for ping response
    const pingTimeout = setTimeout(() => {
      console.warn('⚠️ Ping timeout - connection may be unstable');
      this.connectionQuality.latency = 5000; // High latency indicates problem
      this.updateConnectionQuality();
    }, 10000);

    // Handle ping response
    const handlePong = () => {
      clearTimeout(pingTimeout);
      const pingEnd = performance.now();
      const latency = pingEnd - pingStart;
      
      this.connectionQuality.latency = latency;
      this.connectionQuality.lastPingTime = new Date();
      this.updateConnectionQuality();
      
      this.socket?.off('pong-health', handlePong);
    };

    this.socket.once('pong-health', handlePong);
  }

  /**
   * Update connection quality based on metrics
   */
  private updateConnectionQuality(): void {
    const { latency } = this.connectionQuality;
    const { effectiveType } = this.networkState;
    
    // Determine quality based on latency
    if (latency < 100) {
      this.connectionQuality.quality = 'excellent';
    } else if (latency < 300) {
      this.connectionQuality.quality = 'good';
    } else if (latency < 800) {
      this.connectionQuality.quality = 'fair';
    } else {
      this.connectionQuality.quality = 'poor';
    }

    // Factor in network type
    if (effectiveType) {
      this.connectionQuality.networkType = effectiveType;
      
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        this.connectionQuality.quality = 'poor';
      }
    }

    // Calculate connection stability
    const now = new Date();
    const connectionDuration = this.connectionStartTime 
      ? now.getTime() - this.connectionStartTime.getTime()
      : 0;
    
    // Stability decreases with disconnection frequency
    const stabilityFactor = Math.max(0.1, 1 - (this.disconnectionCount / 10));
    const durationFactor = Math.min(1, connectionDuration / (5 * 60 * 1000)); // 5 minutes for full stability
    
    this.connectionQuality.connectionStability = stabilityFactor * durationFactor;

    // Emit quality update
    this.emit('connection-quality-updated', {
      quality: this.connectionQuality,
      networkState: this.networkState,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        // Connection is healthy, just update activity time
        this.connectionQuality.lastPingTime = new Date();
      } else if (!this.isConnecting && this.networkState.isOnline) {
        // Should be connected but aren't - attempt reconnection
        console.log('💔 Heartbeat detected disconnection, attempting reconnection');
        this.attemptReconnection();
      }
    }, 60000); // Check every minute
  }

  /**
   * Get connection quality information
   */
  getConnectionQuality(): ConnectionQuality {
    return { ...this.connectionQuality };
  }

  /**
   * Get network state information
   */
  getNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    reconnectAttempts: number;
    maxReconnectAttempts: number;
    disconnectionCount: number;
    connectionDuration: number;
    lastPingTime: Date;
    isStable: boolean;
  } {
    const connectionDuration = this.connectionStartTime
      ? new Date().getTime() - this.connectionStartTime.getTime()
      : 0;

    return {
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      disconnectionCount: this.disconnectionCount,
      connectionDuration,
      lastPingTime: this.connectionQuality.lastPingTime,
      isStable: this.connectionQuality.connectionStability > 0.7
    };
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();