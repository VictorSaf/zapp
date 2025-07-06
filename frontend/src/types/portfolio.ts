export interface PortfolioMetrics {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  weeklyPnL: number;
  weeklyPnLPercent: number;
  monthlyPnL: number;
  monthlyPnLPercent: number;
  yearlyPnL: number;
  yearlyPnLPercent: number;
  unrealizedPnL: number;
  realizedPnL: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  currentDrawdown: number;
  currentDrawdownPercent: number;
  bestDay: number;
  worstDay: number;
  avgDailyReturn: number;
  volatility: number;
  beta: number;
  alpha: number;
  rSquared: number;
  informationRatio: number;
  treynorRatio: number;
  omega: number;
}

export interface PerformanceTimeSeries {
  date: Date;
  value: number;
  pnl: number;
  pnlPercent: number;
  drawdown: number;
  drawdownPercent: number;
  trades: number;
  volume: number;
}

export interface TradeAnalytics {
  byInstrument: Record<string, InstrumentStats>;
  byStrategy: Record<string, StrategyStats>;
  byTimeOfDay: Record<number, TimeStats>;
  byDayOfWeek: Record<number, DayStats>;
  byMonth: Record<string, MonthStats>;
  byDuration: DurationStats;
  bySize: SizeStats;
}

export interface InstrumentStats {
  symbol: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  avgPnL: number;
  winRate: number;
  profitFactor: number;
  avgHoldingPeriod: number;
}

export interface StrategyStats {
  strategyId: string;
  strategyName: string;
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface TimeStats {
  hour: number;
  trades: number;
  winRate: number;
  avgPnL: number;
}

export interface DayStats {
  dayOfWeek: number;
  trades: number;
  winRate: number;
  avgPnL: number;
}

export interface MonthStats {
  month: string;
  trades: number;
  winRate: number;
  totalPnL: number;
  avgPnL: number;
}

export interface DurationStats {
  short: {
    trades: number;
    winRate: number;
    avgPnL: number;
  };
  medium: {
    trades: number;
    winRate: number;
    avgPnL: number;
  };
  long: {
    trades: number;
    winRate: number;
    avgPnL: number;
  };
}

export interface SizeStats {
  small: {
    trades: number;
    winRate: number;
    avgPnL: number;
  };
  medium: {
    trades: number;
    winRate: number;
    avgPnL: number;
  };
  large: {
    trades: number;
    winRate: number;
    avgPnL: number;
  };
}

export interface RiskMetrics {
  valueAtRisk95: number;
  valueAtRisk99: number;
  expectedShortfall: number;
  downsideDeviation: number;
  ulcerIndex: number;
  recoveryTime: number;
  concentrationRisk: Record<string, number>;
  correlationMatrix: Record<string, Record<string, number>>;
  omega: number;
}

export interface BenchmarkComparison {
  benchmark: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  alpha: number;
  beta: number;
  correlation: number;
  trackingError: number;
  informationRatio: number;
}

export interface ReportOptions {
  includeMetrics?: boolean;
  includeCharts?: boolean;
  includeTradeList?: boolean;
  includeBenchmarks?: boolean;
  startDate?: Date;
  endDate?: Date;
}