import { pool } from '../config/database'
import { v4 as uuidv4 } from 'uuid'
import { createError } from '../middleware/errorHandler'

interface CreateConversationDto {
  userId: string
  agentId: string
  title?: string
}

interface UpdateConversationDto {
  title?: string
  isArchived?: boolean
}

interface Conversation {
  id: string
  userId: string
  agentId: string
  title: string
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

interface Message {
  id: string
  conversationId: string
  content: string
  role: 'user' | 'assistant' | 'system'
  agentId?: string
  createdAt: Date
}

class ConversationService {
  async createConversation(data: CreateConversationDto): Promise<Conversation> {
    const { userId, agentId, title } = data
    const conversationId = uuidv4()
    
    const defaultTitle = title || `New conversation`
    
    const query = `
      INSERT INTO zaeus_core.conversations (id, user_id, agent_id, title)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, agent_id, title, is_archived, created_at, updated_at
    `
    
    const result = await pool.query(query, [conversationId, userId, agentId, defaultTitle])
    
    if (result.rows.length === 0) {
      throw createError('Failed to create conversation', 500)
    }
    
    return this.mapRowToConversation(result.rows[0])
  }
  
  async getConversations(
    userId: string, 
    limit: number = 50, 
    offset: number = 0,
    agentId?: string
  ): Promise<Conversation[]> {
    let query = `
      SELECT id, user_id, agent_id, title, is_archived, created_at, updated_at
      FROM zaeus_core.conversations
      WHERE user_id = $1
    `
    
    const params: any[] = [userId]
    
    if (agentId) {
      query += ` AND agent_id = $${params.length + 1}`
      params.push(agentId)
    }
    
    query += ` ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)
    
    const result = await pool.query(query, params)
    
    return result.rows.map(row => this.mapRowToConversation(row))
  }
  
  async getConversation(conversationId: string | undefined, userId: string): Promise<Conversation | null> {
    if (!conversationId) {
      throw createError('Conversation ID is required', 400)
    }
    const query = `
      SELECT id, user_id, agent_id, title, is_archived, created_at, updated_at
      FROM zaeus_core.conversations
      WHERE id = $1 AND user_id = $2
    `
    
    const result = await pool.query(query, [conversationId, userId])
    
    if (result.rows.length === 0) {
      return null
    }
    
    return this.mapRowToConversation(result.rows[0])
  }
  
  async updateConversation(
    conversationId: string | undefined, 
    userId: string,
    updates: UpdateConversationDto
  ): Promise<Conversation> {
    if (!conversationId) {
      throw createError('Conversation ID is required', 400)
    }
    const updateFields: string[] = []
    const values: any[] = []
    let paramCount = 1
    
    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramCount++}`)
      values.push(updates.title)
    }
    
    if (updates.isArchived !== undefined) {
      updateFields.push(`is_archived = $${paramCount++}`)
      values.push(updates.isArchived)
    }
    
    if (updateFields.length === 0) {
      throw createError('No fields to update', 400)
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    
    values.push(conversationId, userId)
    
    const query = `
      UPDATE zaeus_core.conversations
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount++}
      RETURNING id, user_id, agent_id, title, is_archived, created_at, updated_at
    `
    
    const result = await pool.query(query, values)
    
    if (result.rows.length === 0) {
      throw createError('Conversation not found', 404)
    }
    
    return this.mapRowToConversation(result.rows[0])
  }
  
  async deleteConversation(conversationId: string | undefined, userId: string): Promise<void> {
    if (!conversationId) {
      throw createError('Conversation ID is required', 400)
    }
    const query = `
      DELETE FROM zaeus_core.conversations
      WHERE id = $1 AND user_id = $2
    `
    
    const result = await pool.query(query, [conversationId, userId])
    
    if (result.rowCount === 0) {
      throw createError('Conversation not found', 404)
    }
  }
  
  async getMessages(
    conversationId: string | undefined, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<Message[]> {
    if (!conversationId) {
      throw createError('Conversation ID is required', 400)
    }
    const query = `
      SELECT 
        m.id,
        m.conversation_id,
        pgp_sym_decrypt(m.content::bytea, current_setting('app.encryption_key')) as content,
        m.role,
        m.agent_id,
        m.created_at
      FROM zaeus_core.messages m
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `
    
    const result = await pool.query(query, [conversationId, limit, offset])
    
    return result.rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      content: row.content,
      role: row.role,
      agentId: row.agent_id,
      createdAt: row.created_at
    })).reverse() // Reverse to get chronological order
  }
  
  private mapRowToConversation(row: any): Conversation {
    return {
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      title: row.title,
      isArchived: row.is_archived,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}

export const conversationService = new ConversationService()