import { config } from '../config/env'

const API_URL = `${config.API_URL}/api`

export interface CreateConversationDto {
  agentId: string
  title?: string
}

export interface ConversationResponse {
  id: string
  title: string
  agentId: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface MessageResponse {
  id: string
  conversationId: string
  content: string
  role: 'user' | 'assistant' | 'system'
  agentId?: string
  createdAt: string
}

class ChatService {
  private getAuthHeaders() {
    const token = localStorage.getItem('zaeus_token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  async createConversation(data: CreateConversationDto): Promise<ConversationResponse> {
    const response = await fetch(`${API_URL}/conversations`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error('Failed to create conversation')
    }

    const result = await response.json()
    return result.data
  }

  async getConversations(): Promise<ConversationResponse[]> {
    const response = await fetch(`${API_URL}/conversations`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch conversations')
    }

    const result = await response.json()
    return result.data
  }

  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<MessageResponse[]> {
    const response = await fetch(
      `${API_URL}/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
      {
        headers: this.getAuthHeaders()
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch messages')
    }

    const result = await response.json()
    return result.data
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${API_URL}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to delete conversation')
    }
  }
}

export const chatService = new ChatService()