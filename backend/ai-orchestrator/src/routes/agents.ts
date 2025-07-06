import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/error-handler';
import { authenticate } from '@/middleware/auth';
import { aiRequestRateLimit } from '@/middleware/rate-limit';
import validateRequest, { agentSchemas, commonSchemas } from '@/middleware/validation';
import { AIOrchestratorService } from '@/grpc/services/ai-orchestrator.service';

const router = Router();
const orchestratorService = new AIOrchestratorService();

/**
 * POST /agents/process
 * Process agent request
 */
router.post('/process',
  authenticate,
  aiRequestRateLimit,
  validateRequest({ body: agentSchemas.processRequest }),
  asyncHandler(async (req: Request, res: Response) => {
    const response = await orchestratorService.processAgentRequest(req.body);
    
    res.json({
      success: true,
      data: response,
    });
  })
);

/**
 * POST /agents/switch
 * Switch agent in conversation
 */
router.post('/switch',
  authenticate,
  aiRequestRateLimit,
  validateRequest({ body: agentSchemas.switchAgent }),
  asyncHandler(async (req: Request, res: Response) => {
    const response = await orchestratorService.switchAgent(req.body);
    
    res.json({
      success: true,
      data: response,
    });
  })
);

/**
 * GET /agents/active
 * Get active agents
 */
router.get('/active',
  authenticate,
  validateRequest({ query: agentSchemas.getActiveAgents }),
  asyncHandler(async (req: Request, res: Response) => {
    const response = await orchestratorService.getActiveAgents(req.query);
    
    res.json({
      success: true,
      data: response,
    });
  })
);

export default router;