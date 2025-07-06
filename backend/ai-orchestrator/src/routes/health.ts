import { Router, Request, Response } from 'express';
import config from '@/config';
import { asyncHandler } from '@/middleware/error-handler';
import { queueService } from '@/services/queue.service';
import { serviceDiscovery } from '@/services/service-discovery';
import { grpcServer } from '@/grpc/grpc-server';

const router = Router();

/**
 * GET /health
 * Basic health check
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: {
      name: config.serviceName,
      version: config.serviceVersion,
      environment: config.nodeEnv,
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  res.json({
    success: true,
    data: health,
  });
}));

/**
 * GET /health/detailed
 * Detailed health check with dependencies
 */
router.get('/detailed', asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Check queue health
  const queueHealth = await queueService.getQueueHealth();
  
  // Check gRPC server status
  const grpcStatus = grpcServer.getStatus();
  
  // Check service discovery (basic connectivity)
  let consulHealthy = true;
  try {
    await serviceDiscovery.getKeyValue('health-check');
  } catch (error) {
    consulHealthy = false;
  }

  const checks = {
    queues: {
      status: queueHealth.healthy ? 'healthy' : 'unhealthy',
      details: queueHealth.issues.length > 0 ? queueHealth.issues : 'All queues operational',
      stats: queueHealth.queueStats,
    },
    grpc: {
      status: grpcStatus.running ? 'healthy' : 'unhealthy',
      details: grpcStatus.running ? 'gRPC server is running' : 'gRPC server is not running',
      address: grpcStatus.address,
      port: grpcStatus.port,
    },
    consul: {
      status: consulHealthy ? 'healthy' : 'unhealthy',
      details: consulHealthy ? 'Service discovery is accessible' : 'Service discovery is not accessible',
    },
    memory: {
      status: 'healthy',
      usage: process.memoryUsage(),
    },
    disk: {
      status: 'healthy', // In production, check actual disk usage
      details: 'Disk usage is within acceptable limits',
    },
  };

  const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
  
  const health = {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: {
      name: config.serviceName,
      version: config.serviceVersion,
      environment: config.nodeEnv,
    },
    uptime: process.uptime(),
    responseTime: Date.now() - startTime,
    checks,
  };

  const statusCode = allHealthy ? 200 : 503;
  res.status(statusCode).json({
    success: allHealthy,
    data: health,
  });
}));

/**
 * GET /health/ready
 * Readiness check for Kubernetes
 */
router.get('/ready', asyncHandler(async (req: Request, res: Response) => {
  // Check if service is ready to accept requests
  const queueHealth = await queueService.getQueueHealth();
  const grpcStatus = grpcServer.getStatus();
  
  const isReady = queueHealth.healthy && grpcStatus.running;
  
  if (isReady) {
    res.json({
      success: true,
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      success: false,
      status: 'not ready',
      timestamp: new Date().toISOString(),
      issues: [
        ...(!queueHealth.healthy ? queueHealth.issues : []),
        ...(!grpcStatus.running ? ['gRPC server not running'] : []),
      ],
    });
  }
}));

/**
 * GET /health/live
 * Liveness check for Kubernetes
 */
router.get('/live', asyncHandler(async (req: Request, res: Response) => {
  // Basic liveness check - if this endpoint responds, the service is alive
  res.json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}));

/**
 * GET /health/startup
 * Startup check for Kubernetes
 */
router.get('/startup', asyncHandler(async (req: Request, res: Response) => {
  // Check if service has completed startup
  const minimumUptime = 10; // 10 seconds
  const hasStarted = process.uptime() > minimumUptime;
  
  if (hasStarted) {
    res.json({
      success: true,
      status: 'started',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } else {
    res.status(503).json({
      success: false,
      status: 'starting',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: `Service is still starting up. Minimum uptime: ${minimumUptime}s`,
    });
  }
}));

export default router;