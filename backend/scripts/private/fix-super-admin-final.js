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

// Step 1: Update the CHECK constraint to allow super_admin
console.log('Step 1: Updating role constraint...');
try {
  // SQLite doesn't support ALTER TABLE to modify CHECK constraints
  // We need to recreate the table
  db.exec(`
    -- Create new users table with super_admin support
    CREATE TABLE users_new (
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
      last_login TEXT,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL
    );
    
    -- Copy existing data
    INSERT INTO users_new (id, username, email, password_hash, full_name, role, is_active, created_at, updated_at, last_login, business_id)
    SELECT id, username, email, password_hash, full_name, role, is_active, created_at, updated_at, last_login, business_id
    FROM users;
    
    -- Drop old table
    DROP TABLE users;
    
    -- Rename new table
    ALTER TABLE users_new RENAME TO users;
    
    -- Recreate indexes
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id);
  `);
  console.log('✅ Role constraint updated to allow super_admin\n');
} catch (error) {
  console.log('Note: Constraint update may have failed:', error.message);
  console.log('Trying alternative approach...\n');
}

// Step 2: Check existing users
const allUsers = db.prepare('SELECT username, email, role FROM users').all();
console.log('Existing users:');
allUsers.forEach(u => console.log(`  - ${u.username} (${u.email}) - Role: ${u.role}`));
console.log('');

// Step 3: Check if super admin exists
const existingSuperAdmin = db.prepare(`
  SELECT id, username FROM users WHERE role = 'super_admin'
`).get();

if (existingSuperAdmin) {
  console.log(`✅ Super admin already exists: ${existingSuperAdmin.username}`);
  console.log('   If password is incorrect, you can reset it using the change password feature.');
} else {
  // Step 4: Check if 'nova' user exists and update it, or create new admin
  const novaUser = db.prepare("SELECT id, username FROM users WHERE username = 'nova'").get();
  
  if (novaUser) {
    console.log(`Updating existing user "nova" to super_admin...`);
    try {
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
      console.log('   New username: admin');
      console.log('   New password: admin123');
    } catch (error) {
      console.error('❌ Error updating user:', error.message);
      // Try creating a new one instead
      console.log('\nTrying to create new super admin...');
      const adminId = `user-${Date.now()}`;
      const adminPasswordHash = hashPassword('admin123');
      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, business_id)
        VALUES (?, 'admin', 'admin@novagadget.com', ?, 'Super Administrator', 'super_admin', 1, NULL)
      `).run(adminId, adminPasswordHash);
      console.log('✅ Created new super admin');
      console.log('   Username: admin');
      console.log('   Password: admin123');
    }
  } else {
    // Create new super admin
    console.log('Creating new super admin...');
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
    } catch (error) {
      console.error('❌ Error creating super admin:', error.message);
    }
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
  console.log('\n❌ Super admin not found. Please check the database manually.');
}

db.close();

