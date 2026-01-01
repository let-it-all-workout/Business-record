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

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

console.log('Testing login flow step by step...\n');

// Test super admin login
console.log('1. Super Admin Login Test:');
const username = 'superadmin';
const password = 'password123';
const passwordHash = hashPassword(password);

console.log(`   Username: ${username}`);
console.log(`   Password hash: ${passwordHash.substring(0, 20)}...`);

const user = db.prepare(`
  SELECT id, username, email, full_name, role, is_active, business_id
  FROM users
  WHERE username = ? AND password_hash = ?
`).get(username, passwordHash);

if (!user) {
  console.log('   ❌ User not found or password incorrect');
} else {
  console.log(`   ✅ User found: ${user.username}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Active: ${user.is_active}`);
  console.log(`   Business ID: ${user.business_id || 'NULL'}`);
  
  // Test session creation
  try {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('\n   Creating session...');
    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, user.id, token, expiresAt);
    console.log('   ✅ Session created');
    
    // Test business query
    let business = null;
    if (user.business_id) {
      console.log('\n   Querying business...');
      business = db.prepare('SELECT id, name FROM businesses WHERE id = ?').get(user.business_id);
      if (business) {
        console.log(`   ✅ Business found: ${business.name}`);
      } else {
        console.log(`   ⚠️  Business not found (ID: ${user.business_id})`);
      }
    } else {
      console.log('\n   No business linked (super admin)');
    }
    
    console.log('\n   ✅ Login flow completed successfully!');
    console.log(`   Token: ${token.substring(0, 20)}...`);
    
  } catch (error) {
    console.log(`   ❌ Error in login flow: ${error.message}`);
    console.log(`   Full error: ${error}`);
  }
}

db.close();

