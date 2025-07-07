import type { Timeframe } from './trading.types';

export interface TradingStrategy {
  id: string;
  userId: string;
  name: string;
  description?: string;
  strategyType: string;
  rules: any;
  parameters?: any;
  backtestResults?: BacktestResult;
  isActive: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StrategyRule {
  type: 'entry' | 'exit';
  conditions: StrategyCondition[];
  logic: 'AND' | 'OR';
}

export interface StrategyCondition {
  indicator: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'crosses_above' | 'crosses_below';
  value?: number;
  target?: {
    indicator: string;
    period?: number;
  };
  period?: number;
}

export interface BacktestResult {
  strategyId: string;
  symbol: string;
  timeframe: Timeframe;
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  finalBalance: number;
  totalReturn: number;
  totalReturnPercent: number;
  trades: BacktestTrade[];
  metrics: BacktestMetrics;
  equityCurve: EquityPoint[];
}

export interface BacktestTrade {
  entryDate: Date;
  exitDate?: Date;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  type: 'buy' | 'sell';
  profitLoss: number;
  profitLossPercent: number;
  holdingPeriod: number;
  entryReason: string;
  exitReason?: string;
}

export interface BacktestMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  avgHoldingPeriod: number;
  expectancy: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface EquityPoint {
  date: Date;
  value: number;
  drawdown: number;
  trades: number;
}

export interface StrategySignal {
  type: 'entry' | 'exit';
  action: 'buy' | 'sell';
  symbol: string;
  price: number;
  timestamp: Date;
  confidence: number;
  reason: string;
  indicators: any[];
}