import { Request, Response, NextFunction } from 'express';
import config from '@/config';
import logger, { logError } from '@/config/logger';
import { metricsService } from '@/services/metrics.service';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

class ApiError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;
  code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', isOperational: boolean = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types
export class ValidationError extends ApiError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message: string = 'Service unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

const errorHandler = (error: AppError, req: Request, res: Response, next: NextFunction): void => {
  // Don't handle if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Default error values
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let code = error.code || 'INTERNAL_ERROR';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid ID format';
  } else if (error.name === 'MongoError' && (error as any).code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'Duplicate entry';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token expired';
  }

  // Log error
  logError(error, {
    statusCode,
    code,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
  });

  // Record error metrics
  metricsService.recordHttpRequest(req.method, req.route?.path || req.url, statusCode, 0);

  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: {
      code,
      message,
      statusCode,
    },
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
  };

  // Add request ID if available
  if ((req as any).requestId) {
    errorResponse.requestId = (req as any).requestId;
  }

  // Add stack trace in development
  if (config.nodeEnv === 'development' && error.stack) {
    errorResponse.error.stack = error.stack;
  }

  // Add validation details for validation errors
  if (error.name === 'ValidationError' && (error as any).details) {
    errorResponse.error.details = (error as any).details;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.url} not found`);
  next(error);
};

// Uncaught exception handler
export const uncaughtExceptionHandler = (error: Error): void => {
  logError(error, { type: 'uncaught_exception' });
  
  // Graceful shutdown
  process.exit(1);
};

// Unhandled rejection handler
export const unhandledRejectionHandler = (reason: any, promise: Promise<any>): void => {
  logError(new Error(`Unhandled Rejection: ${reason}`), { 
    type: 'unhandled_rejection',
    promise: promise.toString(),
  });
  
  // Graceful shutdown
  process.exit(1);
};

// Setup global error handlers
export const setupGlobalErrorHandlers = (): void => {
  process.on('uncaughtException', uncaughtExceptionHandler);
  process.on('unhandledRejection', unhandledRejectionHandler);
  
  // Graceful shutdown on SIGTERM
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });
  
  // Graceful shutdown on SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};

export {
  ApiError,
  errorHandler as default,
};