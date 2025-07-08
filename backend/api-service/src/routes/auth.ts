import { Router, Request, Response, NextFunction } from 'express';
import { AuthService, LoginRequest } from '../services/authService';
import { UserService } from '../services/userService';
import { CreateUserRequest } from '../types/user';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { validateEmail, validatePassword } from '../utils/validation';
import { 
  loginRateLimiter, 
  registerRateLimiter, 
  authGeneralRateLimiter 
} from '../middleware/rateLimiter';

const router = Router();
const authService = new AuthService();
const userService = new UserService();

// POST /api/auth/login
router.post('/login', loginRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, remember_me }: LoginRequest = req.body;

    // Validation
    if (!email || !password) {
      throw createError('Email and password are required', 400);
    }

    if (!validateEmail(email)) {
      throw createError('Invalid email format', 400);
    }

    // Extract device info from request
    const deviceInfo: {
      ip_address?: string;
      user_agent?: string;
      device_info?: any;
    } = {};
    
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    if (ip) deviceInfo.ip_address = ip;
    if (userAgent) deviceInfo.user_agent = userAgent;
    deviceInfo.device_info = {
      timestamp: new Date().toISOString(),
      remember_me: remember_me || false
    };

    const result = await authService.login(
      { email, password, remember_me },
      deviceInfo
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/register
router.post('/register', registerRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      email, 
      password, 
      first_name, 
      last_name,
      trading_experience,
      preferred_markets,
      risk_tolerance 
    }: CreateUserRequest = req.body;

    // Validation
    if (!email || !password || !first_name || !last_name) {
      throw createError('Email, password, first name, and last name are required', 400);
    }

    if (!validateEmail(email)) {
      throw createError('Invalid email format', 400);
    }

    if (!validatePassword(password)) {
      throw createError('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character', 400);
    }

    // Create user
    const createUserData: CreateUserRequest = {
      email,
      password,
      first_name,
      last_name
    };
    
    if (trading_experience) createUserData.trading_experience = trading_experience;
    if (preferred_markets) createUserData.preferred_markets = preferred_markets;
    if (risk_tolerance) createUserData.risk_tolerance = risk_tolerance;
    
    const user = await userService.createUser(createUserData);

    // Auto-login after registration
    const deviceInfoReg: {
      ip_address?: string;
      user_agent?: string;
      device_info?: any;
    } = {};
    
    const ipReg = req.ip || req.connection.remoteAddress;
    const userAgentReg = req.get('User-Agent');
    
    if (ipReg) deviceInfoReg.ip_address = ipReg;
    if (userAgentReg) deviceInfoReg.user_agent = userAgentReg;
    deviceInfoReg.device_info = {
      timestamp: new Date().toISOString(),
      registration: true
    };

    const loginResult = await authService.login(
      { email, password },
      deviceInfoReg
    );

    res.status(201).json({
      success: true,
      data: {
        user,
        token: loginResult.data.token,
        expires_in: loginResult.data.expires_in
      },
      message: 'User registered and logged in successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', authGeneralRateLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.slice(7); // Remove 'Bearer ' prefix
    
    if (!token || !req.user) {
      throw createError('Authentication required', 401);
    }

    const result = await authService.logout(req.user.id, token);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout-all
router.post('/logout-all', authGeneralRateLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    const result = await authService.logoutAll(req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authGeneralRateLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    // Get full user profile
    const userWithProfile = await userService.getUserWithProfile(req.user.id);
    
    if (!userWithProfile) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      data: {
        user: userWithProfile.user,
        profile: userWithProfile.profile
      },
      message: 'User profile retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/sessions
router.get('/sessions', authGeneralRateLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    const sessions = await authService.getUserSessions(req.user.id);
    
    res.json({
      success: true,
      data: sessions,
      message: 'User sessions retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/verify-token
router.post('/verify-token', authGeneralRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.slice(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      throw createError('Token required', 400);
    }

    const isValid = await authService.validateSession(token);
    
    res.json({
      success: true,
      data: { valid: isValid },
      message: isValid ? 'Token is valid' : 'Token is invalid or expired'
    });
  } catch (error) {
    res.json({
      success: true,
      data: { valid: false },
      message: 'Token is invalid'
    });
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authGeneralRateLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log('Update profile request:', req.body);
    console.log('User from token:', req.user);
    
    if (!req.user) {
      throw createError('Authentication required', 401);
    }

    const { first_name, last_name, phone } = req.body;

    // Validate input
    if (!first_name || !last_name) {
      throw createError('First name and last name are required', 400);
    }

    // Update user profile
    const updatedUser = await authService.updateUserProfile(req.user.id, {
      first_name,
      last_name,
      phone
    });

    res.json({
      success: true,
      data: {
        user: updatedUser
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;