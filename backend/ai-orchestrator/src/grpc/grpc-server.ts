import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import config from '@/config';
import logger, { logError, logServiceEvent } from '@/config/logger';
import { metricsService } from '@/services/metrics.service';

// Import service implementations
import { AIOrchestratorService } from './services/ai-orchestrator.service';

export class GRPCServer {
  private server: grpc.Server;
  private packageDefinition: protoLoader.PackageDefinition;
  private proto: any;

  constructor() {
    this.server = new grpc.Server({
      'grpc.max_receive_message_length': config.grpc.maxMessageSize,
      'grpc.max_send_message_length': config.grpc.maxMessageSize,
    });

    this.loadProtoDefinition();
    this.registerServices();
    this.setupInterceptors();
  }

  /**
   * Load protocol buffer definitions
   */
  private loadProtoDefinition(): void {
    try {
      const protoPath = path.join(__dirname, '../proto/ai-orchestrator.proto');
      
      this.packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      this.proto = grpc.loadPackageDefinition(this.packageDefinition);
      
      logger.info('Proto definition loaded successfully', { protoPath });
    } catch (error) {
      logError(error as Error, { operation: 'load_proto_definition' });
      throw new Error(`Failed to load proto definition: ${(error as Error).message}`);
    }
  }

  /**
   * Register gRPC services
   */
  private registerServices(): void {
    try {
      // Register AI Orchestrator service
      const aiOrchestratorService = new AIOrchestratorService();
      
      this.server.addService(
        this.proto.ai_orchestrator.AIOrchestrator.service,
        {
          // Agent Operations
          processAgentRequest: this.createMethodHandler(
            aiOrchestratorService.processAgentRequest.bind(aiOrchestratorService)
          ),
          switchAgent: this.createMethodHandler(
            aiOrchestratorService.switchAgent.bind(aiOrchestratorService)
          ),
          getActiveAgents: this.createMethodHandler(
            aiOrchestratorService.getActiveAgents.bind(aiOrchestratorService)
          ),
          
          // Orchestration Operations
          orchestrateTasks: this.createMethodHandler(
            aiOrchestratorService.orchestrateTasks.bind(aiOrchestratorService)
          ),
          getTaskStatus: this.createMethodHandler(
            aiOrchestratorService.getTaskStatus.bind(aiOrchestratorService)
          ),
          cancelTask: this.createMethodHandler(
            aiOrchestratorService.cancelTask.bind(aiOrchestratorService)
          ),
          
          // Memory Context Operations
          storeContext: this.createMethodHandler(
            aiOrchestratorService.storeContext.bind(aiOrchestratorService)
          ),
          getContext: this.createMethodHandler(
            aiOrchestratorService.getContext.bind(aiOrchestratorService)
          ),
          updateContext: this.createMethodHandler(
            aiOrchestratorService.updateContext.bind(aiOrchestratorService)
          ),
          
          // Health Check
          healthCheck: this.createMethodHandler(
            aiOrchestratorService.healthCheck.bind(aiOrchestratorService)
          ),
        }
      );

      logger.info('gRPC services registered successfully');
    } catch (error) {
      logError(error as Error, { operation: 'register_services' });
      throw new Error(`Failed to register services: ${(error as Error).message}`);
    }
  }

  /**
   * Create a method handler with error handling and metrics
   */
  private createMethodHandler(handler: Function) {
    return async (call: any, callback: any) => {
      const startTime = Date.now();
      const methodName = call.definition?.path || 'unknown';
      
      try {
        // Increment in-flight requests
        metricsService.incrementHttpRequestsInFlight();
        
        logger.debug('gRPC method called', {
          method: methodName,
          requestId: call.metadata?.get('request-id')?.[0] || 'unknown',
        });

        // Call the actual handler
        const result = await handler(call.request);
        
        // Record success metrics
        const duration = (Date.now() - startTime) / 1000;
        metricsService.recordHttpRequest('gRPC', methodName, 200, duration);
        
        callback(null, result);
        
      } catch (error) {
        // Record error metrics
        const duration = (Date.now() - startTime) / 1000;
        metricsService.recordHttpRequest('gRPC', methodName, 500, duration);
        
        logError(error as Error, {
          operation: 'grpc_method_call',
          method: methodName,
          requestData: call.request,
        });

        // Convert error to gRPC error
        const grpcError = this.createGRPCError(error as Error);
        callback(grpcError, null);
        
      } finally {
        // Decrement in-flight requests
        metricsService.decrementHttpRequestsInFlight();
      }
    };
  }

  /**
   * Convert regular error to gRPC error
   */
  private createGRPCError(error: Error): grpc.ServiceError {
    let code = grpc.status.INTERNAL;
    let message = error.message || 'Internal server error';

    // Map specific errors to gRPC status codes
    if (error.message.includes('not found')) {
      code = grpc.status.NOT_FOUND;
    } else if (error.message.includes('invalid') || error.message.includes('validation')) {
      code = grpc.status.INVALID_ARGUMENT;
    } else if (error.message.includes('timeout')) {
      code = grpc.status.DEADLINE_EXCEEDED;
    } else if (error.message.includes('unauthorized')) {
      code = grpc.status.UNAUTHENTICATED;
    } else if (error.message.includes('forbidden')) {
      code = grpc.status.PERMISSION_DENIED;
    } else if (error.message.includes('rate limit')) {
      code = grpc.status.RESOURCE_EXHAUSTED;
    }

    const grpcError: grpc.ServiceError = {
      name: 'ServiceError',
      message,
      code,
      details: error.stack || '',
    };

    return grpcError;
  }

  /**
   * Setup gRPC interceptors
   */
  private setupInterceptors(): void {
    // Add metadata interceptor for logging and tracing
    const metadataInterceptor = (options: any, nextCall: any) => {
      return new grpc.InterceptingCall(nextCall(options), {
        start: (metadata, listener, next) => {
          // Add correlation ID if not present
          if (!metadata.get('correlation-id').length) {
            metadata.add('correlation-id', `grpc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
          }
          
          // Add service info
          metadata.add('service-name', config.serviceName);
          metadata.add('service-version', config.serviceVersion);
          
          next(metadata, listener);
        },
      });
    };

    // Note: Interceptors are typically set up at the client level
    // For server interceptors, we handle them in the method handlers above
  }

  /**
   * Start the gRPC server
   */
  async start(): Promise<void> {
    try {
      const bindAddress = `0.0.0.0:${config.grpc.port}`;
      
      await new Promise<void>((resolve, reject) => {
        this.server.bindAsync(
          bindAddress,
          grpc.ServerCredentials.createInsecure(),
          (error, port) => {
            if (error) {
              reject(error);
              return;
            }
            
            this.server.start();
            resolve();
          }
        );
      });

      logServiceEvent('grpc_server_started', {
        port: config.grpc.port,
        address: bindAddress,
      });

      logger.info(`gRPC server started on ${bindAddress}`);
    } catch (error) {
      logError(error as Error, { operation: 'start_grpc_server' });
      throw new Error(`Failed to start gRPC server: ${(error as Error).message}`);
    }
  }

  /**
   * Stop the gRPC server
   */
  async stop(): Promise<void> {
    try {
      await new Promise<void>((resolve) => {
        this.server.tryShutdown((error) => {
          if (error) {
            logger.warn('Error during gRPC server shutdown', { error: error.message });
            // Force shutdown
            this.server.forceShutdown();
          }
          resolve();
        });
      });

      logServiceEvent('grpc_server_stopped');
      logger.info('gRPC server stopped');
    } catch (error) {
      logError(error as Error, { operation: 'stop_grpc_server' });
    }
  }

  /**
   * Get server status
   */
  getStatus(): {
    running: boolean;
    port: number;
    address: string;
  } {
    return {
      running: this.server !== null,
      port: config.grpc.port,
      address: `0.0.0.0:${config.grpc.port}`,
    };
  }

  /**
   * Get registered services
   */
  getServices(): string[] {
    // This would need to be implemented based on the server's internal structure
    // For now, return known services
    return ['ai_orchestrator.AIOrchestrator'];
  }
}

// Singleton instance
export const grpcServer = new GRPCServer();