import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { api } from '../services/api';
import type {
  PortfolioMetrics,
  PerformanceTimeSeries,
  TradeAnalytics,
  RiskMetrics,
  BenchmarkComparison
} from '../types/portfolio';
import type { TradingAccount } from '../types/trading';

interface PortfolioState {
  // Selected account
  selectedAccount: TradingAccount | null;
  
  // Portfolio data
  metrics: PortfolioMetrics | null;
  performanceData: PerformanceTimeSeries[];
  tradeAnalytics: TradeAnalytics | null;
  riskMetrics: RiskMetrics | null;
  benchmarkComparisons: BenchmarkComparison[];
  
  // Loading states
  isLoading: boolean;
  isLoadingPerformance: boolean;
  isLoadingAnalytics: boolean;
  isLoadingRisk: boolean;
  isLoadingBenchmarks: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  setSelectedAccount: (account: TradingAccount | null) => void;
  fetchMetrics: (accountId: string, startDate?: Date, endDate?: Date) => Promise<void>;
  fetchPerformanceData: (accountId: string, period: 'day' | 'week' | 'month' | 'year' | 'all') => Promise<void>;
  fetchTradeAnalytics: (accountId: string, startDate?: Date, endDate?: Date) => Promise<void>;
  fetchRiskMetrics: (accountId: string) => Promise<void>;
  compareBenchmarks: (accountId: string, benchmarks?: string[]) => Promise<void>;
  generateReport: (accountId: string, format: 'pdf' | 'excel', options?: any) => Promise<void>;
  clearData: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        selectedAccount: null,
        metrics: null,
        performanceData: [],
        tradeAnalytics: null,
        riskMetrics: null,
        benchmarkComparisons: [],
        isLoading: false,
        isLoadingPerformance: false,
        isLoadingAnalytics: false,
        isLoadingRisk: false,
        isLoadingBenchmarks: false,
        error: null,

        // Actions
        setSelectedAccount: (account) => {
          set({ selectedAccount: account, error: null });
        },

        fetchMetrics: async (accountId, startDate, endDate) => {
          set({ isLoading: true, error: null });
          try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate.toISOString());
            if (endDate) params.append('endDate', endDate.toISOString());
            
            const response = await api.get(`/portfolio/${accountId}/metrics?${params}`);
            if (response.data.success) {
              set({ metrics: response.data.data });
            } else {
              throw new Error(response.data.error || 'Failed to fetch metrics');
            }
          } catch (error: any) {
            set({ error: error.message || 'Failed to fetch portfolio metrics' });
            console.error('Failed to fetch metrics:', error);
          } finally {
            set({ isLoading: false });
          }
        },

        fetchPerformanceData: async (accountId, period) => {
          set({ isLoadingPerformance: true, error: null });
          try {
            const response = await api.get(`/portfolio/${accountId}/performance?period=${period}`);
            if (response.data.success) {
              set({ performanceData: response.data.data });
            } else {
              throw new Error(response.data.error || 'Failed to fetch performance data');
            }
          } catch (error: any) {
            set({ error: error.message || 'Failed to fetch performance data' });
            console.error('Failed to fetch performance:', error);
          } finally {
            set({ isLoadingPerformance: false });
          }
        },

        fetchTradeAnalytics: async (accountId, startDate, endDate) => {
          set({ isLoadingAnalytics: true, error: null });
          try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate.toISOString());
            if (endDate) params.append('endDate', endDate.toISOString());
            
            const response = await api.get(`/portfolio/${accountId}/analytics?${params}`);
            if (response.data.success) {
              set({ tradeAnalytics: response.data.data });
            } else {
              throw new Error(response.data.error || 'Failed to fetch analytics');
            }
          } catch (error: any) {
            set({ error: error.message || 'Failed to fetch trade analytics' });
            console.error('Failed to fetch analytics:', error);
          } finally {
            set({ isLoadingAnalytics: false });
          }
        },

        fetchRiskMetrics: async (accountId) => {
          set({ isLoadingRisk: true, error: null });
          try {
            const response = await api.get(`/portfolio/${accountId}/risk`);
            if (response.data.success) {
              set({ riskMetrics: response.data.data });
            } else {
              throw new Error(response.data.error || 'Failed to fetch risk metrics');
            }
          } catch (error: any) {
            set({ error: error.message || 'Failed to fetch risk metrics' });
            console.error('Failed to fetch risk metrics:', error);
          } finally {
            set({ isLoadingRisk: false });
          }
        },

        compareBenchmarks: async (accountId, benchmarks) => {
          set({ isLoadingBenchmarks: true, error: null });
          try {
            const params = benchmarks ? `?benchmarks=${benchmarks.join(',')}` : '';
            const response = await api.get(`/portfolio/${accountId}/benchmarks${params}`);
            if (response.data.success) {
              set({ benchmarkComparisons: response.data.data });
            } else {
              throw new Error(response.data.error || 'Failed to compare benchmarks');
            }
          } catch (error: any) {
            set({ error: error.message || 'Failed to compare benchmarks' });
            console.error('Failed to compare benchmarks:', error);
          } finally {
            set({ isLoadingBenchmarks: false });
          }
        },

        generateReport: async (accountId, format, options = {}) => {
          try {
            const response = await api.post(`/portfolio/${accountId}/report`, {
              format,
              ...options
            }, {
              responseType: 'blob'
            });

            // Create download link
            const blob = new Blob([response.data], {
              type: format === 'pdf' 
                ? 'application/pdf' 
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `portfolio-report-${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          } catch (error: any) {
            set({ error: error.message || 'Failed to generate report' });
            console.error('Failed to generate report:', error);
          }
        },

        clearData: () => {
          set({
            selectedAccount: null,
            metrics: null,
            performanceData: [],
            tradeAnalytics: null,
            riskMetrics: null,
            benchmarkComparisons: [],
            error: null
          });
        }
      }),
      {
        name: 'portfolio-store',
        partialize: (state) => ({
          selectedAccount: state.selectedAccount
        })
      }
    )
  )
);