import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { webSocketService } from '../services/websocket.service';
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
}

interface ChatStore extends ChatState {
  // WebSocket state
  connectionStatus: ConnectionStatus;
  typingUsers: TypingUser[];
  typingAgents: { agentId: string; conversationId: string; isTyping: boolean }[];
  
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

const API_BASE_URL = 'http://localhost:3000/api';

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

      // Actions
      sendMessage: async ({ content, conversationId }) => {
        const { activeConversationId, activeAgent, messages } = get();
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
            .filter(msg => msg.conversationId === convId)
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
        const newConversation: Conversation = {
          id: uuidv4(),
          title: title || `Conversație nouă ${new Date().toLocaleDateString('ro-RO')}`,
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
        const conversation = get().conversations.find(c => c.id === conversationId);
        if (conversation) {
          set({
            activeConversationId: conversationId,
            messages: get().messages.filter(m => m.conversationId === conversationId),
          });
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