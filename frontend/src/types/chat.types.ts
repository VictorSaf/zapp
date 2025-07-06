export interface Message {
  id: string;
  conversationId?: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isLoading?: boolean;
  error?: string;
  modelUsed?: string;
  provider?: string;
  processingTimeMs?: number;
  tokenCount?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  agentId?: string;
  agentName?: string;
}

export interface Agent {
  id: string;
  name: string;
  displayName: string;
  type: 'central' | 'mentor' | 'reporter' | 'analyst' | 'strategist';
  description: string;
  capabilities: string[];
  isActive: boolean;
  avatar?: string;
  primaryModel?: string;
  temperature?: number;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  agents: Agent[];
  activeAgent: Agent | null;
}

export interface SendMessageParams {
  content: string;
  conversationId?: string;
  agentId?: string;
}

export interface ChatContextType extends ChatState {
  sendMessage: (params: SendMessageParams) => Promise<void>;
  createConversation: (title?: string) => void;
  selectConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  clearError: () => void;
  selectAgent: (agentId: string) => void;
}