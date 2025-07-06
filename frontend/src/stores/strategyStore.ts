import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { TradingStrategy, BacktestResult } from '../types/strategy.types';
import { Timeframe } from '../types/trading.types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface StrategyStore {
  strategies: TradingStrategy[];
  publicStrategies: TradingStrategy[];
  currentStrategy: TradingStrategy | null;
  backtestResults: BacktestResult | null;
  suggestions: TradingStrategy[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchStrategies: () => Promise<void>;
  fetchPublicStrategies: (filters?: any) => Promise<void>;
  createStrategy: (data: any) => Promise<void>;
  updateStrategy: (id: string, data: any) => Promise<void>;
  deleteStrategy: (id: string) => Promise<void>;
  cloneStrategy: (id: string, name?: string) => Promise<void>;
  setCurrentStrategy: (strategy: TradingStrategy | null) => void;
  
  // Backtest
  backtestStrategy: (id: string, params: any) => Promise<void>;
  getBacktestResults: (id: string) => Promise<void>;
  
  // Monitoring
  startMonitoring: (id: string, params: any) => Promise<void>;
  stopMonitoring: (id: string) => Promise<void>;
  
  // AI Suggestions
  generateSuggestions: (symbol: string, timeframe: Timeframe, preferences?: any) => Promise<void>;
  
  // Performance
  getStrategyPerformance: (id: string, accountId?: string, period?: string) => Promise<any>;
}

export const useStrategyStore = create<StrategyStore>()(
  persist(
    (set, get) => ({
      strategies: [],
      publicStrategies: [],
      currentStrategy: null,
      backtestResults: null,
      suggestions: [],
      isLoading: false,
      error: null,
      
      fetchStrategies: async () => {
        set({ isLoading: true, error: null });
        try {
          const token = localStorage.getItem('auth_token');
          const response = await axios.get(`${API_BASE_URL}/strategies`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          set({ strategies: response.data.data, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to fetch strategies',
            isLoading: false 
          });
        }
      },
      
      fetchPublicStrategies: async (filters = {}) => {
        set({ isLoading: true, error: null });
        try {
          const token = localStorage.getItem('auth_token');
          const response = await axios.get(`${API_BASE_URL}/strategies/public`, {
            params: filters,
            headers: { Authorization: `Bearer ${token}` }
          });
          set({ publicStrategies: response.data.data, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to fetch public strategies',
            isLoading: false 
          });
        }
      },
      
      createStrategy: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const token = localStorage.getItem('auth_token');
          const response = await axios.post(
            `${API_BASE_URL}/strategies`,
            data,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          const newStrategy = response.data.data;
          set(state => ({
            strategies: [...state.strategies, newStrategy],
            currentStrategy: newStrategy,
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to create strategy',
            isLoading: false 
          });
        }
      },
      
      updateStrategy: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const token = localStorage.getItem('auth_token');
          const response = await axios.put(
            `${API_BASE_URL}/strategies/${id}`,
            data,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          const updatedStrategy = response.data.data;
          set(state => ({
            strategies: state.strategies.map(s => 
              s.id === id ? updatedStrategy : s
            ),
            currentStrategy: state.currentStrategy?.id === id 
              ? updatedStrategy 
              : state.currentStrategy,
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to update strategy',
            isLoading: false 
          });
        }
      },
      
      deleteStrategy: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const token = localStorage.getItem('auth_token');
          await axios.delete(
            `${API_BASE_URL}/strategies/${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          set(state => ({
            strategies: state.strategies.filter(s => s.id !== id),
            currentStrategy: state.currentStrategy?.id === id 
              ? null 
              : state.currentStrategy,
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to delete strategy',
            isLoading: false 
          });
        }
      },
      
      cloneStrategy: async (id, name) => {
        set({ isLoading: true, error: null });
        try {
          const token = localStorage.getItem('auth_token');
          const response = await axios.post(
            `${API_BASE_URL}/strategies/${id}/clone`,
            { name },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          const clonedStrategy = response.data.data;
          set(state => ({
            strategies: [...state.strategies, clonedStrategy],
            currentStrategy: clonedStrategy,
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to clone strategy',
            isLoading: false 
          });
        }
      },
      
      setCurrentStrategy: (strategy) => {
        set({ currentStrategy: strategy, backtestResults: null });
      },
      
      backtestStrategy: async (id, params) => {
        set({ isLoading: true, error: null });
        try {
          const token = localStorage.getItem('auth_token');
          const response = await axios.post(
            `${API_BASE_URL}/strategies/${id}/backtest`,
            params,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          const results = response.data.data;
          set(state => ({
            backtestResults: results,
            currentStrategy: state.currentStrategy 
              ? { ...state.currentStrategy, backtestResults: results }
              : state.currentStrategy,
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Backtest failed',
            isLoading: false 
          });
        }
      },
      
      getBacktestResults: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const token = localStorage.getItem('auth_token');
          const response = await axios.get(
            `${API_BASE_URL}/strategies/${id}/backtest-results`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          set({ 
            backtestResults: response.data.data,
            isLoading: false 
          });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to fetch backtest results',
            isLoading: false 
          });
        }
      },
      
      startMonitoring: async (id, params) => {
        set({ isLoading: true, error: null });
        try {
          const token = localStorage.getItem('auth_token');
          await axios.post(
            `${API_BASE_URL}/strategies/${id}/monitor`,
            params,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          set({ isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to start monitoring',
            isLoading: false 
          });
        }
      },
      
      stopMonitoring: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const token = localStorage.getItem('auth_token');
          await axios.delete(
            `${API_BASE_URL}/strategies/${id}/monitor`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          set({ isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to stop monitoring',
            isLoading: false 
          });
        }
      },
      
      generateSuggestions: async (symbol, timeframe, preferences) => {
        set({ isLoading: true, error: null });
        try {
          const token = localStorage.getItem('auth_token');
          const response = await axios.post(
            `${API_BASE_URL}/strategies/suggestions`,
            { symbol, timeframe, ...preferences },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          set({ 
            suggestions: response.data.data,
            isLoading: false 
          });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to generate suggestions',
            isLoading: false 
          });
        }
      },
      
      getStrategyPerformance: async (id, accountId, period) => {
        set({ isLoading: true, error: null });
        try {
          const token = localStorage.getItem('auth_token');
          const response = await axios.get(
            `${API_BASE_URL}/strategies/${id}/performance`,
            {
              params: { accountId, period },
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          set({ isLoading: false });
          return response.data.data;
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || 'Failed to fetch performance',
            isLoading: false 
          });
          return null;
        }
      }
    }),
    {
      name: 'strategy-storage',
      partialize: (state) => ({
        currentStrategy: state.currentStrategy
      })
    }
  )
);