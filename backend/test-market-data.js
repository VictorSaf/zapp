// Test script for Market Data API functionality
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
let authToken = '';

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

async function getSupportedSymbols() {
  try {
    console.log('\n📊 Getting supported symbols...');
    const response = await api.get('/market-data/symbols');
    console.log('✅ Supported symbols:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to get symbols:', error.response?.data || error.message);
    throw error;
  }
}

async function getQuote(symbol) {
  try {
    console.log(`\n💰 Getting quote for ${symbol}...`);
    const response = await api.get(`/market-data/quote/${symbol}`);
    const quote = response.data.data;
    console.log('✅ Quote received:', {
      symbol: quote.symbol,
      bid: quote.bid,
      ask: quote.ask,
      price: quote.price,
      spread: (quote.ask - quote.bid).toFixed(5),
      timestamp: quote.timestamp
    });
    return quote;
  } catch (error) {
    console.error('❌ Failed to get quote:', error.response?.data || error.message);
    throw error;
  }
}

async function getHistoricalData(symbol, timeframe, limit = 10) {
  try {
    console.log(`\n📈 Getting historical data for ${symbol} (${timeframe})...`);
    const response = await api.get(`/market-data/historical/${symbol}`, {
      params: { timeframe, limit }
    });
    const data = response.data.data;
    console.log(`✅ Retrieved ${data.length} candles`);
    
    // Display last 5 candles
    console.log('Last 5 candles:');
    data.slice(-5).forEach(candle => {
      console.log(`  ${new Date(candle.timestamp).toISOString()} - O: ${candle.open} H: ${candle.high} L: ${candle.low} C: ${candle.close}`);
    });
    
    return data;
  } catch (error) {
    console.error('❌ Failed to get historical data:', error.response?.data || error.message);
    throw error;
  }
}

async function getIndicators(symbol, timeframe) {
  try {
    console.log(`\n📊 Getting technical indicators for ${symbol} (${timeframe})...`);
    const response = await api.get(`/market-data/indicators/${symbol}`, {
      params: { timeframe }
    });
    const indicators = response.data.data;
    console.log('✅ Technical Indicators:');
    indicators.forEach(ind => {
      if (ind.metadata) {
        console.log(`  - ${ind.name}(${ind.period}): ${ind.value.toFixed(5)} | metadata:`, ind.metadata);
      } else {
        console.log(`  - ${ind.name}(${ind.period}): ${ind.value.toFixed(5)}`);
      }
    });
    return indicators;
  } catch (error) {
    console.error('❌ Failed to get indicators:', error.response?.data || error.message);
    throw error;
  }
}

async function getMarketSignals(symbol, timeframe) {
  try {
    console.log(`\n🚦 Getting market signals for ${symbol} (${timeframe})...`);
    const response = await api.get(`/market-data/signals/${symbol}`, {
      params: { timeframe }
    });
    const signals = response.data.data;
    console.log('✅ Market Signals:');
    signals.forEach(signal => {
      const icon = signal.type === 'buy' ? '🟢' : signal.type === 'sell' ? '🔴' : '⚪';
      console.log(`  ${icon} ${signal.type.toUpperCase()} (${signal.strength}) - ${signal.indicator}: ${signal.reason} [${(signal.confidence * 100).toFixed(0)}% confidence]`);
    });
    return signals;
  } catch (error) {
    console.error('❌ Failed to get signals:', error.response?.data || error.message);
    throw error;
  }
}

async function subscribeToSymbol(symbol) {
  try {
    console.log(`\n📡 Subscribing to real-time updates for ${symbol}...`);
    const response = await api.post('/market-data/subscribe', { symbol });
    console.log('✅ Subscription created:', response.data.data);
    return response.data.data.subscriptionId;
  } catch (error) {
    console.error('❌ Failed to subscribe:', error.response?.data || error.message);
    throw error;
  }
}

async function getBulkQuotes(symbols) {
  try {
    console.log(`\n💹 Getting bulk quotes for ${symbols.join(', ')}...`);
    const response = await api.post('/market-data/bulk-quotes', { symbols });
    console.log('✅ Bulk quotes:');
    response.data.data.forEach(result => {
      if (result.quote) {
        console.log(`  - ${result.symbol}: ${result.quote.price} (Bid: ${result.quote.bid}, Ask: ${result.quote.ask})`);
      } else {
        console.log(`  - ${result.symbol}: Error - ${result.error}`);
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to get bulk quotes:', error.response?.data || error.message);
    throw error;
  }
}

async function compareSymbols(baseSymbol, compareSymbols, timeframe = 'D1', period = 30) {
  try {
    console.log(`\n📊 Comparing ${compareSymbols.join(', ')} against ${baseSymbol}...`);
    const response = await api.get(`/market-data/compare/${baseSymbol}`, {
      params: { 
        symbols: compareSymbols.join(','),
        timeframe,
        period
      }
    });
    console.log('✅ Symbol comparison:');
    response.data.data.forEach(result => {
      if (result.change !== undefined) {
        const icon = result.change > 0 ? '📈' : '📉';
        console.log(`  ${icon} ${result.symbol}: ${result.change.toFixed(2)}% (${result.firstPrice.toFixed(5)} → ${result.lastPrice.toFixed(5)})`);
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('❌ Failed to compare symbols:', error.response?.data || error.message);
    throw error;
  }
}

// Mock Market Data API endpoints for demonstration
function createMockMarketDataAPI() {
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

  // Mock routes (simplified versions)
  app.get('/api/market-data/symbols', mockAuth, (req, res) => {
    res.json({
      success: true,
      data: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'SPX500']
    });
  });

  app.get('/api/market-data/quote/:symbol', mockAuth, (req, res) => {
    const basePrice = {
      'EURUSD': 1.0850,
      'GBPUSD': 1.2650,
      'USDJPY': 150.50,
      'XAUUSD': 2050.00,
      'BTCUSD': 45000.00,
      'SPX500': 4800.00
    }[req.params.symbol] || 1.0;

    const spread = 0.0001;
    const price = basePrice + (Math.random() - 0.5) * 0.001;

    res.json({
      success: true,
      data: {
        symbol: req.params.symbol,
        bid: price - spread,
        ask: price + spread,
        price: price,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date()
      }
    });
  });

  return app;
}

// Main test flow
async function runTests() {
  console.log('🧪 Starting Market Data API Tests...\n');

  // Check if we should use mock API
  const useMockAPI = process.argv.includes('--mock');
  
  if (useMockAPI) {
    console.log('🎭 Using mock API server...');
    const mockApp = createMockMarketDataAPI();
    const server = mockApp.listen(3000, () => {
      console.log('Mock server running on port 3000\n');
    });
    
    // Add simplified mock routes for other endpoints
    mockApp.get('/api/market-data/historical/:symbol', (req, res) => {
      const data = [];
      for (let i = 0; i < 10; i++) {
        const basePrice = 1.0850;
        data.push({
          timestamp: new Date(Date.now() - i * 3600000),
          open: basePrice + Math.random() * 0.01,
          high: basePrice + Math.random() * 0.015,
          low: basePrice - Math.random() * 0.01,
          close: basePrice + (Math.random() - 0.5) * 0.01,
          volume: Math.floor(Math.random() * 1000000)
        });
      }
      res.json({ success: true, data: data.reverse() });
    });

    mockApp.get('/api/market-data/indicators/:symbol', (req, res) => {
      res.json({
        success: true,
        data: [
          { name: 'SMA', period: 20, value: 1.0845 },
          { name: 'RSI', period: 14, value: 65.3 },
          { name: 'MACD', period: 0, value: 0.0012, metadata: { signal: 0.0010, histogram: 0.0002 } }
        ]
      });
    });

    mockApp.get('/api/market-data/signals/:symbol', (req, res) => {
      res.json({
        success: true,
        data: [
          { type: 'buy', strength: 'medium', indicator: 'RSI', reason: 'Oversold recovery', confidence: 0.7 },
          { type: 'buy', strength: 'weak', indicator: 'MA', reason: 'Golden cross', confidence: 0.6 }
        ]
      });
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  try {
    // Run test sequence
    await login();
    
    // Test 1: Get supported symbols
    const symbols = await getSupportedSymbols();
    
    // Test 2: Get quotes for major pairs
    const testSymbols = ['EURUSD', 'GBPUSD', 'XAUUSD'];
    for (const symbol of testSymbols.slice(0, 2)) {
      await getQuote(symbol);
    }
    
    // Test 3: Get historical data
    await getHistoricalData('EURUSD', 'H1', 20);
    
    // Test 4: Get technical indicators
    await getIndicators('EURUSD', 'H1');
    
    // Test 5: Get market signals
    await getMarketSignals('EURUSD', 'H1');
    
    // Test 6: Subscribe to real-time updates
    const subscriptionId = await subscribeToSymbol('EURUSD');
    
    // Test 7: Get bulk quotes
    await getBulkQuotes(['EURUSD', 'GBPUSD', 'USDJPY']);
    
    // Test 8: Compare symbols
    await compareSymbols('EURUSD', ['GBPUSD', 'USDJPY'], 'D1', 7);
    
    console.log('\n✅ All market data tests completed successfully!');
    
    // Simulate real-time updates for 5 seconds
    console.log('\n📡 Simulating real-time price updates for 5 seconds...');
    let updateCount = 0;
    const updateInterval = setInterval(async () => {
      try {
        const quote = await getQuote('EURUSD');
        updateCount++;
        if (updateCount >= 3) {
          clearInterval(updateInterval);
          console.log('\n✅ Real-time simulation complete!');
          if (useMockAPI) {
            process.exit(0);
          }
        }
      } catch (error) {
        clearInterval(updateInterval);
      }
    }, 2000);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();