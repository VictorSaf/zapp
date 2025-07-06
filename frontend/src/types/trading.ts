export interface TradingAccount {
  id: string;
  userId: string;
  accountName: string;
  accountType: 'demo' | 'live' | 'paper';
  currency: string;
  initialBalance: number;
  currentBalance: number;
  availableBalance: number;
  marginUsed: number;
  leverage: number;
  status: 'active' | 'suspended' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Trade {
  id: string;
  accountId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  commission: number;
  swap: number;
  profit?: number;
  status: 'open' | 'closed' | 'cancelled';
  openTime: Date;
  closeTime?: Date;
  strategyId?: string;
  notes?: string;
}

export interface Position {
  id: string;
  accountId: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  marginUsed: number;
  openTime: Date;
}

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  type: 'forex' | 'crypto' | 'stock' | 'commodity' | 'index';
  baseCurrency?: string;
  quoteCurrency?: string;
  tickSize: number;
  minQuantity: number;
  maxQuantity: number;
  marginRequirement: number;
  tradingHours?: string;
  active: boolean;
}

export interface TradingStrategy {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: 'trend_following' | 'mean_reversion' | 'momentum' | 'arbitrage' | 'scalping' | 'custom';
  rules: StrategyRule[];
  parameters: Record<string, any>;
  isPublic: boolean;
  isActive: boolean;
  performance?: StrategyPerformance;
  createdAt: Date;
  updatedAt: Date;
}

export interface StrategyRule {
  id: string;
  type: 'entry' | 'exit' | 'risk';
  conditions: RuleCondition[];
  logic: 'AND' | 'OR';
  action: RuleAction;
}

export interface RuleCondition {
  indicator: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'crosses_above' | 'crosses_below';
  value: number | string;
  timeframe?: string;
}

export interface RuleAction {
  type: 'buy' | 'sell' | 'close' | 'alert';
  quantity?: number | 'percentage';
  percentage?: number;
}

export interface StrategyPerformance {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  totalReturn: number;
}

export interface JournalEntry {
  id: string;
  accountId: string;
  tradeId?: string;
  date: Date;
  mood: 'confident' | 'neutral' | 'anxious' | 'fearful' | 'greedy';
  notes: string;
  tags: string[];
  mistakes?: string;
  lessons?: string;
  screenshots?: string[];
}