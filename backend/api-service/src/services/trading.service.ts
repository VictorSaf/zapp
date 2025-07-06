import { pool } from '../config/database';
import { 
  Trade, 
  TradingAccount, 
  TradingInstrument,
  Position,
  TradingStrategy,
  PortfolioPerformance,
  TradingJournal,
  CreateTradeRequest,
  UpdateTradeRequest,
  CreateAccountRequest,
  CreateStrategyRequest,
  CreateJournalEntryRequest,
  PortfolioSummary,
  TradeSummary,
  TradeStatus,
  AccountType,
  PositionType,
  JournalMood
} from '../types/trading.types';
import logger from '../utils/logger';

export class TradingService {
  /**
   * Trading Accounts Management
   */
  async createAccount(userId: string, data: CreateAccountRequest): Promise<TradingAccount> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO trading_accounts 
         (user_id, account_name, account_type, broker, currency, initial_balance, current_balance, leverage)
         VALUES ($1, $2, $3, $4, $5, $6, $6, $7)
         RETURNING *`,
        [
          userId,
          data.accountName,
          data.accountType,
          data.broker || null,
          data.currency || 'USD',
          data.initialBalance,
          data.leverage || 1
        ]
      );

      logger.info('Trading account created', { userId, accountName: data.accountName });
      return this.mapToTradingAccount(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create trading account', { userId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserAccounts(userId: string): Promise<TradingAccount[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM trading_accounts WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC',
        [userId]
      );
      return result.rows.map(row => this.mapToTradingAccount(row));
    } finally {
      client.release();
    }
  }

  async getAccount(accountId: string, userId: string): Promise<TradingAccount | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM trading_accounts WHERE id = $1 AND user_id = $2',
        [accountId, userId]
      );
      return result.rows[0] ? this.mapToTradingAccount(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async updateAccountBalance(accountId: string, newBalance: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE trading_accounts SET current_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newBalance, accountId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Trades Management
   */
  async createTrade(data: CreateTradeRequest): Promise<Trade> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO trades 
         (account_id, instrument_id, trade_type, entry_price, quantity, stop_loss, take_profit, status, open_time, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)
         RETURNING *`,
        [
          data.accountId,
          data.instrumentId,
          data.tradeType,
          data.entryPrice,
          data.quantity,
          data.stopLoss || null,
          data.takeProfit || null,
          TradeStatus.OPEN,
          data.notes || null
        ]
      );

      logger.info('Trade created', { 
        accountId: data.accountId, 
        instrumentId: data.instrumentId,
        tradeType: data.tradeType,
        quantity: data.quantity
      });

      return this.mapToTrade(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create trade', { accountId: data.accountId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async updateTrade(tradeId: string, accountId: string, data: UpdateTradeRequest): Promise<Trade | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current trade
      const currentResult = await client.query(
        'SELECT * FROM trades WHERE id = $1 AND account_id = $2',
        [tradeId, accountId]
      );

      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const currentTrade = currentResult.rows[0];

      // Update trade
      const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
      const values: any[] = [];
      let paramCount = 1;

      if (data.exitPrice !== undefined) {
        updates.push(`exit_price = $${paramCount++}`);
        values.push(data.exitPrice);
      }

      if (data.stopLoss !== undefined) {
        updates.push(`stop_loss = $${paramCount++}`);
        values.push(data.stopLoss);
      }

      if (data.takeProfit !== undefined) {
        updates.push(`take_profit = $${paramCount++}`);
        values.push(data.takeProfit);
      }

      if (data.notes !== undefined) {
        updates.push(`notes = $${paramCount++}`);
        values.push(data.notes);
      }

      if (data.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(data.status);

        if (data.status === TradeStatus.CLOSED && data.exitPrice) {
          updates.push(`close_time = CURRENT_TIMESTAMP`);
          
          // Calculate profit/loss
          const entryPrice = parseFloat(currentTrade.entry_price);
          const exitPrice = data.exitPrice;
          const quantity = parseFloat(currentTrade.quantity);
          const tradeType = currentTrade.trade_type;

          let profitLoss = 0;
          if (tradeType === 'buy') {
            profitLoss = (exitPrice - entryPrice) * quantity;
          } else {
            profitLoss = (entryPrice - exitPrice) * quantity;
          }

          updates.push(`profit_loss = $${paramCount++}`);
          values.push(profitLoss);

          // Update account balance
          const accountResult = await client.query(
            'SELECT current_balance FROM trading_accounts WHERE id = $1',
            [accountId]
          );
          const currentBalance = parseFloat(accountResult.rows[0].current_balance);
          const newBalance = currentBalance + profitLoss - (currentTrade.commission || 0) - (currentTrade.swap || 0);
          
          await client.query(
            'UPDATE trading_accounts SET current_balance = $1 WHERE id = $2',
            [newBalance, accountId]
          );
        }
      }

      values.push(tradeId);
      values.push(accountId);

      const result = await client.query(
        `UPDATE trades SET ${updates.join(', ')} 
         WHERE id = $${paramCount++} AND account_id = $${paramCount++} 
         RETURNING *`,
        values
      );

      await client.query('COMMIT');

      logger.info('Trade updated', { tradeId, accountId, status: data.status });
      return this.mapToTrade(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update trade', { tradeId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async getAccountTrades(accountId: string, status?: TradeStatus): Promise<Trade[]> {
    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM trades WHERE account_id = $1';
      const values: any[] = [accountId];

      if (status) {
        query += ' AND status = $2';
        values.push(status);
      }

      query += ' ORDER BY open_time DESC';

      const result = await client.query(query, values);
      return result.rows.map(row => this.mapToTrade(row));
    } finally {
      client.release();
    }
  }

  /**
   * Positions Management
   */
  async getOpenPositions(accountId: string): Promise<Position[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM positions WHERE account_id = $1 AND is_open = true',
        [accountId]
      );
      return result.rows.map(row => this.mapToPosition(row));
    } finally {
      client.release();
    }
  }

  async updatePositionPrice(positionId: string, currentPrice: number): Promise<void> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM positions WHERE id = $1',
        [positionId]
      );

      if (result.rows.length === 0) return;

      const position = result.rows[0];
      const unrealizedPnl = (currentPrice - position.average_price) * position.total_quantity * 
                           (position.position_type === PositionType.LONG ? 1 : -1);

      await client.query(
        `UPDATE positions 
         SET current_price = $1, unrealized_pnl = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [currentPrice, unrealizedPnl, positionId]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Portfolio Analytics
   */
  async getPortfolioSummary(accountId: string): Promise<PortfolioSummary> {
    const client = await pool.connect();
    try {
      // Get account details
      const accountResult = await client.query(
        'SELECT * FROM trading_accounts WHERE id = $1',
        [accountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Account not found');
      }

      const account = accountResult.rows[0];

      // Get open positions
      const positionsResult = await client.query(
        'SELECT COUNT(*) as count, SUM(unrealized_pnl) as total_unrealized FROM positions WHERE account_id = $1 AND is_open = true',
        [accountId]
      );

      // Get today's performance
      const todayResult = await client.query(
        `SELECT daily_pnl, daily_return FROM portfolio_performance 
         WHERE account_id = $1 AND date = CURRENT_DATE`,
        [accountId]
      );

      // Get overall trade statistics
      const statsResult = await client.query(
        `SELECT 
          COUNT(*) as total_trades,
          COUNT(*) FILTER (WHERE profit_loss > 0) as winning_trades,
          AVG(profit_loss) FILTER (WHERE profit_loss > 0) as avg_win,
          AVG(profit_loss) FILTER (WHERE profit_loss < 0) as avg_loss,
          SUM(profit_loss) as total_pnl
         FROM trades 
         WHERE account_id = $1 AND status = 'closed'`,
        [accountId]
      );

      const stats = statsResult.rows[0];
      const winRate = stats.total_trades > 0 ? (stats.winning_trades / stats.total_trades) * 100 : 0;
      const profitFactor = stats.avg_loss !== 0 ? Math.abs(stats.avg_win / stats.avg_loss) : 0;

      return {
        totalValue: parseFloat(account.current_balance),
        totalPnl: parseFloat(stats.total_pnl || 0),
        totalPnlPercent: ((parseFloat(account.current_balance) - parseFloat(account.initial_balance)) / parseFloat(account.initial_balance)) * 100,
        todayPnl: todayResult.rows[0]?.daily_pnl || 0,
        todayPnlPercent: todayResult.rows[0]?.daily_return || 0,
        openPositions: parseInt(positionsResult.rows[0].count),
        totalTrades: parseInt(stats.total_trades),
        winRate,
        profitFactor,
        sharpeRatio: 0, // TODO: Calculate Sharpe ratio
        maxDrawdown: 0, // TODO: Calculate max drawdown
      };
    } finally {
      client.release();
    }
  }

  async getTradeSummary(accountId: string): Promise<TradeSummary> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          COUNT(*) as total_trades,
          COUNT(*) FILTER (WHERE status = 'open') as open_trades,
          COUNT(*) FILTER (WHERE status = 'closed') as closed_trades,
          COUNT(*) FILTER (WHERE profit_loss > 0) as winning_trades,
          COUNT(*) FILTER (WHERE profit_loss < 0) as losing_trades,
          AVG(profit_loss) FILTER (WHERE profit_loss > 0) as avg_win,
          AVG(profit_loss) FILTER (WHERE profit_loss < 0) as avg_loss,
          SUM(profit_loss) as total_pnl,
          MAX(profit_loss) as best_trade,
          MIN(profit_loss) as worst_trade
         FROM trades 
         WHERE account_id = $1`,
        [accountId]
      );

      const stats = result.rows[0];
      const winRate = stats.closed_trades > 0 ? (stats.winning_trades / stats.closed_trades) * 100 : 0;
      const profitFactor = stats.avg_loss !== 0 ? Math.abs(stats.avg_win / stats.avg_loss) : 0;

      return {
        totalTrades: parseInt(stats.total_trades),
        openTrades: parseInt(stats.open_trades),
        closedTrades: parseInt(stats.closed_trades),
        winningTrades: parseInt(stats.winning_trades),
        losingTrades: parseInt(stats.losing_trades),
        winRate,
        totalPnl: parseFloat(stats.total_pnl || 0),
        avgWin: parseFloat(stats.avg_win || 0),
        avgLoss: parseFloat(stats.avg_loss || 0),
        profitFactor,
        bestTrade: parseFloat(stats.best_trade || 0),
        worstTrade: parseFloat(stats.worst_trade || 0),
      };
    } finally {
      client.release();
    }
  }

  async recordDailyPerformance(accountId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get account details
      const accountResult = await client.query(
        'SELECT * FROM trading_accounts WHERE id = $1',
        [accountId]
      );

      if (accountResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return;
      }

      const account = accountResult.rows[0];

      // Get yesterday's balance
      const yesterdayResult = await client.query(
        `SELECT ending_balance FROM portfolio_performance 
         WHERE account_id = $1 AND date = CURRENT_DATE - INTERVAL '1 day'`,
        [accountId]
      );

      const startingBalance = yesterdayResult.rows[0]?.ending_balance || account.initial_balance;
      const endingBalance = account.current_balance;
      const dailyPnl = endingBalance - startingBalance;
      const dailyReturn = startingBalance > 0 ? (dailyPnl / startingBalance) : 0;

      // Get today's trade metrics
      const metricsResult = await client.query(
        'SELECT * FROM calculate_portfolio_metrics($1, CURRENT_DATE)',
        [accountId]
      );

      const metrics = metricsResult.rows[0];

      // Insert or update daily performance
      await client.query(
        `INSERT INTO portfolio_performance 
         (account_id, date, starting_balance, ending_balance, daily_pnl, daily_return,
          total_trades, winning_trades, losing_trades, win_rate, avg_win, avg_loss, profit_factor)
         VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (account_id, date) DO UPDATE SET
           ending_balance = $3,
           daily_pnl = $4,
           daily_return = $5,
           total_trades = $6,
           winning_trades = $7,
           losing_trades = $8,
           win_rate = $9,
           avg_win = $10,
           avg_loss = $11,
           profit_factor = $12`,
        [
          accountId,
          startingBalance,
          endingBalance,
          dailyPnl,
          dailyReturn,
          metrics.total_trades,
          metrics.winning_trades,
          metrics.losing_trades,
          metrics.win_rate,
          metrics.avg_win,
          metrics.avg_loss,
          metrics.profit_factor
        ]
      );

      await client.query('COMMIT');
      logger.info('Daily performance recorded', { accountId, date: new Date().toISOString() });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to record daily performance', { accountId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Trading Journal
   */
  async createJournalEntry(userId: string, data: CreateJournalEntryRequest): Promise<TradingJournal> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO trading_journal 
         (user_id, trade_id, entry_date, title, content, mood, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          userId,
          data.tradeId || null,
          data.entryDate || new Date(),
          data.title || null,
          data.content,
          data.mood || null,
          data.tags || null
        ]
      );

      logger.info('Journal entry created', { userId });
      return this.mapToJournalEntry(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create journal entry', { userId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserJournalEntries(userId: string, limit = 50): Promise<TradingJournal[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM trading_journal WHERE user_id = $1 ORDER BY entry_date DESC LIMIT $2',
        [userId, limit]
      );
      return result.rows.map(row => this.mapToJournalEntry(row));
    } finally {
      client.release();
    }
  }

  /**
   * Trading Strategies
   */
  async createStrategy(userId: string, data: CreateStrategyRequest): Promise<TradingStrategy> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO trading_strategies 
         (user_id, name, description, strategy_type, rules, parameters, is_public)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          userId,
          data.name,
          data.description || null,
          data.strategyType,
          JSON.stringify(data.rules),
          data.parameters ? JSON.stringify(data.parameters) : null,
          data.isPublic || false
        ]
      );

      logger.info('Trading strategy created', { userId, strategyName: data.name });
      return this.mapToStrategy(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create trading strategy', { userId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserStrategies(userId: string): Promise<TradingStrategy[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM trading_strategies WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC',
        [userId]
      );
      return result.rows.map(row => this.mapToStrategy(row));
    } finally {
      client.release();
    }
  }

  /**
   * Trading Instruments
   */
  async getInstruments(type?: string): Promise<TradingInstrument[]> {
    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM trading_instruments WHERE is_active = true';
      const values: any[] = [];

      if (type) {
        query += ' AND instrument_type = $1';
        values.push(type);
      }

      query += ' ORDER BY symbol';

      const result = await client.query(query, values);
      return result.rows.map(row => this.mapToInstrument(row));
    } finally {
      client.release();
    }
  }

  async getInstrument(id: string): Promise<TradingInstrument | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM trading_instruments WHERE id = $1',
        [id]
      );
      return result.rows[0] ? this.mapToInstrument(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Mapping functions
   */
  private mapToTradingAccount(row: any): TradingAccount {
    return {
      id: row.id,
      userId: row.user_id,
      accountName: row.account_name,
      accountType: row.account_type as AccountType,
      broker: row.broker,
      currency: row.currency,
      initialBalance: parseFloat(row.initial_balance),
      currentBalance: parseFloat(row.current_balance),
      leverage: row.leverage,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToTrade(row: any): Trade {
    return {
      id: row.id,
      accountId: row.account_id,
      instrumentId: row.instrument_id,
      tradeType: row.trade_type,
      entryPrice: parseFloat(row.entry_price),
      exitPrice: row.exit_price ? parseFloat(row.exit_price) : undefined,
      quantity: parseFloat(row.quantity),
      stopLoss: row.stop_loss ? parseFloat(row.stop_loss) : undefined,
      takeProfit: row.take_profit ? parseFloat(row.take_profit) : undefined,
      commission: parseFloat(row.commission),
      swap: parseFloat(row.swap),
      profitLoss: row.profit_loss ? parseFloat(row.profit_loss) : undefined,
      profitLossPips: row.profit_loss_pips ? parseFloat(row.profit_loss_pips) : undefined,
      status: row.status as TradeStatus,
      openTime: row.open_time,
      closeTime: row.close_time,
      strategyId: row.strategy_id,
      notes: row.notes,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToPosition(row: any): Position {
    return {
      id: row.id,
      accountId: row.account_id,
      instrumentId: row.instrument_id,
      positionType: row.position_type as PositionType,
      totalQuantity: parseFloat(row.total_quantity),
      averagePrice: parseFloat(row.average_price),
      currentPrice: row.current_price ? parseFloat(row.current_price) : undefined,
      unrealizedPnl: row.unrealized_pnl ? parseFloat(row.unrealized_pnl) : undefined,
      realizedPnl: row.realized_pnl ? parseFloat(row.realized_pnl) : undefined,
      isOpen: row.is_open,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToInstrument(row: any): TradingInstrument {
    return {
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      instrumentType: row.instrument_type,
      baseCurrency: row.base_currency,
      quoteCurrency: row.quote_currency,
      exchange: row.exchange,
      pipSize: parseFloat(row.pip_size),
      contractSize: row.contract_size,
      marginRequirement: parseFloat(row.margin_requirement),
      tradingHours: row.trading_hours,
      metadata: row.metadata,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToStrategy(row: any): TradingStrategy {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      strategyType: row.strategy_type,
      rules: row.rules,
      parameters: row.parameters,
      backtestResults: row.backtest_results,
      isActive: row.is_active,
      isPublic: row.is_public,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapToJournalEntry(row: any): TradingJournal {
    return {
      id: row.id,
      userId: row.user_id,
      tradeId: row.trade_id,
      entryDate: row.entry_date,
      title: row.title,
      content: row.content,
      mood: row.mood as JournalMood,
      tags: row.tags,
      attachments: row.attachments,
      isPrivate: row.is_private,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const tradingService = new TradingService();