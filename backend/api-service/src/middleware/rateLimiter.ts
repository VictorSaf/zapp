import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Generic rate limiter configuration
const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: 'Too many requests',
      message: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000)
    },
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: options.keyGenerator || ((req: Request) => req.ip || 'unknown'),
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  });
};

// Login rate limiter - strict limits to prevent brute force attacks
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts. Please try again in 15 minutes.',
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
  keyGenerator: (req: Request) => {
    // Use IP + email combination for more targeted limiting
    const email = req.body?.email?.toLowerCase() || '';
    return `${req.ip || 'unknown'}:${email}`;
  }
});

// Registration rate limiter - prevent account creation spam
export const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration attempts per hour
  message: 'Too many registration attempts. Please try again in 1 hour.',
  keyGenerator: (req: Request) => req.ip || 'unknown'
});

// Password reset rate limiter
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset attempts per hour
  message: 'Too many password reset attempts. Please try again in 1 hour.',
  keyGenerator: (req: Request) => {
    const email = req.body?.email?.toLowerCase() || '';
    return `${req.ip || 'unknown'}:${email}`;
  }
});

// General auth endpoints rate limiter (for logout, verify-token, etc.)
export const authGeneralRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: 'Too many requests to authentication endpoints. Please try again later.',
  keyGenerator: (req: Request) => req.ip || 'unknown'
});

// API general rate limiter (for all other endpoints)
export const apiGeneralRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per 15 minutes
  message: 'Too many API requests. Please try again later.',
  keyGenerator: (req: Request) => req.ip || 'unknown'
});

// Authenticated user rate limiter (higher limits for authenticated users)
export const authenticatedRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Higher limit for authenticated users
  message: 'Too many requests. Please try again later.',
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise fall back to IP
    const user = (req as any).user;
    return user?.id || req.ip || 'unknown';
  }
});