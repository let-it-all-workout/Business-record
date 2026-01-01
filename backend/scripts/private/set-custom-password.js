import Database from 'better-sqlite3';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'server/database/novagadget.db');
const db = new Database(dbPath);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Get command line argument for password, or use default
const newPassword = process.argv[2] || 'admin123';

console.log('Setting super admin password...\n');

// Find super admin
const superAdmin = db.prepare("SELECT id, username FROM users WHERE role = 'super_admin'").get();

if (!superAdmin) {
  console.log('❌ No super admin found!');
  db.close();
  process.exit(1);
}

// Set new password
const newPasswordHash = hashPassword(newPassword);

db.prepare(`
  UPDATE users 
  SET password_hash = ?, updated_at = datetime('now')
  WHERE id = ?
`).run(newPasswordHash, superAdmin.id);

console.log(`✅ Password updated for super admin: ${superAdmin.username}`);
console.log(`   Username: admin`);
console.log(`   Password: ${newPassword}`);
console.log(`\n⚠️  Please change this password after first login!`);

// Verify
const verify = db.prepare("SELECT username, password_hash FROM users WHERE role = 'super_admin'").get();
const expectedHash = hashPassword(newPassword);
const matches = verify.password_hash === expectedHash;

console.log(`\nVerification: ${matches ? '✅ Password set correctly' : '❌ Password mismatch!'}`);

db.close();

