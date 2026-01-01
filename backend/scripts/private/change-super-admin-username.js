import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'server/database/novagadget.db');
const db = new Database(dbPath);

// Get new username from command line argument
const newUsername = process.argv[2];

if (!newUsername) {
  console.log('Usage: node change-super-admin-username.js <new_username>');
  console.log('Example: node change-super-admin-username.js superadmin');
  process.exit(1);
}

console.log('Changing super admin username...\n');

// Check if new username already exists
const existingUser = db.prepare('SELECT username FROM users WHERE username = ?').get(newUsername);
if (existingUser) {
  console.log(`❌ Username "${newUsername}" already exists!`);
  console.log('Please choose a different username.');
  db.close();
  process.exit(1);
}

// Find super admin
const superAdmin = db.prepare("SELECT id, username, email FROM users WHERE role = 'super_admin'").get();

if (!superAdmin) {
  console.log('❌ No super admin found!');
  db.close();
  process.exit(1);
}

console.log('Current super admin:');
console.log(`   Username: ${superAdmin.username}`);
console.log(`   Email: ${superAdmin.email}\n`);

// Update username
try {
  db.prepare(`
    UPDATE users 
    SET username = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newUsername, superAdmin.id);
  
  console.log(`✅ Username updated successfully!`);
  console.log(`   Old username: ${superAdmin.username}`);
  console.log(`   New username: ${newUsername}`);
  console.log(`   Email: ${superAdmin.email}`);
  console.log(`   Password: password123 (or admin123 if not changed)`);
  console.log(`\n⚠️  You can now login with:`);
  console.log(`   Username: ${newUsername}`);
  console.log(`   Password: password123`);
} catch (error) {
  console.error('❌ Error updating username:', error.message);
  db.close();
  process.exit(1);
}

// Verify
const verify = db.prepare("SELECT username, email, role FROM users WHERE role = 'super_admin'").get();
console.log(`\n✅ Verification:`);
console.log(`   Username: ${verify.username}`);
console.log(`   Email: ${verify.email}`);
console.log(`   Role: ${verify.role}`);

db.close();

