import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { PortfolioAnalytics } from '../components/portfolio/PortfolioAnalytics';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { useTradingStore } from '../stores/tradingStore';
import { usePortfolioStore } from '../stores/portfolioStore';
import FadeIn from '../components/animations/FadeIn';
import { formatCurrency, formatPercent } from '../utils/formatters';

const Portfolio: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { accounts, fetchAccounts } = useTradingStore();
  const { setSelectedAccount, selectedAccount } = usePortfolioStore();
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Fetch trading accounts
    const loadAccounts = async () => {
      setIsLoadingAccounts(true);
      try {
        await fetchAccounts();
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    loadAccounts();
  }, [isAuthenticated, navigate, fetchAccounts]);

  useEffect(() => {
    // Auto-select first account if none selected
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts, selectedAccount, setSelectedAccount]);

  const handleAccountSelect = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (account) {
      setSelectedAccount(account);
    }
  };

  const calculateTotalValue = () => {
    return accounts.reduce((total, account) => total + account.currentBalance, 0);
  };

  const calculateTotalPnL = () => {
    return accounts.reduce((total, account) => {
      const pnl = account.currentBalance - account.initialBalance;
      return total + pnl;
    }, 0);
  };

  const totalValue = calculateTotalValue();
  const totalPnL = calculateTotalPnL();
  const totalPnLPercent = totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0;

  if (isLoadingAccounts) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-primary">Portfolio Analytics</h1>
                <p className="text-muted-foreground mt-1">
                  Track performance, analyze risks, and optimize your trading
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Portfolio Summary */}
        <FadeIn delay={0.2} direction="up">
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Portfolio Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Total P&L</p>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(totalPnL)}
                  </p>
                  {totalPnL !== 0 && (
                    totalPnL >= 0 ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <p className={`text-sm ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent(totalPnLPercent)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Active Accounts</p>
                <p className="text-2xl font-bold">{accounts.length}</p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Account Selector */}
        {accounts.length > 0 ? (
          <FadeIn delay={0.3} direction="up">
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm text-gray-400">Select Account:</span>
                {accounts.map(account => (
                  <button
                    key={account.id}
                    onClick={() => handleAccountSelect(account.id)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedAccount?.id === account.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-medium">{account.accountName}</p>
                      <p className="text-xs opacity-80">
                        {account.accountType.toUpperCase()} • {formatCurrency(account.currentBalance)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </FadeIn>
        ) : (
          <FadeIn delay={0.3} direction="up">
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Trading Accounts</h3>
              <p className="text-gray-400 mb-4">
                You need to create a trading account to view analytics
              </p>
              <Button
                onClick={() => navigate('/trading')}
                className="mx-auto"
              >
                Create Account
              </Button>
            </div>
          </FadeIn>
        )}

        {/* Portfolio Analytics Component */}
        {selectedAccount && (
          <FadeIn delay={0.4} direction="up">
            <PortfolioAnalytics />
          </FadeIn>
        )}
      </div>
    </div>
  );
};

export default Portfolio;