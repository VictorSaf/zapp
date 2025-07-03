import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import { DatabaseConnection } from '../config/database';
import config from '../config';
import { 
  User, 
  UserProfile, 
  PublicUser, 
  CreateUserRequest, 
  UpdateUserRequest,
  UpdateUserProfileRequest,
  UserFilters,
  PaginationOptions 
} from '../types/user';
import { createError } from '../middleware/errorHandler';

export class UserService {
  private pool: Pool;

  constructor() {
    const dbConnection = DatabaseConnection.getInstance(config.database);
    this.pool = dbConnection.getPool();
  }

  // Hash password
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.bcrypt.rounds);
  }

  // Verify password
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Convert User to PublicUser (remove sensitive fields)
  private toPublicUser(user: User): PublicUser {
    const { password_hash, email_verification_token, password_reset_token, password_reset_expires, failed_login_attempts, locked_until, two_factor_secret, ...publicUser } = user;
    return publicUser;
  }

  // Create new user
  async createUser(userData: CreateUserRequest): Promise<PublicUser> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM zaeus_core.users WHERE email = $1',
        [userData.email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        throw createError('User already exists with this email', 409);
      }

      // Hash password
      const passwordHash = await this.hashPassword(userData.password);

      // Insert user
      const userResult = await client.query(`
        INSERT INTO zaeus_core.users 
        (email, password_hash, first_name, last_name) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `, [
        userData.email.toLowerCase(),
        passwordHash,
        userData.first_name.trim(),
        userData.last_name.trim()
      ]);

      const user: User = userResult.rows[0];

      // Create user profile
      await client.query(`
        INSERT INTO zaeus_core.user_profiles 
        (user_id, trading_experience, preferred_markets, risk_tolerance) 
        VALUES ($1, $2, $3, $4)
      `, [
        user.id,
        userData.trading_experience || 'beginner',
        userData.preferred_markets || [],
        userData.risk_tolerance || 'medium'
      ]);

      await client.query('COMMIT');

      return this.toPublicUser(user);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get user by ID
  async getUserById(userId: string): Promise<PublicUser | null> {
    const result = await this.pool.query(
      'SELECT * FROM zaeus_core.users WHERE id = $1 AND is_active = true',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.toPublicUser(result.rows[0]);
  }

  // Get user by email (for authentication)
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM zaeus_core.users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  // Get user with profile
  async getUserWithProfile(userId: string): Promise<{ user: PublicUser; profile: UserProfile } | null> {
    const result = await this.pool.query(`
      SELECT 
        u.*,
        p.id as profile_id,
        p.trading_experience,
        p.preferred_markets,
        p.risk_tolerance,
        p.learning_goals,
        p.timezone,
        p.language,
        p.theme,
        p.notifications_enabled,
        p.marketing_emails,
        p.created_at as profile_created_at,
        p.updated_at as profile_updated_at
      FROM zaeus_core.users u
      LEFT JOIN zaeus_core.user_profiles p ON u.id = p.user_id
      WHERE u.id = $1 AND u.is_active = true
    `, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    const user = this.toPublicUser({
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      first_name: row.first_name,
      last_name: row.last_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_login: row.last_login,
      is_active: row.is_active,
      email_verified: row.email_verified,
      email_verification_token: row.email_verification_token,
      password_reset_token: row.password_reset_token,
      password_reset_expires: row.password_reset_expires,
      failed_login_attempts: row.failed_login_attempts,
      locked_until: row.locked_until,
      two_factor_enabled: row.two_factor_enabled,
      two_factor_secret: row.two_factor_secret
    });

    const profile: UserProfile = {
      id: row.profile_id,
      user_id: row.id,
      trading_experience: row.trading_experience,
      preferred_markets: row.preferred_markets,
      risk_tolerance: row.risk_tolerance,
      learning_goals: row.learning_goals,
      timezone: row.timezone || 'UTC',
      language: row.language || 'en',
      theme: row.theme || 'light',
      notifications_enabled: row.notifications_enabled ?? true,
      marketing_emails: row.marketing_emails ?? false,
      created_at: row.profile_created_at,
      updated_at: row.profile_updated_at
    };

    return { user, profile };
  }

  // Update user
  async updateUser(userId: string, updates: UpdateUserRequest): Promise<PublicUser> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.first_name !== undefined) {
      fields.push(`first_name = $${paramCount++}`);
      values.push(updates.first_name.trim());
    }

    if (updates.last_name !== undefined) {
      fields.push(`last_name = $${paramCount++}`);
      values.push(updates.last_name.trim());
    }

    if (updates.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(updates.email.toLowerCase());
    }

    if (fields.length === 0) {
      throw createError('No valid fields to update', 400);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `
      UPDATE zaeus_core.users 
      SET ${fields.join(', ')} 
      WHERE id = $${paramCount} AND is_active = true 
      RETURNING *
    `;

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw createError('User not found', 404);
    }

    return this.toPublicUser(result.rows[0]);
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: UpdateUserProfileRequest): Promise<UserProfile> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      throw createError('No valid fields to update', 400);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `
      UPDATE zaeus_core.user_profiles 
      SET ${fields.join(', ')} 
      WHERE user_id = $${paramCount} 
      RETURNING *
    `;

    const result = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      throw createError('User profile not found', 404);
    }

    return result.rows[0];
  }

  // Update last login
  async updateLastLogin(userId: string): Promise<void> {
    await this.pool.query(
      'UPDATE zaeus_core.users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  // Get users with pagination and filters
  async getUsers(filters: UserFilters = {}, pagination: PaginationOptions = {}): Promise<{ users: PublicUser[]; total: number; page: number; limit: number }> {
    const conditions: string[] = ['u.is_active = true'];
    const values: any[] = [];
    let paramCount = 1;

    // Apply filters
    if (filters.email_verified !== undefined) {
      conditions.push(`u.email_verified = $${paramCount++}`);
      values.push(filters.email_verified);
    }

    if (filters.created_after) {
      conditions.push(`u.created_at >= $${paramCount++}`);
      values.push(filters.created_after);
    }

    if (filters.created_before) {
      conditions.push(`u.created_at <= $${paramCount++}`);
      values.push(filters.created_before);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countQuery = `SELECT COUNT(*) FROM zaeus_core.users u ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Pagination
    const page = pagination.page || 1;
    const limit = Math.min(pagination.limit || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    // Sorting
    const sortBy = pagination.sort_by || 'created_at';
    const sortOrder = pagination.sort_order || 'DESC';

    const query = `
      SELECT * FROM zaeus_core.users u 
      ${whereClause}
      ORDER BY u.${sortBy} ${sortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    const users = result.rows.map(user => this.toPublicUser(user));

    return {
      users,
      total,
      page,
      limit
    };
  }

  // Delete user (soft delete)
  async deleteUser(userId: string): Promise<void> {
    const result = await this.pool.query(
      'UPDATE zaeus_core.users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND is_active = true',
      [userId]
    );

    if (result.rowCount === 0) {
      throw createError('User not found', 404);
    }
  }

  // Check if user is locked
  async isUserLocked(userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT locked_until FROM zaeus_core.users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const lockedUntil = result.rows[0].locked_until;
    return lockedUntil && new Date() < new Date(lockedUntil);
  }

  // Increment failed login attempts
  async incrementFailedLoginAttempts(userId: string): Promise<void> {
    await this.pool.query(`
      UPDATE zaeus_core.users 
      SET 
        failed_login_attempts = failed_login_attempts + 1,
        locked_until = CASE 
          WHEN failed_login_attempts >= 4 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
          ELSE locked_until
        END
      WHERE id = $1
    `, [userId]);
  }

  // Reset failed login attempts
  async resetFailedLoginAttempts(userId: string): Promise<void> {
    await this.pool.query(
      'UPDATE zaeus_core.users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [userId]
    );
  }
}