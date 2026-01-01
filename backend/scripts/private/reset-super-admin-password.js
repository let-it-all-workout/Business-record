import Database from 'better-sqlite3';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'server/database/novagadget.db');
const db = new Database(dbPath);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

console.log('Resetting super admin password...\n');

// Find super admin
const superAdmin = db.prepare("SELECT id, username FROM users WHERE role = 'super_admin'").get();

if (!superAdmin) {
  console.log('❌ No super admin found. Creating one...');
  const adminId = `user-${Date.now()}`;
  const adminPasswordHash = hashPassword('admin123');
  
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, business_id)
    VALUES (?, 'admin', 'admin@novagadget.com', ?, 'Super Administrator', 'super_admin', 1, NULL)
  `).run(adminId, adminPasswordHash);
  
  console.log('✅ Super admin created!');
  console.log('   Username: admin');
  console.log('   Password: admin123');
} else {
  // Reset password to admin123
  const newPasswordHash = hashPassword('admin123');
  
  db.prepare(`
    UPDATE users 
    SET password_hash = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newPasswordHash, superAdmin.id);
  
  console.log(`✅ Password reset for super admin: ${superAdmin.username}`);
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('\n⚠️  Please change this password after first login!');
}

// Verify the hash
const verify = db.prepare("SELECT username, password_hash FROM users WHERE role = 'super_admin'").get();
const expectedHash = hashPassword('admin123');

console.log('\nVerification:');
console.log(`   Expected hash: ${expectedHash}`);
console.log(`   Stored hash:   ${verify.password_hash}`);
console.log(`   Match: ${verify.password_hash === expectedHash ? '✅ YES' : '❌ NO'}`);

db.close();

