import { EventEmitter } from 'events';
import { tradingService } from './trading.service';
import { marketDataService } from './market-data.service';
import { pool } from '../config/database';
import logger from '../utils/logger';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { format, startOfDay, endOfDay, subDays, subMonths, subYears } from 'date-fns';

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
  byInstrument: Map<string, InstrumentStats>;
  byStrategy: Map<string, StrategyStats>;
  byTimeOfDay: Map<number, TimeStats>;
  byDayOfWeek: Map<number, DayStats>;
  byMonth: Map<string, MonthStats>;
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
  pnl: number;
  winRate: number;
}

export interface DurationStats {
  lessThan1Hour: { trades: number; winRate: number; avgPnL: number };
  oneToFourHours: { trades: number; winRate: number; avgPnL: number };
  fourToOneDay: { trades: number; winRate: number; avgPnL: number };
  oneTothreeDays: { trades: number; winRate: number; avgPnL: number };
  moreThanThreeDays: { trades: number; winRate: number; avgPnL: number };
}

export interface SizeStats {
  small: { trades: number; winRate: number; avgPnL: number };
  medium: { trades: number; winRate: number; avgPnL: number };
  large: { trades: number; winRate: number; avgPnL: number };
}

export interface RiskMetrics {
  valueAtRisk95: number;
  valueAtRisk99: number;
  conditionalVaR: number;
  expectedShortfall: number;
  downsideDeviation: number;
  upsideDeviation: number;
  omega: number;
  kappa: number;
  gainLossRatio: number;
  ulcerIndex: number;
  painIndex: number;
  recoveryTime: number;
  concentrationRisk: Map<string, number>;
  correlationMatrix: Map<string, Map<string, number>>;
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
  upCapture: number;
  downCapture: number;
}

export class PortfolioAnalyticsService extends EventEmitter {
  private performanceCache: Map<string, PerformanceTimeSeries[]> = new Map();
  private metricsCache: Map<string, PortfolioMetrics> = new Map();
  private benchmarkData: Map<string, number[]> = new Map();

  constructor() {
    super();
    this.initializeBenchmarks();
  }

  private async initializeBenchmarks() {
    // Initialize with some default benchmark data
    // In production, this would fetch from market data providers
    this.benchmarkData.set('SPX', []); // S&P 500
    this.benchmarkData.set('DXY', []); // US Dollar Index
    this.benchmarkData.set('GLD', []); // Gold
  }

  /**
   * Get comprehensive portfolio metrics
   */
  async getPortfolioMetrics(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PortfolioMetrics> {
    const cacheKey = `metrics:${accountId}:${startDate?.getTime()}:${endDate?.getTime()}`;
    
    // Check cache
    if (this.metricsCache.has(cacheKey)) {
      return this.metricsCache.get(cacheKey)!;
    }

    const client = await pool.connect();
    try {
      // Get account info
      const accountResult = await client.query(
        'SELECT * FROM trading_accounts WHERE id = $1',
        [accountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Account not found');
      }

      const account = accountResult.rows[0];
      const currentBalance = parseFloat(account.current_balance);
      const initialBalance = parseFloat(account.initial_balance);

      // Get all trades
      let tradesQuery = `
        SELECT * FROM trades 
        WHERE account_id = $1 
        AND status = 'closed'
      `;
      const queryParams: any[] = [accountId];

      if (startDate) {
        tradesQuery += ' AND close_time >= $2';
        queryParams.push(startDate);
      }
      if (endDate) {
        tradesQuery += ` AND close_time <= $${queryParams.length + 1}`;
        queryParams.push(endDate);
      }

      tradesQuery += ' ORDER BY close_time';

      const tradesResult = await client.query(tradesQuery, queryParams);
      const trades = tradesResult.rows;

      // Calculate basic metrics
      const totalPnL = currentBalance - initialBalance;
      const totalPnLPercent = (totalPnL / initialBalance) * 100;

      // Get time-based PnL
      const now = new Date();
      const todayPnL = await this.getPeriodPnL(accountId, startOfDay(now), now);
      const weekPnL = await this.getPeriodPnL(accountId, subDays(now, 7), now);
      const monthPnL = await this.getPeriodPnL(accountId, subMonths(now, 1), now);
      const yearPnL = await this.getPeriodPnL(accountId, subYears(now, 1), now);

      // Calculate win/loss statistics
      const winningTrades = trades.filter(t => parseFloat(t.profit_loss) > 0);
      const losingTrades = trades.filter(t => parseFloat(t.profit_loss) < 0);
      const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
      
      const avgWin = winningTrades.length > 0 
        ? winningTrades.reduce((sum, t) => sum + parseFloat(t.profit_loss), 0) / winningTrades.length 
        : 0;
      
      const avgLoss = losingTrades.length > 0
        ? losingTrades.reduce((sum, t) => sum + parseFloat(t.profit_loss), 0) / losingTrades.length
        : 0;

      const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

      // Calculate risk metrics
      const dailyReturns = await this.getDailyReturns(accountId);
      const { sharpeRatio, sortinoRatio, calmarRatio } = this.calculateRatios(dailyReturns, totalPnL);
      const { maxDrawdown, maxDrawdownPercent, currentDrawdown, currentDrawdownPercent } = 
        await this.calculateDrawdowns(accountId);

      // Calculate volatility and other metrics
      const volatility = this.calculateVolatility(dailyReturns);
      const { beta, alpha, rSquared } = await this.calculateMarketMetrics(accountId, dailyReturns);

      // Get best/worst days
      const sortedReturns = [...dailyReturns].sort((a, b) => b - a);
      const bestDay = sortedReturns[0] || 0;
      const worstDay = sortedReturns[sortedReturns.length - 1] || 0;
      const avgDailyReturn = dailyReturns.length > 0
        ? dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length
        : 0;

      // Calculate unrealized PnL from open positions
      const unrealizedPnL = await this.getUnrealizedPnL(accountId);
      const realizedPnL = totalPnL - unrealizedPnL;

      const metrics: PortfolioMetrics = {
        totalValue: currentBalance,
        totalPnL,
        totalPnLPercent,
        dailyPnL: todayPnL.pnl,
        dailyPnLPercent: todayPnL.percent,
        weeklyPnL: weekPnL.pnl,
        weeklyPnLPercent: weekPnL.percent,
        monthlyPnL: monthPnL.pnl,
        monthlyPnLPercent: monthPnL.percent,
        yearlyPnL: yearPnL.pnl,
        yearlyPnLPercent: yearPnL.percent,
        unrealizedPnL,
        realizedPnL,
        winRate,
        avgWin,
        avgLoss,
        profitFactor,
        sharpeRatio,
        sortinoRatio,
        calmarRatio,
        maxDrawdown,
        maxDrawdownPercent,
        currentDrawdown,
        currentDrawdownPercent,
        bestDay,
        worstDay,
        avgDailyReturn,
        volatility,
        beta,
        alpha,
        rSquared,
        informationRatio: 0, // TODO: Calculate
        treynorRatio: beta !== 0 ? (totalPnLPercent - 2) / beta : 0 // Risk-free rate assumed 2%
      };

      // Cache the results
      this.metricsCache.set(cacheKey, metrics);

      return metrics;
    } finally {
      client.release();
    }
  }

  /**
   * Get performance time series data
   */
  async getPerformanceTimeSeries(
    accountId: string,
    period: 'day' | 'week' | 'month' | 'year' | 'all' = 'month'
  ): Promise<PerformanceTimeSeries[]> {
    const cacheKey = `timeseries:${accountId}:${period}`;
    
    // Check cache
    if (this.performanceCache.has(cacheKey)) {
      return this.performanceCache.get(cacheKey)!;
    }

    const client = await pool.connect();
    try {
      let startDate: Date;
      const endDate = new Date();

      switch (period) {
        case 'day':
          startDate = subDays(endDate, 1);
          break;
        case 'week':
          startDate = subDays(endDate, 7);
          break;
        case 'month':
          startDate = subMonths(endDate, 1);
          break;
        case 'year':
          startDate = subYears(endDate, 1);
          break;
        default:
          // Get account creation date for 'all'
          const accountResult = await client.query(
            'SELECT created_at FROM trading_accounts WHERE id = $1',
            [accountId]
          );
          startDate = accountResult.rows[0]?.created_at || subYears(endDate, 1);
      }

      // Get daily performance data
      const result = await client.query(
        `SELECT 
          date,
          ending_balance as value,
          daily_pnl as pnl,
          daily_return as pnl_percent,
          total_trades as trades
        FROM portfolio_performance
        WHERE account_id = $1 AND date >= $2 AND date <= $3
        ORDER BY date`,
        [accountId, startDate, endDate]
      );

      // Calculate drawdowns
      let peak = 0;
      const timeSeries: PerformanceTimeSeries[] = result.rows.map(row => {
        const value = parseFloat(row.value);
        if (value > peak) {
          peak = value;
        }
        const drawdown = peak - value;
        const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

        return {
          date: row.date,
          value,
          pnl: parseFloat(row.pnl),
          pnlPercent: parseFloat(row.pnl_percent),
          drawdown,
          drawdownPercent,
          trades: parseInt(row.trades),
          volume: 0 // TODO: Calculate volume
        };
      });

      // Cache the results
      this.performanceCache.set(cacheKey, timeSeries);

      return timeSeries;
    } finally {
      client.release();
    }
  }

  /**
   * Get detailed trade analytics
   */
  async getTradeAnalytics(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TradeAnalytics> {
    const client = await pool.connect();
    try {
      // Get all trades with instrument info
      let query = `
        SELECT 
          t.*,
          ti.symbol,
          ti.instrument_type,
          ts.name as strategy_name
        FROM trades t
        JOIN trading_instruments ti ON t.instrument_id = ti.id
        LEFT JOIN trading_strategies ts ON t.strategy_id = ts.id
        WHERE t.account_id = $1 AND t.status = 'closed'
      `;
      const queryParams: any[] = [accountId];

      if (startDate) {
        query += ' AND t.close_time >= $2';
        queryParams.push(startDate);
      }
      if (endDate) {
        query += ` AND t.close_time <= $${queryParams.length + 1}`;
        queryParams.push(endDate);
      }

      const result = await client.query(query, queryParams);
      const trades = result.rows;

      // Analyze by instrument
      const byInstrument = new Map<string, InstrumentStats>();
      
      trades.forEach(trade => {
        const symbol = trade.symbol;
        if (!byInstrument.has(symbol)) {
          byInstrument.set(symbol, {
            symbol,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalPnL: 0,
            avgPnL: 0,
            winRate: 0,
            profitFactor: 0,
            avgHoldingPeriod: 0
          });
        }

        const stats = byInstrument.get(symbol)!;
        stats.totalTrades++;
        const pnl = parseFloat(trade.profit_loss);
        stats.totalPnL += pnl;
        
        if (pnl > 0) {
          stats.winningTrades++;
        } else if (pnl < 0) {
          stats.losingTrades++;
        }

        // Calculate holding period in hours
        if (trade.close_time && trade.open_time) {
          const holdingPeriod = (new Date(trade.close_time).getTime() - 
                                new Date(trade.open_time).getTime()) / (1000 * 60 * 60);
          stats.avgHoldingPeriod += holdingPeriod;
        }
      });

      // Finalize instrument stats
      byInstrument.forEach(stats => {
        stats.avgPnL = stats.totalTrades > 0 ? stats.totalPnL / stats.totalTrades : 0;
        stats.winRate = stats.totalTrades > 0 ? (stats.winningTrades / stats.totalTrades) * 100 : 0;
        stats.avgHoldingPeriod = stats.totalTrades > 0 ? stats.avgHoldingPeriod / stats.totalTrades : 0;
        
        // Calculate profit factor
        const wins = trades
          .filter(t => t.symbol === stats.symbol && parseFloat(t.profit_loss) > 0)
          .reduce((sum, t) => sum + parseFloat(t.profit_loss), 0);
        const losses = Math.abs(trades
          .filter(t => t.symbol === stats.symbol && parseFloat(t.profit_loss) < 0)
          .reduce((sum, t) => sum + parseFloat(t.profit_loss), 0));
        
        stats.profitFactor = losses > 0 ? wins / losses : wins > 0 ? Infinity : 0;
      });

      // Analyze by strategy
      const byStrategy = new Map<string, StrategyStats>();
      
      trades.filter(t => t.strategy_id).forEach(trade => {
        const strategyId = trade.strategy_id;
        if (!byStrategy.has(strategyId)) {
          byStrategy.set(strategyId, {
            strategyId,
            strategyName: trade.strategy_name || 'Unknown',
            totalTrades: 0,
            winRate: 0,
            totalPnL: 0,
            sharpeRatio: 0,
            maxDrawdown: 0
          });
        }

        const stats = byStrategy.get(strategyId)!;
        stats.totalTrades++;
        stats.totalPnL += parseFloat(trade.profit_loss);
      });

      // Analyze by time of day
      const byTimeOfDay = new Map<number, TimeStats>();
      for (let hour = 0; hour < 24; hour++) {
        byTimeOfDay.set(hour, { hour, trades: 0, winRate: 0, avgPnL: 0 });
      }

      trades.forEach(trade => {
        const hour = new Date(trade.open_time).getHours();
        const stats = byTimeOfDay.get(hour)!;
        stats.trades++;
        stats.avgPnL += parseFloat(trade.profit_loss);
      });

      // Finalize time stats
      byTimeOfDay.forEach(stats => {
        if (stats.trades > 0) {
          stats.avgPnL = stats.avgPnL / stats.trades;
          const wins = trades.filter(t => 
            new Date(t.open_time).getHours() === stats.hour && 
            parseFloat(t.profit_loss) > 0
          ).length;
          stats.winRate = (wins / stats.trades) * 100;
        }
      });

      // Analyze by day of week
      const byDayOfWeek = new Map<number, DayStats>();
      for (let day = 0; day < 7; day++) {
        byDayOfWeek.set(day, { dayOfWeek: day, trades: 0, winRate: 0, avgPnL: 0 });
      }

      trades.forEach(trade => {
        const day = new Date(trade.open_time).getDay();
        const stats = byDayOfWeek.get(day)!;
        stats.trades++;
        stats.avgPnL += parseFloat(trade.profit_loss);
      });

      // Finalize day stats
      byDayOfWeek.forEach(stats => {
        if (stats.trades > 0) {
          stats.avgPnL = stats.avgPnL / stats.trades;
          const wins = trades.filter(t => 
            new Date(t.open_time).getDay() === stats.dayOfWeek && 
            parseFloat(t.profit_loss) > 0
          ).length;
          stats.winRate = (wins / stats.trades) * 100;
        }
      });

      // Analyze by month
      const byMonth = new Map<string, MonthStats>();
      
      trades.forEach(trade => {
        const monthKey = format(new Date(trade.close_time), 'yyyy-MM');
        if (!byMonth.has(monthKey)) {
          byMonth.set(monthKey, {
            month: monthKey,
            trades: 0,
            pnl: 0,
            winRate: 0
          });
        }
        
        const stats = byMonth.get(monthKey)!;
        stats.trades++;
        stats.pnl += parseFloat(trade.profit_loss);
      });

      // Calculate duration stats
      const byDuration: DurationStats = {
        lessThan1Hour: { trades: 0, winRate: 0, avgPnL: 0 },
        oneToFourHours: { trades: 0, winRate: 0, avgPnL: 0 },
        fourToOneDay: { trades: 0, winRate: 0, avgPnL: 0 },
        oneTothreeDays: { trades: 0, winRate: 0, avgPnL: 0 },
        moreThanThreeDays: { trades: 0, winRate: 0, avgPnL: 0 }
      };

      trades.forEach(trade => {
        if (!trade.close_time || !trade.open_time) return;
        
        const duration = (new Date(trade.close_time).getTime() - 
                         new Date(trade.open_time).getTime()) / (1000 * 60 * 60); // hours
        
        let category: keyof DurationStats;
        if (duration < 1) category = 'lessThan1Hour';
        else if (duration < 4) category = 'oneToFourHours';
        else if (duration < 24) category = 'fourToOneDay';
        else if (duration < 72) category = 'oneTothreeDays';
        else category = 'moreThanThreeDays';

        byDuration[category].trades++;
        byDuration[category].avgPnL += parseFloat(trade.profit_loss);
      });

      // Finalize duration stats
      Object.keys(byDuration).forEach(key => {
        const stats = byDuration[key as keyof DurationStats];
        if (stats.trades > 0) {
          stats.avgPnL = stats.avgPnL / stats.trades;
          const wins = trades.filter(t => {
            if (!t.close_time || !t.open_time) return false;
            const duration = (new Date(t.close_time).getTime() - 
                            new Date(t.open_time).getTime()) / (1000 * 60 * 60);
            
            let inCategory = false;
            switch (key) {
              case 'lessThan1Hour': inCategory = duration < 1; break;
              case 'oneToFourHours': inCategory = duration >= 1 && duration < 4; break;
              case 'fourToOneDay': inCategory = duration >= 4 && duration < 24; break;
              case 'oneTothreeDays': inCategory = duration >= 24 && duration < 72; break;
              case 'moreThanThreeDays': inCategory = duration >= 72; break;
            }
            
            return inCategory && parseFloat(t.profit_loss) > 0;
          }).length;
          stats.winRate = (wins / stats.trades) * 100;
        }
      });

      // Calculate size stats
      const tradeSizes = trades.map(t => parseFloat(t.quantity) * parseFloat(t.entry_price));
      tradeSizes.sort((a, b) => a - b);
      
      const smallThreshold = tradeSizes[Math.floor(tradeSizes.length * 0.33)] || 0;
      const largeThreshold = tradeSizes[Math.floor(tradeSizes.length * 0.67)] || 0;

      const bySize: SizeStats = {
        small: { trades: 0, winRate: 0, avgPnL: 0 },
        medium: { trades: 0, winRate: 0, avgPnL: 0 },
        large: { trades: 0, winRate: 0, avgPnL: 0 }
      };

      trades.forEach(trade => {
        const size = parseFloat(trade.quantity) * parseFloat(trade.entry_price);
        let category: keyof SizeStats;
        
        if (size <= smallThreshold) category = 'small';
        else if (size <= largeThreshold) category = 'medium';
        else category = 'large';

        bySize[category].trades++;
        bySize[category].avgPnL += parseFloat(trade.profit_loss);
      });

      // Finalize size stats
      Object.keys(bySize).forEach(key => {
        const stats = bySize[key as keyof SizeStats];
        if (stats.trades > 0) {
          stats.avgPnL = stats.avgPnL / stats.trades;
          const wins = trades.filter(t => {
            const size = parseFloat(t.quantity) * parseFloat(t.entry_price);
            let inCategory = false;
            
            switch (key) {
              case 'small': inCategory = size <= smallThreshold; break;
              case 'medium': inCategory = size > smallThreshold && size <= largeThreshold; break;
              case 'large': inCategory = size > largeThreshold; break;
            }
            
            return inCategory && parseFloat(t.profit_loss) > 0;
          }).length;
          stats.winRate = (wins / stats.trades) * 100;
        }
      });

      return {
        byInstrument,
        byStrategy,
        byTimeOfDay,
        byDayOfWeek,
        byMonth,
        byDuration,
        bySize
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get risk metrics
   */
  async getRiskMetrics(accountId: string): Promise<RiskMetrics> {
    const dailyReturns = await this.getDailyReturns(accountId);
    
    // Sort returns for VaR calculation
    const sortedReturns = [...dailyReturns].sort((a, b) => a - b);
    const n = sortedReturns.length;

    // Value at Risk (95% and 99%)
    const var95Index = Math.floor(n * 0.05);
    const var99Index = Math.floor(n * 0.01);
    const valueAtRisk95 = sortedReturns[var95Index] || 0;
    const valueAtRisk99 = sortedReturns[var99Index] || 0;

    // Conditional VaR (Expected Shortfall)
    const conditionalVaR = var95Index > 0 
      ? sortedReturns.slice(0, var95Index).reduce((sum, r) => sum + r, 0) / var95Index
      : 0;
    const expectedShortfall = conditionalVaR;

    // Downside and Upside Deviation
    const negativeReturns = dailyReturns.filter(r => r < 0);
    const positiveReturns = dailyReturns.filter(r => r > 0);
    
    const downsideDeviation = this.calculateStandardDeviation(negativeReturns);
    const upsideDeviation = this.calculateStandardDeviation(positiveReturns);

    // Omega Ratio
    const threshold = 0; // Minimum acceptable return
    const gainsAboveThreshold = dailyReturns
      .filter(r => r > threshold)
      .reduce((sum, r) => sum + (r - threshold), 0);
    const lossesBelowThreshold = Math.abs(dailyReturns
      .filter(r => r < threshold)
      .reduce((sum, r) => sum + (r - threshold), 0));
    const omega = lossesBelowThreshold > 0 ? gainsAboveThreshold / lossesBelowThreshold : Infinity;

    // Kappa (similar to Sortino but with higher moment)
    const kappa = downsideDeviation > 0 
      ? (dailyReturns.reduce((sum, r) => sum + r, 0) / n) / Math.pow(downsideDeviation, 3)
      : 0;

    // Gain/Loss Ratio
    const gains = positiveReturns.reduce((sum, r) => sum + r, 0);
    const losses = Math.abs(negativeReturns.reduce((sum, r) => sum + r, 0));
    const gainLossRatio = losses > 0 ? gains / losses : gains > 0 ? Infinity : 0;

    // Ulcer Index (measure of downside volatility)
    const ulcerIndex = await this.calculateUlcerIndex(accountId);

    // Pain Index
    const painIndex = await this.calculatePainIndex(accountId);

    // Recovery Time
    const recoveryTime = await this.calculateRecoveryTime(accountId);

    // Concentration Risk
    const concentrationRisk = await this.calculateConcentrationRisk(accountId);

    // Correlation Matrix
    const correlationMatrix = await this.calculateCorrelationMatrix(accountId);

    return {
      valueAtRisk95,
      valueAtRisk99,
      conditionalVaR,
      expectedShortfall,
      downsideDeviation,
      upsideDeviation,
      omega,
      kappa,
      gainLossRatio,
      ulcerIndex,
      painIndex,
      recoveryTime,
      concentrationRisk,
      correlationMatrix
    };
  }

  /**
   * Compare portfolio performance with benchmarks
   */
  async compareBenchmarks(
    accountId: string,
    benchmarks: string[] = ['SPX', 'DXY']
  ): Promise<BenchmarkComparison[]> {
    const portfolioReturns = await this.getDailyReturns(accountId);
    const comparisons: BenchmarkComparison[] = [];

    for (const benchmark of benchmarks) {
      // Get benchmark returns (mock data for now)
      const benchmarkReturns = await this.getBenchmarkReturns(benchmark, portfolioReturns.length);
      
      if (benchmarkReturns.length === 0) continue;

      // Calculate metrics
      const portfolioReturn = portfolioReturns.reduce((sum, r) => sum + r, 0);
      const benchmarkReturn = benchmarkReturns.reduce((sum, r) => sum + r, 0);
      
      // Calculate beta
      const { beta, alpha, correlation } = this.calculateBetaAlpha(portfolioReturns, benchmarkReturns);
      
      // Tracking Error
      const trackingError = this.calculateTrackingError(portfolioReturns, benchmarkReturns);
      
      // Information Ratio
      const excessReturns = portfolioReturns.map((r, i) => r - benchmarkReturns[i]);
      const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
      const informationRatio = trackingError > 0 ? avgExcessReturn / trackingError : 0;
      
      // Up/Down Capture
      const { upCapture, downCapture } = this.calculateCapture(portfolioReturns, benchmarkReturns);

      comparisons.push({
        benchmark,
        portfolioReturn,
        benchmarkReturn,
        alpha,
        beta,
        correlation,
        trackingError,
        informationRatio,
        upCapture,
        downCapture
      });
    }

    return comparisons;
  }

  /**
   * Generate portfolio report
   */
  async generateReport(
    accountId: string,
    format: 'pdf' | 'excel',
    options: {
      includeMetrics?: boolean;
      includeCharts?: boolean;
      includeTradeList?: boolean;
      includeBenchmarks?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<Buffer> {
    const {
      includeMetrics = true,
      includeCharts = true,
      includeTradeList = true,
      includeBenchmarks = true,
      startDate,
      endDate
    } = options;

    if (format === 'pdf') {
      return this.generatePDFReport(accountId, {
        includeMetrics,
        includeCharts,
        includeTradeList,
        includeBenchmarks,
        startDate,
        endDate
      });
    } else {
      return this.generateExcelReport(accountId, {
        includeMetrics,
        includeTradeList,
        includeBenchmarks,
        startDate,
        endDate
      });
    }
  }

  /**
   * Private helper methods
   */
  private async getPeriodPnL(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ pnl: number; percent: number }> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          SUM(daily_pnl) as total_pnl,
          AVG(daily_return) as avg_return
        FROM portfolio_performance
        WHERE account_id = $1 AND date >= $2 AND date <= $3`,
        [accountId, startDate, endDate]
      );

      return {
        pnl: parseFloat(result.rows[0]?.total_pnl || 0),
        percent: parseFloat(result.rows[0]?.avg_return || 0) * 
                 Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      };
    } finally {
      client.release();
    }
  }

  private async getDailyReturns(accountId: string): Promise<number[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT daily_return 
        FROM portfolio_performance 
        WHERE account_id = $1 
        ORDER BY date`,
        [accountId]
      );

      return result.rows.map(row => parseFloat(row.daily_return));
    } finally {
      client.release();
    }
  }

  private async getUnrealizedPnL(accountId: string): Promise<number> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT SUM(unrealized_pnl) as total 
        FROM positions 
        WHERE account_id = $1 AND is_open = true`,
        [accountId]
      );

      return parseFloat(result.rows[0]?.total || 0);
    } finally {
      client.release();
    }
  }

  private calculateRatios(
    returns: number[],
    totalPnL: number
  ): { sharpeRatio: number; sortinoRatio: number; calmarRatio: number } {
    if (returns.length === 0) {
      return { sharpeRatio: 0, sortinoRatio: 0, calmarRatio: 0 };
    }

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = this.calculateStandardDeviation(returns);
    const riskFreeRate = 0.02 / 252; // 2% annual, daily

    // Sharpe Ratio
    const sharpeRatio = stdDev > 0 
      ? (avgReturn - riskFreeRate) * Math.sqrt(252) / (stdDev * Math.sqrt(252))
      : 0;

    // Sortino Ratio (only downside deviation)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideDeviation = this.calculateStandardDeviation(downsideReturns);
    const sortinoRatio = downsideDeviation > 0
      ? (avgReturn - riskFreeRate) * Math.sqrt(252) / (downsideDeviation * Math.sqrt(252))
      : 0;

    // Calmar Ratio (return / max drawdown)
    // Using totalPnL as proxy for now
    const calmarRatio = 0; // Will be calculated in drawdown function

    return { sharpeRatio, sortinoRatio, calmarRatio };
  }

  private async calculateDrawdowns(accountId: string): Promise<{
    maxDrawdown: number;
    maxDrawdownPercent: number;
    currentDrawdown: number;
    currentDrawdownPercent: number;
  }> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT date, ending_balance 
        FROM portfolio_performance 
        WHERE account_id = $1 
        ORDER BY date`,
        [accountId]
      );

      if (result.rows.length === 0) {
        return {
          maxDrawdown: 0,
          maxDrawdownPercent: 0,
          currentDrawdown: 0,
          currentDrawdownPercent: 0
        };
      }

      let peak = 0;
      let maxDrawdown = 0;
      let maxDrawdownPercent = 0;
      
      result.rows.forEach(row => {
        const balance = parseFloat(row.ending_balance);
        if (balance > peak) {
          peak = balance;
        }
        const drawdown = peak - balance;
        const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
        
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
          maxDrawdownPercent = drawdownPercent;
        }
      });

      const currentBalance = parseFloat(result.rows[result.rows.length - 1].ending_balance);
      const currentDrawdown = peak - currentBalance;
      const currentDrawdownPercent = peak > 0 ? (currentDrawdown / peak) * 100 : 0;

      return {
        maxDrawdown,
        maxDrawdownPercent,
        currentDrawdown,
        currentDrawdownPercent
      };
    } finally {
      client.release();
    }
  }

  private calculateVolatility(returns: number[]): number {
    return this.calculateStandardDeviation(returns) * Math.sqrt(252); // Annualized
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private async calculateMarketMetrics(
    accountId: string,
    portfolioReturns: number[]
  ): Promise<{ beta: number; alpha: number; rSquared: number }> {
    // Get market returns (using SPX as proxy)
    const marketReturns = await this.getBenchmarkReturns('SPX', portfolioReturns.length);
    
    if (marketReturns.length === 0) {
      return { beta: 0, alpha: 0, rSquared: 0 };
    }

    return this.calculateBetaAlpha(portfolioReturns, marketReturns);
  }

  private calculateBetaAlpha(
    portfolioReturns: number[],
    marketReturns: number[]
  ): { beta: number; alpha: number; correlation: number } {
    if (portfolioReturns.length !== marketReturns.length || portfolioReturns.length === 0) {
      return { beta: 0, alpha: 0, correlation: 0 };
    }

    const n = portfolioReturns.length;
    
    // Calculate means
    const portfolioMean = portfolioReturns.reduce((sum, r) => sum + r, 0) / n;
    const marketMean = marketReturns.reduce((sum, r) => sum + r, 0) / n;

    // Calculate covariance
    let covariance = 0;
    for (let i = 0; i < n; i++) {
      covariance += (portfolioReturns[i] - portfolioMean) * (marketReturns[i] - marketMean);
    }
    covariance /= n;

    // Calculate market variance
    const marketVariance = marketReturns
      .reduce((sum, r) => sum + Math.pow(r - marketMean, 2), 0) / n;

    // Calculate beta
    const beta = marketVariance > 0 ? covariance / marketVariance : 0;

    // Calculate alpha (Jensen's alpha)
    const riskFreeRate = 0.02 / 252; // 2% annual, daily
    const alpha = portfolioMean - (riskFreeRate + beta * (marketMean - riskFreeRate));

    // Calculate correlation
    const portfolioStdDev = this.calculateStandardDeviation(portfolioReturns);
    const marketStdDev = this.calculateStandardDeviation(marketReturns);
    const correlation = (portfolioStdDev > 0 && marketStdDev > 0)
      ? covariance / (portfolioStdDev * marketStdDev)
      : 0;

    return { beta, alpha: alpha * 252, correlation }; // Annualize alpha
  }

  private async getBenchmarkReturns(benchmark: string, length: number): Promise<number[]> {
    // In production, this would fetch actual benchmark data
    // For now, return mock data
    const returns: number[] = [];
    for (let i = 0; i < length; i++) {
      // Generate realistic daily returns
      returns.push((Math.random() - 0.5) * 0.02); // ±1% daily
    }
    return returns;
  }

  private calculateTrackingError(
    portfolioReturns: number[],
    benchmarkReturns: number[]
  ): number {
    if (portfolioReturns.length !== benchmarkReturns.length) return 0;
    
    const excessReturns = portfolioReturns.map((r, i) => r - benchmarkReturns[i]);
    return this.calculateStandardDeviation(excessReturns) * Math.sqrt(252); // Annualized
  }

  private calculateCapture(
    portfolioReturns: number[],
    benchmarkReturns: number[]
  ): { upCapture: number; downCapture: number } {
    if (portfolioReturns.length !== benchmarkReturns.length) {
      return { upCapture: 0, downCapture: 0 };
    }

    let upPortfolio = 0, upBenchmark = 0;
    let downPortfolio = 0, downBenchmark = 0;

    for (let i = 0; i < benchmarkReturns.length; i++) {
      if (benchmarkReturns[i] > 0) {
        upPortfolio += portfolioReturns[i];
        upBenchmark += benchmarkReturns[i];
      } else if (benchmarkReturns[i] < 0) {
        downPortfolio += portfolioReturns[i];
        downBenchmark += benchmarkReturns[i];
      }
    }

    const upCapture = upBenchmark !== 0 ? (upPortfolio / upBenchmark) * 100 : 0;
    const downCapture = downBenchmark !== 0 ? (downPortfolio / downBenchmark) * 100 : 0;

    return { upCapture, downCapture };
  }

  private async calculateUlcerIndex(accountId: string): Promise<number> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT date, ending_balance 
        FROM portfolio_performance 
        WHERE account_id = $1 
        ORDER BY date DESC 
        LIMIT 90`, // Last 90 days
        [accountId]
      );

      if (result.rows.length === 0) return 0;

      let peak = 0;
      let sumSquaredDrawdowns = 0;

      result.rows.reverse().forEach(row => {
        const balance = parseFloat(row.ending_balance);
        if (balance > peak) {
          peak = balance;
        }
        const drawdownPercent = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
        sumSquaredDrawdowns += Math.pow(drawdownPercent, 2);
      });

      return Math.sqrt(sumSquaredDrawdowns / result.rows.length);
    } finally {
      client.release();
    }
  }

  private async calculatePainIndex(accountId: string): Promise<number> {
    // Similar to Ulcer Index but uses simple average instead of RMS
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT date, ending_balance 
        FROM portfolio_performance 
        WHERE account_id = $1 
        ORDER BY date DESC 
        LIMIT 90`,
        [accountId]
      );

      if (result.rows.length === 0) return 0;

      let peak = 0;
      let sumDrawdowns = 0;

      result.rows.reverse().forEach(row => {
        const balance = parseFloat(row.ending_balance);
        if (balance > peak) {
          peak = balance;
        }
        const drawdownPercent = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
        sumDrawdowns += drawdownPercent;
      });

      return sumDrawdowns / result.rows.length;
    } finally {
      client.release();
    }
  }

  private async calculateRecoveryTime(accountId: string): Promise<number> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT date, ending_balance 
        FROM portfolio_performance 
        WHERE account_id = $1 
        ORDER BY date`,
        [accountId]
      );

      if (result.rows.length === 0) return 0;

      let peak = 0;
      let peakDate: Date | null = null;
      let totalRecoveryDays = 0;
      let drawdownCount = 0;

      result.rows.forEach(row => {
        const balance = parseFloat(row.ending_balance);
        const date = new Date(row.date);

        if (balance > peak) {
          if (peakDate && peak > 0) {
            // Recovered from drawdown
            const recoveryDays = Math.floor((date.getTime() - peakDate.getTime()) / (1000 * 60 * 60 * 24));
            totalRecoveryDays += recoveryDays;
            drawdownCount++;
          }
          peak = balance;
          peakDate = date;
        }
      });

      return drawdownCount > 0 ? totalRecoveryDays / drawdownCount : 0;
    } finally {
      client.release();
    }
  }

  private async calculateConcentrationRisk(accountId: string): Promise<Map<string, number>> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          ti.symbol,
          SUM(ABS(p.total_quantity * p.average_price)) as exposure
        FROM positions p
        JOIN trading_instruments ti ON p.instrument_id = ti.id
        WHERE p.account_id = $1 AND p.is_open = true
        GROUP BY ti.symbol`,
        [accountId]
      );

      const totalExposure = result.rows.reduce((sum, row) => sum + parseFloat(row.exposure), 0);
      const concentrationRisk = new Map<string, number>();

      result.rows.forEach(row => {
        const percentage = totalExposure > 0 ? (parseFloat(row.exposure) / totalExposure) * 100 : 0;
        concentrationRisk.set(row.symbol, percentage);
      });

      return concentrationRisk;
    } finally {
      client.release();
    }
  }

  private async calculateCorrelationMatrix(accountId: string): Promise<Map<string, Map<string, number>>> {
    // Calculate correlation between different instruments in portfolio
    // This is a simplified version
    const matrix = new Map<string, Map<string, number>>();
    
    // In production, this would calculate actual correlations
    // For now, return empty matrix
    return matrix;
  }

  private async generatePDFReport(
    accountId: string,
    options: any
  ): Promise<Buffer> {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));

    // Get data for report
    const metrics = await this.getPortfolioMetrics(accountId, options.startDate, options.endDate);
    const timeSeries = await this.getPerformanceTimeSeries(accountId, 'month');
    const analytics = await this.getTradeAnalytics(accountId, options.startDate, options.endDate);

    // Title Page
    doc.fontSize(24).text('Portfolio Performance Report', { align: 'center' });
    doc.fontSize(14).text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Executive Summary
    if (options.includeMetrics) {
      doc.fontSize(18).text('Executive Summary');
      doc.fontSize(12);
      doc.text(`Total Portfolio Value: $${metrics.totalValue.toFixed(2)}`);
      doc.text(`Total Return: ${metrics.totalPnLPercent.toFixed(2)}% ($${metrics.totalPnL.toFixed(2)})`);
      doc.text(`Win Rate: ${metrics.winRate.toFixed(2)}%`);
      doc.text(`Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}`);
      doc.text(`Max Drawdown: ${metrics.maxDrawdownPercent.toFixed(2)}%`);
      doc.moveDown();
    }

    // Performance Metrics
    if (options.includeMetrics) {
      doc.addPage();
      doc.fontSize(18).text('Performance Metrics');
      doc.fontSize(10);
      
      // Add detailed metrics table
      const metricsData = [
        ['Metric', 'Value'],
        ['Daily P&L', `$${metrics.dailyPnL.toFixed(2)} (${metrics.dailyPnLPercent.toFixed(2)}%)`],
        ['Weekly P&L', `$${metrics.weeklyPnL.toFixed(2)} (${metrics.weeklyPnLPercent.toFixed(2)}%)`],
        ['Monthly P&L', `$${metrics.monthlyPnL.toFixed(2)} (${metrics.monthlyPnLPercent.toFixed(2)}%)`],
        ['Average Win', `$${metrics.avgWin.toFixed(2)}`],
        ['Average Loss', `$${Math.abs(metrics.avgLoss).toFixed(2)}`],
        ['Profit Factor', metrics.profitFactor.toFixed(2)],
        ['Sortino Ratio', metrics.sortinoRatio.toFixed(2)],
        ['Volatility', `${metrics.volatility.toFixed(2)}%`]
      ];

      // Simple table rendering
      let y = doc.y;
      metricsData.forEach((row, i) => {
        doc.text(row[0], 50, y);
        doc.text(row[1], 300, y);
        y += 20;
        if (i === 0) {
          doc.moveTo(50, y - 15).lineTo(450, y - 15).stroke();
        }
      });
    }

    // Trade Analytics
    if (options.includeTradeList) {
      doc.addPage();
      doc.fontSize(18).text('Trade Analytics');
      doc.fontSize(10);
      doc.moveDown();

      // By Instrument
      doc.fontSize(14).text('Performance by Instrument');
      doc.fontSize(10);
      analytics.byInstrument.forEach((stats, symbol) => {
        doc.text(`${symbol}: ${stats.totalTrades} trades, Win Rate: ${stats.winRate.toFixed(1)}%, Total P&L: $${stats.totalPnL.toFixed(2)}`);
      });
      doc.moveDown();

      // By Time
      doc.fontSize(14).text('Performance by Time of Day');
      doc.fontSize(10);
      const bestHour = Array.from(analytics.byTimeOfDay.entries())
        .sort((a, b) => b[1].avgPnL - a[1].avgPnL)[0];
      if (bestHour) {
        doc.text(`Best Hour: ${bestHour[0]}:00 - ${bestHour[0] + 1}:00 (Avg P&L: $${bestHour[1].avgPnL.toFixed(2)})`);
      }
    }

    // Benchmark Comparison
    if (options.includeBenchmarks) {
      const benchmarks = await this.compareBenchmarks(accountId, ['SPX']);
      if (benchmarks.length > 0) {
        doc.addPage();
        doc.fontSize(18).text('Benchmark Comparison');
        doc.fontSize(10);
        
        benchmarks.forEach(bench => {
          doc.text(`vs ${bench.benchmark}:`);
          doc.text(`  Portfolio Return: ${bench.portfolioReturn.toFixed(2)}%`);
          doc.text(`  Benchmark Return: ${bench.benchmarkReturn.toFixed(2)}%`);
          doc.text(`  Alpha: ${bench.alpha.toFixed(2)}%`);
          doc.text(`  Beta: ${bench.beta.toFixed(2)}`);
          doc.text(`  Information Ratio: ${bench.informationRatio.toFixed(2)}`);
          doc.moveDown();
        });
      }
    }

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
    });
  }

  private async generateExcelReport(
    accountId: string,
    options: any
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Get data
    const metrics = await this.getPortfolioMetrics(accountId, options.startDate, options.endDate);
    const timeSeries = await this.getPerformanceTimeSeries(accountId, 'all');
    const analytics = await this.getTradeAnalytics(accountId, options.startDate, options.endDate);

    // Summary Sheet
    if (options.includeMetrics) {
      const summarySheet = workbook.addWorksheet('Summary');
      
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 20 }
      ];

      summarySheet.addRows([
        { metric: 'Total Portfolio Value', value: `$${metrics.totalValue.toFixed(2)}` },
        { metric: 'Total Return', value: `${metrics.totalPnLPercent.toFixed(2)}%` },
        { metric: 'Total P&L', value: `$${metrics.totalPnL.toFixed(2)}` },
        { metric: 'Win Rate', value: `${metrics.winRate.toFixed(2)}%` },
        { metric: 'Sharpe Ratio', value: metrics.sharpeRatio.toFixed(2) },
        { metric: 'Max Drawdown', value: `${metrics.maxDrawdownPercent.toFixed(2)}%` },
        { metric: 'Profit Factor', value: metrics.profitFactor.toFixed(2) },
        { metric: 'Average Win', value: `$${metrics.avgWin.toFixed(2)}` },
        { metric: 'Average Loss', value: `$${Math.abs(metrics.avgLoss).toFixed(2)}` }
      ]);

      // Style header
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    }

    // Performance Time Series
    const performanceSheet = workbook.addWorksheet('Performance');
    
    performanceSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Portfolio Value', key: 'value', width: 15 },
      { header: 'Daily P&L', key: 'pnl', width: 15 },
      { header: 'Daily Return %', key: 'pnlPercent', width: 15 },
      { header: 'Drawdown %', key: 'drawdownPercent', width: 15 }
    ];

    timeSeries.forEach(point => {
      performanceSheet.addRow({
        date: format(point.date, 'yyyy-MM-dd'),
        value: point.value.toFixed(2),
        pnl: point.pnl.toFixed(2),
        pnlPercent: point.pnlPercent.toFixed(2),
        drawdownPercent: point.drawdownPercent.toFixed(2)
      });
    });

    // Trade List
    if (options.includeTradeList) {
      const tradesSheet = workbook.addWorksheet('Trades');
      
      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT 
            t.*,
            ti.symbol
          FROM trades t
          JOIN trading_instruments ti ON t.instrument_id = ti.id
          WHERE t.account_id = $1 AND t.status = 'closed'
          ORDER BY t.close_time DESC`,
          [accountId]
        );

        tradesSheet.columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Symbol', key: 'symbol', width: 10 },
          { header: 'Type', key: 'type', width: 10 },
          { header: 'Entry Price', key: 'entryPrice', width: 12 },
          { header: 'Exit Price', key: 'exitPrice', width: 12 },
          { header: 'Quantity', key: 'quantity', width: 12 },
          { header: 'P&L', key: 'pnl', width: 12 },
          { header: 'P&L %', key: 'pnlPercent', width: 10 }
        ];

        result.rows.forEach(trade => {
          const pnlPercent = parseFloat(trade.entry_price) > 0
            ? (parseFloat(trade.profit_loss) / (parseFloat(trade.entry_price) * parseFloat(trade.quantity))) * 100
            : 0;

          tradesSheet.addRow({
            date: format(new Date(trade.close_time), 'yyyy-MM-dd'),
            symbol: trade.symbol,
            type: trade.trade_type,
            entryPrice: parseFloat(trade.entry_price).toFixed(5),
            exitPrice: parseFloat(trade.exit_price).toFixed(5),
            quantity: parseFloat(trade.quantity),
            pnl: parseFloat(trade.profit_loss).toFixed(2),
            pnlPercent: pnlPercent.toFixed(2)
          });
        });
      } finally {
        client.release();
      }
    }

    // Instrument Analytics
    const instrumentSheet = workbook.addWorksheet('By Instrument');
    
    instrumentSheet.columns = [
      { header: 'Symbol', key: 'symbol', width: 15 },
      { header: 'Total Trades', key: 'trades', width: 12 },
      { header: 'Win Rate %', key: 'winRate', width: 12 },
      { header: 'Total P&L', key: 'pnl', width: 15 },
      { header: 'Avg P&L', key: 'avgPnl', width: 12 },
      { header: 'Profit Factor', key: 'profitFactor', width: 12 }
    ];

    analytics.byInstrument.forEach((stats, symbol) => {
      instrumentSheet.addRow({
        symbol,
        trades: stats.totalTrades,
        winRate: stats.winRate.toFixed(2),
        pnl: stats.totalPnL.toFixed(2),
        avgPnl: stats.avgPnL.toFixed(2),
        profitFactor: stats.profitFactor.toFixed(2)
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.performanceCache.clear();
    this.metricsCache.clear();
    logger.info('Portfolio analytics cache cleared');
  }
}

// Create singleton instance
export const portfolioAnalyticsService = new PortfolioAnalyticsService();