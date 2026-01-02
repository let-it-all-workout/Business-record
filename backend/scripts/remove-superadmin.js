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

async function removeSuperadmin() {
  try {
    console.log('\n🗑️  Removing Superadmin User\n');
    console.log('='.repeat(60));
    
    // Check if superadmin exists
    const checkResult = await pool.query(`
      SELECT id, username, email, role FROM users 
      WHERE username = 'superadmin' OR role = 'super_admin'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('✅ No superadmin user found. Already removed.');
      return;
    }
    
    console.log(`\n📋 Found ${checkResult.rows.length} superadmin user(s):`);
    checkResult.rows.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.username} (${user.email}) - ${user.role}`);
    });
    
    // Delete superadmin users
    const deleteResult = await pool.query(`
      DELETE FROM users 
      WHERE username = 'superadmin' OR role = 'super_admin'
    `);
    
    console.log(`\n✅ Deleted ${deleteResult.rowCount} superadmin user(s)`);
    console.log('\n⚠️  Note: Superadmin functionality has been removed from the codebase.');
    console.log('   Use the admin-management script for manual admin changes.');
    
  } catch (error) {
    console.error('❌ Error removing superadmin:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

removeSuperadmin().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

