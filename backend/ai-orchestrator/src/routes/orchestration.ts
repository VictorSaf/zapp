import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/error-handler';
import { authenticate } from '@/middleware/auth';
import { orchestrationRateLimit } from '@/middleware/rate-limit';
import validateRequest, { orchestrationSchemas, commonSchemas } from '@/middleware/validation';
import { AIOrchestratorService } from '@/grpc/services/ai-orchestrator.service';

const router = Router();
const orchestratorService = new AIOrchestratorService();

/**
 * POST /orchestration/tasks
 * Orchestrate multi-agent tasks
 */
router.post('/tasks',
  authenticate,
  orchestrationRateLimit,
  validateRequest({ body: orchestrationSchemas.orchestrateTasks }),
  asyncHandler(async (req: Request, res: Response) => {
    const response = await orchestratorService.orchestrateTasks(req.body);
    
    res.json({
      success: true,
      data: response,
    });
  })
);

/**
 * GET /orchestration/tasks/:taskId/status
 * Get task status
 */
router.get('/tasks/:taskId/status',
  authenticate,
  validateRequest({ params: orchestrationSchemas.getTaskStatus }),
  asyncHandler(async (req: Request, res: Response) => {
    const response = await orchestratorService.getTaskStatus(req.params);
    
    res.json({
      success: true,
      data: response,
    });
  })
);

/**
 * POST /orchestration/tasks/:taskId/cancel
 * Cancel task
 */
router.post('/tasks/:taskId/cancel',
  authenticate,
  validateRequest({ 
    params: orchestrationSchemas.cancelTask,
    body: orchestrationSchemas.cancelTask
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const requestData = {
      taskId: req.params.taskId,
      ...req.body,
    };
    
    const response = await orchestratorService.cancelTask(requestData);
    
    res.json({
      success: true,
      data: response,
    });
  })
);

export default router;