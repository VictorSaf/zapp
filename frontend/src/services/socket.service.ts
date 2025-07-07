import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../stores/auth.store'
import { useChatStore } from '../stores/chat.store'

class SocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private pingInterval: NodeJS.Timeout | null = null

  constructor() {
    // Auto-connect when auth state changes
    useAuthStore.subscribe((state) => {
      if (state.isAuthenticated && state.token) {
        this.connect()
      } else {
        this.disconnect()
      }
    })
  }

  connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected')
      return
    }

    const token = useAuthStore.getState().token
    if (!token) {
      console.error('No auth token available')
      return
    }

    console.log('Connecting to WebSocket server...')
    
    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
      timeout: 20000
    })

    this.setupEventHandlers()
    this.setupPingInterval()
  }

  private setupEventHandlers() {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket?.id)
      this.reconnectAttempts = 0
      this.updateConnectionStatus('connected')
      
      // Re-join active conversation if any
      const activeConversation = useChatStore.getState().activeConversation
      if (activeConversation) {
        this.joinConversation(activeConversation.id)
      }
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      this.updateConnectionStatus('disconnected')
    })

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.updateConnectionStatus('error')
      } else {
        this.updateConnectionStatus('reconnecting')
      }
    })

    // Chat events
    this.socket.on('message', (data) => {
      console.log('Received message:', data)
      useChatStore.getState().addMessage(data)
    })

    this.socket.on('typing', (data) => {
      console.log('User typing:', data)
      useChatStore.getState().setTypingUser(data.userId, data.isTyping)
    })

    this.socket.on('user_joined', (data) => {
      console.log('User joined:', data)
    })

    this.socket.on('user_left', (data) => {
      console.log('User left:', data)
    })

    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    // Pong response for heartbeat
    this.socket.on('pong', () => {
      console.log('Pong received')
    })
  }

  private setupPingInterval() {
    // Clear existing interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }

    // Setup new ping interval (every 30 seconds)
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping')
      }
    }, 30000)
  }

  private updateConnectionStatus(status: 'connected' | 'disconnected' | 'reconnecting' | 'error') {
    useChatStore.getState().setConnectionStatus(status)
  }

  disconnect() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    if (this.socket) {
      console.log('Disconnecting WebSocket...')
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Chat methods
  joinConversation(conversationId: string) {
    if (!this.socket?.connected) {
      console.error('Socket not connected')
      return
    }

    this.socket.emit('join_conversation', { conversationId })
  }

  leaveConversation(conversationId: string) {
    if (!this.socket?.connected) {
      console.error('Socket not connected')
      return
    }

    this.socket.emit('leave_conversation', { conversationId })
  }

  sendMessage(conversationId: string, content: string) {
    if (!this.socket?.connected) {
      console.error('Socket not connected')
      // Store message in offline queue
      useChatStore.getState().addToOfflineQueue({
        conversationId,
        content,
        timestamp: new Date()
      })
      return
    }

    this.socket.emit('send_message', {
      conversationId,
      content
    })
  }

  emitTypingStatus(conversationId: string, isTyping: boolean) {
    if (!this.socket?.connected) {
      return
    }

    this.socket.emit('typing', {
      conversationId,
      isTyping
    })
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  getSocketId(): string | undefined {
    return this.socket?.id
  }

  reconnect() {
    if (this.socket) {
      this.socket.connect()
    } else {
      this.connect()
    }
  }
}

// Export singleton instance
export const socketService = new SocketService()

// Auto-connect on page load if authenticated
if (useAuthStore.getState().isAuthenticated) {
  socketService.connect()
}