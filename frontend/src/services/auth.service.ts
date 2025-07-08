import { coreApi } from './api.service'
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from '../types/auth.types'

const TOKEN_KEY = 'zaeus_token'

class AuthService {
  // Token management
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
    coreApi.setToken(token)
  }

  clearTokens() {
    localStorage.removeItem(TOKEN_KEY)
    coreApi.setToken(null)
  }

  // API calls
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await coreApi.post<LoginResponse>(
      '/api/auth/login',
      credentials
    )
    
    this.setToken(response.token)
    
    return response
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return coreApi.post<RegisterResponse>('/api/auth/register', data)
  }

  async logout(): Promise<void> {
    try {
      await coreApi.post('/api/auth/logout', {})
    } finally {
      this.clearTokens()
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await coreApi.get<{ data: { user: User } }>('/api/auth/me')
    console.log('getCurrentUser response:', response)
    return response.data.user
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return coreApi.post('/api/auth/forgot-password', { email })
  }

  async resetPassword(
    token: string,
    password: string
  ): Promise<{ success: boolean }> {
    return coreApi.post('/api/auth/reset-password', { token, password })
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await coreApi.put<{ data: { user: User } }>('/api/auth/profile', data)
    return response.data.user
  }

  // Initialize service
  initialize() {
    const token = this.getToken()
    if (token) {
      coreApi.setToken(token)
    }
  }
}

const authService = new AuthService()
authService.initialize()

export default authService