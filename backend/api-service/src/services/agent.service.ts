import { DatabaseConnection } from '../config/database';
import { aiProviderService } from './ai-provider.service';
import type { AIMessage, AIResponse } from './ai-provider.service';

export interface Agent {
  id: string;
  agent_name: string;
  agent_type: 'central' | 'mentor' | 'reporter' | 'analyst' | 'strategist';
  display_name: string;
  description: string;
  personality_prompt: string;
  capabilities: Record<string, boolean>;
  model_config: {
    primary_model: string;
    fallback_model?: string;
    local_model?: string;
    temperature: number;
    max_tokens: number;
    system_prompt_template?: string;
  };
  is_active: boolean;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  conversation_type: 'general' | 'analysis' | 'education' | 'strategy';
  active_agent_id: string;
  context_summary?: string;
  metadata?: Record<string, any>;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
  last_activity_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  agent_id?: string;
  user_id?: string;
  content: string;
  message_type: 'user' | 'agent' | 'system' | 'tool';
  role: 'user' | 'assistant' | 'system' | 'function';
  model_used?: string;
  model_provider?: string;
  processing_time_ms?: number;
  token_count?: number;
  cost_usd?: number;
  created_at: Date;
}

export class AgentService {
  private db: DatabaseConnection;

  constructor() {
    // Get database config from somewhere - for now we'll get the instance differently
    this.db = DatabaseConnection.getInstance({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'zaeus_db',
      user: process.env.POSTGRES_USER || 'zaeus_user',
      password: process.env.POSTGRES_PASSWORD || 'zaeus_password',
    });
  }

  /**
   * Get all active agents
   */
  async getAgents(): Promise<Agent[]> {
    const query = `
      SELECT 
        id, agent_name, agent_type, display_name, description,
        personality_prompt, capabilities, model_config, is_active,
        created_at, updated_at
      FROM zaeus_core.ai_agents 
      WHERE is_active = true
      ORDER BY created_at ASC
    `;
    
    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Get agent by ID
   */
  async getAgentById(agentId: string): Promise<Agent | null> {
    const query = `
      SELECT 
        id, agent_name, agent_type, display_name, description,
        personality_prompt, capabilities, model_config, is_active,
        created_at, updated_at
      FROM zaeus_core.ai_agents 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await this.db.query(query, [agentId]);
    return result.rows[0] || null;
  }

  /**
   * Get agent by name
   */
  async getAgentByName(agentName: string): Promise<Agent | null> {
    const query = `
      SELECT 
        id, agent_name, agent_type, display_name, description,
        personality_prompt, capabilities, model_config, is_active,
        created_at, updated_at
      FROM zaeus_core.ai_agents 
      WHERE agent_name = $1 AND is_active = true
    `;
    
    const result = await this.db.query(query, [agentName]);
    return result.rows[0] || null;
  }

  /**
   * Create a new conversation
   */
  async createConversation(params: {
    userId: string;
    title?: string;
    agentId?: string;
    conversationType?: 'general' | 'analysis' | 'education' | 'strategy';
  }): Promise<Conversation> {
    const { userId, title, agentId, conversationType = 'general' } = params;
    
    // Get default agent if none specified
    let activeAgentId = agentId;
    if (!activeAgentId) {
      const defaultAgent = await this.getAgentByName('agent_00z');
      activeAgentId = defaultAgent?.id || '';
    }

    const query = `
      INSERT INTO zaeus_core.conversations (
        user_id, title, conversation_type, active_agent_id,
        context_summary, metadata, is_archived
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const defaultTitle = title || `Conversație ${new Date().toLocaleDateString('ro-RO')}`;
    const result = await this.db.query(query, [
      userId,
      defaultTitle,
      conversationType,
      activeAgentId,
      'Conversație nouă',
      JSON.stringify({ created_via: 'api', version: '1.0' }),
      false
    ]);

    return result.rows[0];
  }

  /**
   * Get conversations for a user
   */
  async getUserConversations(userId: string, limit = 50): Promise<Conversation[]> {
    const query = `
      SELECT * FROM zaeus_core.conversations 
      WHERE user_id = $1 AND is_archived = false
      ORDER BY last_activity_at DESC
      LIMIT $2
    `;
    
    const result = await this.db.query(query, [userId, limit]);
    return result.rows;
  }

  /**
   * Save a message to the database
   */
  async saveMessage(params: {
    conversationId: string;
    content: string;
    messageType: 'user' | 'agent' | 'system' | 'tool';
    role: 'user' | 'assistant' | 'system' | 'function';
    userId?: string;
    agentId?: string;
    modelUsed?: string;
    modelProvider?: string;
    processingTimeMs?: number;
    tokenCount?: number;
    costUsd?: number;
  }): Promise<Message> {
    const {
      conversationId,
      content,
      messageType,
      role,
      userId,
      agentId,
      modelUsed,
      modelProvider,
      processingTimeMs,
      tokenCount,
      costUsd
    } = params;

    // Get conversation to get user_id for encryption
    const convQuery = 'SELECT user_id FROM zaeus_core.conversations WHERE id = $1';
    const convResult = await this.db.query(convQuery, [conversationId]);
    const conversationUserId = convResult.rows[0]?.user_id;

    if (!conversationUserId) {
      throw new Error('Conversation not found');
    }

    const query = `
      INSERT INTO zaeus_core.messages (
        conversation_id, user_id, agent_id, content_encrypted, content_hash,
        message_type, role, model_used, model_provider, processing_time_ms,
        token_count, cost_usd
      ) VALUES (
        $1, $2, $3, encrypt_message_content($4, $5), encode(sha256($4::bytea), 'hex'),
        $6, $7, $8, $9, $10, $11, $12
      )
      RETURNING 
        id, conversation_id, user_id, agent_id, message_type, role,
        model_used, model_provider, processing_time_ms, token_count, cost_usd,
        created_at, decrypt_message_content(content_encrypted, $5) as content
    `;

    const result = await this.db.query(query, [
      conversationId,
      messageType === 'user' ? userId : null,
      messageType === 'agent' ? agentId : null,
      content,
      conversationUserId,
      messageType,
      role,
      modelUsed,
      modelProvider,
      processingTimeMs,
      tokenCount,
      costUsd
    ]);

    // Update conversation last activity
    await this.db.query(
      'UPDATE zaeus_core.conversations SET last_activity_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );

    return result.rows[0];
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(conversationId: string, limit = 100): Promise<Message[]> {
    const query = `
      SELECT 
        m.id, m.conversation_id, m.user_id, m.agent_id,
        m.message_type, m.role, m.model_used, m.model_provider,
        m.processing_time_ms, m.token_count, m.cost_usd, m.created_at,
        decrypt_message_content(m.content_encrypted, c.user_id) as content,
        a.display_name as agent_name
      FROM zaeus_core.messages m
      JOIN zaeus_core.conversations c ON m.conversation_id = c.id
      LEFT JOIN zaeus_core.ai_agents a ON m.agent_id = a.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
      LIMIT $2
    `;
    
    const result = await this.db.query(query, [conversationId, limit]);
    return result.rows;
  }

  /**
   * Get conversation messages with pagination
   */
  async getConversationMessagesPaginated(conversationId: string, limit = 50, offset = 0): Promise<{
    messages: Message[];
    totalCount: number;
    hasMore: boolean;
  }> {
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM zaeus_core.messages m
      WHERE m.conversation_id = $1
    `;
    
    const countResult = await this.db.query(countQuery, [conversationId]);
    const totalCount = parseInt(countResult.rows[0].total_count);

    // Get paginated messages
    const query = `
      SELECT 
        m.id, m.conversation_id, m.user_id, m.agent_id,
        m.message_type, m.role, m.model_used, m.model_provider,
        m.processing_time_ms, m.token_count, m.cost_usd, m.created_at,
        decrypt_message_content(m.content_encrypted, c.user_id) as content,
        a.display_name as agent_name
      FROM zaeus_core.messages m
      JOIN zaeus_core.conversations c ON m.conversation_id = c.id
      LEFT JOIN zaeus_core.ai_agents a ON m.agent_id = a.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.db.query(query, [conversationId, limit, offset]);
    
    // Reverse to get chronological order
    const messages = result.rows.reverse();
    
    return {
      messages,
      totalCount,
      hasMore: offset + messages.length < totalCount,
    };
  }

  /**
   * Generate AI response using agent configuration
   */
  async generateAgentResponse(params: {
    agentId: string;
    messages: AIMessage[];
    conversationId?: string;
    userId?: string;
  }): Promise<AIResponse> {
    const { agentId, messages, conversationId, userId } = params;
    
    // Get agent configuration
    const agent = await this.getAgentById(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Build system prompt
    let systemPrompt = agent.personality_prompt;
    
    // Add context about capabilities if needed
    if (agent.capabilities) {
      const capabilities = Object.keys(agent.capabilities).filter(
        key => agent.capabilities[key]
      );
      if (capabilities.length > 0) {
        systemPrompt += `\n\nCapabilitățile tale includ: ${capabilities.join(', ')}.`;
      }
    }

    // Add Romanian language preference
    systemPrompt += '\n\nVorbește întotdeauna în română și adaptează-te la stilul conversației utilizatorului.';

    // Get agent memory context if conversation exists
    if (conversationId && userId) {
      const memoryContext = await this.getAgentMemoryContext(agentId, userId);
      if (memoryContext.length > 0) {
        systemPrompt += `\n\nContext din conversațiile anterioare: ${memoryContext.slice(0, 3).join('; ')}.`;
      }
    }

    // Generate response using AI provider
    const response = await aiProviderService.generateResponse(
      agent.model_config,
      messages,
      systemPrompt
    );

    // Store agent memory if this is a meaningful interaction
    if (conversationId && userId && messages.length > 0) {
      await this.updateAgentMemory(agentId, userId, messages, response.content);
    }

    return response;
  }

  /**
   * Get agent memory context for better responses
   */
  async getAgentMemoryContext(agentId: string, userId: string): Promise<string[]> {
    const query = `
      SELECT 
        memory_type, memory_key,
        decrypt_memory_value(memory_value_encrypted, user_id) as memory_value,
        importance_score
      FROM zaeus_core.agent_memory
      WHERE agent_id = $1 AND user_id = $2
      ORDER BY importance_score DESC, last_accessed_at DESC
      LIMIT 10
    `;
    
    const result = await this.db.query(query, [agentId, userId]);
    
    return result.rows.map((row: any) => 
      `${row.memory_key}: ${row.memory_value}`
    );
  }

  /**
   * Update agent memory based on conversation
   */
  async updateAgentMemory(
    agentId: string, 
    userId: string, 
    messages: AIMessage[], 
    response: string
  ): Promise<void> {
    try {
      // Extract user preferences from messages
      const userMessage = messages.find(m => m.role === 'user')?.content || '';
      
      // Simple pattern matching for preferences
      const patterns = [
        { key: 'communication_style', pattern: /\b(formal|informal|prietenos|tehnic)\b/i },
        { key: 'preferred_topics', pattern: /\b(forex|stocks|crypto|trading|analiz[ăa])\b/i },
        { key: 'experience_level', pattern: /\b(începător|intermediar|avansat|expert)\b/i },
      ];

      for (const { key, pattern } of patterns) {
        const match = userMessage.match(pattern);
        if (match) {
          await this.saveAgentMemory({
            agentId,
            userId,
            memoryType: 'user_preferences',
            memoryKey: key,
            memoryValue: match[0].toLowerCase(),
            importanceScore: 0.6
          });
        }
      }

      // Update access count for existing memories
      await this.db.query(
        `UPDATE zaeus_core.agent_memory 
         SET access_count = access_count + 1, last_accessed_at = CURRENT_TIMESTAMP
         WHERE agent_id = $1 AND user_id = $2`,
        [agentId, userId]
      );

    } catch (error) {
      console.error('Failed to update agent memory:', error);
      // Don't throw error, as this is not critical for the response
    }
  }

  /**
   * Save agent memory
   */
  async saveAgentMemory(params: {
    agentId: string;
    userId: string;
    memoryType: string;
    memoryKey: string;
    memoryValue: string;
    importanceScore?: number;
    expiresAt?: Date;
  }): Promise<void> {
    const {
      agentId,
      userId,
      memoryType,
      memoryKey,
      memoryValue,
      importanceScore = 0.5,
      expiresAt
    } = params;

    const query = `
      INSERT INTO zaeus_core.agent_memory (
        user_id, agent_id, memory_type, memory_key,
        memory_value_encrypted, memory_metadata, importance_score, expires_at
      ) VALUES ($1, $2, $3, $4, encrypt_memory_value($5, $1), $6, $7, $8)
      ON CONFLICT (user_id, agent_id, memory_type, memory_key)
      DO UPDATE SET
        memory_value_encrypted = encrypt_memory_value($5, $1),
        importance_score = $7,
        updated_at = CURRENT_TIMESTAMP
    `;

    await this.db.query(query, [
      userId,
      agentId,
      memoryType,
      memoryKey,
      memoryValue,
      JSON.stringify({ updated_via: 'conversation', confidence: 0.8 }),
      importanceScore,
      expiresAt
    ]);
  }

  /**
   * Switch active agent for a conversation
   */
  async switchAgent(conversationId: string, newAgentId: string, reason?: string): Promise<void> {
    // Get current conversation
    const convQuery = 'SELECT * FROM zaeus_core.conversations WHERE id = $1';
    const convResult = await this.db.query(convQuery, [conversationId]);
    const conversation = convResult.rows[0];

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const oldAgentId = conversation.active_agent_id;

    // Update conversation
    await this.db.query(
      'UPDATE zaeus_core.conversations SET active_agent_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newAgentId, conversationId]
    );

    // Log agent switch
    await this.db.query(
      `INSERT INTO zaeus_core.agent_switches (
        conversation_id, user_id, from_agent_id, to_agent_id, switch_reason, switch_trigger
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        conversationId,
        conversation.user_id,
        oldAgentId,
        newAgentId,
        reason || 'manual_switch',
        'User requested agent change'
      ]
    );
  }
}

// Singleton instance
export const agentService = new AgentService();