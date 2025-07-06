import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { webSocketService } from '../services/websocket.service';
import { offlineQueueService } from '../services/offline-queue.service';
// import { networkMonitorService } from '../services/network-monitor.service';
import type { 
  ChatState, 
  Message, 
  Conversation, 
  SendMessageParams,
  Agent 
} from '../types/chat.types';

export interface TypingUser {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

export interface ConnectionStatus {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastConnected?: Date;
  reconnectAttempts: number;
  networkQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  networkRecommendation?: 'optimal' | 'reduced' | 'minimal' | 'offline';
  isOptimized?: boolean;
}

interface ChatStore extends ChatState {
  // WebSocket state
  connectionStatus: ConnectionStatus;
  typingUsers: TypingUser[];
  typingAgents: { agentId: string; conversationId: string; isTyping: boolean }[];
  
  // Pagination state
  messagePagination: Map<string, { hasMore: boolean; totalCount: number; offset: number }>;
  
  // Actions
  sendMessage: (params: SendMessageParams) => Promise<void>;
  createConversation: (title?: string) => void;
  selectConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  clearError: () => void;
  selectAgent: (agentId: string) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, update: Partial<Message>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadAgents: () => Promise<void>;
  
  // WebSocket actions
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId?: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  addTypingUser: (userId: string, conversationId: string) => void;
  removeTypingUser: (userId: string, conversationId: string) => void;
  setAgentTyping: (agentId: string, conversationId: string, isTyping: boolean) => void;
  
  // Persistence actions
  loadConversations: () => void;
  loadMessages: (conversationId: string, limit?: number, offset?: number) => void;
  loadMoreMessages: (conversationId: string) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  archiveConversation: (conversationId: string) => void;
}

// Default Agent 00Z
const defaultAgent: Agent = {
  id: 'agent_00z',
  name: 'agent_00z',
  displayName: 'Agent 00Z',
  type: 'central',
  description: 'Agentul tău personal AI pentru trading și educație financiară',
  capabilities: ['conversation', 'education', 'analysis', 'coordination'],
  isActive: true,
  primaryModel: 'llama3.2',
  temperature: 0.7,
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api` : 'http://localhost:3000/api';

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: [],
      activeConversationId: null,
      messages: [],
      isLoading: false,
      error: null,
      agents: [defaultAgent],
      activeAgent: defaultAgent,
      
      // WebSocket state
      connectionStatus: {
        status: 'disconnected',
        reconnectAttempts: 0,
      },
      typingUsers: [],
      typingAgents: [],
      
      // Pagination state
      messagePagination: new Map(),

      // Actions
      sendMessage: async ({ content, conversationId }) => {
        const { activeConversationId, activeAgent, messages, connectionStatus } = get();
        const convId = conversationId || activeConversationId;
        
        if (!convId) {
          // Create new conversation if none exists
          get().createConversation();
          const newConvId = get().activeConversationId;
          if (!newConvId) return;
        }

        const userMessage: Message = {
          id: uuidv4(),
          conversationId: convId || '',
          content,
          role: 'user',
          timestamp: new Date(),
        };

        // Add user message
        get().addMessage(userMessage);
        set({ isLoading: true, error: null });

        // Stop typing indicator
        get().stopTyping(convId || '');

        // Send message via WebSocket if connected
        if (connectionStatus.status === 'connected') {
          webSocketService.sendMessage(convId || '', content, activeAgent?.id);
          
          // Request agent response via WebSocket
          const conversationMessages = messages
            .filter(msg => msg.conversationId === convId && !msg.isLoading)
            .map(msg => ({
              role: msg.role,
              content: msg.content,
            }));
          
          conversationMessages.push({
            role: 'user',
            content,
          });

          webSocketService.requestAgentResponse(
            convId || '',
            activeAgent?.id || 'agent_00z',
            conversationMessages
          );
          
          set({ isLoading: false });
          return;
        }

        // Queue message for offline sync if not connected
        if (connectionStatus.status === 'disconnected' || connectionStatus.status === 'error') {
          const queuedMessageId = offlineQueueService.queueMessage(convId || '', content, activeAgent?.id);
          
          // Update the user message with queue info
          get().updateMessage(userMessage.id, {
            id: queuedMessageId,
            error: 'Message queued for sending when online',
          });
          
          set({ isLoading: false });
          console.log('📦 Message queued for offline sync');
          return;
        }

        // Fallback to HTTP API if WebSocket not connected
        console.warn('WebSocket not connected, falling back to HTTP API');
        
        // Create loading message
        const loadingMessage: Message = {
          id: uuidv4(),
          conversationId: convId || '',
          content: '',
          role: 'assistant',
          timestamp: new Date(),
          isLoading: true,
        };
        get().addMessage(loadingMessage);

        try {
          // Get auth token
          const authState = localStorage.getItem('zaeus-auth-storage');
          const token = authState ? JSON.parse(authState).state.token : null;

          if (!token) {
            throw new Error('Nu ești autentificat. Te rog să te loghezi.');
          }

          // Prepare messages for API
          const conversationMessages = messages
            .filter(msg => msg.conversationId === convId && !msg.isLoading)
            .map(msg => ({
              role: msg.role,
              content: msg.content,
            }));

          // Add current message
          conversationMessages.push({
            role: 'user',
            content,
          });

          // Call Agent API  
          const response = await fetch(`${API_BASE_URL}/agents/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              agentId: activeAgent?.id || 'agent_00z',
              messages: conversationMessages,
              conversationId: convId,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Eroare la generarea răspunsului');
          }

          const data = await response.json();
          const aiResponse = data.data;

          // Update loading message with response
          get().updateMessage(loadingMessage.id, {
            content: aiResponse.content,
            isLoading: false,
            modelUsed: aiResponse.model_used,
            provider: aiResponse.provider,
            processingTimeMs: aiResponse.processing_time_ms,
            tokenCount: aiResponse.token_count,
          });

          // Update conversation
          set(state => ({
            conversations: state.conversations.map(conv =>
              conv.id === convId
                ? { ...conv, updatedAt: new Date() }
                : conv
            ),
          }));

        } catch (error: any) {
          console.error('Chat error:', error);
          
          // Update loading message with error
          get().updateMessage(loadingMessage.id, {
            content: 'Scuze, am întâmpinat o eroare. Te rog încearcă din nou.',
            isLoading: false,
            error: error.message,
          });

          set({ error: error.message });
        } finally {
          set({ isLoading: false });
        }
      },

      createConversation: (title?: string) => {
        const { connectionStatus, activeAgent } = get();
        
        // Use WebSocket if connected
        if (connectionStatus.status === 'connected') {
          webSocketService.createConversation(
            title || `Conversație nouă ${new Date().toLocaleDateString('ro-RO')}`,
            activeAgent?.id,
            'general'
          );
          return;
        }

        // Queue conversation creation for offline sync
        const conversationTitle = title || `Conversație nouă ${new Date().toLocaleDateString('ro-RO')}`;
        const queuedConversationId = offlineQueueService.queueConversation(
          conversationTitle,
          activeAgent?.id,
          'general'
        );

        // Create local conversation with queued ID
        const newConversation: Conversation = {
          id: queuedConversationId,
          title: conversationTitle,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
          agentId: get().activeAgent?.id,
          agentName: get().activeAgent?.displayName,
        };

        set(state => ({
          conversations: [newConversation, ...state.conversations],
          activeConversationId: newConversation.id,
          messages: [],
        }));
      },

      selectConversation: (conversationId: string) => {
        const { activeConversationId, connectionStatus } = get();
        
        // Leave current conversation if different
        if (activeConversationId && activeConversationId !== conversationId) {
          get().leaveConversation(activeConversationId);
        }
        
        const conversation = get().conversations.find(c => c.id === conversationId);
        if (conversation) {
          set({
            activeConversationId: conversationId,
            messages: get().messages.filter(m => m.conversationId === conversationId),
          });
          
          // Join new conversation via WebSocket
          get().joinConversation(conversationId);
          
          // Load messages if connected to WebSocket
          if (connectionStatus.status === 'connected') {
            webSocketService.loadConversationMessages(conversationId, 50, 0);
          }
        }
      },

      deleteConversation: (conversationId: string) => {
        set(state => ({
          conversations: state.conversations.filter(c => c.id !== conversationId),
          messages: state.messages.filter(m => m.conversationId !== conversationId),
          activeConversationId: state.activeConversationId === conversationId 
            ? null 
            : state.activeConversationId,
        }));
      },

      clearError: () => set({ error: null }),

      selectAgent: (agentId: string) => {
        const agent = get().agents.find(a => a.id === agentId);
        if (agent) {
          set({ activeAgent: agent });
        }
      },

      addMessage: (message: Message) => {
        set(state => ({
          messages: [...state.messages, message],
        }));
      },

      updateMessage: (messageId: string, update: Partial<Message>) => {
        set(state => ({
          messages: state.messages.map(msg =>
            msg.id === messageId ? { ...msg, ...update } : msg
          ),
        }));
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),

      loadAgents: async () => {
        try {
          // In the future, load agents from API
          // For now, we use the default agent
          set({ agents: [defaultAgent] });
        } catch (error: any) {
          console.error('Failed to load agents:', error);
        }
      },

      loadConversations: () => {
        const { connectionStatus } = get();
        if (connectionStatus.status === 'connected') {
          webSocketService.loadUserConversations(50);
        }
      },

      loadMessages: (conversationId: string, limit = 50, offset = 0) => {
        const { connectionStatus } = get();
        if (connectionStatus.status === 'connected') {
          webSocketService.loadConversationMessages(conversationId, limit, offset);
        }
      },

      loadMoreMessages: (conversationId: string) => {
        const { connectionStatus, messagePagination } = get();
        if (connectionStatus.status !== 'connected') return;
        
        const pagination = messagePagination.get(conversationId);
        if (!pagination || !pagination.hasMore) return;
        
        const newOffset = pagination.offset + 50; // Standard page size
        webSocketService.loadConversationMessages(conversationId, 50, newOffset);
      },

      updateConversationTitle: (conversationId: string, title: string) => {
        const { connectionStatus } = get();
        
        if (connectionStatus.status === 'connected') {
          webSocketService.updateConversation(conversationId, title);
        } else {
          // Queue update for offline sync
          offlineQueueService.queueConversationUpdate(conversationId, title);
          
          // Local update for immediate UI feedback
          set(state => ({
            conversations: state.conversations.map(conv =>
              conv.id === conversationId ? { ...conv, title, updatedAt: new Date() } : conv
            ),
          }));
        }
      },

      archiveConversation: (conversationId: string) => {
        const { connectionStatus } = get();
        
        if (connectionStatus.status === 'connected') {
          webSocketService.updateConversation(conversationId, undefined, true);
        } else {
          // Queue archive for offline sync
          offlineQueueService.queueConversationUpdate(conversationId, undefined, true);
          
          // Local update for immediate UI feedback
          set(state => ({
            conversations: state.conversations.map(conv =>
              conv.id === conversationId ? { ...conv, isActive: false, updatedAt: new Date() } : conv
            ),
          }));
        }
      },
      
      // WebSocket actions
      connectWebSocket: async () => {
        try {
          const authState = localStorage.getItem('zaeus-auth-storage');
          const token = authState ? JSON.parse(authState).state.token : null;
          
          if (!token) {
            throw new Error('No authentication token available');
          }
          
          get().setConnectionStatus({ status: 'connecting', reconnectAttempts: 0 });
          
          await webSocketService.connect(token);
          
        } catch (error: any) {
          console.error('WebSocket connection failed:', error);
          get().setConnectionStatus({ 
            status: 'error', 
            reconnectAttempts: get().connectionStatus.reconnectAttempts + 1 
          });
        }
      },
      
      disconnectWebSocket: () => {
        webSocketService.disconnect();
        get().setConnectionStatus({ status: 'disconnected', reconnectAttempts: 0 });
      },
      
      joinConversation: (conversationId: string) => {
        webSocketService.joinConversation(conversationId);
      },
      
      leaveConversation: (conversationId?: string) => {
        webSocketService.leaveConversation(conversationId);
      },
      
      startTyping: (conversationId: string) => {
        webSocketService.startTyping(conversationId);
      },
      
      stopTyping: (conversationId: string) => {
        webSocketService.stopTyping(conversationId);
      },
      
      setConnectionStatus: (status: ConnectionStatus) => {
        set({ connectionStatus: status });
      },
      
      addTypingUser: (userId: string, conversationId: string) => {
        set(state => ({
          typingUsers: [
            ...state.typingUsers.filter(u => !(u.userId === userId && u.conversationId === conversationId)),
            { userId, conversationId, isTyping: true }
          ]
        }));
      },
      
      removeTypingUser: (userId: string, conversationId: string) => {
        set(state => ({
          typingUsers: state.typingUsers.filter(u => !(u.userId === userId && u.conversationId === conversationId))
        }));
      },
      
      setAgentTyping: (agentId: string, conversationId: string, isTyping: boolean) => {
        set(state => ({
          typingAgents: isTyping
            ? [
                ...state.typingAgents.filter(a => !(a.agentId === agentId && a.conversationId === conversationId)),
                { agentId, conversationId, isTyping: true }
              ]
            : state.typingAgents.filter(a => !(a.agentId === agentId && a.conversationId === conversationId))
        }));
      },
    }),
    {
      name: 'zaeus-chat-storage',
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        messages: state.messages.slice(-100), // Keep only last 100 messages
      }),
    }
  )
);

// Setup WebSocket event listeners
let isWebSocketSetup = false;

const setupWebSocketListeners = () => {
  if (isWebSocketSetup) return;
  isWebSocketSetup = true;
  
  // Connection events
  webSocketService.on('connected', () => {
    const store = useChatStore.getState();
    store.setConnectionStatus({ 
      status: 'connected', 
      lastConnected: new Date(),
      reconnectAttempts: 0 
    });
    
    // Load conversations when connected
    store.loadConversations();
    
    // Process offline queue
    offlineQueueService.processQueue(webSocketService);
  });
  
  webSocketService.on('disconnected', () => {
    useChatStore.getState().setConnectionStatus({ 
      status: 'disconnected',
      reconnectAttempts: 0
    });
  });
  
  webSocketService.on('connection-error', () => {
    const currentStatus = useChatStore.getState().connectionStatus;
    useChatStore.getState().setConnectionStatus({ 
      status: 'error',
      reconnectAttempts: currentStatus.reconnectAttempts + 1
    });
  });
  
  webSocketService.on('reconnected', () => {
    const store = useChatStore.getState();
    store.setConnectionStatus({ 
      status: 'connected',
      lastConnected: new Date(),
      reconnectAttempts: 0
    });
    
    // Process offline queue on reconnection
    offlineQueueService.processQueue(webSocketService);
  });
  
  // Message events
  webSocketService.on('message-received', (message: any) => {
    const newMessage: Message = {
      id: message.id || uuidv4(),
      conversationId: message.conversationId,
      content: message.content,
      role: message.role,
      timestamp: new Date(message.timestamp),
    };
    
    useChatStore.getState().addMessage(newMessage);
  });
  
  // Typing events
  webSocketService.on('user-typing', (data: any) => {
    if (data.isTyping) {
      useChatStore.getState().addTypingUser(data.userId, data.conversationId);
    } else {
      useChatStore.getState().removeTypingUser(data.userId, data.conversationId);
    }
  });
  
  webSocketService.on('agent-typing', (data: any) => {
    useChatStore.getState().setAgentTyping(data.agentId, data.conversationId, data.isTyping);
  });
  
  // Error events
  webSocketService.on('message-error', (data: any) => {
    useChatStore.getState().setError(data.error);
  });
  
  webSocketService.on('agent-error', (data: any) => {
    useChatStore.getState().setError(data.error);
  });
  
  // Conversation management events
  webSocketService.on('conversation-created', (data: any) => {
    const { conversation } = data;
    const newConversation: Conversation = {
      id: conversation.id,
      title: conversation.title,
      messages: [],
      createdAt: new Date(conversation.createdAt),
      updatedAt: new Date(conversation.updatedAt),
      isActive: true,
      agentId: conversation.agentId,
      agentName: useChatStore.getState().agents.find(a => a.id === conversation.agentId)?.displayName,
    };
    
    useChatStore.setState(state => ({
      conversations: [newConversation, ...state.conversations],
      activeConversationId: newConversation.id,
      messages: [],
    }));
  });
  
  webSocketService.on('conversation-messages-loaded', (data: any) => {
    const { conversationId, messages, pagination } = data;
    const conversationMessages: Message[] = messages.map((msg: any) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      content: msg.content,
      role: msg.role,
      timestamp: new Date(msg.timestamp),
      modelUsed: msg.modelUsed,
      provider: msg.provider,
      processingTimeMs: msg.processingTimeMs,
      tokenCount: msg.tokenCount,
    }));
    
    useChatStore.setState(state => {
      const newPagination = new Map(state.messagePagination);
      newPagination.set(conversationId, {
        hasMore: pagination.hasMore,
        totalCount: pagination.totalCount,
        offset: pagination.offset + messages.length,
      });
      
      return {
        ...state,
        messages: pagination.offset === 0 
          ? [
              ...state.messages.filter(m => m.conversationId !== conversationId),
              ...conversationMessages
            ]
          : [
              ...state.messages,
              ...conversationMessages
            ],
        messagePagination: newPagination,
      };
    });
  });
  
  webSocketService.on('user-conversations-loaded', (data: any) => {
    const { conversations } = data;
    const userConversations: Conversation[] = conversations.map((conv: any) => ({
      id: conv.id,
      title: conv.title,
      messages: [],
      createdAt: new Date(conv.createdAt),
      updatedAt: new Date(conv.updatedAt),
      isActive: !conv.isArchived,
      agentId: conv.agentId,
      agentName: useChatStore.getState().agents.find(a => a.id === conv.agentId)?.displayName,
    }));
    
    useChatStore.setState(() => ({
      conversations: userConversations
    }));
  });
  
  webSocketService.on('conversation-updated', (data: any) => {
    const { conversation } = data;
    
    useChatStore.setState(state => ({
      conversations: state.conversations.map(conv =>
        conv.id === conversation.id 
          ? { 
              ...conv, 
              title: conversation.title || conv.title,
              isActive: conversation.isArchived !== undefined ? !conversation.isArchived : conv.isActive,
              updatedAt: new Date(conversation.updatedAt)
            }
          : conv
      ),
    }));
  });
  
  webSocketService.on('conversation-error', (data: any) => {
    useChatStore.getState().setError(data.error);
  });
  
  // Network quality events
  webSocketService.on('network-quality-changed', (data: any) => {
    const store = useChatStore.getState();
    store.setConnectionStatus({
      ...store.connectionStatus,
      networkQuality: data.quality.latency,
      networkRecommendation: data.quality.recommendation,
    });
  });
  
  webSocketService.on('network-optimization-suggestions', (data: any) => {
    const store = useChatStore.getState();
    store.setConnectionStatus({
      ...store.connectionStatus,
      isOptimized: true,
    });
    
    // Log optimization suggestions for debugging
    console.log('🎛️ Network optimizations applied:', data.suggestions);
  });
  
  // Advanced reconnection events
  webSocketService.on('max-reconnect-attempts-reached', () => {
    const store = useChatStore.getState();
    store.setConnectionStatus({
      ...store.connectionStatus,
      status: 'error',
    });
    store.setError('Conexiunea a eșuat după mai multe încercări. Verifică conexiunea la internet.');
  });
  
  webSocketService.on('reconnect-attempt', (data: any) => {
    const store = useChatStore.getState();
    store.setConnectionStatus({
      ...store.connectionStatus,
      status: 'connecting',
      reconnectAttempts: data.attempt,
    });
  });
};

// Initialize WebSocket listeners
setupWebSocketListeners();

// Export types
export type { Message as ChatMessage, Agent } from '../types/chat.types';