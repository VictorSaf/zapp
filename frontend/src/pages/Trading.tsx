import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, DollarSign, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { useTradingStore } from '../stores/tradingStore';
import FadeIn from '../components/animations/FadeIn';
import { formatCurrency, formatPercent } from '../utils/formatters';

const Trading: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { 
    accounts, 
    fetchAccounts, 
    createAccount,
    isLoading 
  } = useTradingStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    accountName: '',
    accountType: 'demo' as 'demo' | 'paper',
    currency: 'USD',
    initialBalance: 10000
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchAccounts();
  }, [isAuthenticated, navigate, fetchAccounts]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAccount(formData);
      setShowCreateForm(false);
      setFormData({
        accountName: '',
        accountType: 'demo',
        currency: 'USD',
        initialBalance: 10000
      });
    } catch (error) {
      console.error('Failed to create account:', error);
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
                <h1 className="text-3xl font-bold text-primary">Trading Accounts</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your trading accounts and execute trades
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Account
            </Button>
          </div>
        </FadeIn>

        {/* Portfolio Overview */}
        <FadeIn delay={0.2} direction="up">
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Portfolio Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <p className="text-gray-400 text-sm">Total Value</p>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                  <p className="text-gray-400 text-sm">Total P&L</p>
                </div>
                <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(totalPnL)}
                </p>
                <p className={`text-sm ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercent(totalPnLPercent)}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                  <p className="text-gray-400 text-sm">Active Accounts</p>
                </div>
                <p className="text-2xl font-bold">{accounts.length}</p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Accounts List */}
        {accounts.length > 0 ? (
          <FadeIn delay={0.3} direction="up">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map(account => {
                const pnl = account.currentBalance - account.initialBalance;
                const pnlPercent = (pnl / account.initialBalance) * 100;
                
                return (
                  <motion.div
                    key={account.id}
                    className="bg-gray-800 rounded-lg p-6 cursor-pointer"
                    whileHover={{ scale: 1.02, y: -5 }}
                    onClick={() => navigate(`/trading/${account.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{account.accountName}</h3>
                        <p className="text-sm text-gray-400">
                          {account.accountType.toUpperCase()} • {account.currency}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        account.status === 'active' 
                          ? 'bg-green-900/20 text-green-400'
                          : 'bg-gray-900/20 text-gray-400'
                      }`}>
                        {account.status}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-400">Balance</p>
                        <p className="text-xl font-bold">{formatCurrency(account.currentBalance)}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400">P&L</p>
                        <div className="flex items-center gap-2">
                          <p className={`text-lg font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(pnl)}
                          </p>
                          <p className={`text-sm ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ({formatPercent(pnlPercent)})
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between text-sm">
                        <div>
                          <p className="text-gray-400">Available</p>
                          <p>{formatCurrency(account.availableBalance)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Margin</p>
                          <p>{formatCurrency(account.marginUsed)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-xs text-gray-400">
                        Leverage: {account.leverage}x
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </FadeIn>
        ) : (
          <FadeIn delay={0.3} direction="up">
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Trading Accounts</h3>
              <p className="text-gray-400 mb-4">
                Create your first trading account to start trading
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="mx-auto"
              >
                Create Your First Account
              </Button>
            </div>
          </FadeIn>
        )}

        {/* Create Account Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-lg p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-semibold mb-4">Create Trading Account</h3>
              
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="My Trading Account"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Account Type
                  </label>
                  <select
                    value={formData.accountType}
                    onChange={(e) => setFormData({ ...formData, accountType: e.target.value as 'demo' | 'paper' })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="demo">Demo Account</option>
                    <option value="paper">Paper Trading</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Initial Balance
                  </label>
                  <input
                    type="number"
                    value={formData.initialBalance}
                    onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    min="1000"
                    step="1000"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Creating...' : 'Create Account'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Trading;