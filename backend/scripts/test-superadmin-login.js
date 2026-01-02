import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcrypt';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function testLogin() {
  try {
    console.log('\n🔐 Testing Superadmin Login\n');
    console.log('='.repeat(60));
    
    // Get superadmin user
    const result = await pool.query(`
      SELECT id, username, email, full_name, role, is_active, business_id, password_hash
      FROM users
      WHERE username = $1 OR role = 'super_admin'
      LIMIT 1
    `, ['superadmin']);
    
    if (result.rows.length === 0) {
      console.log('❌ Superadmin user not found!');
      return;
    }
    
    const user = result.rows[0];
    
    console.log('\n📋 User Details:');
    console.log('─'.repeat(60));
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.is_active}`);
    console.log(`   Business ID: ${user.business_id || 'NULL (correct for super_admin)'}`);
    console.log(`   Password Hash: ${user.password_hash ? 'Exists (' + user.password_hash.length + ' chars)' : 'MISSING!'}`);
    console.log(`   Hash Type: ${user.password_hash?.startsWith('$2') ? 'bcrypt' : 'SHA256/Other'}`);
    console.log(`   Hash Preview: ${user.password_hash?.substring(0, 20)}...`);
    
    // Test password verification
    console.log('\n🔑 Password Verification Test:');
    console.log('─'.repeat(60));
    console.log('To test password, you need to know the original password.');
    console.log('The password hash is stored and can be verified with bcrypt.compare()');
    
    // Check if password hash format is correct
    if (user.password_hash) {
      if (user.password_hash.startsWith('$2')) {
        console.log('✅ Password hash is in bcrypt format (correct)');
      } else {
        console.log('⚠️  Password hash is NOT in bcrypt format - might be SHA256 (legacy)');
        console.log('   The login route supports both, but bcrypt is preferred');
      }
    } else {
      console.log('❌ Password hash is missing! This will cause login to fail.');
    }
    
    // Check for common issues
    console.log('\n🔍 Common Issues Check:');
    console.log('─'.repeat(60));
    
    if (!user.is_active) {
      console.log('❌ User is INACTIVE - login will fail');
    } else {
      console.log('✅ User is active');
    }
    
    if (!user.password_hash) {
      console.log('❌ Password hash is missing - login will fail');
    } else {
      console.log('✅ Password hash exists');
    }
    
    if (user.role !== 'super_admin') {
      console.log(`⚠️  Role is "${user.role}" not "super_admin"`);
    } else {
      console.log('✅ Role is correct (super_admin)');
    }
    
    // Check if there are duplicate usernames
    const duplicates = await pool.query(
      'SELECT username, COUNT(*) as count FROM users WHERE username = $1 GROUP BY username',
      ['superadmin']
    );
    
    if (duplicates.rows[0]?.count > 1) {
      console.log('⚠️  Multiple users with username "superadmin" found!');
    } else {
      console.log('✅ No duplicate usernames');
    }
    
    console.log('\n💡 Troubleshooting Tips:');
    console.log('─'.repeat(60));
    console.log('1. Make sure you\'re using the correct password');
    console.log('2. Try logging in with email instead: novagadget72@gmail.com');
    console.log('3. Check Railway logs for login errors');
    console.log('4. Verify the password hash was migrated correctly from SQLite');
    console.log('5. If password doesn\'t work, you may need to reset it');
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

testLogin().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

