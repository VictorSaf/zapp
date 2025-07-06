const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
let authToken = null;
let accountId = null;

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@zaeus.ai',
      password: 'Admin123!@#'
    });
    
    authToken = response.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function getAccounts() {
  try {
    console.log('\n📊 Fetching trading accounts...');
    const response = await axios.get(`${API_BASE_URL}/trading/accounts`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.data.length > 0) {
      accountId = response.data.data[0].id;
      console.log('✅ Found account:', response.data.data[0].accountName);
      return true;
    }
    
    console.log('❌ No trading accounts found');
    return false;
  } catch (error) {
    console.error('❌ Failed to fetch accounts:', error.response?.data || error.message);
    return false;
  }
}

async function testPortfolioMetrics() {
  try {
    console.log('\n📈 Testing Portfolio Metrics...');
    
    const response = await axios.get(`${API_BASE_URL}/portfolio/${accountId}/metrics`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Portfolio Metrics:', JSON.stringify(response.data.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Failed to fetch metrics:', error.response?.data || error.message);
    return false;
  }
}

async function testPerformanceData() {
  try {
    console.log('\n📊 Testing Performance Data...');
    
    const periods = ['day', 'week', 'month', 'year', 'all'];
    
    for (const period of periods) {
      const response = await axios.get(`${API_BASE_URL}/portfolio/${accountId}/performance?period=${period}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log(`✅ Performance data for ${period}:`, response.data.data.length, 'data points');
      if (response.data.data.length > 0) {
        console.log('   Sample:', response.data.data[0]);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to fetch performance data:', error.response?.data || error.message);
    return false;
  }
}

async function testTradeAnalytics() {
  try {
    console.log('\n📊 Testing Trade Analytics...');
    
    const response = await axios.get(`${API_BASE_URL}/portfolio/${accountId}/analytics`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const analytics = response.data.data;
    console.log('✅ Trade Analytics:');
    console.log('   By Instrument:', Object.keys(analytics.byInstrument));
    console.log('   By Time of Day:', Object.keys(analytics.byTimeOfDay).length, 'hours');
    console.log('   By Size:', Object.keys(analytics.bySize));
    
    return true;
  } catch (error) {
    console.error('❌ Failed to fetch analytics:', error.response?.data || error.message);
    return false;
  }
}

async function testRiskMetrics() {
  try {
    console.log('\n⚠️ Testing Risk Metrics...');
    
    const response = await axios.get(`${API_BASE_URL}/portfolio/${accountId}/risk`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const risk = response.data.data;
    console.log('✅ Risk Metrics:');
    console.log(`   Value at Risk (95%): $${risk.valueAtRisk95.toFixed(2)}`);
    console.log(`   Expected Shortfall: $${risk.expectedShortfall.toFixed(2)}`);
    console.log(`   Downside Deviation: ${risk.downsideDeviation.toFixed(2)}%`);
    console.log(`   Ulcer Index: ${risk.ulcerIndex.toFixed(2)}`);
    console.log(`   Omega Ratio: ${risk.omega.toFixed(2)}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to fetch risk metrics:', error.response?.data || error.message);
    return false;
  }
}

async function testBenchmarkComparisons() {
  try {
    console.log('\n🎯 Testing Benchmark Comparisons...');
    
    const response = await axios.get(`${API_BASE_URL}/portfolio/${accountId}/benchmarks?benchmarks=SPX,DXY,BTC`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Benchmark Comparisons:');
    response.data.data.forEach(comp => {
      console.log(`   vs ${comp.benchmark}:`);
      console.log(`      Alpha: ${comp.alpha.toFixed(2)}%`);
      console.log(`      Beta: ${comp.beta.toFixed(2)}`);
      console.log(`      Information Ratio: ${comp.informationRatio.toFixed(2)}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to compare benchmarks:', error.response?.data || error.message);
    return false;
  }
}

async function testReportGeneration() {
  try {
    console.log('\n📄 Testing Report Generation...');
    
    // Test PDF generation
    console.log('   Generating PDF report...');
    const pdfResponse = await axios.post(
      `${API_BASE_URL}/portfolio/${accountId}/report`,
      {
        format: 'pdf',
        includeMetrics: true,
        includeCharts: true,
        includeTradeList: true,
        includeBenchmarks: true
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
        responseType: 'arraybuffer'
      }
    );
    
    console.log('✅ PDF report generated:', pdfResponse.data.byteLength, 'bytes');
    
    // Test Excel generation
    console.log('   Generating Excel report...');
    const excelResponse = await axios.post(
      `${API_BASE_URL}/portfolio/${accountId}/report`,
      {
        format: 'excel',
        includeMetrics: true,
        includeTradeList: true
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
        responseType: 'arraybuffer'
      }
    );
    
    console.log('✅ Excel report generated:', excelResponse.data.byteLength, 'bytes');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to generate reports:', error.response?.data || error.message);
    return false;
  }
}

async function testPortfolioSummary() {
  try {
    console.log('\n📊 Testing Portfolio Summary...');
    
    const response = await axios.get(`${API_BASE_URL}/portfolio/summary`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const summary = response.data.data;
    console.log('✅ Portfolio Summary:');
    console.log(`   Total Accounts: ${summary.totals.accountCount}`);
    console.log(`   Total Value: $${summary.totals.totalValue.toFixed(2)}`);
    console.log(`   Total P&L: $${summary.totals.totalPnL.toFixed(2)}`);
    console.log(`   Daily P&L: $${summary.totals.dailyPnL.toFixed(2)}`);
    
    console.log('\n   Account Details:');
    summary.accounts.forEach(acc => {
      console.log(`   - ${acc.accountName} (${acc.accountType}): $${acc.totalValue.toFixed(2)}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to fetch portfolio summary:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Portfolio Analytics Tests...');
  console.log('=====================================\n');
  
  // Login first
  if (!await login()) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }
  
  // Get trading account
  if (!await getAccounts()) {
    console.log('\n❌ Cannot proceed without a trading account');
    return;
  }
  
  // Run all tests
  const tests = [
    testPortfolioMetrics,
    testPerformanceData,
    testTradeAnalytics,
    testRiskMetrics,
    testBenchmarkComparisons,
    testReportGeneration,
    testPortfolioSummary
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await test();
    if (result) passed++;
    else failed++;
  }
  
  // Summary
  console.log('\n=====================================');
  console.log('📊 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(0)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All Portfolio Analytics tests passed! 🎉');
  }
}

// Run the tests
runTests().catch(console.error);