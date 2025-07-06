import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  last_login?: string;
  is_active: boolean;
  email_verified: boolean;
  two_factor_enabled: boolean;
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
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  trading_experience?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferred_markets?: string[];
  risk_tolerance?: 'low' | 'medium' | 'high';
}

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  validateToken: () => Promise<boolean>;
  refreshToken: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;

const API_BASE_URL = 'http://localhost:3000/api';

// API Helper functions
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || 'An error occurred');
  }

  return data;
};

const apiCallWithAuth = async (endpoint: string, token: string, options: RequestInit = {}) => {
  return apiCall(endpoint, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      profile: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
          });

          const { user, token } = response.data;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Fetch profile after successful login
          get().refreshProfile();
        } catch (error: any) {
          set({
            error: error.message,
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
          });
          throw error;
        }
      },

      register: async (data: RegisterRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
          });

          const { user, token } = response.data;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          // Fetch profile after successful registration
          get().refreshProfile();
        } catch (error: any) {
          set({
            error: error.message,
            isLoading: false,
            isAuthenticated: false,
            user: null,
            token: null,
          });
          throw error;
        }
      },

      logout: async () => {
        const { token } = get();
        
        set({ isLoading: true });

        try {
          if (token) {
            await apiCallWithAuth('/auth/logout', token, {
              method: 'POST',
            });
          }
        } catch (error) {
          // Continue with logout even if API call fails
          console.warn('Logout API call failed:', error);
        } finally {
          set({
            user: null,
            profile: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      refreshProfile: async () => {
        const { token, isAuthenticated } = get();
        
        if (!token || !isAuthenticated) {
          return;
        }

        try {
          const response = await apiCallWithAuth('/auth/me', token);
          const { user, profile } = response.data;
          
          set({ user, profile });
        } catch (error: any) {
          console.warn('Failed to refresh profile:', error.message);
          // Don't set error state for profile refresh failures
        }
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      setError: (error: string | null) => {
        set({ error, isLoading: false });
      },

      validateToken: async (): Promise<boolean> => {
        const { token } = get();
        
        if (!token) {
          return false;
        }

        try {
          const response = await apiCallWithAuth('/auth/verify-token', token, {
            method: 'POST',
          });

          return response.data?.valid || false;
        } catch (error) {
          console.warn('Token validation failed:', error);
          return false;
        }
      },

      refreshToken: async () => {
        const { token } = get();
        
        if (!token) {
          throw new Error('No token to refresh');
        }

        try {
          // For now, we don't have a separate refresh token endpoint
          // We'll validate the current token and refresh profile
          const isValid = await get().validateToken();
          
          if (!isValid) {
            throw new Error('Token is no longer valid');
          }

          await get().refreshProfile();
        } catch (error) {
          // If refresh fails, logout the user
          await get().logout();
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'zaeus-auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);