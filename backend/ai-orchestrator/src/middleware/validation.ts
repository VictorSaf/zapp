import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from './error-handler';

interface ValidationOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}

const formatZodError = (error: ZodError): string => {
  return error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join(', ');
};

const validateRequest = (schemas: ValidationOptions) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      
      if (schemas.headers) {
        req.headers = schemas.headers.parse(req.headers);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(formatZodError(error));
      }
      throw error;
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Pagination
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
    offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
  }),
  
  // ID parameter
  idParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),
  
  // User ID parameter
  userIdParam: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
  
  // Agent ID parameter
  agentIdParam: z.object({
    agentId: z.string().min(1, 'Agent ID is required'),
  }),
  
  // Conversation ID parameter
  conversationIdParam: z.object({
    conversationId: z.string().uuid('Invalid conversation ID format'),
  }),
};

// Agent request validation schemas
export const agentSchemas = {
  processRequest: z.object({
    agentId: z.string().min(1, 'Agent ID is required'),
    userId: z.string().uuid('Invalid user ID format').optional(),
    conversationId: z.string().uuid('Invalid conversation ID format').optional(),
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1, 'Message content is required'),
      timestamp: z.string().datetime().optional(),
    })).min(1, 'At least one message is required'),
    context: z.record(z.string()).optional(),
    config: z.object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      max_tokens: z.number().min(1).max(8192).optional(),
      tools: z.array(z.string()).optional(),
    }).optional(),
  }),
  
  switchAgent: z.object({
    conversationId: z.string().uuid('Invalid conversation ID format'),
    fromAgentId: z.string().min(1, 'From agent ID is required'),
    toAgentId: z.string().min(1, 'To agent ID is required'),
    reason: z.string().optional(),
  }),
  
  getActiveAgents: z.object({
    agentTypes: z.array(z.string()).optional(),
  }),
};

// Orchestration validation schemas
export const orchestrationSchemas = {
  orchestrateTasks: z.object({
    taskId: z.string().min(1, 'Task ID is required').optional(),
    conversationId: z.string().uuid('Invalid conversation ID format').optional(),
    taskType: z.enum(['single_agent', 'multi_agent_sequential', 'multi_agent_parallel', 'multi_agent_collaborative', 'agent_chain']),
    agentTasks: z.array(z.object({
      taskId: z.string().min(1, 'Task ID is required'),
      agentId: z.string().min(1, 'Agent ID is required'),
      taskDescription: z.string().min(1, 'Task description is required'),
      inputMessages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1, 'Message content is required'),
      })).optional(),
      parameters: z.record(z.string()).optional(),
      priority: z.number().min(1).max(10).default(5),
    })).min(1, 'At least one agent task is required'),
    strategy: z.enum(['round_robin', 'priority_based', 'capability_based', 'load_balanced', 'optimal_assignment']).default('round_robin'),
    timeoutSeconds: z.number().min(1).max(300).default(60),
    context: z.record(z.string()).optional(),
  }),
  
  getTaskStatus: z.object({
    taskId: z.string().min(1, 'Task ID is required'),
  }),
  
  cancelTask: z.object({
    taskId: z.string().min(1, 'Task ID is required'),
    reason: z.string().optional(),
  }),
};

// Context validation schemas
export const contextSchemas = {
  storeContext: z.object({
    contextId: z.string().min(1, 'Context ID is required').optional(),
    agentId: z.string().min(1, 'Agent ID is required').optional(),
    conversationId: z.string().uuid('Invalid conversation ID format').optional(),
    contextType: z.enum(['conversation', 'agent_memory', 'user_preferences', 'shared_context', 'temporary']),
    contextData: z.any(), // Can be any valid JSON
    metadata: z.record(z.string()).optional(),
    ttlSeconds: z.number().min(60).max(86400).optional(), // 1 minute to 1 day
  }),
  
  getContext: z.object({
    contextId: z.string().min(1, 'Context ID is required').optional(),
    agentId: z.string().min(1, 'Agent ID is required').optional(),
    conversationId: z.string().uuid('Invalid conversation ID format').optional(),
    contextType: z.enum(['conversation', 'agent_memory', 'user_preferences', 'shared_context', 'temporary']).optional(),
  }),
  
  updateContext: z.object({
    contextId: z.string().min(1, 'Context ID is required'),
    contextData: z.any(), // Can be any valid JSON
    metadata: z.record(z.string()).optional(),
  }),
};

// Queue validation schemas
export const queueSchemas = {
  getStats: z.object({
    queueName: z.string().min(1, 'Queue name is required').optional(),
  }),
  
  pauseQueue: z.object({
    queueName: z.string().min(1, 'Queue name is required'),
  }),
  
  resumeQueue: z.object({
    queueName: z.string().min(1, 'Queue name is required'),
  }),
  
  clearQueue: z.object({
    queueName: z.string().min(1, 'Queue name is required'),
  }),
  
  retryFailedJobs: z.object({
    queueName: z.string().min(1, 'Queue name is required'),
  }),
};

// Service discovery validation schemas
export const serviceSchemas = {
  discoverServices: z.object({
    serviceName: z.string().min(1, 'Service name is required'),
    passing: z.string().optional().transform(val => val === 'true'),
    tags: z.string().optional().transform(val => val ? val.split(',') : undefined),
  }),
  
  registerService: z.object({
    serviceName: z.string().min(1, 'Service name is required'),
    serviceId: z.string().optional(),
    address: z.string().ip().optional(),
    port: z.number().min(1).max(65535),
    tags: z.array(z.string()).optional(),
    meta: z.record(z.string()).optional(),
    healthCheck: z.object({
      http: z.string().url().optional(),
      interval: z.string().optional(),
      timeout: z.string().optional(),
    }).optional(),
  }),
  
  deregisterService: z.object({
    serviceId: z.string().min(1, 'Service ID is required'),
  }),
};

export default validateRequest;