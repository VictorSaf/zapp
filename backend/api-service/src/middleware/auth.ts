import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../config';
import { createError } from './errorHandler';
import { UserService } from '../services/userService';

// Extended Request interface to include user data
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

// JWT payload interface
interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export class AuthMiddleware {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // Generate JWT token
  generateToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );
  }

  // Verify JWT token
  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw createError('Token expired', 401);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw createError('Invalid token', 401);
      }
      throw createError('Token verification failed', 401);
    }
  }

  // Extract token from request headers
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    // Check for Bearer token format
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7); // Remove 'Bearer ' prefix
    }

    return null;
  }

  // Middleware to require authentication
  requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        throw createError('Authentication token required', 401);
      }

      // Verify token
      const payload = this.verifyToken(token);

      // Get user from database to ensure user still exists and is active
      const user = await this.userService.getUserById(payload.userId);
      
      if (!user) {
        throw createError('User not found or inactive', 401);
      }

      // Check if user account is locked
      const isLocked = await this.userService.isUserLocked(payload.userId);
      if (isLocked) {
        throw createError('Account is temporarily locked', 423);
      }

      // Attach user data to request
      req.user = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      };

      next();
    } catch (error) {
      next(error);
    }
  };

  // Optional authentication middleware (doesn't throw error if no token)
  optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        return next(); // Continue without authentication
      }

      const payload = this.verifyToken(token);
      const user = await this.userService.getUserById(payload.userId);
      
      if (user) {
        const isLocked = await this.userService.isUserLocked(payload.userId);
        if (!isLocked) {
          req.user = {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
          };
        }
      }

      next();
    } catch (error) {
      // Continue without authentication if token is invalid
      next();
    }
  };

  // Middleware to check if user is authenticated (for route protection)
  isAuthenticated = (req: AuthenticatedRequest): boolean => {
    return !!req.user;
  };
}

// Create singleton instance
export const authMiddleware = new AuthMiddleware();

// Export individual middleware functions for easy use
export const requireAuth = authMiddleware.requireAuth;
export const optionalAuth = authMiddleware.optionalAuth;