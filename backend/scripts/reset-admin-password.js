#!/usr/bin/env node
/**
 * Quick Super Admin Password Reset
 * 
 * Resets the super admin password to a default value.
 * 
 * Usage:
 *   node server/scripts/reset-admin-password.js
 *   node server/scripts/reset-admin-password.js MyNewPassword123
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../database/novagadget.db');
const db = new Database(dbPath);

async function resetAdminPassword() {
  const args = process.argv.slice(2);
  const newPassword = args[0] || 'admin123'; // Default password if not provided

  if (newPassword.length < 6) {
    console.log('❌ Password must be at least 6 characters');
    db.close();
    process.exit(1);
  }

  try {
    // Find super admin
    const superAdmin = db.prepare(`
      SELECT id, username, email
      FROM users
      WHERE role = 'super_admin'
      LIMIT 1
    `).get();

    if (!superAdmin) {
      console.log('❌ No super admin found in database');
      db.close();
      process.exit(1);
    }

    console.log('🔐 Resetting super admin password...\n');
    console.log(`📋 User: ${superAdmin.username} (${superAdmin.email || 'N/A'})`);

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    const result = db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(passwordHash, superAdmin.id);

    if (result.changes === 0) {
      console.log('❌ Failed to update password');
      db.close();
      process.exit(1);
    }

    console.log('\n✅ Password reset successfully!');
    console.log(`\n📝 Login Credentials:`);
    console.log(`   Username: ${superAdmin.username}`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n⚠️  IMPORTANT: Please change this password after first login!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    db.close();
    process.exit(1);
  }

  db.close();
}

resetAdminPassword().catch((error) => {
  console.error('❌ Fatal error:', error);
  db.close();
  process.exit(1);
});

