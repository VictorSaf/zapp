import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '@/config';
import { UnauthorizedError, ForbiddenError } from './error-handler';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1] || null;
};

const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.security.jwtSecret) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    } else {
      throw new UnauthorizedError('Token verification failed');
    }
  }
};

// Base authentication middleware
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }
    
    const payload = verifyToken(token);
    
    if (!payload.userId || !payload.email) {
      throw new UnauthorizedError('Invalid token payload');
    }
    
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role || 'user',
      permissions: payload.permissions || [],
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const payload = verifyToken(token);
      
      if (payload.userId && payload.email) {
        req.user = {
          id: payload.userId,
          email: payload.email,
          role: payload.role || 'user',
          permissions: payload.permissions || [],
        };
      }
    }
    
    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

// Role-based authorization
export const requireRole = (requiredRoles: string | string[]) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Role '${req.user.role}' is not authorized. Required roles: ${roles.join(', ')}`);
    }
    
    next();
  };
};

// Permission-based authorization
export const requirePermission = (requiredPermissions: string | string[]) => {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    
    const hasPermission = permissions.some(permission => 
      req.user!.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      throw new ForbiddenError(`Missing required permissions: ${permissions.join(', ')}`);
    }
    
    next();
  };
};

// API key authentication (for service-to-service communication)
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw new UnauthorizedError('API key required');
    }
    
    // In production, validate API key against database
    // For now, just check if it's present
    if (apiKey.length < 10) {
      throw new UnauthorizedError('Invalid API key');
    }
    
    // Add service info to request
    (req as any).service = {
      name: req.headers['x-service-name'] || 'unknown',
      version: req.headers['x-service-version'] || 'unknown',
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

// Combined authentication (JWT or API key)
export const authenticateFlexible = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = extractTokenFromHeader(req.headers.authorization);
  const apiKey = req.headers['x-api-key'] as string;
  
  if (token) {
    // Try JWT authentication
    authenticate(req, res, next);
  } else if (apiKey) {
    // Try API key authentication
    authenticateApiKey(req, res, next);
  } else {
    throw new UnauthorizedError('Authentication required (JWT token or API key)');
  }
};

export default authenticate;