import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/error-handler';
import { authenticate } from '@/middleware/auth';
import validateRequest, { queueSchemas } from '@/middleware/validation';
import { queueService } from '@/services/queue.service';

const router = Router();

/**
 * GET /queues/stats
 * Get queue statistics
 */
router.get('/stats',
  authenticate,
  validateRequest({ query: queueSchemas.getStats }),
  asyncHandler(async (req: Request, res: Response) => {
    const { queueName } = req.query as any;
    
    let stats;
    if (queueName) {
      stats = { [queueName]: await queueService.getQueueStats(queueName) };
    } else {
      stats = await queueService.getAllQueueStats();
    }
    
    res.json({
      success: true,
      data: {
        stats,
        timestamp: new Date().toISOString(),
      },
    });
  })
);

/**
 * GET /queues/health
 * Get queue health status
 */
router.get('/health',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const health = await queueService.getQueueHealth();
    
    res.json({
      success: health.healthy,
      data: health,
    });
  })
);

/**
 * POST /queues/:queueName/pause
 * Pause a queue
 */
router.post('/:queueName/pause',
  authenticate,
  validateRequest({ params: queueSchemas.pauseQueue }),
  asyncHandler(async (req: Request, res: Response) => {
    await queueService.pauseQueue(req.params.queueName);
    
    res.json({
      success: true,
      message: `Queue ${req.params.queueName} paused successfully`,
    });
  })
);

/**
 * POST /queues/:queueName/resume
 * Resume a queue
 */
router.post('/:queueName/resume',
  authenticate,
  validateRequest({ params: queueSchemas.resumeQueue }),
  asyncHandler(async (req: Request, res: Response) => {
    await queueService.resumeQueue(req.params.queueName);
    
    res.json({
      success: true,
      message: `Queue ${req.params.queueName} resumed successfully`,
    });
  })
);

/**
 * POST /queues/:queueName/clear
 * Clear a queue
 */
router.post('/:queueName/clear',
  authenticate,
  validateRequest({ params: queueSchemas.clearQueue }),
  asyncHandler(async (req: Request, res: Response) => {
    await queueService.clearQueue(req.params.queueName);
    
    res.json({
      success: true,
      message: `Queue ${req.params.queueName} cleared successfully`,
    });
  })
);

/**
 * POST /queues/:queueName/retry
 * Retry failed jobs in a queue
 */
router.post('/:queueName/retry',
  authenticate,
  validateRequest({ params: queueSchemas.retryFailedJobs }),
  asyncHandler(async (req: Request, res: Response) => {
    await queueService.retryFailedJobs(req.params.queueName);
    
    res.json({
      success: true,
      message: `Failed jobs in queue ${req.params.queueName} retried successfully`,
    });
  })
);

export default router;