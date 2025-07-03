#!/usr/bin/env node

/**
 * ZAEUS Database Connection Test
 * Tests PostgreSQL and Redis connections
 */

const { Client } = require('pg');
const redis = require('redis');

// PostgreSQL connection test
async function testPostgreSQL() {
  console.log('🔍 Testing PostgreSQL connection...');
  
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'zaeus_db',
    user: 'zaeus_user',
    password: 'zaeus_password',
  });

  try {
    await client.connect();
    console.log('✅ PostgreSQL connection successful!');
    
    // Test basic query
    const result = await client.query('SELECT version()');
    console.log(`📊 PostgreSQL version: ${result.rows[0].version.split(' ')[1]}`);
    
    // Test schemas
    const schemas = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name IN ('zaeus_core', 'zaeus_ai', 'zaeus_analytics')
    `);
    console.log(`🗄️  Available schemas: ${schemas.rows.map(r => r.schema_name).join(', ')}`);
    
    await client.end();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    return false;
  }
  
  return true;
}

// Redis connection test
async function testRedis() {
  console.log('\n🔍 Testing Redis connection...');
  
  const client = redis.createClient({
    host: 'localhost',
    port: 6379,
    password: 'redis_password'
  });

  try {
    await client.connect();
    console.log('✅ Redis connection successful!');
    
    // Test basic operations
    await client.set('test_key', 'ZAEUS_TEST');
    const value = await client.get('test_key');
    console.log(`📝 Redis test value: ${value}`);
    
    // Test info
    const info = await client.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)[1];
    console.log(`📊 Redis version: ${version}`);
    
    // Cleanup
    await client.del('test_key');
    await client.disconnect();
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    return false;
  }
  
  return true;
}

// Main test function
async function runTests() {
  console.log('🚀 ZAEUS Database Connection Tests\n');
  
  const postgresOK = await testPostgreSQL();
  const redisOK = await testRedis();
  
  console.log('\n📋 Test Results:');
  console.log(`PostgreSQL: ${postgresOK ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Redis: ${redisOK ? '✅ PASS' : '❌ FAIL'}`);
  
  if (postgresOK && redisOK) {
    console.log('\n🎉 All database connections are working correctly!');
    process.exit(0);
  } else {
    console.log('\n💥 Some connections failed. Please check your Docker services.');
    process.exit(1);
  }
}

// Handle dependencies check
async function checkDependencies() {
  try {
    require('pg');
    require('redis');
  } catch (error) {
    console.log('📦 Installing required dependencies...');
    const { execSync } = require('child_process');
    execSync('npm init -y', { stdio: 'ignore' });
    execSync('npm install pg redis', { stdio: 'inherit' });
  }
}

// Run if this file is executed directly
if (require.main === module) {
  checkDependencies().then(runTests).catch(console.error);
}

module.exports = { testPostgreSQL, testRedis };