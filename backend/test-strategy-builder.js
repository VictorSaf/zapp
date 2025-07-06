// Test script for Strategy Builder functionality
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let testStrategyId = '';

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
async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await api.post('/auth/login', testUser);
    authToken = response.data.data.token;
    console.log('✅ Login successful');
    return response.data.data.user.id;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createTestStrategy() {
  try {
    console.log('\n📝 Creating test strategy...');
    const strategyData = {
      name: 'MA Crossover Test Strategy',
      description: 'Simple moving average crossover strategy for testing',
      strategyType: 'trend_following',
      rules: {
        entry: {
          type: 'entry',
          conditions: [
            {
              indicator: 'SMA',
              period: 20,
              operator: 'crosses_above',
              target: { indicator: 'SMA', period: 50 }
            },
            {
              indicator: 'RSI',
              period: 14,
              operator: 'gt',
              value: 30
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
              operator: 'crosses_below',
              target: { indicator: 'SMA', period: 50 }
            },
            {
              indicator: 'RSI',
              period: 14,
              operator: 'gt',
              value: 70
            }
          ],
          logic: 'OR'
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
        rsiPeriod: 14,
        timeframe: 'H1'
      },
      isPublic: false
    };

    const response = await api.post('/strategies', strategyData);
    testStrategyId = response.data.data.id;
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

async function getUserStrategies() {
  try {
    console.log('\n📋 Getting user strategies...');
    const response = await api.get('/strategies');
    console.log(`✅ Found ${response.data.data.length} strategies`);
    response.data.data.forEach(strategy => {
      console.log(`  - ${strategy.name} (${strategy.strategyType}) - ${strategy.isActive ? 'Active' : 'Inactive'}`);
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to get strategies:', error.response?.data || error.message);
    throw error;
  }
}

async function backtestStrategy(strategyId) {
  try {
    console.log('\n📊 Running backtest...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // 3 months back

    const backtestParams = {
      symbol: 'EURUSD',
      timeframe: 'H1',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      initialBalance: 10000
    };

    console.log('Backtest parameters:', {
      ...backtestParams,
      startDate: startDate.toLocaleDateString(),
      endDate: endDate.toLocaleDateString()
    });

    const response = await api.post(`/strategies/${strategyId}/backtest`, backtestParams);
    const results = response.data.data;
    
    console.log('✅ Backtest completed!');
    console.log('\n📈 Results Summary:');
    console.log(`  - Total Return: $${results.totalReturn.toFixed(2)} (${results.totalReturnPercent.toFixed(2)}%)`);
    console.log(`  - Final Balance: $${results.finalBalance.toFixed(2)}`);
    console.log(`  - Total Trades: ${results.metrics.totalTrades}`);
    console.log(`  - Win Rate: ${results.metrics.winRate.toFixed(1)}%`);
    console.log(`  - Profit Factor: ${results.metrics.profitFactor.toFixed(2)}`);
    console.log(`  - Max Drawdown: -${results.metrics.maxDrawdownPercent.toFixed(1)}%`);
    console.log(`  - Sharpe Ratio: ${results.metrics.sharpeRatio.toFixed(2)}`);
    
    return results;
  } catch (error) {
    console.error('❌ Backtest failed:', error.response?.data || error.message);
    throw error;
  }
}

async function generateAISuggestions() {
  try {
    console.log('\n🤖 Generating AI strategy suggestions...');
    const response = await api.post('/strategies/suggestions', {
      symbol: 'EURUSD',
      timeframe: 'H1',
      riskTolerance: 'medium',
      tradingStyle: 'swing_trading'
    });

    const suggestions = response.data.data;
    console.log(`✅ Generated ${suggestions.length} strategy suggestions:`);
    
    suggestions.forEach((strategy, index) => {
      console.log(`\n${index + 1}. ${strategy.name}`);
      console.log(`   Type: ${strategy.strategyType}`);
      console.log(`   Description: ${strategy.description}`);
      if (strategy.parameters) {
        console.log(`   Parameters:`, strategy.parameters);
      }
    });
    
    return suggestions;
  } catch (error) {
    console.error('❌ Failed to generate suggestions:', error.response?.data || error.message);
    throw error;
  }
}

async function evaluateStrategy(strategyId) {
  try {
    console.log('\n🔍 Evaluating strategy for current market...');
    const response = await api.post(`/strategies/${strategyId}/evaluate`, {
      symbol: 'EURUSD',
      timeframe: 'H1'
    });

    const evaluation = response.data.data;
    console.log('✅ Strategy evaluation:');
    
    if (evaluation.signal) {
      console.log(`  📍 Signal: ${evaluation.signal.type.toUpperCase()} ${evaluation.signal.action.toUpperCase()}`);
      console.log(`  💰 Price: ${evaluation.signal.price}`);
      console.log(`  📊 Confidence: ${(evaluation.signal.confidence * 100).toFixed(0)}%`);
      console.log(`  📝 Reason: ${evaluation.signal.reason}`);
    } else {
      console.log('  ⏸️ No signal at current market conditions');
    }
    
    return evaluation;
  } catch (error) {
    console.error('❌ Evaluation failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getPublicStrategies() {
  try {
    console.log('\n🌐 Getting public strategies...');
    const response = await api.get('/strategies/public', {
      params: {
        minWinRate: 60,
        limit: 5
      }
    });

    const strategies = response.data.data;
    console.log(`✅ Found ${strategies.length} public strategies:`);
    
    strategies.forEach(strategy => {
      console.log(`\n  📊 ${strategy.name}`);
      console.log(`     Type: ${strategy.strategyType}`);
      console.log(`     Created by: ${strategy.userId}`);
      if (strategy.backtestResults) {
        console.log(`     Win Rate: ${strategy.backtestResults.winRate}%`);
      }
    });
    
    return strategies;
  } catch (error) {
    console.error('❌ Failed to get public strategies:', error.response?.data || error.message);
    throw error;
  }
}

async function updateStrategy(strategyId) {
  try {
    console.log('\n✏️ Updating strategy...');
    const updates = {
      description: 'Updated description with improved parameters',
      parameters: {
        fastMA: 10,
        slowMA: 30,
        rsiPeriod: 14,
        timeframe: 'H1'
      },
      isPublic: true
    };

    const response = await api.put(`/strategies/${strategyId}`, updates);
    console.log('✅ Strategy updated:', {
      name: response.data.data.name,
      isPublic: response.data.data.isPublic,
      updatedAt: response.data.data.updatedAt
    });
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to update strategy:', error.response?.data || error.message);
    throw error;
  }
}

// Mock endpoints for testing
function createMockStrategyAPI() {
  const express = require('express');
  const app = express();
  app.use(express.json());

  // Mock auth middleware
  const mockAuth = (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    req.user = { id: 'test-user-123' };
    next();
  };

  // Mock strategy storage
  const strategies = new Map();
  let strategyIdCounter = 1;

  // Mock routes
  app.post('/api/strategies', mockAuth, (req, res) => {
    const strategy = {
      id: `strategy-${strategyIdCounter++}`,
      userId: req.user.id,
      ...req.body,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    strategies.set(strategy.id, strategy);
    res.status(201).json({ success: true, data: strategy });
  });

  app.get('/api/strategies', mockAuth, (req, res) => {
    const userStrategies = Array.from(strategies.values())
      .filter(s => s.userId === req.user.id);
    res.json({ success: true, data: userStrategies });
  });

  app.post('/api/strategies/:id/backtest', mockAuth, (req, res) => {
    // Generate mock backtest results
    const results = {
      strategyId: req.params.id,
      symbol: req.body.symbol,
      timeframe: req.body.timeframe,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      initialBalance: req.body.initialBalance,
      finalBalance: req.body.initialBalance * 1.25,
      totalReturn: req.body.initialBalance * 0.25,
      totalReturnPercent: 25,
      trades: [],
      metrics: {
        totalTrades: 45,
        winningTrades: 30,
        losingTrades: 15,
        winRate: 66.7,
        avgWin: 120,
        avgLoss: -60,
        profitFactor: 2.0,
        maxDrawdown: 800,
        maxDrawdownPercent: 8,
        sharpeRatio: 1.5,
        sortinoRatio: 2.1,
        calmarRatio: 3.125,
        avgHoldingPeriod: 2.5,
        expectancy: 55.56,
        consecutiveWins: 7,
        consecutiveLosses: 3
      },
      equityCurve: []
    };
    
    // Update strategy with results
    const strategy = strategies.get(req.params.id);
    if (strategy) {
      strategy.backtestResults = results;
    }
    
    res.json({ success: true, data: results });
  });

  app.post('/api/strategies/suggestions', mockAuth, (req, res) => {
    const suggestions = [
      {
        id: 'ai-1',
        userId: 'ai-generated',
        name: 'Trend Following Strategy',
        description: 'AI-optimized for current market conditions',
        strategyType: 'trend_following',
        rules: {},
        parameters: { fastMA: 20, slowMA: 50 },
        isActive: true,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'ai-2',
        userId: 'ai-generated',
        name: 'Mean Reversion Strategy',
        description: 'Optimized for range-bound markets',
        strategyType: 'mean_reversion',
        rules: {},
        parameters: { bbPeriod: 20, bbStdDev: 2 },
        isActive: true,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    res.json({ success: true, data: suggestions });
  });

  return app;
}

// Main test flow
async function runTests() {
  console.log('🧪 Starting Strategy Builder Tests...\n');

  // Check if we should use mock API
  const useMockAPI = process.argv.includes('--mock');
  
  if (useMockAPI) {
    console.log('🎭 Using mock API server...');
    const mockApp = createMockStrategyAPI();
    const server = mockApp.listen(3000, () => {
      console.log('Mock server running on port 3000\n');
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  try {
    // Run test sequence
    await login();
    
    // Test 1: Create strategy
    const strategy = await createTestStrategy();
    
    // Test 2: Get user strategies
    await getUserStrategies();
    
    // Test 3: Run backtest
    await backtestStrategy(testStrategyId || strategy.id);
    
    // Test 4: Generate AI suggestions
    await generateAISuggestions();
    
    // Test 5: Evaluate strategy
    await evaluateStrategy(testStrategyId || strategy.id);
    
    // Test 6: Get public strategies
    await getPublicStrategies();
    
    // Test 7: Update strategy
    await updateStrategy(testStrategyId || strategy.id);
    
    console.log('\n✅ All strategy builder tests completed successfully!');
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