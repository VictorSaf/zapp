#!/usr/bin/env node

/**
 * ZAEUS Users Schema Test
 * Tests the users database schema and default data
 */

const { Client } = require('pg');

async function testUsersSchema() {
  console.log('🔍 Testing ZAEUS Users Schema...\n');
  
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'zaeus_db',
    user: 'zaeus_user',
    password: 'zaeus_password',
  });

  try {
    await client.connect();
    console.log('✅ Database connected');

    // Test if users table exists
    const usersTableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'zaeus_core' 
      AND table_name IN ('users', 'user_profiles', 'user_sessions')
    `);
    
    console.log(`📊 Found tables: ${usersTableResult.rows.map(r => r.table_name).join(', ')}`);

    // Test users table structure
    const usersStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'zaeus_core' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Users table structure:');
    usersStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Test default admin user
    const adminUser = await client.query(`
      SELECT id, email, first_name, last_name, is_active, email_verified, created_at
      FROM zaeus_core.users 
      WHERE email = 'admin@zaeus.dev'
    `);

    if (adminUser.rows.length > 0) {
      console.log('\n👤 Default admin user found:');
      const user = adminUser.rows[0];
      console.log(`  - ID: ${user.id}`);
      console.log(`  - Email: ${user.email}`);
      console.log(`  - Name: ${user.first_name} ${user.last_name}`);
      console.log(`  - Active: ${user.is_active}`);
      console.log(`  - Verified: ${user.email_verified}`);
      console.log(`  - Created: ${user.created_at}`);
    } else {
      console.log('\n❌ Default admin user not found');
    }

    // Test user profile
    const adminProfile = await client.query(`
      SELECT p.trading_experience, p.preferred_markets, p.risk_tolerance, p.learning_goals
      FROM zaeus_core.user_profiles p
      JOIN zaeus_core.users u ON p.user_id = u.id
      WHERE u.email = 'admin@zaeus.dev'
    `);

    if (adminProfile.rows.length > 0) {
      console.log('\n📊 Admin profile found:');
      const profile = adminProfile.rows[0];
      console.log(`  - Experience: ${profile.trading_experience}`);
      console.log(`  - Markets: ${profile.preferred_markets}`);
      console.log(`  - Risk: ${profile.risk_tolerance}`);
      console.log(`  - Goals: ${profile.learning_goals}`);
    } else {
      console.log('\n❌ Admin profile not found');
    }

    // Test indexes
    const indexes = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'zaeus_core' 
      AND tablename IN ('users', 'user_profiles', 'user_sessions')
      ORDER BY tablename, indexname
    `);

    console.log('\n🔍 Database indexes:');
    indexes.rows.forEach(row => {
      console.log(`  - ${row.tablename}.${row.indexname}`);
    });

    // Test triggers
    const triggers = await client.query(`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'zaeus_core'
    `);

    console.log('\n⚡ Database triggers:');
    triggers.rows.forEach(row => {
      console.log(`  - ${row.event_object_table}.${row.trigger_name}`);
    });

    await client.end();
    console.log('\n🎉 Users schema test completed successfully!');
    
  } catch (error) {
    console.error('❌ Users schema test failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

// Run test
testUsersSchema();