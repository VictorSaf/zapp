import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface ServiceConfig {
  // Service Information
  serviceName: string;
  serviceVersion: string;
  port: number;
  nodeEnv: string;

  // Service Discovery
  consul: {
    host: string;
    port: number;
    serviceId: string;
    healthCheckInterval: string;
  };

  // Redis Configuration
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };

  // Queue Configuration
  queue: {
    redis: {
      host: string;
      port: number;
      db: number;
    };
  };

  // External Services
  services: {
    apiService: string;
    frontend: string;
  };

  // gRPC Configuration
  grpc: {
    port: number;
    maxMessageSize: number;
  };

  // Monitoring
  monitoring: {
    metricsPort: number;
    healthCheckPath: string;
    metricsPath: string;
  };

  // Logging
  logging: {
    level: string;
    format: string;
  };

  // AI Configuration
  ai: {
    responseTimeout: number;
    maxConcurrentRequests: number;
    orchestrationTimeout: number;
  };

  // Load Balancing
  loadBalancer: {
    strategy: 'round_robin' | 'least_connections' | 'weighted';
    maxRetries: number;
    retryDelay: number;
  };

  // Security
  security: {
    jwtSecret: string;
    corsOrigins: string[];
  };

  // Performance
  performance: {
    requestTimeout: number;
    connectionPoolSize: number;
    keepAliveTimeout: number;
  };
}

const config: ServiceConfig = {
  // Service Information
  serviceName: process.env.SERVICE_NAME || 'ai-orchestrator',
  serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Service Discovery
  consul: {
    host: process.env.CONSUL_HOST || 'localhost',
    port: parseInt(process.env.CONSUL_PORT || '8500', 10),
    serviceId: process.env.CONSUL_SERVICE_ID || 'ai-orchestrator-1',
    healthCheckInterval: process.env.CONSUL_HEALTH_CHECK_INTERVAL || '30s',
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // Queue Configuration
  queue: {
    redis: {
      host: process.env.QUEUE_REDIS_HOST || 'localhost',
      port: parseInt(process.env.QUEUE_REDIS_PORT || '6379', 10),
      db: parseInt(process.env.QUEUE_REDIS_DB || '1', 10),
    },
  },

  // External Services
  services: {
    apiService: process.env.API_SERVICE_URL || 'http://localhost:3000',
    frontend: process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  // gRPC Configuration
  grpc: {
    port: parseInt(process.env.GRPC_PORT || '50051', 10),
    maxMessageSize: parseInt(process.env.GRPC_MAX_MESSAGE_SIZE || '4194304', 10),
  },

  // Monitoring
  monitoring: {
    metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
    healthCheckPath: process.env.HEALTH_CHECK_PATH || '/health',
    metricsPath: process.env.METRICS_PATH || '/metrics',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // AI Configuration
  ai: {
    responseTimeout: parseInt(process.env.AI_RESPONSE_TIMEOUT || '30000', 10),
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '10', 10),
    orchestrationTimeout: parseInt(process.env.AGENT_ORCHESTRATION_TIMEOUT || '60000', 10),
  },

  // Load Balancing
  loadBalancer: {
    strategy: (process.env.LOAD_BALANCER_STRATEGY as any) || 'round_robin',
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.RETRY_DELAY || '1000', 10),
  },

  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-here',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  },

  // Performance
  performance: {
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
    connectionPoolSize: parseInt(process.env.CONNECTION_POOL_SIZE || '10', 10),
    keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT || '65000', 10),
  },
};

// Validation
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && config.nodeEnv === 'production') {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

export default config;