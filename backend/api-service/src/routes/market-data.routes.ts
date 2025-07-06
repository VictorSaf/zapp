import { Router, Request, Response } from 'express';
import { marketDataService } from '../services/market-data.service';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { param, query, body } from 'express-validator';
import { Timeframe } from '../types/trading.types';
import logger from '../utils/logger';

const router = Router();

// All market data routes require authentication
router.use(authMiddleware);

/**
 * GET /api/market-data/symbols
 * Get list of supported trading symbols
 */
router.get('/symbols', async (req: Request, res: Response) => {
  try {
    const symbols = marketDataService.getSupportedSymbols();
    res.json({
      success: true,
      data: symbols
    });
  } catch (error) {
    logger.error('Failed to get symbols', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve supported symbols'
    });
  }
});

/**
 * GET /api/market-data/quote/:symbol
 * Get real-time quote for a symbol
 */
router.get('/quote/:symbol',
  validate([
    param('symbol').isString().isLength({ min: 1, max: 20 })
  ]),
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const quote = await marketDataService.getQuote(symbol);
      
      res.json({
        success: true,
        data: quote
      });
    } catch (error: any) {
      logger.error('Failed to get quote', { symbol: req.params.symbol, error });
      res.status(error.message.includes('No provider') ? 404 : 500).json({
        success: false,
        error: error.message || 'Failed to retrieve quote'
      });
    }
  }
);

/**
 * GET /api/market-data/historical/:symbol
 * Get historical OHLCV data
 */
router.get('/historical/:symbol',
  validate([
    param('symbol').isString().isLength({ min: 1, max: 20 }),
    query('timeframe').isIn(Object.values(Timeframe)),
    query('limit').optional().isInt({ min: 1, max: 5000 }).toInt()
  ]),
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const timeframe = req.query.timeframe as Timeframe;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      const data = await marketDataService.getHistoricalData(symbol, timeframe, limit);
      
      res.json({
        success: true,
        data,
        meta: {
          symbol,
          timeframe,
          count: data.length
        }
      });
    } catch (error: any) {
      logger.error('Failed to get historical data', { 
        symbol: req.params.symbol, 
        timeframe: req.query.timeframe,
        error 
      });
      res.status(error.message.includes('No provider') ? 404 : 500).json({
        success: false,
        error: error.message || 'Failed to retrieve historical data'
      });
    }
  }
);

/**
 * GET /api/market-data/indicators/:symbol
 * Get technical indicators for a symbol
 */
router.get('/indicators/:symbol',
  validate([
    param('symbol').isString().isLength({ min: 1, max: 20 }),
    query('timeframe').isIn(Object.values(Timeframe))
  ]),
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const timeframe = req.query.timeframe as Timeframe;
      
      const indicators = await marketDataService.calculateIndicators(symbol, timeframe);
      
      res.json({
        success: true,
        data: indicators,
        meta: {
          symbol,
          timeframe,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to calculate indicators', { 
        symbol: req.params.symbol, 
        timeframe: req.query.timeframe,
        error 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to calculate indicators'
      });
    }
  }
);

/**
 * GET /api/market-data/signals/:symbol
 * Get trading signals based on technical analysis
 */
router.get('/signals/:symbol',
  validate([
    param('symbol').isString().isLength({ min: 1, max: 20 }),
    query('timeframe').isIn(Object.values(Timeframe))
  ]),
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const timeframe = req.query.timeframe as Timeframe;
      
      const signals = await marketDataService.getMarketSignals(symbol, timeframe);
      
      res.json({
        success: true,
        data: signals,
        meta: {
          symbol,
          timeframe,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to get market signals', { 
        symbol: req.params.symbol, 
        timeframe: req.query.timeframe,
        error 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve market signals'
      });
    }
  }
);

/**
 * POST /api/market-data/subscribe
 * Subscribe to real-time price updates for a symbol
 */
router.post('/subscribe',
  validate([
    body('symbol').isString().isLength({ min: 1, max: 20 })
  ]),
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.body;
      const userId = req.user!.id;
      
      // Create a unique subscription ID for this user-symbol pair
      const subscriptionId = marketDataService.subscribeToSymbol(symbol, (quote) => {
        // In a real implementation, this would send updates via WebSocket
        // For now, we just log it
        logger.debug('Price update', { userId, symbol, quote });
      });
      
      res.json({
        success: true,
        data: {
          subscriptionId,
          symbol,
          message: 'Subscribed to real-time updates'
        }
      });
    } catch (error) {
      logger.error('Failed to subscribe to symbol', { 
        symbol: req.body.symbol,
        error 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to subscribe to symbol'
      });
    }
  }
);

/**
 * DELETE /api/market-data/subscribe/:subscriptionId
 * Unsubscribe from real-time price updates
 */
router.delete('/subscribe/:subscriptionId',
  validate([
    param('subscriptionId').isString(),
    body('symbol').isString().isLength({ min: 1, max: 20 })
  ]),
  async (req: Request, res: Response) => {
    try {
      const { subscriptionId } = req.params;
      const { symbol } = req.body;
      
      marketDataService.unsubscribeFromSymbol(symbol, subscriptionId);
      
      res.json({
        success: true,
        message: 'Unsubscribed from real-time updates'
      });
    } catch (error) {
      logger.error('Failed to unsubscribe', { 
        subscriptionId: req.params.subscriptionId,
        error 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to unsubscribe'
      });
    }
  }
);

/**
 * GET /api/market-data/bulk-quotes
 * Get quotes for multiple symbols at once
 */
router.post('/bulk-quotes',
  validate([
    body('symbols').isArray().withMessage('Symbols must be an array'),
    body('symbols.*').isString().isLength({ min: 1, max: 20 })
  ]),
  async (req: Request, res: Response) => {
    try {
      const { symbols } = req.body;
      
      // Fetch quotes in parallel
      const quotePromises = symbols.map((symbol: string) => 
        marketDataService.getQuote(symbol)
          .then(quote => ({ symbol, quote, error: null }))
          .catch(error => ({ symbol, quote: null, error: error.message }))
      );
      
      const results = await Promise.all(quotePromises);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Failed to get bulk quotes', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve bulk quotes'
      });
    }
  }
);

/**
 * GET /api/market-data/compare/:baseSymbol
 * Compare multiple symbols against a base symbol
 */
router.get('/compare/:baseSymbol',
  validate([
    param('baseSymbol').isString().isLength({ min: 1, max: 20 }),
    query('symbols').isString(),
    query('timeframe').isIn(Object.values(Timeframe)),
    query('period').optional().isInt({ min: 1, max: 365 }).toInt()
  ]),
  async (req: Request, res: Response) => {
    try {
      const { baseSymbol } = req.params;
      const symbols = (req.query.symbols as string).split(',');
      const timeframe = req.query.timeframe as Timeframe;
      const period = req.query.period ? parseInt(req.query.period as string) : 30;
      
      // Get historical data for all symbols
      const dataPromises = [baseSymbol, ...symbols].map(symbol =>
        marketDataService.getHistoricalData(symbol, timeframe, period)
          .then(data => ({ symbol, data, error: null }))
          .catch(error => ({ symbol, data: [], error: error.message }))
      );
      
      const results = await Promise.all(dataPromises);
      
      // Calculate percentage changes relative to base symbol
      const baseData = results.find(r => r.symbol === baseSymbol)?.data || [];
      const comparisons = results.map(result => {
        if (result.data.length === 0) return result;
        
        const firstPrice = result.data[0].close;
        const lastPrice = result.data[result.data.length - 1].close;
        const change = ((lastPrice - firstPrice) / firstPrice) * 100;
        
        return {
          symbol: result.symbol,
          firstPrice,
          lastPrice,
          change,
          data: result.data
        };
      });
      
      res.json({
        success: true,
        data: comparisons,
        meta: {
          baseSymbol,
          timeframe,
          period
        }
      });
    } catch (error) {
      logger.error('Failed to compare symbols', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to compare symbols'
      });
    }
  }
);

export default router;