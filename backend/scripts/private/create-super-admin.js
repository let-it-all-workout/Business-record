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

// Check if super admin exists
const existingSuperAdmin = db.prepare(`
  SELECT id, username FROM users WHERE role = 'super_admin'
`).get();

if (existingSuperAdmin) {
  console.log(`Super admin already exists: ${existingSuperAdmin.username}`);
  console.log('To reset password, delete the user first or use the change password feature.');
} else {
  // Create super admin
  const adminId = `user-${Date.now()}`;
  const adminPasswordHash = hashPassword('admin123');
  
  try {
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, business_id)
      VALUES (?, 'admin', 'admin@novagadget.com', ?, 'Super Administrator', 'super_admin', 1, NULL)
    `).run(adminId, adminPasswordHash);
    
    console.log('✅ Super admin created successfully!');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   ⚠️  Please change this password after first login!');
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
  }
}

db.close();

