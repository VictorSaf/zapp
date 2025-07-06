import { Router } from 'express';
import healthRoutes from './health';
import metricsRoutes from './metrics';
import agentRoutes from './agents';
import orchestrationRoutes from './orchestration';
import contextRoutes from './context';
import queueRoutes from './queues';
import serviceRoutes from './services';

const router = Router();

// Health check routes
router.use('/health', healthRoutes);

// Metrics routes
router.use('/metrics', metricsRoutes);

// Agent routes
router.use('/agents', agentRoutes);

// Orchestration routes
router.use('/orchestration', orchestrationRoutes);

// Context routes
router.use('/context', contextRoutes);

// Queue management routes
router.use('/queues', queueRoutes);

// Service discovery routes
router.use('/services', serviceRoutes);

export default router;