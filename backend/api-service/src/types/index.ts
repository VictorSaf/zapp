// ZAEUS API Service Types

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
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password_hash'>;
  expires_in: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  database: DatabaseConfig;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  cors: {
    origin: string;
    allowedOrigins: string[];
  };
  bcrypt: {
    rounds: number;
  };
}