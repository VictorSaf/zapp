import express from 'express';
import compression from 'compression';
import config from '@/config';
import logger, { logServiceEvent } from '@/config/logger';

// Import middleware
import {
  errorHandler,
  requestLogger,
  cors,
  security,
  rateLimit,
  metrics,
  notFoundHandler,
  setupGlobalErrorHandlers,
} from '@/middleware';

// Import routes
import routes from '@/routes';

// Import services
import { serviceDiscovery } from '@/services/service-discovery';
import { grpcServer } from '@/grpc/grpc-server';
import { queueService } from '@/services/queue.service';

class AIOrchestrator {
  private app: express.Application;
  private httpServer: any;

  constructor() {
    this.app = express();
    this.setupGlobalHandlers();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalHandlers(): void {
    setupGlobalErrorHandlers();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(security);
    
    // CORS
    this.app.use(cors);
    
    // Compression
    this.app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    }));
    
    // Body parsing
    this.app.use(express.json({ 
      limit: '10mb',
      strict: true,
    }));
    this.app.use(express.urlencoded({ 
      extended: true,
      limit: '10mb',
    }));
    
    // Request logging
    this.app.use(requestLogger);
    
    // Metrics
    this.app.use(metrics);
    
    // Rate limiting
    this.app.use(rateLimit);
    
    // Trust proxy (for load balancers)
    this.app.set('trust proxy', true);
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // API routes
    this.app.use('/api', routes);
    
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: config.serviceName,
        version: config.serviceVersion,
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        endpoints: {
          health: '/api/health',
          metrics: '/api/metrics',
          agents: '/api/agents',
          orchestration: '/api/orchestration',
          context: '/api/context',
          queues: '/api/queues',
          services: '/api/services',
        },
        grpc: {
          port: config.grpc.port,
          services: grpcServer.getServices(),
        },
      });
    });
    
    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        service: 'ZAEUS AI Orchestrator',
        version: config.serviceVersion,
        description: 'Multi-agent AI orchestration and coordination service',
        documentation: {
          health: 'GET /api/health - Health check endpoints',
          metrics: 'GET /api/metrics - Prometheus metrics',
          agents: 'POST /api/agents/process - Process agent requests',
          orchestration: 'POST /api/orchestration/tasks - Orchestrate multi-agent tasks',
          context: 'POST /api/context/store - Store context data',
          queues: 'GET /api/queues/stats - Queue statistics',
          services: 'GET /api/services/discover - Service discovery',
        },
        grpc: {
          port: config.grpc.port,
          proto: 'ai-orchestrator.proto',
          services: grpcServer.getServices(),
        },
      });
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Error handler (must be last)
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      logServiceEvent('service_starting', {
        service: config.serviceName,
        version: config.serviceVersion,
        environment: config.nodeEnv,
      });

      // Start gRPC server
      await grpcServer.start();
      
      // Register with service discovery
      await this.registerWithConsul();
      
      // Start HTTP server
      await this.startHttpServer();
      
      // Setup queue processors
      this.setupQueueProcessors();
      
      logServiceEvent('service_started', {
        httpPort: config.port,
        grpcPort: config.grpc.port,
        metricsPort: config.monitoring.metricsPort,
      });

      logger.info(`🚀 AI Orchestrator started successfully`, {
        service: config.serviceName,
        version: config.serviceVersion,
        environment: config.nodeEnv,
        httpPort: config.port,
        grpcPort: config.grpc.port,
        pid: process.pid,
      });

    } catch (error) {
      logger.error('Failed to start AI Orchestrator', { error });
      process.exit(1);
    }
  }

  /**
   * Start HTTP server
   */
  private async startHttpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = this.app.listen(config.port, '0.0.0.0', () => {
        resolve();
      });

      this.httpServer.on('error', reject);
      
      // Configure server timeouts
      this.httpServer.keepAliveTimeout = config.performance.keepAliveTimeout;
      this.httpServer.headersTimeout = config.performance.keepAliveTimeout + 1000;
      
      // Handle server errors
      this.httpServer.on('clientError', (error: Error, socket: any) => {
        logger.warn('Client error', { error: error.message });
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      });
    });
  }

  /**
   * Register service with Consul
   */
  private async registerWithConsul(): Promise<void> {
    try {
      await serviceDiscovery.registerService({
        serviceName: config.serviceName,
        serviceId: config.consul.serviceId,
        port: config.port,
        tags: [
          `version:${config.serviceVersion}`,
          `environment:${config.nodeEnv}`,
          'ai-orchestrator',
          'microservice',
        ],
        meta: {
          version: config.serviceVersion,
          environment: config.nodeEnv,
          grpcPort: config.grpc.port.toString(),
          metricsPort: config.monitoring.metricsPort.toString(),
        },
        healthCheck: {
          http: `http://localhost:${config.port}${config.monitoring.healthCheckPath}`,
          interval: config.consul.healthCheckInterval,
          timeout: '10s',
          deregisterCriticalServiceAfter: '5m',
        },
      });

      // Start health monitoring
      serviceDiscovery.startHealthMonitoring();
      
    } catch (error) {
      logger.warn('Failed to register with Consul, continuing without service discovery', { 
        error: (error as Error).message 
      });
    }
  }

  /**
   * Setup queue processors
   */
  private setupQueueProcessors(): void {
    // AI Processing Queue Processors
    queueService.registerProcessor('ai-processing', 'agent_request', async (job) => {
      logger.info('Processing agent request job', { jobId: job.id, data: job.data });
      
      // Mock processing for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        data: { processed: true, agentId: job.data.agentId },
        duration: 1000,
        timestamp: new Date(),
      };
    });

    // Agent Orchestration Queue Processors
    queueService.registerProcessor('agent-orchestration', 'agent_switch', async (job) => {
      logger.info('Processing agent switch job', { jobId: job.id, data: job.data });
      
      // Mock processing for now
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        data: { switched: true, fromAgent: job.data.fromAgentId, toAgent: job.data.toAgentId },
        duration: 500,
        timestamp: new Date(),
      };
    });

    queueService.registerProcessor('agent-orchestration', 'task_orchestration', async (job) => {
      logger.info('Processing task orchestration job', { jobId: job.id, data: job.data });
      
      // Mock processing for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        data: { orchestrated: true, taskId: job.data.taskId },
        duration: 2000,
        timestamp: new Date(),
      };
    });

    // Memory Context Queue Processors
    queueService.registerProcessor('memory-context', 'context_storage', async (job) => {
      logger.info('Processing context storage job', { jobId: job.id, data: job.data });
      
      // Mock processing for now
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        success: true,
        data: { stored: true, contextId: job.data.contextId },
        duration: 300,
        timestamp: new Date(),
      };
    });

    logger.info('Queue processors setup completed');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      logServiceEvent('service_shutting_down');
      logger.info('Starting graceful shutdown...');

      // Stop accepting new connections
      if (this.httpServer) {
        this.httpServer.close();
      }

      // Stop gRPC server
      await grpcServer.stop();

      // Deregister from service discovery
      await serviceDiscovery.shutdown();

      // Shutdown queue service
      await queueService.shutdown();

      logServiceEvent('service_shutdown_complete');
      logger.info('Graceful shutdown completed');

    } catch (error) {
      logger.error('Error during shutdown', { error });
    }
  }
}

// Create and start the service
const aiOrchestrator = new AIOrchestrator();

// Start the service
aiOrchestrator.start().catch((error) => {
  logger.error('Failed to start service', { error });
  process.exit(1);
});

// Handle graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  await aiOrchestrator.shutdown();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default aiOrchestrator;