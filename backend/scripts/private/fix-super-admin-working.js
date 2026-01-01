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

console.log('Fixing super admin setup...\n');

// Step 1: Create businesses table if it doesn't exist (for foreign key)
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  console.log('✅ Businesses table ready\n');
} catch (error) {
  console.log('Note: Businesses table issue:', error.message);
}

// Step 2: Update users table to allow super_admin
console.log('Step 2: Updating users table constraint...');
try {
  // Get all existing users data
  const users = db.prepare('SELECT * FROM users').all();
  console.log(`Found ${users.length} existing user(s)\n`);
  
  // Drop the old table
  db.exec('DROP TABLE IF EXISTS users_old');
  db.exec('ALTER TABLE users RENAME TO users_old');
  
  // Create new table with super_admin support (without foreign key first)
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'manager', 'staff', 'viewer')),
      business_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login TEXT
    );
  `);
  
  // Copy data back
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, created_at, updated_at, last_login, business_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const user of users) {
    insertUser.run(
      user.id,
      user.username,
      user.email,
      user.password_hash,
      user.full_name,
      user.role,
      user.is_active,
      user.created_at,
      user.updated_at,
      user.last_login,
      user.business_id || null
    );
  }
  
  // Recreate indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id);
  `);
  
  // Drop old table
  db.exec('DROP TABLE users_old');
  
  console.log('✅ Users table updated to support super_admin role\n');
} catch (error) {
  console.error('❌ Error updating users table:', error.message);
  db.close();
  process.exit(1);
}

// Step 3: Check existing users
const allUsers = db.prepare('SELECT username, email, role FROM users').all();
console.log('Existing users:');
allUsers.forEach(u => console.log(`  - ${u.username} (${u.email}) - Role: ${u.role}`));
console.log('');

// Step 4: Create or update super admin
const existingSuperAdmin = db.prepare(`
  SELECT id, username FROM users WHERE role = 'super_admin'
`).get();

if (existingSuperAdmin) {
  console.log(`✅ Super admin already exists: ${existingSuperAdmin.username}`);
  console.log('   If password is incorrect, you can reset it.');
} else {
  // Check if 'nova' user exists
  const novaUser = db.prepare("SELECT id, username FROM users WHERE username = 'nova'").get();
  
  if (novaUser) {
    console.log(`Updating existing user "nova" to super_admin...`);
    const newPasswordHash = hashPassword('admin123');
    db.prepare(`
      UPDATE users 
      SET role = 'super_admin', 
          username = 'admin',
          password_hash = ?,
          business_id = NULL
      WHERE id = ?
    `).run(newPasswordHash, novaUser.id);
    console.log('✅ Updated user "nova" to super_admin');
    console.log('   Username: admin');
    console.log('   Password: admin123');
  } else {
    // Create new super admin
    console.log('Creating new super admin...');
    const adminId = `user-${Date.now()}`;
    const adminPasswordHash = hashPassword('admin123');
    
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, business_id)
      VALUES (?, 'admin', 'admin@novagadget.com', ?, 'Super Administrator', 'super_admin', 1, NULL)
    `).run(adminId, adminPasswordHash);
    console.log('✅ Super admin created successfully!');
    console.log('   Username: admin');
    console.log('   Password: admin123');
  }
}

// Step 5: Verify
const superAdmin = db.prepare("SELECT username, role, email FROM users WHERE role = 'super_admin'").get();
if (superAdmin) {
  console.log(`\n✅ Super admin verified:`);
  console.log(`   Username: ${superAdmin.username}`);
  console.log(`   Email: ${superAdmin.email}`);
  console.log(`   Role: ${superAdmin.role}`);
  console.log(`\n⚠️  Please change the password after first login!`);
} else {
  console.log('\n❌ Super admin not found.');
}

db.close();

