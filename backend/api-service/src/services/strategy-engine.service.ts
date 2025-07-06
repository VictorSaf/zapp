import { EventEmitter } from 'events';
import { marketDataService } from './market-data.service';
import { tradingService } from './trading.service';
import { 
  TradingStrategy, 
  Trade, 
  OHLCV, 
  TechnicalIndicator,
  MarketSignal,
  Timeframe,
  TradeType,
  CreateTradeRequest
} from '../types/trading.types';
import logger from '../utils/logger';

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
  type: TradeType;
  profitLoss?: number;
  profitLossPercent?: number;
  holdingPeriod?: number;
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
  action: TradeType;
  symbol: string;
  price: number;
  timestamp: Date;
  confidence: number;
  reason: string;
  indicators: TechnicalIndicator[];
}

export class StrategyEngineService extends EventEmitter {
  private activeStrategies: Map<string, ActiveStrategy> = new Map();
  private backtestCache: Map<string, BacktestResult> = new Map();

  constructor() {
    super();
  }

  /**
   * Evaluate strategy rules against current market data
   */
  async evaluateStrategy(
    strategy: TradingStrategy,
    symbol: string,
    timeframe: Timeframe
  ): Promise<StrategySignal | null> {
    try {
      // Get current market data and indicators
      const indicators = await marketDataService.calculateIndicators(symbol, timeframe);
      const historicalData = await marketDataService.getHistoricalData(symbol, timeframe, 100);
      
      if (!strategy.rules || historicalData.length < 50) {
        return null;
      }

      const rules = strategy.rules as { entry: StrategyRule; exit: StrategyRule };
      
      // Check entry conditions
      if (rules.entry && await this.evaluateRule(rules.entry, indicators, historicalData)) {
        return {
          type: 'entry',
          action: this.determineTradeType(strategy, indicators),
          symbol,
          price: historicalData[historicalData.length - 1].close,
          timestamp: new Date(),
          confidence: this.calculateConfidence(indicators, rules.entry),
          reason: this.generateReason(rules.entry, indicators),
          indicators
        };
      }

      // Check exit conditions
      if (rules.exit && await this.evaluateRule(rules.exit, indicators, historicalData)) {
        return {
          type: 'exit',
          action: TradeType.SELL, // Will be inverted based on position
          symbol,
          price: historicalData[historicalData.length - 1].close,
          timestamp: new Date(),
          confidence: this.calculateConfidence(indicators, rules.exit),
          reason: this.generateReason(rules.exit, indicators),
          indicators
        };
      }

      return null;
    } catch (error) {
      logger.error('Strategy evaluation failed', { strategy: strategy.name, symbol, error });
      return null;
    }
  }

  /**
   * Backtest a strategy on historical data
   */
  async backtestStrategy(
    strategy: TradingStrategy,
    symbol: string,
    timeframe: Timeframe,
    startDate: Date,
    endDate: Date,
    initialBalance: number = 10000
  ): Promise<BacktestResult> {
    const cacheKey = `${strategy.id}-${symbol}-${timeframe}-${startDate.getTime()}-${endDate.getTime()}`;
    
    // Check cache
    if (this.backtestCache.has(cacheKey)) {
      return this.backtestCache.get(cacheKey)!;
    }

    try {
      // Get historical data for the period
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const historicalData = await marketDataService.getHistoricalData(symbol, timeframe, days * 24);
      
      // Filter data to match date range
      const filteredData = historicalData.filter(candle => 
        candle.timestamp >= startDate && candle.timestamp <= endDate
      );

      if (filteredData.length < 50) {
        throw new Error('Insufficient historical data for backtesting');
      }

      // Initialize backtest state
      let balance = initialBalance;
      let position: BacktestTrade | null = null;
      const trades: BacktestTrade[] = [];
      const equityCurve: EquityPoint[] = [];
      let maxEquity = initialBalance;
      let maxDrawdown = 0;

      // Process each candle
      for (let i = 50; i < filteredData.length; i++) {
        const currentCandles = filteredData.slice(0, i + 1);
        const currentCandle = currentCandles[currentCandles.length - 1];
        
        // Calculate indicators for current point
        const indicators = await this.calculateIndicatorsAtPoint(currentCandles);
        
        // Evaluate strategy
        const signal = await this.evaluateStrategyAtPoint(
          strategy,
          indicators,
          currentCandles
        );

        // Process signal
        if (signal) {
          if (signal.type === 'entry' && !position) {
            // Open new position
            const quantity = this.calculatePositionSize(
              balance,
              currentCandle.close,
              strategy.parameters?.riskPerTrade || 0.02
            );

            position = {
              entryDate: currentCandle.timestamp,
              entryPrice: currentCandle.close,
              quantity,
              type: signal.action,
              entryReason: signal.reason
            };
          } else if (signal.type === 'exit' && position) {
            // Close position
            const exitPrice = currentCandle.close;
            const profitLoss = this.calculateProfitLoss(
              position.type,
              position.entryPrice,
              exitPrice,
              position.quantity
            );

            position.exitDate = currentCandle.timestamp;
            position.exitPrice = exitPrice;
            position.profitLoss = profitLoss;
            position.profitLossPercent = (profitLoss / (position.entryPrice * position.quantity)) * 100;
            position.holdingPeriod = Math.ceil(
              (position.exitDate.getTime() - position.entryDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            position.exitReason = signal.reason;

            trades.push(position);
            balance += profitLoss;
            position = null;
          }
        }

        // Update equity curve
        const currentEquity = balance + (position ? 
          this.calculateUnrealizedPnL(position, currentCandle.close) : 0);
        
        if (currentEquity > maxEquity) {
          maxEquity = currentEquity;
        }
        
        const drawdown = maxEquity - currentEquity;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }

        equityCurve.push({
          date: currentCandle.timestamp,
          value: currentEquity,
          drawdown: drawdown,
          trades: trades.length
        });
      }

      // Close any open position at end
      if (position) {
        const lastCandle = filteredData[filteredData.length - 1];
        const profitLoss = this.calculateProfitLoss(
          position.type,
          position.entryPrice,
          lastCandle.close,
          position.quantity
        );

        position.exitDate = lastCandle.timestamp;
        position.exitPrice = lastCandle.close;
        position.profitLoss = profitLoss;
        position.profitLossPercent = (profitLoss / (position.entryPrice * position.quantity)) * 100;
        position.holdingPeriod = Math.ceil(
          (position.exitDate.getTime() - position.entryDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        position.exitReason = 'End of backtest period';

        trades.push(position);
        balance += profitLoss;
      }

      // Calculate metrics
      const metrics = this.calculateBacktestMetrics(trades, equityCurve, initialBalance);

      const result: BacktestResult = {
        strategyId: strategy.id,
        symbol,
        timeframe,
        startDate,
        endDate,
        initialBalance,
        finalBalance: balance,
        totalReturn: balance - initialBalance,
        totalReturnPercent: ((balance - initialBalance) / initialBalance) * 100,
        trades,
        metrics,
        equityCurve
      };

      // Cache result
      this.backtestCache.set(cacheKey, result);

      return result;
    } catch (error) {
      logger.error('Backtest failed', { strategy: strategy.name, symbol, error });
      throw error;
    }
  }

  /**
   * Generate AI-powered strategy suggestions
   */
  async generateStrategySuggestions(
    symbol: string,
    timeframe: Timeframe,
    userPreferences?: {
      riskTolerance: 'low' | 'medium' | 'high';
      tradingStyle: 'scalping' | 'day_trading' | 'swing_trading' | 'position_trading';
      preferredIndicators?: string[];
    }
  ): Promise<TradingStrategy[]> {
    const suggestions: TradingStrategy[] = [];

    // Get market analysis
    const indicators = await marketDataService.calculateIndicators(symbol, timeframe);
    const signals = await marketDataService.getMarketSignals(symbol, timeframe);

    // Base strategies based on current market conditions
    const marketCondition = this.analyzeMarketCondition(indicators);

    // Trend following strategy
    if (marketCondition.trend !== 'neutral') {
      suggestions.push(this.createTrendFollowingStrategy(
        marketCondition,
        userPreferences?.riskTolerance || 'medium'
      ));
    }

    // Mean reversion strategy
    if (marketCondition.volatility > 0.5) {
      suggestions.push(this.createMeanReversionStrategy(
        marketCondition,
        userPreferences?.riskTolerance || 'medium'
      ));
    }

    // Momentum strategy
    if (marketCondition.momentum > 0.6) {
      suggestions.push(this.createMomentumStrategy(
        marketCondition,
        userPreferences?.riskTolerance || 'medium'
      ));
    }

    // Range trading strategy
    if (marketCondition.trend === 'neutral' && marketCondition.volatility < 0.3) {
      suggestions.push(this.createRangeTradingStrategy(
        marketCondition,
        userPreferences?.riskTolerance || 'medium'
      ));
    }

    // Breakout strategy
    if (marketCondition.consolidation) {
      suggestions.push(this.createBreakoutStrategy(
        marketCondition,
        userPreferences?.riskTolerance || 'medium'
      ));
    }

    return suggestions;
  }

  /**
   * Start monitoring a strategy in real-time
   */
  async startStrategyMonitoring(
    strategyId: string,
    accountId: string,
    symbols: string[],
    timeframe: Timeframe,
    autoTrade: boolean = false
  ): Promise<void> {
    const strategy = await tradingService.getStrategy(strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    const activeStrategy: ActiveStrategy = {
      strategy,
      accountId,
      symbols,
      timeframe,
      autoTrade,
      isActive: true,
      startedAt: new Date()
    };

    this.activeStrategies.set(strategyId, activeStrategy);

    // Start monitoring interval
    const intervalMs = this.getIntervalMs(timeframe);
    const monitoringInterval = setInterval(async () => {
      if (!this.activeStrategies.has(strategyId)) {
        clearInterval(monitoringInterval);
        return;
      }

      for (const symbol of symbols) {
        try {
          const signal = await this.evaluateStrategy(strategy, symbol, timeframe);
          
          if (signal) {
            this.emit('strategy:signal', {
              strategyId,
              accountId,
              signal
            });

            if (autoTrade) {
              await this.executeSignal(signal, accountId, strategy);
            }
          }
        } catch (error) {
          logger.error('Strategy monitoring error', { strategyId, symbol, error });
        }
      }
    }, intervalMs);

    logger.info('Strategy monitoring started', { 
      strategyId, 
      symbols, 
      timeframe, 
      autoTrade 
    });
  }

  /**
   * Stop monitoring a strategy
   */
  stopStrategyMonitoring(strategyId: string): void {
    if (this.activeStrategies.has(strategyId)) {
      this.activeStrategies.delete(strategyId);
      logger.info('Strategy monitoring stopped', { strategyId });
    }
  }

  /**
   * Private helper methods
   */
  private async evaluateRule(
    rule: StrategyRule,
    indicators: TechnicalIndicator[],
    historicalData: OHLCV[]
  ): Promise<boolean> {
    const results = await Promise.all(
      rule.conditions.map(condition => 
        this.evaluateCondition(condition, indicators, historicalData)
      )
    );

    if (rule.logic === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  private async evaluateCondition(
    condition: StrategyCondition,
    indicators: TechnicalIndicator[],
    historicalData: OHLCV[]
  ): Promise<boolean> {
    const indicator = indicators.find(i => 
      i.name === condition.indicator && 
      (!condition.period || i.period === condition.period)
    );

    if (!indicator) {
      return false;
    }

    // Handle comparison operators
    switch (condition.operator) {
      case 'gt':
        return indicator.value > (condition.value || 0);
      case 'lt':
        return indicator.value < (condition.value || 0);
      case 'eq':
        return Math.abs(indicator.value - (condition.value || 0)) < 0.0001;
      case 'gte':
        return indicator.value >= (condition.value || 0);
      case 'lte':
        return indicator.value <= (condition.value || 0);
      case 'crosses_above':
      case 'crosses_below':
        if (condition.target) {
          const targetIndicator = indicators.find(i => 
            i.name === condition.target!.indicator &&
            (!condition.target!.period || i.period === condition.target!.period)
          );
          
          if (targetIndicator) {
            // For crossover, we need historical values
            // This is a simplified check
            const currentDiff = indicator.value - targetIndicator.value;
            return condition.operator === 'crosses_above' ? 
              currentDiff > 0 : currentDiff < 0;
          }
        }
        return false;
      default:
        return false;
    }
  }

  private determineTradeType(
    strategy: TradingStrategy,
    indicators: TechnicalIndicator[]
  ): TradeType {
    // Simple logic - can be enhanced based on strategy type
    const trend = indicators.find(i => i.name === 'SMA' && i.period === 50);
    const price = indicators.find(i => i.name === 'PRICE');
    
    if (trend && price) {
      return price.value > trend.value ? TradeType.BUY : TradeType.SELL;
    }
    
    return TradeType.BUY;
  }

  private calculateConfidence(
    indicators: TechnicalIndicator[],
    rule: StrategyRule
  ): number {
    // Base confidence on number of confirming indicators
    let confirmingSignals = 0;
    let totalSignals = rule.conditions.length;

    // Add additional confirmation from other indicators
    const rsi = indicators.find(i => i.name === 'RSI');
    if (rsi) {
      if (rsi.value < 30 || rsi.value > 70) {
        confirmingSignals += 0.5;
        totalSignals += 1;
      }
    }

    const macd = indicators.find(i => i.name === 'MACD');
    if (macd && macd.metadata) {
      if (macd.metadata.histogram > 0) {
        confirmingSignals += 0.5;
        totalSignals += 1;
      }
    }

    return Math.min(0.95, (confirmingSignals + rule.conditions.length) / (totalSignals + rule.conditions.length));
  }

  private generateReason(rule: StrategyRule, indicators: TechnicalIndicator[]): string {
    const reasons: string[] = [];
    
    for (const condition of rule.conditions) {
      const indicator = indicators.find(i => i.name === condition.indicator);
      if (indicator) {
        reasons.push(
          `${indicator.name}(${indicator.period || ''}) ${condition.operator} ${
            condition.value || condition.target?.indicator || ''
          }`
        );
      }
    }

    return reasons.join(rule.logic === 'AND' ? ' and ' : ' or ');
  }

  private calculatePositionSize(
    balance: number,
    price: number,
    riskPerTrade: number
  ): number {
    // Risk-based position sizing
    const riskAmount = balance * riskPerTrade;
    const stopLossPercent = 0.02; // 2% stop loss
    const positionSize = riskAmount / (price * stopLossPercent);
    
    return Math.floor(positionSize);
  }

  private calculateProfitLoss(
    tradeType: TradeType,
    entryPrice: number,
    exitPrice: number,
    quantity: number
  ): number {
    if (tradeType === TradeType.BUY) {
      return (exitPrice - entryPrice) * quantity;
    } else {
      return (entryPrice - exitPrice) * quantity;
    }
  }

  private calculateUnrealizedPnL(
    position: BacktestTrade,
    currentPrice: number
  ): number {
    return this.calculateProfitLoss(
      position.type,
      position.entryPrice,
      currentPrice,
      position.quantity
    );
  }

  private async calculateIndicatorsAtPoint(candles: OHLCV[]): Promise<TechnicalIndicator[]> {
    // Simplified indicator calculation for backtesting
    const closes = candles.map(c => c.close);
    const indicators: TechnicalIndicator[] = [];

    // Add price as indicator
    indicators.push({
      name: 'PRICE',
      period: 0,
      value: closes[closes.length - 1]
    });

    // Calculate moving averages
    if (closes.length >= 20) {
      indicators.push({
        name: 'SMA',
        period: 20,
        value: closes.slice(-20).reduce((a, b) => a + b, 0) / 20
      });
    }

    if (closes.length >= 50) {
      indicators.push({
        name: 'SMA',
        period: 50,
        value: closes.slice(-50).reduce((a, b) => a + b, 0) / 50
      });
    }

    // Add RSI
    if (closes.length >= 14) {
      const rsi = this.calculateRSI(closes.slice(-15));
      indicators.push({
        name: 'RSI',
        period: 14,
        value: rsi
      });
    }

    return indicators;
  }

  private calculateRSI(prices: number[]): number {
    if (prices.length < 2) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < prices.length; i++) {
      const difference = prices[i] - prices[i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }

    if (losses === 0) return 100;

    const avgGain = gains / (prices.length - 1);
    const avgLoss = losses / (prices.length - 1);
    const rs = avgGain / avgLoss;

    return 100 - (100 / (1 + rs));
  }

  private async evaluateStrategyAtPoint(
    strategy: TradingStrategy,
    indicators: TechnicalIndicator[],
    historicalData: OHLCV[]
  ): Promise<StrategySignal | null> {
    if (!strategy.rules) return null;

    const rules = strategy.rules as { entry: StrategyRule; exit: StrategyRule };
    
    // Check entry conditions
    if (rules.entry && await this.evaluateRule(rules.entry, indicators, historicalData)) {
      return {
        type: 'entry',
        action: TradeType.BUY, // Simplified for backtesting
        symbol: '',
        price: historicalData[historicalData.length - 1].close,
        timestamp: historicalData[historicalData.length - 1].timestamp,
        confidence: 0.8,
        reason: 'Entry conditions met',
        indicators
      };
    }

    // Check exit conditions
    if (rules.exit && await this.evaluateRule(rules.exit, indicators, historicalData)) {
      return {
        type: 'exit',
        action: TradeType.SELL,
        symbol: '',
        price: historicalData[historicalData.length - 1].close,
        timestamp: historicalData[historicalData.length - 1].timestamp,
        confidence: 0.8,
        reason: 'Exit conditions met',
        indicators
      };
    }

    return null;
  }

  private calculateBacktestMetrics(
    trades: BacktestTrade[],
    equityCurve: EquityPoint[],
    initialBalance: number
  ): BacktestMetrics {
    const completedTrades = trades.filter(t => t.exitDate);
    const winningTrades = completedTrades.filter(t => (t.profitLoss || 0) > 0);
    const losingTrades = completedTrades.filter(t => (t.profitLoss || 0) < 0);

    const totalPnL = completedTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const avgWin = winningTrades.length > 0 ?
      winningTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ?
      losingTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0) / losingTrades.length : 0;

    const winRate = completedTrades.length > 0 ? 
      (winningTrades.length / completedTrades.length) * 100 : 0;

    const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let peak = initialBalance;

    for (const point of equityCurve) {
      if (point.value > peak) {
        peak = point.value;
      }
      const drawdown = peak - point.value;
      const drawdownPercent = (drawdown / peak) * 100;
      
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    }

    // Calculate Sharpe ratio (simplified)
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const dailyReturn = (equityCurve[i].value - equityCurve[i - 1].value) / equityCurve[i - 1].value;
      returns.push(dailyReturn);
    }

    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev !== 0 ? (avgReturn * 252) / (stdDev * Math.sqrt(252)) : 0;

    // Calculate consecutive wins/losses
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;

    for (const trade of completedTrades) {
      if ((trade.profitLoss || 0) > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
      }
    }

    // Calculate average holding period
    const holdingPeriods = completedTrades
      .filter(t => t.holdingPeriod)
      .map(t => t.holdingPeriod!);
    const avgHoldingPeriod = holdingPeriods.length > 0 ?
      holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length : 0;

    // Calculate expectancy
    const expectancy = completedTrades.length > 0 ?
      totalPnL / completedTrades.length : 0;

    return {
      totalTrades: completedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      maxDrawdown,
      maxDrawdownPercent,
      sharpeRatio,
      sortinoRatio: sharpeRatio * 0.8, // Simplified
      calmarRatio: maxDrawdown !== 0 ? (totalPnL / maxDrawdown) : 0,
      avgHoldingPeriod,
      expectancy,
      consecutiveWins: maxWinStreak,
      consecutiveLosses: maxLossStreak
    };
  }

  private analyzeMarketCondition(indicators: TechnicalIndicator[]): MarketCondition {
    const sma20 = indicators.find(i => i.name === 'SMA' && i.period === 20);
    const sma50 = indicators.find(i => i.name === 'SMA' && i.period === 50);
    const rsi = indicators.find(i => i.name === 'RSI');
    const bb = indicators.find(i => i.name === 'BB');

    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let volatility = 0.5;
    let momentum = 0.5;
    let consolidation = false;

    // Determine trend
    if (sma20 && sma50) {
      if (sma20.value > sma50.value * 1.01) {
        trend = 'bullish';
      } else if (sma20.value < sma50.value * 0.99) {
        trend = 'bearish';
      }
    }

    // Determine volatility
    if (bb && bb.metadata) {
      const bandWidth = (bb.metadata.upper - bb.metadata.lower) / bb.value;
      volatility = Math.min(1, bandWidth * 10);
    }

    // Determine momentum
    if (rsi) {
      momentum = rsi.value / 100;
    }

    // Check for consolidation
    if (volatility < 0.3 && Math.abs(momentum - 0.5) < 0.2) {
      consolidation = true;
    }

    return { trend, volatility, momentum, consolidation };
  }

  private createTrendFollowingStrategy(
    condition: MarketCondition,
    riskTolerance: string
  ): TradingStrategy {
    const stopLoss = riskTolerance === 'low' ? 1 : riskTolerance === 'medium' ? 2 : 3;
    const takeProfit = stopLoss * 2;

    return {
      id: `trend-${Date.now()}`,
      userId: 'ai-generated',
      name: `${condition.trend === 'bullish' ? 'Bullish' : 'Bearish'} Trend Following`,
      description: `AI-generated trend following strategy for ${condition.trend} market conditions`,
      strategyType: 'trend_following',
      rules: {
        entry: {
          type: 'entry',
          conditions: [
            {
              indicator: 'SMA',
              period: 20,
              operator: condition.trend === 'bullish' ? 'crosses_above' : 'crosses_below',
              target: { indicator: 'SMA', period: 50 }
            },
            {
              indicator: 'RSI',
              period: 14,
              operator: condition.trend === 'bullish' ? 'gt' : 'lt',
              value: condition.trend === 'bullish' ? 30 : 70
            }
          ],
          logic: 'AND'
        },
        exit: {
          type: 'exit',
          conditions: [
            {
              indicator: 'SMA',
              period: 20,
              operator: condition.trend === 'bullish' ? 'crosses_below' : 'crosses_above',
              target: { indicator: 'SMA', period: 50 }
            }
          ],
          logic: 'OR'
        },
        riskManagement: {
          stopLoss: { type: 'percentage', value: stopLoss },
          takeProfit: { type: 'percentage', value: takeProfit },
          positionSize: { type: 'fixed_percentage', value: 5 }
        }
      },
      parameters: {
        fastMA: 20,
        slowMA: 50,
        rsiPeriod: 14,
        timeframe: 'H1'
      },
      isActive: true,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private createMeanReversionStrategy(
    condition: MarketCondition,
    riskTolerance: string
  ): TradingStrategy {
    const bbStdDev = riskTolerance === 'low' ? 2.5 : riskTolerance === 'medium' ? 2 : 1.5;

    return {
      id: `meanrev-${Date.now()}`,
      userId: 'ai-generated',
      name: 'Mean Reversion Strategy',
      description: 'AI-generated mean reversion strategy for high volatility conditions',
      strategyType: 'mean_reversion',
      rules: {
        entry: {
          type: 'entry',
          conditions: [
            {
              indicator: 'BB',
              period: 20,
              operator: 'lt',
              value: -bbStdDev // Price below lower band
            },
            {
              indicator: 'RSI',
              period: 14,
              operator: 'lt',
              value: 30
            }
          ],
          logic: 'AND'
        },
        exit: {
          type: 'exit',
          conditions: [
            {
              indicator: 'BB',
              period: 20,
              operator: 'gt',
              value: 0 // Price above middle band
            }
          ],
          logic: 'OR'
        },
        riskManagement: {
          stopLoss: { type: 'percentage', value: 1.5 },
          takeProfit: { type: 'percentage', value: 2 },
          positionSize: { type: 'volatility_adjusted', value: 0.02 }
        }
      },
      parameters: {
        bbPeriod: 20,
        bbStdDev,
        rsiPeriod: 14,
        timeframe: 'M15'
      },
      isActive: true,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private createMomentumStrategy(
    condition: MarketCondition,
    riskTolerance: string
  ): TradingStrategy {
    return {
      id: `momentum-${Date.now()}`,
      userId: 'ai-generated',
      name: 'Momentum Breakout Strategy',
      description: 'AI-generated momentum strategy for strong trending markets',
      strategyType: 'momentum',
      rules: {
        entry: {
          type: 'entry',
          conditions: [
            {
              indicator: 'RSI',
              period: 14,
              operator: 'gt',
              value: 60
            },
            {
              indicator: 'MACD',
              period: 0,
              operator: 'crosses_above',
              target: { indicator: 'MACD_SIGNAL' }
            }
          ],
          logic: 'AND'
        },
        exit: {
          type: 'exit',
          conditions: [
            {
              indicator: 'RSI',
              period: 14,
              operator: 'lt',
              value: 40
            },
            {
              indicator: 'MACD',
              period: 0,
              operator: 'crosses_below',
              target: { indicator: 'MACD_SIGNAL' }
            }
          ],
          logic: 'OR'
        },
        riskManagement: {
          stopLoss: { type: 'atr', value: 2 },
          takeProfit: { type: 'atr', value: 4 },
          positionSize: { type: 'kelly_criterion', value: 0.25 }
        }
      },
      parameters: {
        rsiPeriod: 14,
        macdFast: 12,
        macdSlow: 26,
        macdSignal: 9,
        timeframe: 'H1'
      },
      isActive: true,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private createRangeTradingStrategy(
    condition: MarketCondition,
    riskTolerance: string
  ): TradingStrategy {
    return {
      id: `range-${Date.now()}`,
      userId: 'ai-generated',
      name: 'Range Trading Strategy',
      description: 'AI-generated range trading strategy for sideways markets',
      strategyType: 'range_trading',
      rules: {
        entry: {
          type: 'entry',
          conditions: [
            {
              indicator: 'RSI',
              period: 14,
              operator: 'lt',
              value: 30
            },
            {
              indicator: 'BB',
              period: 20,
              operator: 'lt',
              value: -2
            }
          ],
          logic: 'OR'
        },
        exit: {
          type: 'exit',
          conditions: [
            {
              indicator: 'RSI',
              period: 14,
              operator: 'gt',
              value: 70
            },
            {
              indicator: 'BB',
              period: 20,
              operator: 'gt',
              value: 2
            }
          ],
          logic: 'OR'
        },
        riskManagement: {
          stopLoss: { type: 'percentage', value: 1 },
          takeProfit: { type: 'percentage', value: 1.5 },
          positionSize: { type: 'fixed_percentage', value: 3 }
        }
      },
      parameters: {
        rsiPeriod: 14,
        bbPeriod: 20,
        bbStdDev: 2,
        timeframe: 'M30'
      },
      isActive: true,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private createBreakoutStrategy(
    condition: MarketCondition,
    riskTolerance: string
  ): TradingStrategy {
    return {
      id: `breakout-${Date.now()}`,
      userId: 'ai-generated',
      name: 'Volatility Breakout Strategy',
      description: 'AI-generated breakout strategy for consolidation patterns',
      strategyType: 'breakout',
      rules: {
        entry: {
          type: 'entry',
          conditions: [
            {
              indicator: 'BB',
              period: 20,
              operator: 'gt',
              value: 2
            },
            {
              indicator: 'VOLUME',
              period: 0,
              operator: 'gt',
              value: 1.5 // 150% of average volume
            }
          ],
          logic: 'AND'
        },
        exit: {
          type: 'exit',
          conditions: [
            {
              indicator: 'BB',
              period: 20,
              operator: 'lt',
              value: 0
            }
          ],
          logic: 'OR'
        },
        riskManagement: {
          stopLoss: { type: 'volatility', value: 1.5 },
          takeProfit: { type: 'volatility', value: 3 },
          positionSize: { type: 'volatility_adjusted', value: 0.02 }
        }
      },
      parameters: {
        bbPeriod: 20,
        bbStdDev: 2,
        volumeMultiplier: 1.5,
        timeframe: 'H1'
      },
      isActive: true,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async executeSignal(
    signal: StrategySignal,
    accountId: string,
    strategy: TradingStrategy
  ): Promise<void> {
    try {
      // Get current open positions for this symbol
      const openTrades = await tradingService.getAccountTrades(accountId, 'open');
      const symbolTrades = openTrades.filter(t => {
        // Need to match symbol with instrument
        return true; // Simplified
      });

      if (signal.type === 'entry' && symbolTrades.length === 0) {
        // Create new trade
        const account = await tradingService.getAccount(accountId, strategy.userId);
        if (!account) return;

        const riskAmount = account.currentBalance * 0.02; // 2% risk
        const quantity = Math.floor(riskAmount / signal.price);

        const tradeRequest: CreateTradeRequest = {
          accountId,
          instrumentId: '1', // Need to map symbol to instrument
          tradeType: signal.action,
          entryPrice: signal.price,
          quantity,
          notes: `Auto-trade by strategy: ${strategy.name}`
        };

        await tradingService.createTrade(tradeRequest);
        
        logger.info('Auto-trade executed', {
          strategyId: strategy.id,
          signal: signal.type,
          price: signal.price
        });
      } else if (signal.type === 'exit' && symbolTrades.length > 0) {
        // Close existing trades
        for (const trade of symbolTrades) {
          await tradingService.updateTrade(trade.id, accountId, {
            exitPrice: signal.price,
            status: 'closed'
          });
        }
        
        logger.info('Auto-trade closed', {
          strategyId: strategy.id,
          trades: symbolTrades.length,
          price: signal.price
        });
      }
    } catch (error) {
      logger.error('Auto-trade execution failed', {
        strategyId: strategy.id,
        signal,
        error
      });
    }
  }

  private getIntervalMs(timeframe: Timeframe): number {
    const intervals: Record<Timeframe, number> = {
      [Timeframe.M1]: 60000,
      [Timeframe.M5]: 300000,
      [Timeframe.M15]: 900000,
      [Timeframe.M30]: 1800000,
      [Timeframe.H1]: 3600000,
      [Timeframe.H4]: 14400000,
      [Timeframe.D1]: 86400000,
      [Timeframe.W1]: 604800000,
      [Timeframe.MN]: 2592000000
    };
    return intervals[timeframe] || 60000;
  }
}

// Interfaces
interface ActiveStrategy {
  strategy: TradingStrategy;
  accountId: string;
  symbols: string[];
  timeframe: Timeframe;
  autoTrade: boolean;
  isActive: boolean;
  startedAt: Date;
}

interface MarketCondition {
  trend: 'bullish' | 'bearish' | 'neutral';
  volatility: number; // 0-1
  momentum: number; // 0-1
  consolidation: boolean;
}

// Create singleton instance
export const strategyEngineService = new StrategyEngineService();