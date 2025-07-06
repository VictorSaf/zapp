import { Router } from 'express';
import { agentService } from '../services/agent.service';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// All agent routes require authentication
router.use(requireAuth);

/**
 * GET /api/agents - Get all available agents
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const agents = await agentService.getAgents();
    
    res.json({
      success: true,
      data: {
        agents: agents.map(agent => ({
          id: agent.id,
          name: agent.agent_name,
          displayName: agent.display_name,
          type: agent.agent_type,
          description: agent.description,
          capabilities: Object.keys(agent.capabilities || {}).filter(
            key => agent.capabilities[key]
          ),
          isActive: agent.is_active,
        })),
      },
    });
  } catch (error: any) {
    console.error('Failed to get agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agents',
    });
  }
});

/**
 * GET /api/agents/:agentId - Get specific agent details
 */
router.get('/:agentId', async (req: AuthenticatedRequest, res) => {
  try {
    const { agentId } = req.params;
    const agent = await agentService.getAgentById(agentId!);
    
    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        agent: {
          id: agent.id,
          name: agent.agent_name,
          displayName: agent.display_name,
          type: agent.agent_type,
          description: agent.description,
          personalityPrompt: agent.personality_prompt,
          capabilities: agent.capabilities,
          modelConfig: agent.model_config,
          isActive: agent.is_active,
        },
      },
    });
  } catch (error: any) {
    console.error('Failed to get agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent details',
    });
  }
});

/**
 * POST /api/agents/chat - Chat with a specific agent
 */
router.post('/chat', async (req: AuthenticatedRequest, res) => {
  try {
    const { agentId, messages, conversationId } = req.body;
    const userId = req.user!.id;
    
    if (!agentId || !messages || !Array.isArray(messages)) {
      res.status(400).json({
        success: false,
        error: 'Agent ID and messages are required',
      });
      return;
    }
    
    // Generate AI response
    const response = await agentService.generateAgentResponse({
      agentId,
      messages,
      conversationId,
      userId,
    });
    
    res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('Agent chat failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Agent chat failed',
    });
  }
});

/**
 * POST /api/agents/conversations - Create new conversation
 */
router.post('/conversations', async (req: AuthenticatedRequest, res) => {
  try {
    const { title, agentId, conversationType } = req.body;
    const userId = req.user!.id;
    
    const conversation = await agentService.createConversation({
      userId,
      title,
      agentId,
      conversationType,
    });
    
    res.json({
      success: true,
      data: { conversation },
    });
  } catch (error: any) {
    console.error('Failed to create conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation',
    });
  }
});

/**
 * GET /api/agents/conversations - Get user conversations
 */
router.get('/conversations', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const conversations = await agentService.getUserConversations(userId, limit);
    
    res.json({
      success: true,
      data: { conversations },
    });
  } catch (error: any) {
    console.error('Failed to get conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversations',
    });
  }
});

/**
 * GET /api/agents/conversations/:conversationId/messages - Get conversation messages
 */
router.get('/conversations/:conversationId/messages', async (req: AuthenticatedRequest, res) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const messages = await agentService.getConversationMessages(conversationId!, limit);
    
    res.json({
      success: true,
      data: { messages },
    });
  } catch (error: any) {
    console.error('Failed to get messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation messages',
    });
  }
});

/**
 * POST /api/agents/conversations/:conversationId/messages - Save message
 */
router.post('/conversations/:conversationId/messages', async (req: AuthenticatedRequest, res) => {
  try {
    const { conversationId } = req.params;
    const { content, messageType, role, agentId, modelUsed, modelProvider, processingTimeMs, tokenCount, costUsd } = req.body;
    const userId = req.user!.id;
    
    if (!content || !messageType || !role) {
      res.status(400).json({
        success: false,
        error: 'Content, messageType, and role are required',
      });
      return;
    }
    
    const message = await agentService.saveMessage({
      conversationId: conversationId!,
      content,
      messageType,
      role,
      ...(messageType === 'user' && { userId }),
      ...(messageType === 'agent' && agentId && { agentId }),
      ...(modelUsed && { modelUsed }),
      ...(modelProvider && { modelProvider }),
      ...(processingTimeMs && { processingTimeMs }),
      ...(tokenCount && { tokenCount }),
      ...(costUsd && { costUsd }),
    });
    
    res.json({
      success: true,
      data: { message },
    });
  } catch (error: any) {
    console.error('Failed to save message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save message',
    });
  }
});

/**
 * POST /api/agents/conversations/:conversationId/switch - Switch active agent
 */
router.post('/conversations/:conversationId/switch', async (req: AuthenticatedRequest, res) => {
  try {
    const { conversationId } = req.params;
    const { agentId, reason } = req.body;
    
    if (!agentId) {
      res.status(400).json({
        success: false,
        error: 'Agent ID is required',
      });
      return;
    }
    
    await agentService.switchAgent(conversationId!, agentId, reason);
    
    res.json({
      success: true,
      data: { message: 'Agent switched successfully' },
    });
  } catch (error: any) {
    console.error('Failed to switch agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to switch agent',
    });
  }
});

/**
 * GET /api/agents/:agentId/memory/:userId - Get agent memory for user
 */
router.get('/:agentId/memory/:userId', async (req: AuthenticatedRequest, res) => {
  try {
    const { agentId, userId } = req.params;
    
    // Only allow users to access their own memory or admin access
    if (req.user!.id !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }
    
    const memoryContext = await agentService.getAgentMemoryContext(agentId!, userId!);
    
    res.json({
      success: true,
      data: { memoryContext },
    });
  } catch (error: any) {
    console.error('Failed to get agent memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent memory',
    });
  }
});

export default router;