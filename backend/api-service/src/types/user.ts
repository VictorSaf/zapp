// ZAEUS User Types

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  is_active: boolean;
  email_verified: boolean;
  email_verification_token?: string;
  password_reset_token?: string;
  password_reset_expires?: Date;
  failed_login_attempts: number;
  locked_until?: Date;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  is_admin?: boolean;
}

export interface UserProfile {
  id: string;
  user_id: string;
  trading_experience?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferred_markets?: string[];
  risk_tolerance?: 'low' | 'medium' | 'high';
  learning_goals?: string[];
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications_enabled: boolean;
  marketing_emails: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserSession {
  id: string;
  user_id: string;
  token_hash: string;
  device_info?: any;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
  created_at: Date;
  last_used_at: Date;
  is_active: boolean;
}

// Public user data (without sensitive fields)
export interface PublicUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: Date;
  last_login?: Date;
  is_active: boolean;
  email_verified: boolean;
  two_factor_enabled: boolean;
  is_admin?: boolean;
}

// Create user request
export interface CreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  trading_experience?: UserProfile['trading_experience'];
  preferred_markets?: string[];
  risk_tolerance?: UserProfile['risk_tolerance'];
}

// Update user request
export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
}

// Update user profile request
export interface UpdateUserProfileRequest {
  trading_experience?: UserProfile['trading_experience'];
  preferred_markets?: string[];
  risk_tolerance?: UserProfile['risk_tolerance'];
  learning_goals?: string[];
  timezone?: string;
  language?: string;
  theme?: UserProfile['theme'];
  notifications_enabled?: boolean;
  marketing_emails?: boolean;
}

// Password change request
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// Database query filters
export interface UserFilters {
  is_active?: boolean;
  email_verified?: boolean;
  created_after?: Date;
  created_before?: Date;
  last_login_after?: Date;
  last_login_before?: Date;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort_by?: keyof User;
  sort_order?: 'ASC' | 'DESC';
}