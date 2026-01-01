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

console.log('Fixing users: Super Admin + NovaGadget User\n');

// Step 1: Unlink super admin from any business
console.log('Step 1: Ensuring super admin is NOT linked to any business...');
const superAdmin = db.prepare("SELECT id, username FROM users WHERE role = 'super_admin'").get();

if (superAdmin) {
  db.prepare('UPDATE users SET business_id = NULL, role = ? WHERE id = ?').run('super_admin', superAdmin.id);
  console.log(`✅ Super admin "${superAdmin.username}" unlinked from business\n`);
} else {
  console.log('⚠️  No super admin found\n');
}

// Step 2: Get or create NovaGadget business
console.log('Step 2: Getting/Creating NovaGadget business...');
let business = db.prepare("SELECT id, name, owner_id FROM businesses WHERE name = 'NovaGadget'").get();

if (!business) {
  const businessId = `business-${Date.now()}`;
  db.prepare(`
    INSERT INTO businesses (id, name, owner_id, created_at, updated_at)
    VALUES (?, 'NovaGadget', ?, datetime('now'), datetime('now'))
  `).run(businessId, 'temp');
  business = { id: businessId, name: 'NovaGadget', owner_id: 'temp' };
  console.log(`✅ Created NovaGadget business: ${business.id}\n`);
} else {
  console.log(`✅ Found NovaGadget business: ${business.id}\n`);
}

// Step 3: Check if novagadget user exists
console.log('Step 3: Creating/Updating NovaGadget user...');
let novagadgetUser = db.prepare("SELECT id, username FROM users WHERE username = 'novagadget'").get();

const password = process.argv[2] || 'novagadget123';
const passwordHash = hashPassword(password);

if (novagadgetUser) {
  // Update existing user
  console.log('Updating existing novagadget user...');
  db.prepare(`
    UPDATE users 
    SET business_id = ?, role = 'admin', password_hash = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(business.id, passwordHash, novagadgetUser.id);
  
  // Update business owner
  db.prepare('UPDATE businesses SET owner_id = ? WHERE id = ?').run(novagadgetUser.id, business.id);
  console.log(`✅ Updated user: ${novagadgetUser.username}\n`);
} else {
  // Create new user
  console.log('Creating new novagadget user...');
  const userId = `user-${Date.now()}`;
  
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, business_id)
    VALUES (?, 'novagadget', 'novagadget@novagadget.com', ?, 'NovaGadget Owner', 'admin', 1, ?)
  `).run(userId, passwordHash, business.id);
  
  // Update business owner
  db.prepare('UPDATE businesses SET owner_id = ? WHERE id = ?').run(userId, business.id);
  console.log(`✅ Created user: novagadget\n`);
}

// Step 4: Verify final state
console.log('📊 Final Verification:\n');

const allUsers = db.prepare('SELECT username, email, role, business_id FROM users ORDER BY role DESC, username').all();
console.log(`Total users: ${allUsers.length}`);
allUsers.forEach(u => {
  const businessName = u.business_id 
    ? db.prepare('SELECT name FROM businesses WHERE id = ?').get(u.business_id)?.name 
    : 'None (Super Admin)';
  console.log(`   - ${u.username} (${u.email})`);
  console.log(`     Role: ${u.role}`);
  console.log(`     Business: ${businessName}`);
  console.log('');
});

const allBusinesses = db.prepare('SELECT id, name, owner_id FROM businesses').all();
console.log(`Total businesses: ${allBusinesses.length}`);
allBusinesses.forEach(b => {
  const owner = db.prepare('SELECT username FROM users WHERE id = ?').get(b.owner_id);
  console.log(`   - ${b.name}`);
  console.log(`     Owner: ${owner ? owner.username : 'None'}`);
  console.log('');
});

console.log('✅ Setup Complete!');
console.log('\nLogin Credentials:');
console.log('1. Super Admin:');
console.log('   Username: superadmin');
console.log('   Password: password123');
console.log('   Business: None (can access all)');
console.log('\n2. NovaGadget Business:');
console.log('   Username: novagadget');
console.log(`   Password: ${password}`);
console.log('   Business: NovaGadget');

db.close();

