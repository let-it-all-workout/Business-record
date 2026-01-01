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

console.log('🧪 Testing Login Credentials\n');
console.log('='.repeat(60));

// Test super admin
console.log('\n1. Testing Super Admin Login:');
const superAdmin = db.prepare("SELECT username, password_hash, role, is_active FROM users WHERE username = 'superadmin'").get();

if (!superAdmin) {
  console.log('   ❌ Super admin user not found!');
} else {
  const testPassword = 'password123';
  const testHash = hashPassword(testPassword);
  const matches = testHash === superAdmin.password_hash;
  
  console.log(`   Username: ${superAdmin.username}`);
  console.log(`   Role: ${superAdmin.role}`);
  console.log(`   Active: ${superAdmin.is_active === 1 ? 'Yes' : 'No'}`);
  console.log(`   Testing password: "${testPassword}"`);
  console.log(`   Expected hash: ${testHash}`);
  console.log(`   Stored hash:   ${superAdmin.password_hash}`);
  console.log(`   Match: ${matches ? '✅ YES' : '❌ NO'}`);
  
  if (matches && superAdmin.is_active === 1 && superAdmin.role === 'super_admin') {
    console.log('   ✅ Super admin login should work!');
  } else {
    console.log('   ❌ Super admin login will fail!');
    if (!matches) console.log('      - Password hash mismatch');
    if (superAdmin.is_active !== 1) console.log('      - User is not active');
    if (superAdmin.role !== 'super_admin') console.log(`      - Wrong role: ${superAdmin.role}`);
  }
}

// Test novagadget user
console.log('\n2. Testing NovaGadget User Login:');
const novagadget = db.prepare("SELECT username, password_hash, role, is_active, business_id FROM users WHERE username = 'novagadget'").get();

if (!novagadget) {
  console.log('   ❌ NovaGadget user not found!');
} else {
  const testPassword = 'novagadget123';
  const testHash = hashPassword(testPassword);
  const matches = testHash === novagadget.password_hash;
  
  console.log(`   Username: ${novagadget.username}`);
  console.log(`   Role: ${novagadget.role}`);
  console.log(`   Active: ${novagadget.is_active === 1 ? 'Yes' : 'No'}`);
  console.log(`   Business ID: ${novagadget.business_id || 'None'}`);
  console.log(`   Testing password: "${testPassword}"`);
  console.log(`   Expected hash: ${testHash}`);
  console.log(`   Stored hash:   ${novagadget.password_hash}`);
  console.log(`   Match: ${matches ? '✅ YES' : '❌ NO'}`);
  
  if (matches && novagadget.is_active === 1 && novagadget.role === 'admin') {
    console.log('   ✅ NovaGadget user login should work!');
  } else {
    console.log('   ❌ NovaGadget user login will fail!');
    if (!matches) console.log('      - Password hash mismatch');
    if (novagadget.is_active !== 1) console.log('      - User is not active');
    if (novagadget.role !== 'admin') console.log(`      - Wrong role: ${novagadget.role}`);
  }
}

// Test the actual login query
console.log('\n3. Testing Login Query Logic:');
console.log('\n   Super Admin:');
const superAdminLogin = db.prepare(`
  SELECT id, username, email, full_name, role, is_active, business_id
  FROM users
  WHERE username = ? AND password_hash = ?
`).get('superadmin', hashPassword('password123'));

if (superAdminLogin) {
  console.log('   ✅ Login query returns user');
  console.log(`      Username: ${superAdminLogin.username}`);
  console.log(`      Role: ${superAdminLogin.role}`);
  console.log(`      Active: ${superAdminLogin.is_active === 1 ? 'Yes' : 'No'}`);
} else {
  console.log('   ❌ Login query returns nothing');
}

console.log('\n   NovaGadget:');
const novagadgetLogin = db.prepare(`
  SELECT id, username, email, full_name, role, is_active, business_id
  FROM users
  WHERE username = ? AND password_hash = ?
`).get('novagadget', hashPassword('novagadget123'));

if (novagadgetLogin) {
  console.log('   ✅ Login query returns user');
  console.log(`      Username: ${novagadgetLogin.username}`);
  console.log(`      Role: ${novagadgetLogin.role}`);
  console.log(`      Active: ${novagadgetLogin.is_active === 1 ? 'Yes' : 'No'}`);
  console.log(`      Business ID: ${novagadgetLogin.business_id || 'None'}`);
} else {
  console.log('   ❌ Login query returns nothing');
}

console.log('\n' + '='.repeat(60));
console.log('\n📊 Summary:');
console.log(`   Super Admin Login: ${superAdminLogin ? '✅ Should work' : '❌ Will fail'}`);
console.log(`   NovaGadget Login: ${novagadgetLogin ? '✅ Should work' : '❌ Will fail'}`);

if (superAdminLogin && novagadgetLogin) {
  console.log('\n✅ Both users should be able to login!');
  console.log('\nIf login still fails, check:');
  console.log('   1. Server is running on port 3002');
  console.log('   2. Database file is accessible');
  console.log('   3. No network/firewall issues');
} else {
  console.log('\n❌ Login will fail. Fix the issues above.');
}

db.close();

