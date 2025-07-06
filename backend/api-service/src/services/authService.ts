import { Pool } from 'pg';
import { DatabaseConnection } from '../config/database';
import { UserService } from './userService';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import config from '../config';
import crypto from 'crypto';

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean | undefined;
}

export interface LoginResponse {
  success: true;
  data: {
    user: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      email_verified: boolean;
      two_factor_enabled: boolean;
    };
    token: string;
    expires_in: string;
  };
  message: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  success: true;
  data: {
    token: string;
    expires_in: string;
  };
  message: string;
}

export interface SessionInfo {
  id: string;
  device_info?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
  last_used_at: Date;
}

export class AuthService {
  private pool: Pool;
  private userService: UserService;

  constructor() {
    const dbConnection = DatabaseConnection.getInstance(config.database);
    this.pool = dbConnection.getPool();
    this.userService = new UserService();
  }

  // Login user with email and password
  async login(loginData: LoginRequest, deviceInfo?: {
    ip_address?: string;
    user_agent?: string;
    device_info?: any;
  }): Promise<LoginResponse> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get user by email (includes password hash for verification)
      const user = await this.userService.getUserByEmail(loginData.email);
      
      if (!user) {
        throw createError('Invalid email or password', 401);
      }

      // Check if account is locked
      const isLocked = await this.userService.isUserLocked(user.id);
      if (isLocked) {
        throw createError('Account is temporarily locked due to multiple failed login attempts', 423);
      }

      // Verify password
      const isValidPassword = await this.userService.verifyPassword(
        loginData.password, 
        user.password_hash
      );

      if (!isValidPassword) {
        // Increment failed login attempts
        await this.userService.incrementFailedLoginAttempts(user.id);
        throw createError('Invalid email or password', 401);
      }

      // Reset failed login attempts on successful login
      await this.userService.resetFailedLoginAttempts(user.id);

      // Update last login timestamp
      await this.userService.updateLastLogin(user.id);

      // Generate JWT token
      const token = authMiddleware.generateToken(user.id, user.email);

      // Create session record
      const sessionId = await this.createSession(user.id, token, deviceInfo);

      await client.query('COMMIT');

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            email_verified: user.email_verified,
            two_factor_enabled: user.two_factor_enabled
          },
          token,
          expires_in: config.jwt.expiresIn
        },
        message: 'Login successful'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Logout user and invalidate session
  async logout(userId: string, token: string): Promise<{ success: true; message: string }> {
    try {
      // Hash the token to find the session
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Deactivate the session
      await this.pool.query(
        'UPDATE zaeus_core.user_sessions SET is_active = false WHERE user_id = $1 AND token_hash = $2',
        [userId, tokenHash]
      );

      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      throw createError('Logout failed', 500);
    }
  }

  // Logout from all devices
  async logoutAll(userId: string): Promise<{ success: true; message: string }> {
    try {
      await this.pool.query(
        'UPDATE zaeus_core.user_sessions SET is_active = false WHERE user_id = $1',
        [userId]
      );

      return {
        success: true,
        message: 'Logged out from all devices'
      };
    } catch (error) {
      throw createError('Logout failed', 500);
    }
  }

  // Create user session
  private async createSession(
    userId: string, 
    token: string, 
    deviceInfo?: {
      ip_address?: string;
      user_agent?: string;
      device_info?: any;
    }
  ): Promise<string> {
    // Hash the token for secure storage
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Calculate expiration based on JWT config
    const expiresAt = new Date();
    const expirationMs = this.parseExpiresIn(config.jwt.expiresIn);
    expiresAt.setTime(expiresAt.getTime() + expirationMs);

    const result = await this.pool.query(`
      INSERT INTO zaeus_core.user_sessions 
      (user_id, token_hash, device_info, ip_address, user_agent, expires_at) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id
    `, [
      userId,
      tokenHash,
      deviceInfo?.device_info || null,
      deviceInfo?.ip_address || null,
      deviceInfo?.user_agent || null,
      expiresAt
    ]);

    return result.rows[0].id;
  }

  // Parse expires_in string to milliseconds
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match || !match[1] || !match[2]) {
      throw new Error('Invalid expires_in format');
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error('Invalid time unit');
    }
  }

  // Get user sessions
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const result = await this.pool.query(`
      SELECT id, device_info, ip_address, user_agent, created_at, last_used_at
      FROM zaeus_core.user_sessions 
      WHERE user_id = $1 AND is_active = true AND expires_at > CURRENT_TIMESTAMP
      ORDER BY last_used_at DESC
    `, [userId]);

    return result.rows;
  }

  // Validate session token
  async validateSession(token: string): Promise<boolean> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const result = await this.pool.query(`
      SELECT id FROM zaeus_core.user_sessions 
      WHERE token_hash = $1 AND is_active = true AND expires_at > CURRENT_TIMESTAMP
    `, [tokenHash]);

    if (result.rows.length > 0) {
      // Update last_used_at timestamp
      await this.pool.query(
        'UPDATE zaeus_core.user_sessions SET last_used_at = CURRENT_TIMESTAMP WHERE token_hash = $1',
        [tokenHash]
      );
      return true;
    }

    return false;
  }

  // Clean up expired sessions
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.pool.query(
      'DELETE FROM zaeus_core.user_sessions WHERE expires_at <= CURRENT_TIMESTAMP'
    );

    return result.rowCount || 0;
  }
}