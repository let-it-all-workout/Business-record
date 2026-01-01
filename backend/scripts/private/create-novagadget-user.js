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

console.log('Creating NovaGadget business user...\n');

// Get password from command line or use default
const password = process.argv[2] || 'novagadget123';

// Check if NovaGadget business already exists
const existingBusiness = db.prepare("SELECT id, name FROM businesses WHERE name LIKE '%NovaGadget%' OR name LIKE '%novagadget%'").get();

let businessId;
if (existingBusiness) {
  console.log(`Found existing business: ${existingBusiness.name}`);
  businessId = existingBusiness.id;
} else {
  // Create NovaGadget business
  businessId = `business-${Date.now()}`;
  console.log('Creating NovaGadget business...');
  
  // We'll set owner_id after creating the user
  db.prepare(`
    INSERT INTO businesses (id, name, owner_id, created_at, updated_at)
    VALUES (?, 'NovaGadget', ?, datetime('now'), datetime('now'))
  `).run(businessId, 'temp'); // Temporary owner_id
  console.log(`✅ Business created: ${businessId}\n`);
}

// Check if NovaGadget user already exists
const existingUser = db.prepare("SELECT id, username FROM users WHERE username = 'novagadget' OR email LIKE '%novagadget%'").get();

if (existingUser) {
  console.log(`⚠️  User already exists: ${existingUser.username}`);
  console.log('Updating to link with business...');
  
  db.prepare(`
    UPDATE users 
    SET business_id = ?, role = 'admin', updated_at = datetime('now')
    WHERE id = ?
  `).run(businessId, existingUser.id);
  
  // Update business owner
  db.prepare('UPDATE businesses SET owner_id = ? WHERE id = ?').run(existingUser.id, businessId);
  
  console.log(`✅ User linked to NovaGadget business`);
  console.log(`   Username: ${existingUser.username}`);
} else {
  // Create NovaGadget user
  const userId = `user-${Date.now()}`;
  const passwordHash = hashPassword(password);
  const email = 'novagadget@novagadget.com';
  
  console.log('Creating NovaGadget user account...');
  
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, business_id)
    VALUES (?, 'novagadget', ?, ?, 'NovaGadget Owner', 'admin', 1, ?)
  `).run(userId, email, passwordHash, businessId);
  
  // Update business owner
  db.prepare('UPDATE businesses SET owner_id = ? WHERE id = ?').run(userId, businessId);
  
  console.log('✅ NovaGadget user created!');
  console.log(`   Username: novagadget`);
  console.log(`   Password: ${password}`);
  console.log(`   Email: ${email}`);
  console.log(`   Business: NovaGadget`);
  console.log(`   Role: admin (business owner)`);
}

// Verify
console.log('\n📊 Verification:');
const allUsers = db.prepare('SELECT username, email, role, business_id FROM users ORDER BY role').all();
console.log(`Total users: ${allUsers.length}`);
allUsers.forEach(u => {
  const business = u.business_id ? db.prepare('SELECT name FROM businesses WHERE id = ?').get(u.business_id) : null;
  console.log(`   - ${u.username} (${u.email}) - Role: ${u.role} - Business: ${business ? business.name : 'None (Super Admin)'}`);
});

const allBusinesses = db.prepare('SELECT id, name, owner_id FROM businesses').all();
console.log(`\nTotal businesses: ${allBusinesses.length}`);
allBusinesses.forEach(b => {
  const owner = db.prepare('SELECT username FROM users WHERE id = ?').get(b.owner_id);
  console.log(`   - ${b.name} - Owner: ${owner ? owner.username : 'None'}`);
});

db.close();

