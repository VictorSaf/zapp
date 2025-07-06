import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { pool } from '../config/database';
import { OHLCV, TechnicalIndicator, MarketSignal, Timeframe } from '../types/trading.types';
import logger from '../utils/logger';
import Redis from 'ioredis';

// Market data provider interfaces
interface MarketDataProvider {
  name: string;
  fetchQuote(symbol: string): Promise<QuoteData>;
  fetchHistoricalData(symbol: string, interval: string, limit: number): Promise<OHLCV[]>;
  supportedSymbols: string[];
}

interface QuoteData {
  symbol: string;
  bid: number;
  ask: number;
  price: number;
  volume: number;
  timestamp: Date;
}

interface CandleData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Technical indicators calculation
class TechnicalAnalysis {
  static calculateSMA(values: number[], period: number): number {
    if (values.length < period) return 0;
    const sum = values.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  static calculateEMA(values: number[], period: number): number {
    if (values.length === 0) return 0;
    
    const k = 2 / (period + 1);
    let ema = values[0];
    
    for (let i = 1; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    
    return ema;
  }

  static calculateRSI(values: number[], period: number = 14): number {
    if (values.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const difference = values[i] - values[i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }

    if (losses === 0) return 100;

    const relativeStrength = gains / losses;
    return 100 - (100 / (1 + relativeStrength));
  }

  static calculateMACD(values: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(values, 12);
    const ema26 = this.calculateEMA(values, 26);
    const macd = ema12 - ema26;
    
    // For simplicity, using current MACD as signal
    const signal = macd * 0.9;
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  static calculateBollingerBands(values: number[], period: number = 20, stdDev: number = 2): {
    upper: number;
    middle: number;
    lower: number;
  } {
    const sma = this.calculateSMA(values, period);
    
    if (values.length < period) {
      return { upper: sma, middle: sma, lower: sma };
    }

    const squaredDifferences = values.slice(-period).map(value => Math.pow(value - sma, 2));
    const variance = squaredDifferences.reduce((a, b) => a + b, 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  static generateSignals(indicators: TechnicalIndicator[]): MarketSignal[] {
    const signals: MarketSignal[] = [];

    // RSI signals
    const rsi = indicators.find(i => i.name === 'RSI');
    if (rsi) {
      if (rsi.value < 30) {
        signals.push({
          type: 'buy',
          strength: 'strong',
          indicator: 'RSI',
          reason: 'Oversold condition (RSI < 30)',
          confidence: 0.8
        });
      } else if (rsi.value > 70) {
        signals.push({
          type: 'sell',
          strength: 'strong',
          indicator: 'RSI',
          reason: 'Overbought condition (RSI > 70)',
          confidence: 0.8
        });
      }
    }

    // MACD signals
    const macd = indicators.find(i => i.name === 'MACD');
    if (macd && macd.metadata) {
      if (macd.metadata.histogram > 0 && macd.metadata.prevHistogram < 0) {
        signals.push({
          type: 'buy',
          strength: 'medium',
          indicator: 'MACD',
          reason: 'MACD bullish crossover',
          confidence: 0.7
        });
      } else if (macd.metadata.histogram < 0 && macd.metadata.prevHistogram > 0) {
        signals.push({
          type: 'sell',
          strength: 'medium',
          indicator: 'MACD',
          reason: 'MACD bearish crossover',
          confidence: 0.7
        });
      }
    }

    // Moving Average signals
    const sma20 = indicators.find(i => i.name === 'SMA' && i.period === 20);
    const sma50 = indicators.find(i => i.name === 'SMA' && i.period === 50);
    if (sma20 && sma50) {
      if (sma20.value > sma50.value) {
        signals.push({
          type: 'buy',
          strength: 'weak',
          indicator: 'MA',
          reason: 'Golden cross (SMA20 > SMA50)',
          confidence: 0.6
        });
      } else {
        signals.push({
          type: 'sell',
          strength: 'weak',
          indicator: 'MA',
          reason: 'Death cross (SMA20 < SMA50)',
          confidence: 0.6
        });
      }
    }

    return signals;
  }
}

// Alpha Vantage provider
class AlphaVantageProvider implements MarketDataProvider {
  name = 'AlphaVantage';
  private apiKey: string;
  private client: AxiosInstance;
  supportedSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://www.alphavantage.co/query',
      timeout: 10000
    });
  }

  async fetchQuote(symbol: string): Promise<QuoteData> {
    try {
      const response = await this.client.get('', {
        params: {
          function: 'CURRENCY_EXCHANGE_RATE',
          from_currency: symbol.slice(0, 3),
          to_currency: symbol.slice(3, 6),
          apikey: this.apiKey
        }
      });

      const data = response.data['Realtime Currency Exchange Rate'];
      if (!data) {
        throw new Error('Invalid response from Alpha Vantage');
      }

      const price = parseFloat(data['5. Exchange Rate']);
      return {
        symbol,
        bid: price - 0.0001, // Mock spread
        ask: price + 0.0001,
        price,
        volume: 0, // Alpha Vantage doesn't provide volume for forex
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Alpha Vantage quote fetch failed', { symbol, error });
      throw error;
    }
  }

  async fetchHistoricalData(symbol: string, interval: string, limit: number): Promise<OHLCV[]> {
    try {
      const response = await this.client.get('', {
        params: {
          function: 'FX_INTRADAY',
          from_symbol: symbol.slice(0, 3),
          to_symbol: symbol.slice(3, 6),
          interval,
          apikey: this.apiKey
        }
      });

      const timeSeries = response.data[`Time Series FX (${interval})`];
      if (!timeSeries) {
        throw new Error('Invalid historical data response');
      }

      const ohlcv: OHLCV[] = Object.entries(timeSeries)
        .slice(0, limit)
        .map(([timestamp, values]: [string, any]) => ({
          timestamp: new Date(timestamp),
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: 0 // Alpha Vantage doesn't provide volume for forex
        }))
        .reverse();

      return ohlcv;
    } catch (error) {
      logger.error('Alpha Vantage historical data fetch failed', { symbol, error });
      throw error;
    }
  }
}

// Mock provider for development/testing
class MockMarketDataProvider implements MarketDataProvider {
  name = 'MockProvider';
  supportedSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'SPX500'];

  async fetchQuote(symbol: string): Promise<QuoteData> {
    const basePrice = this.getBasePrice(symbol);
    const randomChange = (Math.random() - 0.5) * 0.001;
    const price = basePrice + randomChange;

    return {
      symbol,
      bid: price - 0.0001,
      ask: price + 0.0001,
      price,
      volume: Math.floor(Math.random() * 1000000),
      timestamp: new Date()
    };
  }

  async fetchHistoricalData(symbol: string, interval: string, limit: number): Promise<OHLCV[]> {
    const basePrice = this.getBasePrice(symbol);
    const data: OHLCV[] = [];
    const now = Date.now();
    const intervalMs = this.getIntervalMs(interval);

    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = new Date(now - (i * intervalMs));
      const open = basePrice + (Math.random() - 0.5) * 0.01;
      const close = open + (Math.random() - 0.5) * 0.005;
      const high = Math.max(open, close) + Math.random() * 0.003;
      const low = Math.min(open, close) - Math.random() * 0.003;

      data.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 1000000)
      });
    }

    return data;
  }

  private getBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      'EURUSD': 1.0850,
      'GBPUSD': 1.2650,
      'USDJPY': 150.50,
      'XAUUSD': 2050.00,
      'BTCUSD': 45000.00,
      'SPX500': 4800.00
    };
    return prices[symbol] || 1.0;
  }

  private getIntervalMs(interval: string): number {
    const intervals: Record<string, number> = {
      '1min': 60000,
      '5min': 300000,
      '15min': 900000,
      '30min': 1800000,
      '60min': 3600000,
      'daily': 86400000
    };
    return intervals[interval] || 60000;
  }
}

export class MarketDataService extends EventEmitter {
  private providers: Map<string, MarketDataProvider> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();
  private redis: Redis;
  private priceUpdateInterval?: any;
  private cacheExpiry = 5; // seconds for real-time quotes
  private historicalCacheExpiry = 3600; // 1 hour for historical data

  constructor() {
    super();
    const redisOptions: any = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    };
    
    if (process.env.REDIS_PASSWORD) {
      redisOptions.password = process.env.REDIS_PASSWORD;
    }
    
    this.redis = new Redis(redisOptions);
    
    this.initializeProviders();
    this.startPriceUpdates();
  }

  private initializeProviders() {
    // Initialize with mock provider by default
    this.providers.set('mock', new MockMarketDataProvider());

    // Initialize Alpha Vantage if API key is provided
    if (process.env.ALPHA_VANTAGE_API_KEY) {
      this.providers.set('alphavantage', new AlphaVantageProvider(process.env.ALPHA_VANTAGE_API_KEY));
    }

    logger.info('Market data providers initialized', {
      providers: Array.from(this.providers.keys())
    });
  }

  /**
   * Get real-time quote for a symbol
   */
  async getQuote(symbol: string): Promise<QuoteData> {
    // Check cache first
    const cacheKey = `quote:${symbol}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // Find a provider that supports this symbol
    const provider = this.findProviderForSymbol(symbol);
    if (!provider) {
      throw new Error(`No provider supports symbol: ${symbol}`);
    }

    try {
      const quote = await provider.fetchQuote(symbol);
      
      // Cache the quote
      await this.redis.setex(cacheKey, this.cacheExpiry, JSON.stringify(quote));
      
      // Emit price update event
      this.emit('quote:update', quote);
      
      // Store in database for historical tracking
      await this.storeQuoteInDb(quote);
      
      return quote;
    } catch (error) {
      logger.error('Failed to fetch quote', { symbol, provider: provider.name, error });
      
      // Fallback to mock provider
      const mockProvider = this.providers.get('mock') as MockMarketDataProvider;
      return mockProvider.fetchQuote(symbol);
    }
  }

  /**
   * Get historical OHLCV data
   */
  async getHistoricalData(
    symbol: string, 
    timeframe: Timeframe, 
    limit: number = 100
  ): Promise<OHLCV[]> {
    const cacheKey = `historical:${symbol}:${timeframe}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const provider = this.findProviderForSymbol(symbol);
    if (!provider) {
      throw new Error(`No provider supports symbol: ${symbol}`);
    }

    try {
      const interval = this.mapTimeframeToInterval(timeframe);
      const data = await provider.fetchHistoricalData(symbol, interval, limit);
      
      // Cache the data
      await this.redis.setex(
        cacheKey, 
        this.historicalCacheExpiry, 
        JSON.stringify(data)
      );
      
      // Store in database
      await this.storeHistoricalDataInDb(symbol, timeframe, data);
      
      return data;
    } catch (error) {
      logger.error('Failed to fetch historical data', { symbol, timeframe, error });
      
      // Fallback to database or mock
      const dbData = await this.getHistoricalDataFromDb(symbol, timeframe, limit);
      if (dbData.length > 0) {
        return dbData;
      }
      
      const mockProvider = this.providers.get('mock') as MockMarketDataProvider;
      return mockProvider.fetchHistoricalData(symbol, this.mapTimeframeToInterval(timeframe), limit);
    }
  }

  /**
   * Calculate technical indicators
   */
  async calculateIndicators(
    symbol: string, 
    timeframe: Timeframe
  ): Promise<TechnicalIndicator[]> {
    const historicalData = await this.getHistoricalData(symbol, timeframe, 100);
    const closes = historicalData.map(d => d.close);
    
    if (closes.length < 20) {
      return [];
    }

    const indicators: TechnicalIndicator[] = [];

    // Moving Averages
    indicators.push({
      name: 'SMA',
      period: 20,
      value: TechnicalAnalysis.calculateSMA(closes, 20)
    });

    indicators.push({
      name: 'SMA',
      period: 50,
      value: TechnicalAnalysis.calculateSMA(closes, 50)
    });

    indicators.push({
      name: 'EMA',
      period: 12,
      value: TechnicalAnalysis.calculateEMA(closes, 12)
    });

    indicators.push({
      name: 'EMA',
      period: 26,
      value: TechnicalAnalysis.calculateEMA(closes, 26)
    });

    // RSI
    indicators.push({
      name: 'RSI',
      period: 14,
      value: TechnicalAnalysis.calculateRSI(closes, 14)
    });

    // MACD
    const macd = TechnicalAnalysis.calculateMACD(closes);
    indicators.push({
      name: 'MACD',
      period: 0,
      value: macd.macd,
      metadata: {
        signal: macd.signal,
        histogram: macd.histogram
      }
    });

    // Bollinger Bands
    const bb = TechnicalAnalysis.calculateBollingerBands(closes);
    indicators.push({
      name: 'BB',
      period: 20,
      value: bb.middle,
      metadata: {
        upper: bb.upper,
        lower: bb.lower
      }
    });

    // Store analysis in database
    await this.storeAnalysisInDb(symbol, timeframe, indicators);

    return indicators;
  }

  /**
   * Get market signals based on technical analysis
   */
  async getMarketSignals(symbol: string, timeframe: Timeframe): Promise<MarketSignal[]> {
    const indicators = await this.calculateIndicators(symbol, timeframe);
    return TechnicalAnalysis.generateSignals(indicators);
  }

  /**
   * Subscribe to real-time price updates
   */
  subscribeToSymbol(symbol: string, callback: (quote: QuoteData) => void): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.on(`quote:${symbol}`, callback);
    
    // Start WebSocket connection if available
    this.connectWebSocket(symbol);
    
    logger.info('Subscribed to symbol', { symbol, subscriptionId });
    return subscriptionId;
  }

  /**
   * Unsubscribe from price updates
   */
  unsubscribeFromSymbol(symbol: string, subscriptionId: string): void {
    this.removeAllListeners(`quote:${symbol}`);
    
    // Close WebSocket if no more listeners
    if (this.listenerCount(`quote:${symbol}`) === 0) {
      this.disconnectWebSocket(symbol);
    }
    
    logger.info('Unsubscribed from symbol', { symbol, subscriptionId });
  }

  /**
   * Get supported symbols
   */
  getSupportedSymbols(): string[] {
    const symbols = new Set<string>();
    
    for (const provider of this.providers.values()) {
      provider.supportedSymbols.forEach(symbol => symbols.add(symbol));
    }
    
    return Array.from(symbols);
  }

  /**
   * Private methods
   */
  private findProviderForSymbol(symbol: string): MarketDataProvider | null {
    for (const provider of this.providers.values()) {
      if (provider.supportedSymbols.includes(symbol)) {
        return provider;
      }
    }
    return null;
  }

  private mapTimeframeToInterval(timeframe: Timeframe): string {
    const mapping: Record<Timeframe, string> = {
      [Timeframe.M1]: '1min',
      [Timeframe.M5]: '5min',
      [Timeframe.M15]: '15min',
      [Timeframe.M30]: '30min',
      [Timeframe.H1]: '60min',
      [Timeframe.H4]: '240min',
      [Timeframe.D1]: 'daily',
      [Timeframe.W1]: 'weekly',
      [Timeframe.MN]: 'monthly'
    };
    return mapping[timeframe] || '1min';
  }

  private startPriceUpdates() {
    // Update prices every 5 seconds for subscribed symbols
    this.priceUpdateInterval = setInterval(async () => {
      const activeSymbols = Array.from(new Set(
        this.eventNames()
          .filter(event => typeof event === 'string' && event.startsWith('quote:'))
          .map(event => (event as string).replace('quote:', ''))
      ));

      for (const symbol of activeSymbols) {
        try {
          const quote = await this.getQuote(symbol);
          this.emit(`quote:${symbol}`, quote);
        } catch (error) {
          logger.error('Price update failed', { symbol, error });
        }
      }
    }, 5000);
  }

  private connectWebSocket(symbol: string) {
    // WebSocket implementation would go here
    // For now, using polling via startPriceUpdates
  }

  private disconnectWebSocket(symbol: string) {
    const ws = this.wsConnections.get(symbol);
    if (ws) {
      ws.close();
      this.wsConnections.delete(symbol);
    }
  }

  private async storeQuoteInDb(quote: QuoteData): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO market_quotes 
         (symbol, bid, ask, price, volume, timestamp) 
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (symbol, timestamp) DO UPDATE SET
           bid = $2, ask = $3, price = $4, volume = $5`,
        [quote.symbol, quote.bid, quote.ask, quote.price, quote.volume, quote.timestamp]
      );
    } catch (error) {
      logger.error('Failed to store quote in database', { quote, error });
    } finally {
      client.release();
    }
  }

  private async storeHistoricalDataInDb(
    symbol: string, 
    timeframe: string, 
    data: OHLCV[]
  ): Promise<void> {
    const client = await pool.connect();
    try {
      for (const candle of data) {
        await client.query(
          `INSERT INTO market_candles 
           (symbol, timeframe, timestamp, open, high, low, close, volume) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (symbol, timeframe, timestamp) DO UPDATE SET
             open = $4, high = $5, low = $6, close = $7, volume = $8`,
          [symbol, timeframe, candle.timestamp, candle.open, candle.high, 
           candle.low, candle.close, candle.volume]
        );
      }
    } catch (error) {
      logger.error('Failed to store historical data', { symbol, timeframe, error });
    } finally {
      client.release();
    }
  }

  private async getHistoricalDataFromDb(
    symbol: string, 
    timeframe: string, 
    limit: number
  ): Promise<OHLCV[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT timestamp, open, high, low, close, volume 
         FROM market_candles 
         WHERE symbol = $1 AND timeframe = $2 
         ORDER BY timestamp DESC 
         LIMIT $3`,
        [symbol, timeframe, limit]
      );

      return result.rows.map(row => ({
        timestamp: row.timestamp,
        open: parseFloat(row.open),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        close: parseFloat(row.close),
        volume: parseFloat(row.volume)
      })).reverse();
    } finally {
      client.release();
    }
  }

  private async storeAnalysisInDb(
    symbol: string, 
    timeframe: string, 
    indicators: TechnicalIndicator[]
  ): Promise<void> {
    const client = await pool.connect();
    try {
      // Get instrument ID
      const instrumentResult = await client.query(
        'SELECT id FROM trading_instruments WHERE symbol = $1',
        [symbol]
      );

      if (instrumentResult.rows.length === 0) {
        return;
      }

      const instrumentId = instrumentResult.rows[0].id;

      await client.query(
        `INSERT INTO market_analysis 
         (instrument_id, timeframe, analysis_type, indicators, timestamp) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (instrument_id, timeframe, analysis_type, timestamp) 
         DO UPDATE SET indicators = $4`,
        [instrumentId, timeframe, 'technical', JSON.stringify(indicators)]
      );
    } catch (error) {
      logger.error('Failed to store analysis', { symbol, timeframe, error });
    } finally {
      client.release();
    }
  }

  /**
   * Cleanup
   */
  async shutdown(): Promise<void> {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }

    // Close all WebSocket connections
    for (const ws of this.wsConnections.values()) {
      ws.close();
    }

    // Close Redis connection
    await this.redis.quit();

    logger.info('Market data service shutdown complete');
  }
}

// Create singleton instance
export const marketDataService = new MarketDataService();