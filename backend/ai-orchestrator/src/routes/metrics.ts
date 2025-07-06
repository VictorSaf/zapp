import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/error-handler';
import { metricsService } from '@/services/metrics.service';
import { authenticateFlexible } from '@/middleware/auth';

const router = Router();

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const metrics = await metricsService.getMetrics();
  
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics);
}));

/**
 * GET /metrics/json
 * JSON formatted metrics (requires authentication)
 */
router.get('/json', authenticateFlexible, asyncHandler(async (req: Request, res: Response) => {
  const registry = metricsService.getRegistry();
  const metrics = await registry.getMetricsAsJSON();
  
  res.json({
    success: true,
    data: {
      metrics,
      timestamp: new Date().toISOString(),
    },
  });
}));

/**
 * POST /metrics/reset
 * Reset all metrics (requires authentication)
 */
router.post('/reset', authenticateFlexible, asyncHandler(async (req: Request, res: Response) => {
  metricsService.reset();
  
  res.json({
    success: true,
    message: 'Metrics reset successfully',
    timestamp: new Date().toISOString(),
  });
}));

export default router;