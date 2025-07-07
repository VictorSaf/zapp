import { Router } from 'express'
import { requireAuth, AuthenticatedRequest } from '../middleware/auth'
import { conversationService } from '../services/conversationService'
import { createError } from '../middleware/errorHandler'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// Get all conversations
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0
    const agentId = req.query.agentId as string | undefined
    
    const conversations = await conversationService.getConversations(
      userId, 
      limit, 
      offset,
      agentId
    )
    
    res.json({ 
      success: true, 
      data: conversations 
    })
  } catch (error) {
    next(error)
  }
})

// Create new conversation
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id
    const { agentId, title } = req.body
    
    if (!agentId) {
      throw createError('Agent ID is required', 400)
    }
    
    const conversation = await conversationService.createConversation({
      userId,
      agentId,
      title
    })
    
    res.status(201).json({ 
      success: true, 
      data: conversation 
    })
  } catch (error) {
    next(error)
  }
})

// Get conversation by ID
router.get('/:conversationId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id
    const { conversationId } = req.params
    
    if (!conversationId) {
      throw createError('Conversation ID is required', 400)
    }
    
    const conversation = await conversationService.getConversation(
      conversationId,
      userId
    )
    
    if (!conversation) {
      throw createError('Conversation not found', 404)
    }
    
    res.json({ 
      success: true, 
      data: conversation 
    })
  } catch (error) {
    next(error)
  }
})

// Update conversation
router.patch('/:conversationId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id
    const { conversationId } = req.params
    const updates = req.body
    
    if (!conversationId) {
      throw createError('Conversation ID is required', 400)
    }
    
    const conversation = await conversationService.updateConversation(
      conversationId,
      userId,
      updates
    )
    
    res.json({ 
      success: true, 
      data: conversation 
    })
  } catch (error) {
    next(error)
  }
})

// Delete conversation
router.delete('/:conversationId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id
    const { conversationId } = req.params
    
    if (!conversationId) {
      throw createError('Conversation ID is required', 400)
    }
    
    await conversationService.deleteConversation(conversationId, userId)
    
    res.json({ 
      success: true, 
      message: 'Conversation deleted successfully' 
    })
  } catch (error) {
    next(error)
  }
})

// Get messages for conversation
router.get('/:conversationId/messages', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id
    const { conversationId } = req.params
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0
    
    // Verify user has access to conversation
    if (!conversationId) {
      throw createError('Conversation ID is required', 400)
    }
    
    const conversation = await conversationService.getConversation(
      conversationId,
      userId
    )
    
    if (!conversation) {
      throw createError('Conversation not found', 404)
    }
    
    if (!conversationId) {
      throw createError('Conversation ID is required', 400)
    }
    
    const messages = await conversationService.getMessages(
      conversationId,
      limit,
      offset
    )
    
    res.json({ 
      success: true, 
      data: messages 
    })
  } catch (error) {
    next(error)
  }
})

export default router