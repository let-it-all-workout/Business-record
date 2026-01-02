import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcrypt';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

if (!process.env.NEW_PASSWORD) {
  console.error('❌ NEW_PASSWORD environment variable is required');
  console.error('Usage: NEW_PASSWORD="your-new-password" node scripts/reset-superadmin-password.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function resetPassword() {
  try {
    console.log('\n🔐 Resetting Superadmin Password\n');
    console.log('='.repeat(60));
    
    // Find superadmin user
    const userResult = await pool.query(`
      SELECT id, username, email, role
      FROM users
      WHERE username = 'superadmin' OR role = 'super_admin'
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Superadmin user not found!');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`\n📋 Found user: ${user.username} (${user.email})`);
    
    // Hash the new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(process.env.NEW_PASSWORD, saltRounds);
    
    console.log('\n🔄 Updating password...');
    
    // Update password
    const updateResult = await pool.query(`
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
    `, [newPasswordHash, user.id]);
    
    if (updateResult.rowCount > 0) {
      console.log('✅ Password updated successfully!');
      console.log('\n📝 Login Credentials:');
      console.log('─'.repeat(60));
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${process.env.NEW_PASSWORD}`);
      console.log('\n⚠️  Please change this password after logging in!');
    } else {
      console.log('❌ Failed to update password');
    }
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

resetPassword().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

