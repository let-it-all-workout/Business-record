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

// Check if business_id column exists
const tableInfo = db.prepare("PRAGMA table_info(users)").all();
const hasBusinessId = tableInfo.some(col => col.name === 'business_id');

if (!hasBusinessId) {
  console.log('Adding business_id column to users table...');
  try {
    db.prepare('ALTER TABLE users ADD COLUMN business_id TEXT').run();
    console.log('✅ Added business_id column');
  } catch (error) {
    console.log('Note: business_id column may already exist or migration needed');
  }
}

// Check if super_admin role is allowed
const roleCheck = db.prepare("PRAGMA table_info(users)").all();
console.log('Users table columns:', roleCheck.map(c => c.name).join(', '));

// Check existing users
const allUsers = db.prepare('SELECT username, email, role FROM users').all();
console.log('\nExisting users:');
allUsers.forEach(u => console.log(`  - ${u.username} (${u.email}) - Role: ${u.role}`));

// Check if super admin exists
const existingSuperAdmin = db.prepare(`
  SELECT id, username FROM users WHERE role = 'super_admin'
`).get();

if (existingSuperAdmin) {
  console.log(`\n✅ Super admin already exists: ${existingSuperAdmin.username}`);
} else {
  // Try to update existing 'admin' user to 'super_admin'
  const adminUser = db.prepare("SELECT id, username FROM users WHERE username = 'admin' OR role = 'admin'").get();
  
  if (adminUser) {
    console.log(`\nUpdating existing admin user to super_admin...`);
    try {
      db.prepare("UPDATE users SET role = 'super_admin', business_id = NULL WHERE id = ?").run(adminUser.id);
      console.log(`✅ Updated user "${adminUser.username}" to super_admin role`);
    } catch (error) {
      console.error('❌ Error updating user:', error.message);
    }
  } else {
    // Create new super admin
    console.log('\nCreating new super admin...');
    const adminId = `user-${Date.now()}`;
    const adminPasswordHash = hashPassword('admin123');
    
    try {
      // Check which columns exist
      const columns = tableInfo.map(c => c.name);
      const hasBusinessIdCol = columns.includes('business_id');
      
      if (hasBusinessIdCol) {
        db.prepare(`
          INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, business_id)
          VALUES (?, 'admin', 'admin@novagadget.com', ?, 'Super Administrator', 'super_admin', 1, NULL)
        `).run(adminId, adminPasswordHash);
      } else {
        db.prepare(`
          INSERT INTO users (id, username, email, password_hash, full_name, role, is_active)
          VALUES (?, 'admin', 'admin@novagadget.com', ?, 'Super Administrator', 'super_admin', 1)
        `).run(adminId, adminPasswordHash);
      }
      
      console.log('✅ Super admin created successfully!');
      console.log('   Username: admin');
      console.log('   Password: admin123');
    } catch (error) {
      console.error('❌ Error creating super admin:', error.message);
      console.error('   Full error:', error);
    }
  }
}

// Verify
const superAdmin = db.prepare("SELECT username, role FROM users WHERE role = 'super_admin'").get();
if (superAdmin) {
  console.log(`\n✅ Super admin verified: ${superAdmin.username} (${superAdmin.role})`);
} else {
  console.log('\n❌ Super admin not found. Please check the database manually.');
}

db.close();

