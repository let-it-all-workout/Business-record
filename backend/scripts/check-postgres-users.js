import pkg from 'pg';
const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkUsers() {
  try {
    console.log('\n📊 Checking Users in PostgreSQL\n');
    console.log('='.repeat(60));
    
    // Get all users
    const users = await pool.query(`
      SELECT id, username, email, role, business_id, is_active, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log(`\n👥 Total Users: ${users.rows.length}\n`);
    
    users.rows.forEach((user, i) => {
      console.log(`${i + 1}. ${user.username} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Business ID: ${user.business_id || 'None (super_admin)'}`);
      console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });
    
    // Check superadmin specifically
    const superadmin = users.rows.find(u => u.username === 'superadmin' || u.role === 'super_admin');
    
    if (superadmin) {
      console.log('🔍 Superadmin Details:');
      console.log('─'.repeat(60));
      console.log(`   Username: ${superadmin.username}`);
      console.log(`   Email: ${superadmin.email}`);
      console.log(`   Role: ${superadmin.role}`);
      console.log(`   Business ID: ${superadmin.business_id || 'NULL (correct for super_admin)'}`);
      console.log(`   Active: ${superadmin.is_active}`);
      console.log(`   Has password_hash: ${superadmin.password_hash ? 'Yes' : 'No'}`);
      console.log('');
      
      // Check if password_hash exists
      const passwordCheck = await pool.query(
        'SELECT password_hash FROM users WHERE username = $1',
        [superadmin.username]
      );
      
      if (passwordCheck.rows[0]?.password_hash) {
        console.log(`   ✅ Password hash exists (length: ${passwordCheck.rows[0].password_hash.length})`);
      } else {
        console.log(`   ❌ Password hash is missing!`);
      }
    } else {
      console.log('❌ Superadmin user not found!');
    }
    
    // Check for login issues
    console.log('\n🔐 Login Test Info:');
    console.log('─'.repeat(60));
    console.log('Try logging in with:');
    console.log('  Username: superadmin');
    console.log('  Email: superadmin@example.com');
    console.log('');
    console.log('If login fails, check:');
    console.log('  1. Password is correct');
    console.log('  2. User is active (is_active = true)');
    console.log('  3. Password hash exists in database');
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

checkUsers().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

