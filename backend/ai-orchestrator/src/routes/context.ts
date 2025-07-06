import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/error-handler';
import { authenticate } from '@/middleware/auth';
import validateRequest, { contextSchemas } from '@/middleware/validation';
import { AIOrchestratorService } from '@/grpc/services/ai-orchestrator.service';

const router = Router();
const orchestratorService = new AIOrchestratorService();

/**
 * POST /context/store
 * Store context data
 */
router.post('/store',
  authenticate,
  validateRequest({ body: contextSchemas.storeContext }),
  asyncHandler(async (req: Request, res: Response) => {
    const response = await orchestratorService.storeContext(req.body);
    
    res.json({
      success: true,
      data: response,
    });
  })
);

/**
 * GET /context
 * Get context data
 */
router.get('/',
  authenticate,
  validateRequest({ query: contextSchemas.getContext }),
  asyncHandler(async (req: Request, res: Response) => {
    const response = await orchestratorService.getContext(req.query);
    
    res.json({
      success: true,
      data: response,
    });
  })
);

/**
 * PUT /context/:contextId
 * Update context data
 */
router.put('/:contextId',
  authenticate,
  validateRequest({ 
    params: contextSchemas.updateContext,
    body: contextSchemas.updateContext
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const requestData = {
      contextId: req.params.contextId,
      ...req.body,
    };
    
    const response = await orchestratorService.updateContext(requestData);
    
    res.json({
      success: true,
      data: response,
    });
  })
);

export default router;