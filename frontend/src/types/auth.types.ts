export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  email_verified: boolean
  two_factor_enabled: boolean
  is_admin?: boolean
  phone?: string
  created_at?: string
  updated_at?: string
}

export interface LoginRequest {
  email: string
  password: string
  remember_me?: boolean
}

export interface LoginResponse {
  user: User
  token: string
  expires_in: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface RegisterResponse {
  message: string
}

export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  refreshToken: string | null
  isLoading: boolean
  error: string | null
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
}