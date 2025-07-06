import { Request, Response, NextFunction } from 'express';
import { metricsService } from '@/services/metrics.service';

export interface MetricsRequest extends Request {
  startTime?: number;
  requestId?: string;
}

const metricsMiddleware = (req: MetricsRequest, res: Response, next: NextFunction): void => {
  // Record request start time
  req.startTime = Date.now();
  
  // Increment in-flight requests
  metricsService.incrementHttpRequestsInFlight();
  
  // Track response completion
  res.on('finish', () => {
    // Decrement in-flight requests
    metricsService.decrementHttpRequestsInFlight();
    
    // Calculate duration
    const duration = req.startTime ? (Date.now() - req.startTime) / 1000 : 0;
    
    // Get route pattern
    const route = req.route?.path || req.url;
    
    // Record metrics
    metricsService.recordHttpRequest(
      req.method,
      route,
      res.statusCode,
      duration
    );
  });
  
  next();
};

export default metricsMiddleware;