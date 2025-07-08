import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import authService from '../services/auth.service'
import {
  AuthState,
  LoginRequest,
  RegisterRequest,
  User,
} from '../types/auth.types'

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  clearError: () => void
}

type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  error: null,
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      ...initialState,

      login: async (credentials) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await authService.login(credentials)
          
          set({
            isAuthenticated: true,
            user: response.user,
            token: response.token,
            refreshToken: null,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          })
          throw error
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null })
        
        try {
          await authService.register(data)
          set({ isLoading: false, error: null })
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Registration failed',
          })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })
        
        try {
          await authService.logout()
        } finally {
          set(initialState)
        }
      },

      loadUser: async () => {
        const token = authService.getToken()
        
        if (!token) {
          set(initialState)
          return
        }

        set({ isLoading: true })
        
        try {
          const user = await authService.getCurrentUser()
          
          set({
            isAuthenticated: true,
            user,
            token,
            refreshToken: null,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          authService.clearTokens()
          set(initialState)
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null })
        
        try {
          const updatedUser = await authService.updateProfile(data)
          
          set((state) => ({
            user: { ...state.user, ...updatedUser } as User,
            isLoading: false,
            error: null,
          }))
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to update profile'
          })
          throw error
        }
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'auth-store',
    }
  )
)