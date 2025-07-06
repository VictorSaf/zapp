import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertCircle,
  Plus,
  Trash2,
  Play,
  Save,
  Clock,
  DollarSign,
  BarChart3,
  LineChart,
  Brain,
  Share2,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useStrategyStore } from '../../stores/strategyStore';
import { StrategyRule, StrategyCondition } from '../../types/strategy.types';
import { Timeframe } from '../../types/trading.types';

const INDICATORS = [
  { value: 'SMA', label: 'Simple Moving Average', hasPeriodselector: true },
  { value: 'EMA', label: 'Exponential Moving Average', hasPeriodselector: true },
  { value: 'RSI', label: 'Relative Strength Index', hasPeriodselector: true },
  { value: 'MACD', label: 'MACD', hasPeriodselector: false },
  { value: 'BB', label: 'Bollinger Bands', hasPeriodselector: true },
  { value: 'PRICE', label: 'Current Price', hasPeriodselector: false },
  { value: 'VOLUME', label: 'Volume', hasPeriodselector: false }
];

const OPERATORS = [
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'eq', label: 'Equals' },
  { value: 'gte', label: 'Greater or equal' },
  { value: 'lte', label: 'Less or equal' },
  { value: 'crosses_above', label: 'Crosses above' },
  { value: 'crosses_below', label: 'Crosses below' }
];

const STRATEGY_TYPES = [
  { value: 'trend_following', label: 'Trend Following', icon: TrendingUp },
  { value: 'mean_reversion', label: 'Mean Reversion', icon: Activity },
  { value: 'momentum', label: 'Momentum', icon: BarChart3 },
  { value: 'scalping', label: 'Scalping', icon: Clock },
  { value: 'range_trading', label: 'Range Trading', icon: LineChart },
  { value: 'breakout', label: 'Breakout', icon: TrendingUp }
];

export const StrategyBuilder: React.FC = () => {
  const {
    strategies,
    currentStrategy,
    isLoading,
    createStrategy,
    updateStrategy,
    backtestStrategy,
    generateSuggestions,
    setCurrentStrategy
  } = useStrategyStore();

  const [activeTab, setActiveTab] = useState<'builder' | 'backtest' | 'suggestions'>('builder');
  const [strategyName, setStrategyName] = useState('');
  const [strategyDescription, setStrategyDescription] = useState('');
  const [strategyType, setStrategyType] = useState('trend_following');
  const [entryRules, setEntryRules] = useState<StrategyCondition[]>([]);
  const [exitRules, setExitRules] = useState<StrategyCondition[]>([]);
  const [entryLogic, setEntryLogic] = useState<'AND' | 'OR'>('AND');
  const [exitLogic, setExitLogic] = useState<'AND' | 'OR'>('OR');
  const [isPublic, setIsPublic] = useState(false);
  
  // Backtest parameters
  const [backtestSymbol, setBacktestSymbol] = useState('EURUSD');
  const [backtestTimeframe, setBacktestTimeframe] = useState<Timeframe>(Timeframe.H1);
  const [backtestStartDate, setBacktestStartDate] = useState('');
  const [backtestEndDate, setBacktestEndDate] = useState('');
  const [initialBalance, setInitialBalance] = useState(10000);

  useEffect(() => {
    if (currentStrategy) {
      setStrategyName(currentStrategy.name);
      setStrategyDescription(currentStrategy.description || '');
      setStrategyType(currentStrategy.strategyType);
      setIsPublic(currentStrategy.isPublic);
      
      if (currentStrategy.rules) {
        const rules = currentStrategy.rules as any;
        if (rules.entry) {
          setEntryRules(rules.entry.conditions || []);
          setEntryLogic(rules.entry.logic || 'AND');
        }
        if (rules.exit) {
          setExitRules(rules.exit.conditions || []);
          setExitLogic(rules.exit.logic || 'OR');
        }
      }
    }
  }, [currentStrategy]);

  const addCondition = (type: 'entry' | 'exit') => {
    const newCondition: StrategyCondition = {
      indicator: 'SMA',
      operator: 'gt',
      value: 0,
      period: 20
    };

    if (type === 'entry') {
      setEntryRules([...entryRules, newCondition]);
    } else {
      setExitRules([...exitRules, newCondition]);
    }
  };

  const updateCondition = (
    type: 'entry' | 'exit', 
    index: number, 
    field: keyof StrategyCondition, 
    value: any
  ) => {
    const rules = type === 'entry' ? [...entryRules] : [...exitRules];
    rules[index] = { ...rules[index], [field]: value };
    
    if (type === 'entry') {
      setEntryRules(rules);
    } else {
      setExitRules(rules);
    }
  };

  const removeCondition = (type: 'entry' | 'exit', index: number) => {
    if (type === 'entry') {
      setEntryRules(entryRules.filter((_, i) => i !== index));
    } else {
      setExitRules(exitRules.filter((_, i) => i !== index));
    }
  };

  const handleSaveStrategy = async () => {
    const strategyData = {
      name: strategyName,
      description: strategyDescription,
      strategyType,
      rules: {
        entry: {
          type: 'entry' as const,
          conditions: entryRules,
          logic: entryLogic
        },
        exit: {
          type: 'exit' as const,
          conditions: exitRules,
          logic: exitLogic
        }
      },
      parameters: {
        timeframe: backtestTimeframe,
        riskPerTrade: 0.02,
        maxOpenTrades: 3
      },
      isPublic
    };

    if (currentStrategy?.id) {
      await updateStrategy(currentStrategy.id, strategyData);
    } else {
      await createStrategy(strategyData);
    }
  };

  const handleBacktest = async () => {
    if (!currentStrategy?.id) {
      alert('Please save the strategy first');
      return;
    }

    await backtestStrategy(currentStrategy.id, {
      symbol: backtestSymbol,
      timeframe: backtestTimeframe,
      startDate: backtestStartDate,
      endDate: backtestEndDate,
      initialBalance
    });
  };

  const renderConditionBuilder = (
    conditions: StrategyCondition[], 
    type: 'entry' | 'exit',
    logic: 'AND' | 'OR'
  ) => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-300">
            {type === 'entry' ? 'Entry Conditions' : 'Exit Conditions'}
          </h4>
          <select
            value={logic}
            onChange={(e) => type === 'entry' 
              ? setEntryLogic(e.target.value as 'AND' | 'OR')
              : setExitLogic(e.target.value as 'AND' | 'OR')
            }
            className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
          >
            <option value="AND">All conditions (AND)</option>
            <option value="OR">Any condition (OR)</option>
          </select>
        </div>

        {conditions.map((condition, index) => (
          <div key={index} className="p-3 bg-gray-700 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={condition.indicator}
                onChange={(e) => updateCondition(type, index, 'indicator', e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded"
              >
                {INDICATORS.map(ind => (
                  <option key={ind.value} value={ind.value}>{ind.label}</option>
                ))}
              </select>

              {INDICATORS.find(i => i.value === condition.indicator)?.hasPeriodselector && (
                <input
                  type="number"
                  value={condition.period || 20}
                  onChange={(e) => updateCondition(type, index, 'period', parseInt(e.target.value))}
                  placeholder="Period"
                  className="w-20 px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                />
              )}

              <button
                onClick={() => removeCondition(type, index)}
                className="p-2 text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={condition.operator}
                onChange={(e) => updateCondition(type, index, 'operator', e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded"
              >
                {OPERATORS.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              {['crosses_above', 'crosses_below'].includes(condition.operator) ? (
                <div className="flex items-center gap-2 flex-1">
                  <select
                    value={condition.target?.indicator || ''}
                    onChange={(e) => updateCondition(type, index, 'target', { 
                      ...condition.target, 
                      indicator: e.target.value 
                    })}
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                  >
                    <option value="">Select target</option>
                    {INDICATORS.map(ind => (
                      <option key={ind.value} value={ind.value}>{ind.label}</option>
                    ))}
                  </select>
                  
                  {condition.target?.indicator && 
                   INDICATORS.find(i => i.value === condition.target?.indicator)?.hasPeriodselector && (
                    <input
                      type="number"
                      value={condition.target?.period || 20}
                      onChange={(e) => updateCondition(type, index, 'target', { 
                        ...condition.target, 
                        period: parseInt(e.target.value) 
                      })}
                      placeholder="Period"
                      className="w-20 px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                    />
                  )}
                </div>
              ) : (
                <input
                  type="number"
                  value={condition.value || 0}
                  onChange={(e) => updateCondition(type, index, 'value', parseFloat(e.target.value))}
                  placeholder="Value"
                  step="0.01"
                  className="w-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                />
              )}
            </div>
          </div>
        ))}

        <button
          onClick={() => addCondition(type)}
          className="w-full py-2 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Condition
        </button>
      </div>
    );
  };

  const renderBacktestResults = () => {
    if (!currentStrategy?.backtestResults) {
      return (
        <div className="text-center py-12 text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No backtest results yet</p>
          <p className="text-sm mt-2">Configure parameters and run backtest</p>
        </div>
      );
    }

    const results = currentStrategy.backtestResults;
    const metrics = results.metrics;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Total Return</p>
            <p className={`text-2xl font-bold ${results.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${results.totalReturn.toFixed(2)}
            </p>
            <p className={`text-sm ${results.totalReturnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {results.totalReturnPercent >= 0 ? '+' : ''}{results.totalReturnPercent.toFixed(2)}%
            </p>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Win Rate</p>
            <p className="text-2xl font-bold text-white">
              {metrics.winRate.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-400">
              {metrics.winningTrades}/{metrics.totalTrades} trades
            </p>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Profit Factor</p>
            <p className="text-2xl font-bold text-white">
              {metrics.profitFactor.toFixed(2)}
            </p>
            <p className="text-sm text-gray-400">
              Avg W/L ratio
            </p>
          </div>

          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Max Drawdown</p>
            <p className="text-2xl font-bold text-red-400">
              -{metrics.maxDrawdownPercent.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-400">
              ${metrics.maxDrawdown.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="bg-gray-700 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Sharpe Ratio</p>
              <p className="font-medium">{metrics.sharpeRatio.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400">Average Win</p>
              <p className="font-medium text-green-400">
                ${metrics.avgWin.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Average Loss</p>
              <p className="font-medium text-red-400">
                ${Math.abs(metrics.avgLoss).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Expectancy</p>
              <p className="font-medium">
                ${metrics.expectancy.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Avg Holding Period</p>
              <p className="font-medium">
                {metrics.avgHoldingPeriod.toFixed(1)} days
              </p>
            </div>
            <div>
              <p className="text-gray-400">Max Consecutive Wins</p>
              <p className="font-medium text-green-400">
                {metrics.consecutiveWins}
              </p>
            </div>
          </div>
        </div>

        {/* Trade List */}
        <div className="bg-gray-700 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.trades.slice(0, 10).map((trade, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-600">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${trade.profitLoss >= 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                  <div>
                    <p className="text-sm">
                      {trade.type.toUpperCase()} @ {trade.entryPrice.toFixed(5)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(trade.entryDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${trade.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.profitLoss >= 0 ? '+' : ''}{trade.profitLoss.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {trade.holdingPeriod} days
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Strategy Builder</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isPublic ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            {isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {isPublic ? 'Public' : 'Private'}
          </button>
          <Button
            onClick={handleSaveStrategy}
            disabled={!strategyName || isLoading}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Strategy
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6 border-b border-gray-700">
        {['builder', 'backtest', 'suggestions'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`pb-3 px-4 transition-colors relative ${
              activeTab === tab
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'builder' && (
          <motion.div
            key="builder"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Basic Info */}
            <div className="bg-gray-800 p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Strategy Name
                </label>
                <Input
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  placeholder="My Trading Strategy"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={strategyDescription}
                  onChange={(e) => setStrategyDescription(e.target.value)}
                  placeholder="Describe your strategy..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Strategy Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {STRATEGY_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setStrategyType(type.value)}
                      className={`p-3 rounded-lg border transition-colors ${
                        strategyType === type.value
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <type.icon className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-sm">{type.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Entry Rules */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-green-400">Entry Rules</h3>
              {renderConditionBuilder(entryRules, 'entry', entryLogic)}
            </div>

            {/* Exit Rules */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-red-400">Exit Rules</h3>
              {renderConditionBuilder(exitRules, 'exit', exitLogic)}
            </div>

            {/* Risk Management */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Risk Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Stop Loss (%)
                  </label>
                  <Input
                    type="number"
                    defaultValue="2"
                    step="0.1"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Take Profit (%)
                  </label>
                  <Input
                    type="number"
                    defaultValue="4"
                    step="0.1"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Position Size (%)
                  </label>
                  <Input
                    type="number"
                    defaultValue="5"
                    step="1"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'backtest' && (
          <motion.div
            key="backtest"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Backtest Parameters */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Backtest Parameters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Symbol
                  </label>
                  <select
                    value={backtestSymbol}
                    onChange={(e) => setBacktestSymbol(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                  >
                    <option value="EURUSD">EUR/USD</option>
                    <option value="GBPUSD">GBP/USD</option>
                    <option value="USDJPY">USD/JPY</option>
                    <option value="XAUUSD">XAU/USD (Gold)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Timeframe
                  </label>
                  <select
                    value={backtestTimeframe}
                    onChange={(e) => setBacktestTimeframe(e.target.value as Timeframe)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                  >
                    {Object.values(Timeframe).map(tf => (
                      <option key={tf} value={tf}>{tf}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={backtestStartDate}
                    onChange={(e) => setBacktestStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={backtestEndDate}
                    onChange={(e) => setBacktestEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Initial Balance ($)
                  </label>
                  <Input
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleBacktest}
                    disabled={!currentStrategy?.id || isLoading || !backtestStartDate || !backtestEndDate}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Run Backtest
                  </Button>
                </div>
              </div>
            </div>

            {/* Backtest Results */}
            {renderBacktestResults()}
          </motion.div>
        )}

        {activeTab === 'suggestions' && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold">AI Strategy Suggestions</h3>
              </div>
              
              <p className="text-gray-400 mb-6">
                Get AI-powered strategy suggestions based on current market conditions
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Symbol
                  </label>
                  <select className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg">
                    <option value="EURUSD">EUR/USD</option>
                    <option value="GBPUSD">GBP/USD</option>
                    <option value="USDJPY">USD/JPY</option>
                    <option value="XAUUSD">XAU/USD (Gold)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Risk Tolerance
                  </label>
                  <select className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg">
                    <option value="low">Low Risk</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
                </div>
              </div>

              <Button
                onClick={() => generateSuggestions('EURUSD', Timeframe.H1)}
                className="w-full flex items-center justify-center gap-2"
              >
                <Brain className="w-4 h-4" />
                Generate Suggestions
              </Button>
            </div>

            {/* Suggested Strategies */}
            <div className="space-y-4">
              {/* This would be populated with actual suggestions */}
              <div className="bg-gray-700 p-6 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-lg font-semibold">Trend Following Strategy</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      AI-optimized for current bullish market conditions
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button size="sm">
                      Use Strategy
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Expected Win Rate</p>
                    <p className="font-medium">68.5%</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Profit Factor</p>
                    <p className="font-medium">1.85</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Max Drawdown</p>
                    <p className="font-medium text-red-400">-12.3%</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};