import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { UserService } from '../services/userService';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    is_admin?: boolean;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error('No authentication token provided');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      email: string;
    };

    // Fetch user data to get is_admin flag
    const userService = new UserService();
    const user = await userService.getUserById(decoded.userId);

    if (!user) {
      throw new Error('User not found');
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      ...(user.is_admin !== undefined && { is_admin: user.is_admin })
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Please authenticate'
    });
  }
};