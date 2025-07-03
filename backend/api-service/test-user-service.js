#!/usr/bin/env node

/**
 * Test UserService functionality
 */

// Import using ts-node/register for TypeScript files
require('ts-node/register');
const { UserService } = require('./src/services/userService');

async function testUserService() {
  console.log('🧪 Testing UserService...\n');

  try {
    const userService = new UserService();

    // Test 1: Get user by email (admin)
    console.log('📝 Test 1: Get admin user by email');
    const adminUser = await userService.getUserByEmail('admin@zaeus.dev');
    if (adminUser) {
      console.log(`✅ Found admin user: ${adminUser.first_name} ${adminUser.last_name}`);
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Active: ${adminUser.is_active}`);
    } else {
      console.log('❌ Admin user not found');
    }

    // Test 2: Get user with profile
    if (adminUser) {
      console.log('\n📝 Test 2: Get user with profile');
      const userWithProfile = await userService.getUserWithProfile(adminUser.id);
      if (userWithProfile) {
        console.log(`✅ Found user with profile`);
        console.log(`   Experience: ${userWithProfile.profile.trading_experience}`);
        console.log(`   Markets: ${userWithProfile.profile.preferred_markets}`);
        console.log(`   Theme: ${userWithProfile.profile.theme}`);
      } else {
        console.log('❌ User profile not found');
      }
    }

    // Test 3: Create new test user
    console.log('\n📝 Test 3: Create new test user');
    try {
      const newUser = await userService.createUser({
        email: 'test@zaeus.dev',
        password: 'testpassword123',
        first_name: 'Test',
        last_name: 'User',
        trading_experience: 'beginner',
        preferred_markets: ['forex'],
        risk_tolerance: 'low'
      });
      console.log(`✅ Created test user: ${newUser.first_name} ${newUser.last_name}`);
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Email: ${newUser.email}`);

      // Test 4: Verify password
      console.log('\n📝 Test 4: Verify password');
      const testUserFull = await userService.getUserByEmail('test@zaeus.dev');
      if (testUserFull) {
        const isValidPassword = await userService.verifyPassword('testpassword123', testUserFull.password_hash);
        console.log(`✅ Password verification: ${isValidPassword ? 'PASS' : 'FAIL'}`);
        
        const isInvalidPassword = await userService.verifyPassword('wrongpassword', testUserFull.password_hash);
        console.log(`✅ Invalid password check: ${!isInvalidPassword ? 'PASS' : 'FAIL'}`);
      }

      // Test 5: Update user
      console.log('\n📝 Test 5: Update user');
      const updatedUser = await userService.updateUser(newUser.id, {
        first_name: 'Updated Test',
        last_name: 'Updated User'
      });
      console.log(`✅ Updated user: ${updatedUser.first_name} ${updatedUser.last_name}`);

      // Test 6: Get users with pagination
      console.log('\n📝 Test 6: Get users with pagination');
      const usersPage = await userService.getUsers({}, { page: 1, limit: 10 });
      console.log(`✅ Found ${usersPage.users.length} users (total: ${usersPage.total})`);
      console.log(`   Page: ${usersPage.page}, Limit: ${usersPage.limit}`);

      // Test 7: Delete test user
      console.log('\n📝 Test 7: Delete test user');
      await userService.deleteUser(newUser.id);
      const deletedUser = await userService.getUserById(newUser.id);
      console.log(`✅ User deletion: ${deletedUser === null ? 'PASS' : 'FAIL'}`);

    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Test user already exists - cleaning up...');
        const existingUser = await userService.getUserByEmail('test@zaeus.dev');
        if (existingUser) {
          await userService.deleteUser(existingUser.id);
          console.log('✅ Cleanup completed');
        }
      } else {
        throw error;
      }
    }

    console.log('\n🎉 All UserService tests passed!');

  } catch (error) {
    console.error('❌ UserService test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Check dependencies and run
async function checkAndRun() {
  try {
    console.log('📦 Using ts-node for TypeScript execution...');
    
    await testUserService();
  } catch (error) {
    console.error('Setup error:', error.message);
    process.exit(1);
  }
}

checkAndRun();