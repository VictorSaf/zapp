// Test script for Trading API functionality
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let testAccountId = '';
let testTradeId = '';

// Test user credentials
const testUser = {
  email: 'trader@example.com',
  password: 'Trader123!@#'
};

// Axios instance with auth
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Test functions
async function registerUser() {
  try {
    console.log('📝 Registering test user...');
    const response = await api.post('/auth/register', {
      email: testUser.email,
      password: testUser.password,
      fullName: 'Test Trader',
      tradingExperience: 'intermediate'
    });
    console.log('✅ User registered:', response.data);
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️ User already exists, proceeding to login');
    } else {
      console.error('❌ Registration failed:', error.response?.data || error.message);
    }
  }
}

async function login() {
  try {
    console.log('\n🔐 Logging in...');
    const response = await api.post('/auth/login', testUser);
    authToken = response.data.data.token;
    console.log('✅ Login successful');
    console.log('👤 User:', response.data.data.user.email);
    return response.data.data.user.id;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createTradingAccount() {
  try {
    console.log('\n💰 Creating trading account...');
    const response = await api.post('/trading/accounts', {
      accountName: 'Demo Trading Account',
      accountType: 'demo',
      broker: 'ZAEUS Demo',
      currency: 'USD',
      initialBalance: 10000,
      leverage: 30
    });
    testAccountId = response.data.data.id;
    console.log('✅ Trading account created:', {
      id: response.data.data.id,
      name: response.data.data.accountName,
      balance: response.data.data.currentBalance
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to create account:', error.response?.data || error.message);
    throw error;
  }
}

async function getTradingInstruments() {
  try {
    console.log('\n📊 Getting trading instruments...');
    const response = await api.get('/trading/instruments');
    console.log('✅ Available instruments:');
    response.data.data.forEach(instrument => {
      console.log(`  - ${instrument.symbol}: ${instrument.name} (${instrument.instrumentType})`);
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to get instruments:', error.response?.data || error.message);
    throw error;
  }
}

async function createTrade(instrumentId) {
  try {
    console.log('\n📈 Creating a trade...');
    const response = await api.post('/trading/trades', {
      accountId: testAccountId,
      instrumentId: instrumentId,
      tradeType: 'buy',
      entryPrice: 1.0850,
      quantity: 10000,
      stopLoss: 1.0800,
      takeProfit: 1.0900,
      notes: 'Test trade - EUR/USD long position'
    });
    testTradeId = response.data.data.id;
    console.log('✅ Trade created:', {
      id: response.data.data.id,
      type: response.data.data.tradeType,
      quantity: response.data.data.quantity,
      entryPrice: response.data.data.entryPrice
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to create trade:', error.response?.data || error.message);
    throw error;
  }
}

async function getAccountTrades() {
  try {
    console.log('\n📋 Getting account trades...');
    const response = await api.get(`/trading/accounts/${testAccountId}/trades`);
    console.log('✅ Account trades:');
    response.data.data.forEach(trade => {
      console.log(`  - Trade ${trade.id}: ${trade.tradeType} ${trade.quantity} @ ${trade.entryPrice} (${trade.status})`);
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to get trades:', error.response?.data || error.message);
    throw error;
  }
}

async function closeTrade() {
  try {
    console.log('\n🔒 Closing trade...');
    const response = await api.put(`/trading/trades/${testTradeId}?accountId=${testAccountId}`, {
      exitPrice: 1.0870,
      status: 'closed'
    });
    console.log('✅ Trade closed:', {
      id: response.data.data.id,
      exitPrice: response.data.data.exitPrice,
      profitLoss: response.data.data.profitLoss,
      status: response.data.data.status
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to close trade:', error.response?.data || error.message);
    throw error;
  }
}

async function getPortfolioSummary() {
  try {
    console.log('\n📊 Getting portfolio summary...');
    const response = await api.get(`/trading/accounts/${testAccountId}/portfolio/summary`);
    const summary = response.data.data;
    console.log('✅ Portfolio Summary:');
    console.log(`  - Total Value: $${summary.totalValue.toFixed(2)}`);
    console.log(`  - Total P&L: $${summary.totalPnl.toFixed(2)} (${summary.totalPnlPercent.toFixed(2)}%)`);
    console.log(`  - Win Rate: ${summary.winRate.toFixed(2)}%`);
    console.log(`  - Total Trades: ${summary.totalTrades}`);
    return summary;
  } catch (error) {
    console.error('❌ Failed to get portfolio summary:', error.response?.data || error.message);
    throw error;
  }
}

async function createJournalEntry() {
  try {
    console.log('\n📝 Creating journal entry...');
    const response = await api.post('/trading/journal', {
      tradeId: testTradeId,
      title: 'EUR/USD Long Trade Analysis',
      content: 'Entered long position based on support level and positive momentum. Trade executed well with 20 pip profit.',
      mood: 'confident',
      tags: ['forex', 'eurusd', 'momentum']
    });
    console.log('✅ Journal entry created:', {
      id: response.data.data.id,
      title: response.data.data.title,
      mood: response.data.data.mood
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to create journal entry:', error.response?.data || error.message);
    throw error;
  }
}

async function createTradingStrategy() {
  try {
    console.log('\n🎯 Creating trading strategy...');
    const response = await api.post('/trading/strategies', {
      name: 'MA Crossover Strategy',
      description: 'Simple moving average crossover strategy for trend following',
      strategyType: 'trend_following',
      rules: {
        entry: {
          conditions: [
            { indicator: 'SMA', period: 20, crosses: 'above', target: { indicator: 'SMA', period: 50 } }
          ]
        },
        exit: {
          conditions: [
            { indicator: 'SMA', period: 20, crosses: 'below', target: { indicator: 'SMA', period: 50 } }
          ]
        },
        riskManagement: {
          stopLoss: { type: 'percentage', value: 2 },
          takeProfit: { type: 'percentage', value: 4 },
          positionSize: { type: 'fixed_percentage', value: 5 }
        }
      },
      parameters: {
        fastMA: 20,
        slowMA: 50,
        timeframe: 'H1'
      },
      isPublic: false
    });
    console.log('✅ Strategy created:', {
      id: response.data.data.id,
      name: response.data.data.name,
      type: response.data.data.strategyType
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to create strategy:', error.response?.data || error.message);
    throw error;
  }
}

// Mock Trading API endpoints for demonstration
function createMockTradingAPI() {
  const express = require('express');
  const app = express();
  app.use(express.json());

  // Mock data
  const mockInstruments = [
    { id: '1', symbol: 'EURUSD', name: 'Euro/US Dollar', instrumentType: 'forex' },
    { id: '2', symbol: 'GBPUSD', name: 'British Pound/US Dollar', instrumentType: 'forex' },
    { id: '3', symbol: 'XAUUSD', name: 'Gold/US Dollar', instrumentType: 'commodity' }
  ];

  const mockAccounts = new Map();
  const mockTrades = new Map();
  const mockJournal = [];
  const mockStrategies = [];

  // Mock auth middleware
  const mockAuth = (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    req.user = { id: 'test-user-123' };
    next();
  };

  // Mock routes
  app.post('/api/auth/register', (req, res) => {
    res.json({ success: true, message: 'User registered' });
  });

  app.post('/api/auth/login', (req, res) => {
    res.json({
      success: true,
      data: {
        token: 'mock-jwt-token',
        user: { id: 'test-user-123', email: req.body.email }
      }
    });
  });

  app.post('/api/trading/accounts', mockAuth, (req, res) => {
    const account = {
      id: `acc-${Date.now()}`,
      userId: req.user.id,
      ...req.body,
      currentBalance: req.body.initialBalance,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockAccounts.set(account.id, account);
    res.status(201).json({ success: true, data: account });
  });

  app.get('/api/trading/instruments', mockAuth, (req, res) => {
    res.json({ success: true, data: mockInstruments });
  });

  app.post('/api/trading/trades', mockAuth, (req, res) => {
    const trade = {
      id: `trade-${Date.now()}`,
      ...req.body,
      status: 'open',
      openTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockTrades.set(trade.id, trade);
    res.status(201).json({ success: true, data: trade });
  });

  app.get('/api/trading/accounts/:accountId/trades', mockAuth, (req, res) => {
    const trades = Array.from(mockTrades.values()).filter(t => t.accountId === req.params.accountId);
    res.json({ success: true, data: trades });
  });

  app.put('/api/trading/trades/:tradeId', mockAuth, (req, res) => {
    const trade = mockTrades.get(req.params.tradeId);
    if (!trade) {
      return res.status(404).json({ success: false, error: 'Trade not found' });
    }
    
    // Update trade
    Object.assign(trade, req.body);
    
    // Calculate profit/loss if closing
    if (req.body.status === 'closed' && req.body.exitPrice) {
      const profitLoss = (req.body.exitPrice - trade.entryPrice) * trade.quantity;
      trade.profitLoss = profitLoss;
      trade.closeTime = new Date();
      
      // Update account balance
      const account = mockAccounts.get(trade.accountId);
      if (account) {
        account.currentBalance += profitLoss;
      }
    }
    
    trade.updatedAt = new Date();
    res.json({ success: true, data: trade });
  });

  app.get('/api/trading/accounts/:accountId/portfolio/summary', mockAuth, (req, res) => {
    const account = mockAccounts.get(req.params.accountId);
    const trades = Array.from(mockTrades.values()).filter(t => t.accountId === req.params.accountId);
    const closedTrades = trades.filter(t => t.status === 'closed');
    const winningTrades = closedTrades.filter(t => t.profitLoss > 0);
    
    const summary = {
      totalValue: account?.currentBalance || 0,
      totalPnl: closedTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0),
      totalPnlPercent: account ? ((account.currentBalance - account.initialBalance) / account.initialBalance) * 100 : 0,
      todayPnl: 0,
      todayPnlPercent: 0,
      openPositions: trades.filter(t => t.status === 'open').length,
      totalTrades: trades.length,
      winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
      profitFactor: 1.5,
      sharpeRatio: 0.8,
      maxDrawdown: 5.2
    };
    
    res.json({ success: true, data: summary });
  });

  app.post('/api/trading/journal', mockAuth, (req, res) => {
    const entry = {
      id: `journal-${Date.now()}`,
      userId: req.user.id,
      ...req.body,
      entryDate: req.body.entryDate || new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockJournal.push(entry);
    res.status(201).json({ success: true, data: entry });
  });

  app.post('/api/trading/strategies', mockAuth, (req, res) => {
    const strategy = {
      id: `strat-${Date.now()}`,
      userId: req.user.id,
      ...req.body,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    mockStrategies.push(strategy);
    res.status(201).json({ success: true, data: strategy });
  });

  return app;
}

// Main test flow
async function runTests() {
  console.log('🧪 Starting Trading API Tests...\n');

  // Check if we should use mock API
  const useMockAPI = process.argv.includes('--mock');
  
  if (useMockAPI) {
    console.log('🎭 Using mock API server...');
    const mockApp = createMockTradingAPI();
    const server = mockApp.listen(3000, () => {
      console.log('Mock server running on port 3000\n');
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  try {
    // Run test sequence
    await registerUser();
    const userId = await login();
    
    const account = await createTradingAccount();
    const instruments = await getTradingInstruments();
    
    // Use first instrument for trading
    if (instruments.length > 0) {
      const trade = await createTrade(instruments[0].id);
      await getAccountTrades();
      await closeTrade();
      await getPortfolioSummary();
      await createJournalEntry();
    }
    
    await createTradingStrategy();
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
  
  if (useMockAPI) {
    process.exit(0);
  }
}

// Run tests
runTests();