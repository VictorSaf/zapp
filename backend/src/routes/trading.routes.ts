import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { tradingService } from '../services/trading.service';
import { 
  CreateAccountRequest,
  CreateTradeRequest,
  UpdateTradeRequest,
  CreateStrategyRequest,
  CreateJournalEntryRequest,
  TradeStatus
} from '../types/trading.types';
import logger from '../utils/logger';

const router = Router();

// All trading routes require authentication
router.use(authenticateToken);

/**
 * Trading Accounts Routes
 */
router.post('/accounts', validateRequest, async (req: Request, res: Response) => {
  try {
    const data: CreateAccountRequest = req.body;
    const account = await tradingService.createAccount(req.user!.id, data);
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    logger.error('Failed to create trading account', { userId: req.user!.id, error });
    res.status(500).json({ success: false, error: 'Failed to create trading account' });
  }
});

router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const accounts = await tradingService.getUserAccounts(req.user!.id);
    res.json({ success: true, data: accounts });
  } catch (error) {
    logger.error('Failed to get trading accounts', { userId: req.user!.id, error });
    res.status(500).json({ success: false, error: 'Failed to get trading accounts' });
  }
});

router.get('/accounts/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const account = await tradingService.getAccount(accountId, req.user!.id);
    
    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }
    
    res.json({ success: true, data: account });
  } catch (error) {
    logger.error('Failed to get trading account', { userId: req.user!.id, error });
    res.status(500).json({ success: false, error: 'Failed to get trading account' });
  }
});

/**
 * Trades Routes
 */
router.post('/trades', validateRequest, async (req: Request, res: Response) => {
  try {
    const data: CreateTradeRequest = req.body;
    
    // Verify account ownership
    const account = await tradingService.getAccount(data.accountId, req.user!.id);
    if (!account) {
      return res.status(403).json({ success: false, error: 'Account not found or access denied' });
    }
    
    const trade = await tradingService.createTrade(data);
    res.status(201).json({ success: true, data: trade });
  } catch (error) {
    logger.error('Failed to create trade', { userId: req.user!.id, error });
    res.status(500).json({ success: false, error: 'Failed to create trade' });
  }
});

router.put('/trades/:tradeId', validateRequest, async (req: Request, res: Response) => {
  try {
    const { tradeId } = req.params;
    const { accountId } = req.query;
    const data: UpdateTradeRequest = req.body;
    
    if (!accountId) {
      return res.status(400).json({ success: false, error: 'Account ID required' });
    }
    
    // Verify account ownership
    const account = await tradingService.getAccount(accountId as string, req.user!.id);
    if (!account) {
      return res.status(403).json({ success: false, error: 'Account not found or access denied' });
    }
    
    const trade = await tradingService.updateTrade(tradeId, accountId as string, data);
    
    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade not found' });
    }
    
    res.json({ success: true, data: trade });
  } catch (error) {
    logger.error('Failed to update trade', { userId: req.user!.id, error });
    res.status(500).json({ success: false, error: 'Failed to update trade' });
  }
});

router.get('/accounts/:accountId/trades', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const { status } = req.query;
    
    // Verify account ownership
    const account = await tradingService.getAccount(accountId, req.user!.id);
    if (!account) {
      return res.status(403).json({ success: false, error: 'Account not found or access denied' });
    }
    
    const trades = await tradingService.getAccountTrades(accountId, status as TradeStatus);
    res.json({ success: true, data: trades });
  } catch (error) {
    logger.error('Failed to get account trades', { userId: req.user!.id, error });
    res.status(500).json({ success: false, error: 'Failed to get account trades' });
  }
});

/**
 * Positions Routes
 */
router.get('/accounts/:accountId/positions', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    
    // Verify account ownership
    const account = await tradingService.getAccount(accountId, req.user!.id);
    if (!account) {
      return res.status(403).json({ success: false, error: 'Account not found or access denied' });
    }
    
    const positions = await tradingService.getOpenPositions(accountId);
    res.json({ success: true, data: positions });
  } catch (error) {
    logger.error('Failed to get positions', { userId: req.user!.id, error });
    res.status(500).json({ success: false, error: 'Failed to get positions' });
  }
});

/**
 * Portfolio Analytics Routes
 */
router.get('/accounts/:accountId/portfolio/summary', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    
    // Verify account ownership
    const account = await tradingService.getAccount(accountId, req.user!.id);
    if (!account) {
      return res.status(403).json({ success: false, error: 'Account not found or access denied' });
    }
    
    const summary = await tradingService.getPortfolioSummary(accountId);
    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Failed to get portfolio summary', { userId: req.user!.id, error });
    res.status(500).json({ success: false, error: 'Failed to get portfolio summary' });
  }
});

router.get('/accounts/:accountId/trades/summary', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    
    // Verify account ownership
    const account = await tradingService.getAccount(accountId, req.user!.id);
    if (!account) {
      return res.status(403).json({ success: false, error: 'Account not found or access denied' });
    }
    
    const summary = await tradingService.getTradeSummary(accountId);
    res.json({ success: true, data: summary });
  } catch (error) {
    logger.error('Failed to get trade summary', { userId: req.user!.id, error });
    res.status(500).json({ success: false, error: 'Failed to get trade summary' });
  }
});

router.post('/accounts/:accountId/portfolio/record-performance', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    
    // Verify account ownership
    const account = await tradingService.getAccount(accountId, req.user!.id);
    if (!account) {
      return res.status(403).json({ success: false, error: 'Account not found or access denied' });
    }
    
    await tradingService.recordDailyPerformance(accountId);
    res.json({ success: true, message: 'Daily performance recorded' });
  } catch (error) {
    logger.error('Failed to record performance', { userId: req.user!.id, error });
    res.status(500).json({ success: false, error: 'Failed to record performance' });
  }
});

/**
 * Trading Journal Routes
 */
router.post('/journal', validateRequest, async (req: Request, res: Response) => {
  try {
    const data: CreateJournalEntryRequest = req.body;
    const entry = await tradingService.createJournalEntry(req.user!.id, data);
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    logger.error('Failed to create journal entry', { userId: req.user!.id, error });
    res.status(500).json({ success: false, error: 'Failed to create journal entry' });
  }
});

router.get('/journal', async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;
    const entries = await tradingService.getUserJournalEntries(
      req.user!.id, 
      parseInt(limit as string)
    );
    res.json({ success: true, data: entries });
  } catch (error) {
    logger.error('Failed to get journal entries', { userId: req.user!.id, error });
    res.status(500).json({ success: false, error: 'Failed to get journal entries' });
  }
});

/**
 * Trading Strategies Routes
 */
router.post('/strategies', validateRequest, async (req: Request, res: Response) => {
  try {
    const data: CreateStrategyRequest = req.body;
    const strategy = await tradingService.createStrategy(req.user!.id, data);
    res.status(201).json({ success: true, data: strategy });
  } catch (error) {
    logger.error('Failed to create strategy', { userId: req.user!.id, error });
    res.status(500).json({ success: false, error: 'Failed to create strategy' });
  }
});

router.get('/strategies', async (req: Request, res: Response) => {
  try {
    const strategies = await tradingService.getUserStrategies(req.user!.id);
    res.json({ success: true, data: strategies });
  } catch (error) {
    logger.error('Failed to get strategies', { userId: req.user!.id, error });
    res.status(500).json({ success: false, error: 'Failed to get strategies' });
  }
});

/**
 * Trading Instruments Routes (Public)
 */
router.get('/instruments', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const instruments = await tradingService.getInstruments(type as string);
    res.json({ success: true, data: instruments });
  } catch (error) {
    logger.error('Failed to get instruments', { error });
    res.status(500).json({ success: false, error: 'Failed to get instruments' });
  }
});

router.get('/instruments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const instrument = await tradingService.getInstrument(id);
    
    if (!instrument) {
      return res.status(404).json({ success: false, error: 'Instrument not found' });
    }
    
    res.json({ success: true, data: instrument });
  } catch (error) {
    logger.error('Failed to get instrument', { error });
    res.status(500).json({ success: false, error: 'Failed to get instrument' });
  }
});

export default router;