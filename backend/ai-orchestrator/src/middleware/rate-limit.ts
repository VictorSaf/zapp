import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from './error-handler';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

class InMemoryRateLimitStore {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const resetTime = now + windowMs;
    
    if (!this.store[key] || this.store[key].resetTime <= now) {
      this.store[key] = {
        count: 1,
        resetTime,
      };
    } else {
      this.store[key].count++;
    }
    
    return this.store[key];
  }

  get(key: string): { count: number; resetTime: number } | null {
    const entry = this.store[key];
    if (!entry || entry.resetTime <= Date.now()) {
      return null;
    }
    return entry;
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store = {};
  }
}

const store = new InMemoryRateLimitStore();

function createRateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const { count, resetTime } = store.increment(key, windowMs);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));
    
    if (count > maxRequests) {
      throw new RateLimitError('Rate limit exceeded. Please try again later.');
    }
    
    // Track response for conditional counting
    if (skipSuccessfulRequests || skipFailedRequests) {
      res.on('finish', () => {
        const isSuccessful = res.statusCode < 400;
        const shouldSkip = (skipSuccessfulRequests && isSuccessful) || 
                          (skipFailedRequests && !isSuccessful);
        
        if (shouldSkip) {
          // Decrement count if we should skip this response
          const current = store.get(key);
          if (current && current.count > 0) {
            current.count--;
          }
        }
      });
    }
    
    next();
  };
}

// Rate limit configurations
export const generalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
});

export const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
});

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 auth requests per 15 minutes
  keyGenerator: (req) => req.ip + ':auth',
  skipSuccessfulRequests: true,
});

export const aiRequestRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 AI requests per minute
  keyGenerator: (req) => {
    const userId = (req as any).user?.id || req.ip;
    return `${userId}:ai`;
  },
});

export const orchestrationRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20, // 20 orchestration requests per 5 minutes
  keyGenerator: (req) => {
    const userId = (req as any).user?.id || req.ip;
    return `${userId}:orchestration`;
  },
});

export default generalRateLimit;