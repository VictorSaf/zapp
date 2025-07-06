import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { body, param, query } from 'express-validator';
import { strategyEngineService } from '../services/strategy-engine.service';
import { tradingService } from '../services/trading.service';
import { Timeframe } from '../types/trading.types';
import logger from '../utils/logger';

const router = Router();

// All strategy routes require authentication
router.use(authMiddleware);

/**
 * POST /api/strategies
 * Create a new trading strategy
 */
router.post('/',
  validate([
    body('name').isString().isLength({ min: 1, max: 100 }),
    body('description').optional().isString().isLength({ max: 500 }),
    body('strategyType').isString().isIn(['trend_following', 'mean_reversion', 'momentum', 'scalping', 'range_trading', 'breakout']),
    body('rules').isObject(),
    body('parameters').optional().isObject(),
    body('isPublic').optional().isBoolean()
  ]),
  async (req: Request, res: Response) => {
    try {
      const strategy = await tradingService.createStrategy(req.user!.id, req.body);
      
      res.status(201).json({
        success: true,
        data: strategy
      });
    } catch (error) {
      logger.error('Failed to create strategy', { userId: req.user!.id, error });
      res.status(500).json({
        success: false,
        error: 'Failed to create strategy'
      });
    }
  }
);

/**
 * GET /api/strategies
 * Get user's strategies
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const strategies = await tradingService.getUserStrategies(req.user!.id);
    
    res.json({
      success: true,
      data: strategies
    });
  } catch (error) {
    logger.error('Failed to get strategies', { userId: req.user!.id, error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve strategies'
    });
  }
});

/**
 * GET /api/strategies/:strategyId
 * Get a specific strategy
 */
router.get('/:strategyId',
  validate([
    param('strategyId').isUUID()
  ]),
  async (req: Request, res: Response) => {
    try {
      const strategy = await tradingService.getStrategy(req.params.strategyId);
      
      if (!strategy || (strategy.userId !== req.user!.id && !strategy.isPublic)) {
        return res.status(404).json({
          success: false,
          error: 'Strategy not found'
        });
      }
      
      res.json({
        success: true,
        data: strategy
      });
    } catch (error) {
      logger.error('Failed to get strategy', { strategyId: req.params.strategyId, error });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve strategy'
      });
    }
  }
);

/**
 * PUT /api/strategies/:strategyId
 * Update a strategy
 */
router.put('/:strategyId',
  validate([
    param('strategyId').isUUID(),
    body('name').optional().isString().isLength({ min: 1, max: 100 }),
    body('description').optional().isString().isLength({ max: 500 }),
    body('rules').optional().isObject(),
    body('parameters').optional().isObject(),
    body('isActive').optional().isBoolean(),
    body('isPublic').optional().isBoolean()
  ]),
  async (req: Request, res: Response) => {
    try {
      const strategy = await tradingService.updateStrategy(
        req.params.strategyId,
        req.user!.id,
        req.body
      );
      
      if (!strategy) {
        return res.status(404).json({
          success: false,
          error: 'Strategy not found or unauthorized'
        });
      }
      
      res.json({
        success: true,
        data: strategy
      });
    } catch (error) {
      logger.error('Failed to update strategy', { strategyId: req.params.strategyId, error });
      res.status(500).json({
        success: false,
        error: 'Failed to update strategy'
      });
    }
  }
);

/**
 * DELETE /api/strategies/:strategyId
 * Delete a strategy
 */
router.delete('/:strategyId',
  validate([
    param('strategyId').isUUID()
  ]),
  async (req: Request, res: Response) => {
    try {
      const deleted = await tradingService.deleteStrategy(
        req.params.strategyId,
        req.user!.id
      );
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Strategy not found or unauthorized'
        });
      }
      
      res.json({
        success: true,
        message: 'Strategy deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete strategy', { strategyId: req.params.strategyId, error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete strategy'
      });
    }
  }
);

/**
 * POST /api/strategies/:strategyId/backtest
 * Backtest a strategy
 */
router.post('/:strategyId/backtest',
  validate([
    param('strategyId').isUUID(),
    body('symbol').isString().isLength({ min: 1, max: 20 }),
    body('timeframe').isIn(Object.values(Timeframe)),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('initialBalance').optional().isNumeric().isFloat({ min: 100 })
  ]),
  async (req: Request, res: Response) => {
    try {
      const strategy = await tradingService.getStrategy(req.params.strategyId);
      
      if (!strategy || (strategy.userId !== req.user!.id && !strategy.isPublic)) {
        return res.status(404).json({
          success: false,
          error: 'Strategy not found'
        });
      }
      
      const { symbol, timeframe, startDate, endDate, initialBalance } = req.body;
      
      const result = await strategyEngineService.backtestStrategy(
        strategy,
        symbol,
        timeframe,
        new Date(startDate),
        new Date(endDate),
        initialBalance || 10000
      );
      
      // Save backtest results
      await tradingService.saveBacktestResult(strategy.id, result);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Backtest failed', { strategyId: req.params.strategyId, error });
      res.status(500).json({
        success: false,
        error: error.message || 'Backtest failed'
      });
    }
  }
);

/**
 * GET /api/strategies/:strategyId/backtest-results
 * Get backtest results for a strategy
 */
router.get('/:strategyId/backtest-results',
  validate([
    param('strategyId').isUUID()
  ]),
  async (req: Request, res: Response) => {
    try {
      const results = await tradingService.getBacktestResults(
        req.params.strategyId,
        req.user!.id
      );
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Failed to get backtest results', { strategyId: req.params.strategyId, error });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve backtest results'
      });
    }
  }
);

/**
 * POST /api/strategies/:strategyId/evaluate
 * Evaluate a strategy for current market conditions
 */
router.post('/:strategyId/evaluate',
  validate([
    param('strategyId').isUUID(),
    body('symbol').isString().isLength({ min: 1, max: 20 }),
    body('timeframe').isIn(Object.values(Timeframe))
  ]),
  async (req: Request, res: Response) => {
    try {
      const strategy = await tradingService.getStrategy(req.params.strategyId);
      
      if (!strategy || (strategy.userId !== req.user!.id && !strategy.isPublic)) {
        return res.status(404).json({
          success: false,
          error: 'Strategy not found'
        });
      }
      
      const signal = await strategyEngineService.evaluateStrategy(
        strategy,
        req.body.symbol,
        req.body.timeframe
      );
      
      res.json({
        success: true,
        data: {
          strategy: {
            id: strategy.id,
            name: strategy.name
          },
          signal
        }
      });
    } catch (error) {
      logger.error('Strategy evaluation failed', { strategyId: req.params.strategyId, error });
      res.status(500).json({
        success: false,
        error: 'Failed to evaluate strategy'
      });
    }
  }
);

/**
 * POST /api/strategies/:strategyId/monitor
 * Start monitoring a strategy
 */
router.post('/:strategyId/monitor',
  validate([
    param('strategyId').isUUID(),
    body('accountId').isUUID(),
    body('symbols').isArray(),
    body('symbols.*').isString().isLength({ min: 1, max: 20 }),
    body('timeframe').isIn(Object.values(Timeframe)),
    body('autoTrade').optional().isBoolean()
  ]),
  async (req: Request, res: Response) => {
    try {
      // Verify user owns the account
      const account = await tradingService.getAccount(req.body.accountId, req.user!.id);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }
      
      await strategyEngineService.startStrategyMonitoring(
        req.params.strategyId,
        req.body.accountId,
        req.body.symbols,
        req.body.timeframe,
        req.body.autoTrade || false
      );
      
      res.json({
        success: true,
        message: 'Strategy monitoring started',
        data: {
          strategyId: req.params.strategyId,
          accountId: req.body.accountId,
          symbols: req.body.symbols,
          autoTrade: req.body.autoTrade || false
        }
      });
    } catch (error: any) {
      logger.error('Failed to start monitoring', { strategyId: req.params.strategyId, error });
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to start monitoring'
      });
    }
  }
);

/**
 * DELETE /api/strategies/:strategyId/monitor
 * Stop monitoring a strategy
 */
router.delete('/:strategyId/monitor',
  validate([
    param('strategyId').isUUID()
  ]),
  async (req: Request, res: Response) => {
    try {
      strategyEngineService.stopStrategyMonitoring(req.params.strategyId);
      
      res.json({
        success: true,
        message: 'Strategy monitoring stopped'
      });
    } catch (error) {
      logger.error('Failed to stop monitoring', { strategyId: req.params.strategyId, error });
      res.status(500).json({
        success: false,
        error: 'Failed to stop monitoring'
      });
    }
  }
);

/**
 * POST /api/strategies/suggestions
 * Get AI-powered strategy suggestions
 */
router.post('/suggestions',
  validate([
    body('symbol').isString().isLength({ min: 1, max: 20 }),
    body('timeframe').isIn(Object.values(Timeframe)),
    body('riskTolerance').optional().isIn(['low', 'medium', 'high']),
    body('tradingStyle').optional().isIn(['scalping', 'day_trading', 'swing_trading', 'position_trading']),
    body('preferredIndicators').optional().isArray(),
    body('preferredIndicators.*').optional().isString()
  ]),
  async (req: Request, res: Response) => {
    try {
      const suggestions = await strategyEngineService.generateStrategySuggestions(
        req.body.symbol,
        req.body.timeframe,
        {
          riskTolerance: req.body.riskTolerance,
          tradingStyle: req.body.tradingStyle,
          preferredIndicators: req.body.preferredIndicators
        }
      );
      
      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      logger.error('Failed to generate suggestions', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to generate strategy suggestions'
      });
    }
  }
);

/**
 * GET /api/strategies/public
 * Get public strategies from the community
 */
router.get('/public',
  validate([
    query('strategyType').optional().isString(),
    query('minWinRate').optional().isNumeric(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt()
  ]),
  async (req: Request, res: Response) => {
    try {
      const filters = {
        strategyType: req.query.strategyType as string,
        minWinRate: req.query.minWinRate ? parseFloat(req.query.minWinRate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      };
      
      const strategies = await tradingService.getPublicStrategies(filters);
      
      res.json({
        success: true,
        data: strategies,
        meta: {
          limit: filters.limit,
          offset: filters.offset
        }
      });
    } catch (error) {
      logger.error('Failed to get public strategies', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve public strategies'
      });
    }
  }
);

/**
 * POST /api/strategies/:strategyId/clone
 * Clone a public strategy
 */
router.post('/:strategyId/clone',
  validate([
    param('strategyId').isUUID(),
    body('name').optional().isString().isLength({ min: 1, max: 100 })
  ]),
  async (req: Request, res: Response) => {
    try {
      const originalStrategy = await tradingService.getStrategy(req.params.strategyId);
      
      if (!originalStrategy || !originalStrategy.isPublic) {
        return res.status(404).json({
          success: false,
          error: 'Strategy not found or not public'
        });
      }
      
      const clonedStrategy = await tradingService.cloneStrategy(
        req.params.strategyId,
        req.user!.id,
        req.body.name
      );
      
      res.status(201).json({
        success: true,
        data: clonedStrategy
      });
    } catch (error) {
      logger.error('Failed to clone strategy', { strategyId: req.params.strategyId, error });
      res.status(500).json({
        success: false,
        error: 'Failed to clone strategy'
      });
    }
  }
);

/**
 * GET /api/strategies/:strategyId/performance
 * Get live performance metrics for a strategy
 */
router.get('/:strategyId/performance',
  validate([
    param('strategyId').isUUID(),
    query('accountId').optional().isUUID(),
    query('period').optional().isIn(['day', 'week', 'month', 'year', 'all'])
  ]),
  async (req: Request, res: Response) => {
    try {
      const performance = await tradingService.getStrategyPerformance(
        req.params.strategyId,
        req.user!.id,
        req.query.accountId as string,
        req.query.period as string || 'month'
      );
      
      if (!performance) {
        return res.status(404).json({
          success: false,
          error: 'Strategy or performance data not found'
        });
      }
      
      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      logger.error('Failed to get strategy performance', { strategyId: req.params.strategyId, error });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve strategy performance'
      });
    }
  }
);

export default router;