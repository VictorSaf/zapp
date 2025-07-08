import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { chatService } from '../services/chat.service'

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  agent?: string
  isTyping?: boolean
  error?: boolean
  conversationId?: string
}

export interface Conversation {
  id: string
  title: string
  lastMessage?: string
  lastMessageAt?: Date
  agentId: string
  userId: string
}

interface OfflineMessage {
  conversationId: string
  content: string
  timestamp: Date
}

interface ChatStore {
  // State
  messages: Message[]
  conversations: Conversation[]
  activeConversation: Conversation | null
  isTyping: boolean
  currentAgent: string
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' | 'error'
  typingUsers: Map<string, boolean>
  offlineQueue: OfflineMessage[]
  
  // Actions
  sendMessage: (content: string) => void
  addMessage: (message: Message) => void
  setTyping: (isTyping: boolean) => void
  setCurrentAgent: (agent: string) => void
  clearMessages: () => void
  
  // Conversation actions
  setConversations: (conversations: Conversation[]) => void
  setActiveConversation: (conversation: Conversation | null) => void
  addConversation: (conversation: Conversation) => void
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void
  
  // WebSocket actions
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'reconnecting' | 'error') => void
  setTypingUser: (userId: string, isTyping: boolean) => void
  addToOfflineQueue: (message: OfflineMessage) => void
  clearOfflineQueue: () => void
  processOfflineQueue: () => void
}

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        messages: [],
        conversations: [],
        activeConversation: null,
        isTyping: false,
        currentAgent: '00z',
        connectionStatus: 'disconnected',
        typingUsers: new Map(),
        offlineQueue: [],
        
        // Message actions
        sendMessage: async (content: string) => {
          const { activeConversation, currentAgent } = get()
          
          if (!activeConversation) {
            console.error('No active conversation')
            return
          }
          
          const userMessage: Message = {
            id: `msg-${Date.now()}`,
            content,
            role: 'user',
            timestamp: new Date(),
            conversationId: activeConversation.id
          }
          
          // Add message to UI immediately
          set((state) => ({
            messages: [...state.messages, userMessage],
            isTyping: true
          }))
          
          // Import socketService dynamically to avoid circular dependency
          const { socketService } = await import('../services/socket.service')
          
          // Send via WebSocket if connected
          if (socketService.isConnected()) {
            socketService.sendMessage(activeConversation.id, content)
          } else {
            // Add to offline queue
            get().addToOfflineQueue({
              conversationId: activeConversation.id,
              content,
              timestamp: new Date()
            })
          }
        },
        
        addMessage: (message: Message) => {
          set((state) => ({
            messages: [...state.messages, message],
            isTyping: false
          }))
          
          // Update conversation last message
          const { activeConversation, updateConversation } = get()
          if (activeConversation && message.conversationId === activeConversation.id) {
            updateConversation(activeConversation.id, {
              lastMessage: message.content,
              lastMessageAt: message.timestamp
            })
          }
        },
        
        setTyping: (isTyping) => set({ isTyping }),
        
        setCurrentAgent: (agent) => set({ currentAgent: agent }),
        
        clearMessages: () => set({ messages: [] }),
        
        // Conversation actions
        setConversations: (conversations) => set({ conversations }),
        
        setActiveConversation: async (conversation) => {
          if (!conversation) {
            set({ activeConversation: null, messages: [] })
            return
          }

          // clear messages before fetching
          set({ messages: [] })

          try {
            const messages = await chatService.getMessages(conversation.id)
            set({
              activeConversation: conversation,
              messages: messages.map((m) => ({
                id: m.id,
                content: m.content,
                role: m.role,
                timestamp: new Date(m.createdAt),
                agent: m.agentId,
                conversationId: m.conversationId
              }))
            })
          } catch (error) {
            console.error('Failed to load messages:', error)
            set({ activeConversation: conversation })
          }
        },
        
        addConversation: (conversation) => {
          set((state) => ({
            conversations: [conversation, ...state.conversations]
          }))
        },
        
        updateConversation: (conversationId, updates) => {
          set((state) => ({
            conversations: state.conversations.map(conv =>
              conv.id === conversationId ? { ...conv, ...updates } : conv
            )
          }))
        },
        
        // WebSocket actions
        setConnectionStatus: (status) => set({ connectionStatus: status }),
        
        setTypingUser: (userId, isTyping) => {
          set((state) => {
            const newTypingUsers = new Map(state.typingUsers)
            if (isTyping) {
              newTypingUsers.set(userId, true)
            } else {
              newTypingUsers.delete(userId)
            }
            return { typingUsers: newTypingUsers }
          })
        },
        
        addToOfflineQueue: (message) => {
          set((state) => ({
            offlineQueue: [...state.offlineQueue, message]
          }))
        },
        
        clearOfflineQueue: () => set({ offlineQueue: [] }),
        
        processOfflineQueue: async () => {
          const { offlineQueue } = get()
          if (offlineQueue.length === 0) return
          
          const { socketService } = await import('../services/socket.service')
          
          if (socketService.isConnected()) {
            // Send all queued messages
            offlineQueue.forEach(msg => {
              socketService.sendMessage(msg.conversationId, msg.content)
            })
            
            // Clear the queue
            get().clearOfflineQueue()
          }
        }
      }),
      {
        name: 'chat-store',
        partialize: (state) => ({
          // Only persist conversations and current agent
          conversations: state.conversations,
          currentAgent: state.currentAgent
        })
      }
    )
  )
)