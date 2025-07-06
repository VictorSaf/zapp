// Trading types for ZAEUS platform

export enum InstrumentType {
  FOREX = 'forex',
  STOCK = 'stock',
  INDEX = 'index',
  COMMODITY = 'commodity',
  CRYPTO = 'crypto'
}

export enum AccountType {
  DEMO = 'demo',
  LIVE = 'live',
  PAPER = 'paper'
}

export enum TradeType {
  BUY = 'buy',
  SELL = 'sell'
}

export enum TradeStatus {
  PENDING = 'pending',
  OPEN = 'open',
  CLOSED = 'closed',
  CANCELLED = 'cancelled'
}

export enum PositionType {
  LONG = 'long',
  SHORT = 'short'
}

export enum Timeframe {
  M1 = 'M1',
  M5 = 'M5',
  M15 = 'M15',
  M30 = 'M30',
  H1 = 'H1',
  H4 = 'H4',
  D1 = 'D1',
  W1 = 'W1',
  MN = 'MN'
}

export enum JournalMood {
  CONFIDENT = 'confident',
  UNCERTAIN = 'uncertain',
  FEARFUL = 'fearful',
  GREEDY = 'greedy',
  NEUTRAL = 'neutral'
}

export interface TradingInstrument {
  id: string;
  symbol: string;
  name: string;
  instrumentType: InstrumentType;
  baseCurrency?: string;
  quoteCurrency?: string;
  exchange?: string;
  pipSize: number;
  contractSize: number;
  marginRequirement: number;
  tradingHours?: any;
  metadata?: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradingAccount {
  id: string;
  userId: string;
  accountName: string;
  accountType: AccountType;
  broker?: string;
  currency: string;
  initialBalance: number;
  currentBalance: number;
  leverage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Trade {
  id: string;
  accountId: string;
  instrumentId: string;
  tradeType: TradeType;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  commission: number;
  swap: number;
  profitLoss?: number;
  profitLossPips?: number;
  status: TradeStatus;
  openTime: Date;
  closeTime?: Date;
  strategyId?: string;
  notes?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Position {
  id: string;
  accountId: string;
  instrumentId: string;
  positionType: PositionType;
  totalQuantity: number;
  averagePrice: number;
  currentPrice?: number;
  unrealizedPnl?: number;
  realizedPnl?: number;
  isOpen: boolean;
  openedAt: Date;
  closedAt?: Date;
  updatedAt: Date;
}

export interface TradingStrategy {
  id: string;
  userId: string;
  name: string;
  description?: string;
  strategyType: string;
  rules: any;
  parameters?: any;
  backtestResults?: any;
  isActive: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioPerformance {
  id: string;
  accountId: string;
  date: Date;
  startingBalance: number;
  endingBalance: number;
  dailyPnl: number;
  dailyReturn?: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  winRate?: number;
  avgWin?: number;
  avgLoss?: number;
  profitFactor?: number;
  metadata?: any;
  createdAt: Date;
}

export interface TradingJournal {
  id: string;
  userId: string;
  tradeId?: string;
  entryDate: Date;
  title?: string;
  content: string;
  mood?: JournalMood;
  tags?: string[];
  attachments?: any;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketAnalysis {
  id: string;
  instrumentId: string;
  timeframe: string;
  analysisType: string;
  indicators: any;
  signals?: any;
  timestamp: Date;
  createdAt: Date;
}

export interface RiskManagementRule {
  id: string;
  userId: string;
  accountId?: string;
  ruleName: string;
  ruleType: string;
  parameters: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response DTOs
export interface CreateTradeRequest {
  accountId: string;
  instrumentId: string;
  tradeType: TradeType;
  entryPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  notes?: string;
}

export interface UpdateTradeRequest {
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  notes?: string;
  status?: TradeStatus;
}

export interface CreateAccountRequest {
  accountName: string;
  accountType: AccountType;
  broker?: string;
  currency?: string;
  initialBalance: number;
  leverage?: number;
}

export interface CreateStrategyRequest {
  name: string;
  description?: string;
  strategyType: string;
  rules: any;
  parameters?: any;
  isPublic?: boolean;
}

export interface CreateJournalEntryRequest {
  tradeId?: string;
  entryDate?: Date;
  title?: string;
  content: string;
  mood?: JournalMood;
  tags?: string[];
}

export interface PortfolioSummary {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  todayPnl: number;
  todayPnlPercent: number;
  openPositions: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface TradeSummary {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
}

// Technical Analysis Types
export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicator {
  name: string;
  period: number;
  value: number;
  signal?: string;
  metadata?: any;
}

export interface MarketSignal {
  type: 'buy' | 'sell' | 'neutral';
  strength: 'strong' | 'medium' | 'weak';
  indicator: string;
  reason: string;
  confidence: number;
}

// Risk Management Types
export interface RiskMetrics {
  valueAtRisk: number;
  maxPositionSize: number;
  currentExposure: number;
  marginUsed: number;
  marginAvailable: number;
  riskScore: number;
  recommendations: string[];
}