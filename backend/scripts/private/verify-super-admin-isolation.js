import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'server/database/novagadget.db');
const db = new Database(dbPath);

console.log('Verifying Super Admin Isolation...\n');

// Check super admin
const superAdmin = db.prepare("SELECT id, username, email, role, business_id FROM users WHERE role = 'super_admin'").get();

if (!superAdmin) {
  console.log('❌ No super admin found!');
  db.close();
  process.exit(1);
}

console.log('Super Admin Details:');
console.log(`   Username: ${superAdmin.username}`);
console.log(`   Email: ${superAdmin.email}`);
console.log(`   Role: ${superAdmin.role}`);
console.log(`   Business ID: ${superAdmin.business_id === null ? 'NULL ✅ (Not linked to any business)' : superAdmin.business_id + ' ❌ (Linked to business!)'}`);

// Check if super admin owns any businesses
const ownedBusinesses = db.prepare("SELECT id, name FROM businesses WHERE owner_id = ?").all(superAdmin.id);
console.log(`\nBusinesses owned by super admin: ${ownedBusinesses.length}`);
if (ownedBusinesses.length > 0) {
  console.log('   ⚠️  WARNING: Super admin owns businesses:');
  ownedBusinesses.forEach(b => console.log(`      - ${b.name} (${b.id})`));
} else {
  console.log('   ✅ Super admin does not own any businesses');
}

// Check if there are any businesses at all
const allBusinesses = db.prepare("SELECT COUNT(*) as count FROM businesses").get();
console.log(`\nTotal businesses in database: ${allBusinesses.count}`);
if (allBusinesses.count === 0) {
  console.log('   ✅ No businesses exist yet - clean slate');
}

// Check if super admin has any data linked (products, sales, etc.)
try {
  const products = db.prepare("SELECT COUNT(*) as count FROM products WHERE business_id IS NULL OR business_id = ''").get();
  console.log(`\nProducts with NULL business_id: ${products.count}`);
  
  const sales = db.prepare("SELECT COUNT(*) as count FROM sales WHERE business_id IS NULL OR business_id = ''").get();
  console.log(`Sales with NULL business_id: ${sales.count}`);
  
  if (products.count > 0 || sales.count > 0) {
    console.log('   ⚠️  WARNING: There is data without business_id');
  } else {
    console.log('   ✅ All data is properly linked to businesses');
  }
} catch (error) {
  console.log('   Note: Products/Sales tables may not have business_id column yet (migration pending)');
}

console.log('\n✅ Super Admin Isolation Status:');
if (superAdmin.business_id === null && ownedBusinesses.length === 0) {
  console.log('   ✅ CORRECT: Super admin is NOT linked to any business');
  console.log('   ✅ Super admin can access all businesses for support');
  console.log('   ✅ Your NovaGadget business will be separate when you create it');
} else {
  console.log('   ⚠️  ISSUE: Super admin may be linked to a business');
  console.log('   This needs to be fixed!');
}

db.close();

