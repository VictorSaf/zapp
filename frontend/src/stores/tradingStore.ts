import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { api } from '../services/api';
import type { TradingAccount, Trade, Position, Instrument } from '../types/trading';

interface TradingState {
  // Accounts
  accounts: TradingAccount[];
  selectedAccount: TradingAccount | null;
  
  // Trades
  trades: Trade[];
  openPositions: Position[];
  
  // Instruments
  instruments: Instrument[];
  
  // Loading states
  isLoading: boolean;
  isLoadingTrades: boolean;
  isLoadingPositions: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  fetchAccounts: () => Promise<void>;
  createAccount: (data: Partial<TradingAccount>) => Promise<void>;
  selectAccount: (account: TradingAccount | null) => void;
  fetchTrades: (accountId: string) => Promise<void>;
  createTrade: (accountId: string, data: Partial<Trade>) => Promise<void>;
  closeTrade: (accountId: string, tradeId: string, exitPrice: number) => Promise<void>;
  fetchPositions: (accountId: string) => Promise<void>;
  fetchInstruments: () => Promise<void>;
  clearData: () => void;
}

export const useTradingStore = create<TradingState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        accounts: [],
        selectedAccount: null,
        trades: [],
        openPositions: [],
        instruments: [],
        isLoading: false,
        isLoadingTrades: false,
        isLoadingPositions: false,
        error: null,

        // Actions
        fetchAccounts: async () => {
          set({ isLoading: true, error: null });
          try {
            const response = await api.get('/trading/accounts');
            if (response.data.success) {
              set({ accounts: response.data.data });
            } else {
              throw new Error(response.data.error || 'Failed to fetch accounts');
            }
          } catch (error: any) {
            set({ error: error.message || 'Failed to fetch accounts' });
            console.error('Failed to fetch accounts:', error);
          } finally {
            set({ isLoading: false });
          }
        },

        createAccount: async (data) => {
          set({ isLoading: true, error: null });
          try {
            const response = await api.post('/trading/accounts', data);
            if (response.data.success) {
              const newAccount = response.data.data;
              set(state => ({ 
                accounts: [...state.accounts, newAccount],
                selectedAccount: newAccount 
              }));
            } else {
              throw new Error(response.data.error || 'Failed to create account');
            }
          } catch (error: any) {
            set({ error: error.message || 'Failed to create account' });
            console.error('Failed to create account:', error);
            throw error;
          } finally {
            set({ isLoading: false });
          }
        },

        selectAccount: (account) => {
          set({ selectedAccount: account });
          if (account) {
            get().fetchTrades(account.id);
            get().fetchPositions(account.id);
          }
        },

        fetchTrades: async (accountId) => {
          set({ isLoadingTrades: true, error: null });
          try {
            const response = await api.get(`/trading/accounts/${accountId}/trades`);
            if (response.data.success) {
              set({ trades: response.data.data });
            } else {
              throw new Error(response.data.error || 'Failed to fetch trades');
            }
          } catch (error: any) {
            set({ error: error.message || 'Failed to fetch trades' });
            console.error('Failed to fetch trades:', error);
          } finally {
            set({ isLoadingTrades: false });
          }
        },

        createTrade: async (accountId, data) => {
          set({ isLoadingTrades: true, error: null });
          try {
            const response = await api.post(`/trading/accounts/${accountId}/trades`, data);
            if (response.data.success) {
              const newTrade = response.data.data;
              set(state => ({ 
                trades: [newTrade, ...state.trades]
              }));
              // Refresh account data
              await get().fetchAccounts();
              await get().fetchPositions(accountId);
            } else {
              throw new Error(response.data.error || 'Failed to create trade');
            }
          } catch (error: any) {
            set({ error: error.message || 'Failed to create trade' });
            console.error('Failed to create trade:', error);
            throw error;
          } finally {
            set({ isLoadingTrades: false });
          }
        },

        closeTrade: async (accountId, tradeId, exitPrice) => {
          set({ isLoadingTrades: true, error: null });
          try {
            const response = await api.put(`/trading/accounts/${accountId}/trades/${tradeId}/close`, {
              exitPrice
            });
            if (response.data.success) {
              // Update the trade in the list
              set(state => ({
                trades: state.trades.map(trade => 
                  trade.id === tradeId 
                    ? { ...trade, status: 'closed', exitPrice, closeTime: new Date() }
                    : trade
                )
              }));
              // Refresh account data
              await get().fetchAccounts();
              await get().fetchPositions(accountId);
            } else {
              throw new Error(response.data.error || 'Failed to close trade');
            }
          } catch (error: any) {
            set({ error: error.message || 'Failed to close trade' });
            console.error('Failed to close trade:', error);
            throw error;
          } finally {
            set({ isLoadingTrades: false });
          }
        },

        fetchPositions: async (accountId) => {
          set({ isLoadingPositions: true, error: null });
          try {
            const response = await api.get(`/trading/accounts/${accountId}/positions`);
            if (response.data.success) {
              set({ openPositions: response.data.data });
            } else {
              throw new Error(response.data.error || 'Failed to fetch positions');
            }
          } catch (error: any) {
            set({ error: error.message || 'Failed to fetch positions' });
            console.error('Failed to fetch positions:', error);
          } finally {
            set({ isLoadingPositions: false });
          }
        },

        fetchInstruments: async () => {
          try {
            const response = await api.get('/trading/instruments');
            if (response.data.success) {
              set({ instruments: response.data.data });
            } else {
              throw new Error(response.data.error || 'Failed to fetch instruments');
            }
          } catch (error: any) {
            console.error('Failed to fetch instruments:', error);
          }
        },

        clearData: () => {
          set({
            accounts: [],
            selectedAccount: null,
            trades: [],
            openPositions: [],
            error: null
          });
        }
      }),
      {
        name: 'trading-store',
        partialize: (state) => ({
          selectedAccount: state.selectedAccount,
          instruments: state.instruments
        })
      }
    )
  )
);