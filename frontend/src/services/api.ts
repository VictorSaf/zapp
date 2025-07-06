import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout();
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// API service methods
export const apiService = {
  // Auth
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
    
  register: (data: any) => 
    api.post('/auth/register', data),
    
  logout: () => 
    api.post('/auth/logout'),
    
  getProfile: () => 
    api.get('/auth/me'),
    
  // Trading
  getAccounts: () => 
    api.get('/trading/accounts'),
    
  createAccount: (data: any) => 
    api.post('/trading/accounts', data),
    
  getAccount: (id: string) => 
    api.get(`/trading/accounts/${id}`),
    
  getTrades: (accountId: string) => 
    api.get(`/trading/accounts/${accountId}/trades`),
    
  createTrade: (accountId: string, data: any) => 
    api.post(`/trading/accounts/${accountId}/trades`, data),
    
  closeTrade: (accountId: string, tradeId: string, data: any) => 
    api.put(`/trading/accounts/${accountId}/trades/${tradeId}/close`, data),
    
  // Market Data
  getQuote: (symbol: string) => 
    api.get(`/market-data/quote/${symbol}`),
    
  getQuotes: (symbols: string[]) => 
    api.post('/market-data/quotes', { symbols }),
    
  getHistoricalData: (symbol: string, timeframe: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    params.append('timeframe', timeframe);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return api.get(`/market-data/historical/${symbol}?${params}`);
  },
    
  getIndicators: (symbol: string, indicators: string[], timeframe: string) => 
    api.post(`/market-data/indicators/${symbol}`, { indicators, timeframe }),
    
  subscribe: (symbols: string[]) => 
    api.post('/market-data/subscribe', { symbols }),
    
  unsubscribe: (symbols: string[]) => 
    api.post('/market-data/unsubscribe', { symbols }),
    
  // Strategies
  getStrategies: () => 
    api.get('/strategies'),
    
  createStrategy: (data: any) => 
    api.post('/strategies', data),
    
  getStrategy: (id: string) => 
    api.get(`/strategies/${id}`),
    
  updateStrategy: (id: string, data: any) => 
    api.put(`/strategies/${id}`, data),
    
  deleteStrategy: (id: string) => 
    api.delete(`/strategies/${id}`),
    
  backtestStrategy: (id: string, data: any) => 
    api.post(`/strategies/${id}/backtest`, data),
    
  evaluateStrategy: (id: string, symbol: string, timeframe: string) => 
    api.post(`/strategies/${id}/evaluate`, { symbol, timeframe }),
    
  // Portfolio
  getPortfolioMetrics: (accountId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return api.get(`/portfolio/${accountId}/metrics?${params}`);
  },
    
  getPerformanceData: (accountId: string, period: string) => 
    api.get(`/portfolio/${accountId}/performance?period=${period}`),
    
  getTradeAnalytics: (accountId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return api.get(`/portfolio/${accountId}/analytics?${params}`);
  },
    
  getRiskMetrics: (accountId: string) => 
    api.get(`/portfolio/${accountId}/risk`),
    
  compareBenchmarks: (accountId: string, benchmarks?: string[]) => {
    const params = benchmarks ? `?benchmarks=${benchmarks.join(',')}` : '';
    return api.get(`/portfolio/${accountId}/benchmarks${params}`);
  },
    
  generateReport: (accountId: string, format: 'pdf' | 'excel', options: any) => 
    api.post(`/portfolio/${accountId}/report`, { format, ...options }, { responseType: 'blob' }),
    
  getPortfolioSummary: () => 
    api.get('/portfolio/summary'),
    
  // AI & Agents
  getAgents: () => 
    api.get('/agents'),
    
  sendMessage: (conversationId: string, message: string, agentId?: string) => 
    api.post('/ai/chat', { conversationId, message, agentId }),
    
  getConversations: () => 
    api.get('/agents/conversations'),
    
  createConversation: (agentId: string, title?: string) => 
    api.post('/agents/conversations', { agentId, title }),
    
  getConversation: (id: string) => 
    api.get(`/agents/conversations/${id}`),
    
  getMessages: (conversationId: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return api.get(`/agents/conversations/${conversationId}/messages?${params}`);
  },
};