import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { param, query, body } from 'express-validator';
import { portfolioAnalyticsService } from '../services/portfolio-analytics.service';
import { tradingService } from '../services/trading.service';
import logger from '../utils/logger';

const router = Router();

// All portfolio routes require authentication
router.use(authMiddleware);

/**
 * GET /api/portfolio/:accountId/metrics
 * Get comprehensive portfolio metrics
 */
router.get('/:accountId/metrics',
  validate([
    param('accountId').isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      // Verify user owns the account
      const account = await tradingService.getAccount(req.params.accountId!, req.user!.id);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const metrics = await portfolioAnalyticsService.getPortfolioMetrics(
        req.params.accountId!,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to get portfolio metrics', { 
        accountId: req.params.accountId, 
        error 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve portfolio metrics'
      });
    }
  }
);

/**
 * GET /api/portfolio/:accountId/performance
 * Get performance time series data
 */
router.get('/:accountId/performance',
  validate([
    param('accountId').isUUID(),
    query('period').optional().isIn(['day', 'week', 'month', 'year', 'all'])
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      // Verify user owns the account
      const account = await tradingService.getAccount(req.params.accountId!, req.user!.id);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      const period = (req.query.period as 'day' | 'week' | 'month' | 'year' | 'all') || 'month';
      
      const timeSeries = await portfolioAnalyticsService.getPerformanceTimeSeries(
        req.params.accountId!,
        period
      );

      res.json({
        success: true,
        data: timeSeries,
        meta: {
          period,
          count: timeSeries.length
        }
      });
    } catch (error) {
      logger.error('Failed to get performance data', { 
        accountId: req.params.accountId, 
        error 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance data'
      });
    }
  }
);

/**
 * GET /api/portfolio/:accountId/analytics
 * Get detailed trade analytics
 */
router.get('/:accountId/analytics',
  validate([
    param('accountId').isUUID(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      // Verify user owns the account
      const account = await tradingService.getAccount(req.params.accountId!, req.user!.id);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const analytics = await portfolioAnalyticsService.getTradeAnalytics(
        req.params.accountId!,
        startDate,
        endDate
      );

      // Convert Maps to objects for JSON serialization
      const analyticsData = {
        byInstrument: Object.fromEntries(analytics.byInstrument),
        byStrategy: Object.fromEntries(analytics.byStrategy),
        byTimeOfDay: Object.fromEntries(analytics.byTimeOfDay),
        byDayOfWeek: Object.fromEntries(analytics.byDayOfWeek),
        byMonth: Object.fromEntries(analytics.byMonth),
        byDuration: analytics.byDuration,
        bySize: analytics.bySize
      };

      res.json({
        success: true,
        data: analyticsData
      });
    } catch (error) {
      logger.error('Failed to get trade analytics', { 
        accountId: req.params.accountId, 
        error 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve trade analytics'
      });
    }
  }
);

/**
 * GET /api/portfolio/:accountId/risk
 * Get risk metrics
 */
router.get('/:accountId/risk',
  validate([
    param('accountId').isUUID()
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      // Verify user owns the account
      const account = await tradingService.getAccount(req.params.accountId!, req.user!.id);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      const riskMetrics = await portfolioAnalyticsService.getRiskMetrics(
        req.params.accountId
      );

      // Convert Maps to objects for JSON serialization
      const riskData = {
        ...riskMetrics,
        concentrationRisk: Object.fromEntries(riskMetrics.concentrationRisk),
        correlationMatrix: Object.fromEntries(
          Array.from(riskMetrics.correlationMatrix.entries()).map(([key, innerMap]) => [
            key,
            Object.fromEntries(innerMap)
          ])
        )
      };

      res.json({
        success: true,
        data: riskData
      });
    } catch (error) {
      logger.error('Failed to get risk metrics', { 
        accountId: req.params.accountId, 
        error 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve risk metrics'
      });
    }
  }
);

/**
 * GET /api/portfolio/:accountId/benchmarks
 * Compare portfolio performance with benchmarks
 */
router.get('/:accountId/benchmarks',
  validate([
    param('accountId').isUUID(),
    query('benchmarks').optional().isString()
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      // Verify user owns the account
      const account = await tradingService.getAccount(req.params.accountId!, req.user!.id);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      const benchmarks = req.query.benchmarks 
        ? (req.query.benchmarks as string).split(',')
        : ['SPX', 'DXY'];

      const comparisons = await portfolioAnalyticsService.compareBenchmarks(
        req.params.accountId!,
        benchmarks
      );

      res.json({
        success: true,
        data: comparisons
      });
    } catch (error) {
      logger.error('Failed to compare benchmarks', { 
        accountId: req.params.accountId, 
        error 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to compare benchmarks'
      });
    }
  }
);

/**
 * POST /api/portfolio/:accountId/report
 * Generate portfolio report
 */
router.post('/:accountId/report',
  validate([
    param('accountId').isUUID(),
    body('format').isIn(['pdf', 'excel']),
    body('includeMetrics').optional().isBoolean(),
    body('includeCharts').optional().isBoolean(),
    body('includeTradeList').optional().isBoolean(),
    body('includeBenchmarks').optional().isBoolean(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601()
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      // Verify user owns the account
      const account = await tradingService.getAccount(req.params.accountId!, req.user!.id);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      const options = {
        includeMetrics: req.body.includeMetrics ?? true,
        includeCharts: req.body.includeCharts ?? true,
        includeTradeList: req.body.includeTradeList ?? true,
        includeBenchmarks: req.body.includeBenchmarks ?? true,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
      };

      const reportBuffer = await portfolioAnalyticsService.generateReport(
        req.params.accountId!,
        req.body.format,
        options
      );

      // Set appropriate headers
      const filename = `portfolio-report-${new Date().toISOString().split('T')[0]}.${req.body.format}`;
      const contentType = req.body.format === 'pdf' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(reportBuffer);
    } catch (error) {
      logger.error('Failed to generate report', { 
        accountId: req.params.accountId, 
        error 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to generate report'
      });
    }
  }
);

/**
 * POST /api/portfolio/:accountId/record-performance
 * Record daily performance (usually called by a scheduled job)
 */
router.post('/:accountId/record-performance',
  validate([
    param('accountId').isUUID()
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      // Verify user owns the account
      const account = await tradingService.getAccount(req.params.accountId!, req.user!.id);
      if (!account) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      await tradingService.recordDailyPerformance(req.params.accountId);

      res.json({
        success: true,
        message: 'Daily performance recorded'
      });
    } catch (error) {
      logger.error('Failed to record performance', { 
        accountId: req.params.accountId, 
        error 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to record performance'
      });
    }
  }
);

/**
 * GET /api/portfolio/summary
 * Get summary of all user's portfolios
 */
router.get('/summary',
  async (req: AuthRequest, res: Response) => {
    try {
      const accounts = await tradingService.getUserAccounts(req.user!.id);
      
      const summaries = await Promise.all(
        accounts.map(async (account) => {
          try {
            const metrics = await portfolioAnalyticsService.getPortfolioMetrics(account.id);
            return {
              accountId: account.id,
              accountName: account.accountName,
              accountType: account.accountType,
              currency: account.currency,
              totalValue: metrics.totalValue,
              totalPnL: metrics.totalPnL,
              totalPnLPercent: metrics.totalPnLPercent,
              dailyPnL: metrics.dailyPnL,
              dailyPnLPercent: metrics.dailyPnLPercent,
              winRate: metrics.winRate
            };
          } catch (error) {
            logger.error('Failed to get metrics for account', { 
              accountId: account.id, 
              error 
            });
            return {
              accountId: account.id,
              accountName: account.accountName,
              accountType: account.accountType,
              currency: account.currency,
              totalValue: account.currentBalance,
              error: 'Failed to load metrics'
            };
          }
        })
      );

      // Calculate totals
      const totals = summaries.reduce((acc, summary) => {
        if (!summary.error) {
          acc.totalValue += summary.totalValue;
          acc.totalPnL += summary.totalPnL;
          acc.dailyPnL += summary.dailyPnL;
        }
        return acc;
      }, {
        totalValue: 0,
        totalPnL: 0,
        dailyPnL: 0
      });

      res.json({
        success: true,
        data: {
          accounts: summaries,
          totals: {
            ...totals,
            accountCount: accounts.length
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get portfolio summary', { 
        userId: req.user!.id, 
        error 
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve portfolio summary'
      });
    }
  }
);

export default router;