#!/usr/bin/env node
/**
 * Password Reset Script
 * 
 * This script allows you to reset any user's password directly in the database.
 * 
 * Usage:
 *   node server/scripts/reset-password.js <username> <new_password>
 *   node server/scripts/reset-password.js admin MyNewPassword123
 * 
 * Or run interactively:
 *   node server/scripts/reset-password.js
 */

import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get database path (go up from scripts/ to server/, then to database/)
const dbPath = join(__dirname, '../database/novagadget.db');

const db = new Database(dbPath);

// Helper to hash password with bcrypt (synchronous for script)
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Helper to create readline interface
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

// Main function
async function resetPassword() {
  const args = process.argv.slice(2);
  let username, newPassword;

  if (args.length >= 2) {
    // Command line arguments provided
    username = args[0];
    newPassword = args[1];
  } else {
    // Interactive mode
    const rl = createInterface();
    
    const askQuestion = (query) => {
      return new Promise((resolve) => {
        rl.question(query, resolve);
      });
    };

    console.log('🔐 Password Reset Script\n');
    console.log('This script will reset a user\'s password in the database.\n');

    username = await askQuestion('Enter username to reset password: ');
    if (!username || username.trim().length === 0) {
      console.log('❌ Username cannot be empty');
      rl.close();
      db.close();
      process.exit(1);
    }
    username = username.trim();

    newPassword = await askQuestion('Enter new password: ');
    if (!newPassword || newPassword.length < 6) {
      console.log('❌ Password must be at least 6 characters');
      rl.close();
      db.close();
      process.exit(1);
    }

    const confirmPassword = await askQuestion('Confirm new password: ');
    if (newPassword !== confirmPassword) {
      console.log('❌ Passwords do not match');
      rl.close();
      db.close();
      process.exit(1);
    }

    rl.close();
  }

  try {
    // Find user
    const user = db.prepare(`
      SELECT id, username, email, role, is_active
      FROM users
      WHERE username = ?
    `).get(username);

    if (!user) {
      console.log(`❌ User "${username}" not found in database`);
      db.close();
      process.exit(1);
    }

    if (!user.is_active) {
      console.log(`⚠️  Warning: User "${username}" is inactive`);
    }

    console.log(`\n📋 User Information:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${user.is_active ? 'Active' : 'Inactive'}`);

    // Hash the new password
    console.log('\n🔒 Hashing new password...');
    const passwordHash = await hashPassword(newPassword);

    // Update password in database
    const result = db.prepare(`
      UPDATE users
      SET password_hash = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(passwordHash, user.id);

    if (result.changes === 0) {
      console.log('❌ Failed to update password (no rows affected)');
      db.close();
      process.exit(1);
    }

    console.log('\n✅ Password reset successfully!');
    console.log(`\n📝 Login Credentials:`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Password: ${newPassword}`);
    console.log('\n⚠️  IMPORTANT: Please change this password after first login!');

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    db.close();
    process.exit(1);
  }

  db.close();
}

// Run the script
resetPassword().catch((error) => {
  console.error('❌ Fatal error:', error);
  db.close();
  process.exit(1);
});

