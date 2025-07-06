import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger, { createRequestLogger } from '@/config/logger';

export interface LoggedRequest extends Request {
  requestId?: string;
  startTime?: number;
  logger?: any;
}

const requestLoggerMiddleware = (req: LoggedRequest, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  req.requestId = req.headers['x-request-id'] as string || uuidv4();
  req.startTime = Date.now();
  
  // Create request-scoped logger
  req.logger = createRequestLogger(req.requestId);
  
  // Add request ID to response headers
  res.setHeader('x-request-id', req.requestId);
  
  // Log incoming request
  req.logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    referer: req.get('Referer'),
    userId: (req as any).user?.id,
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    const contentLength = res.get('Content-Length');
    
    req.logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength,
      userId: (req as any).user?.id,
    });
  });
  
  // Log response errors
  res.on('error', (error) => {
    req.logger.error('Response error', {
      method: req.method,
      url: req.url,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  });
  
  next();
};

export default requestLoggerMiddleware;