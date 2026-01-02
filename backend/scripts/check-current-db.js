import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../database/novagadget.db');
const db = new Database(dbPath, { readonly: true });

console.log('\n📊 Current SQLite Database Contents\n');
console.log('='.repeat(60));

// Check users
const users = db.prepare('SELECT username, email, role, business_id, created_at FROM users ORDER BY created_at DESC').all();
console.log(`\n👥 Users (${users.length}):`);
console.log('─'.repeat(60));
users.forEach((u, i) => {
  console.log(`${i+1}. ${u.username} (${u.email})`);
  console.log(`   Role: ${u.role}`);
  console.log(`   Business ID: ${u.business_id || 'None'}`);
  console.log(`   Created: ${u.created_at}`);
  console.log('');
});

// Check businesses
const businesses = db.prepare('SELECT id, name, owner_id, created_at FROM businesses ORDER BY created_at DESC').all();
console.log(`\n🏢 Businesses (${businesses.length}):`);
console.log('─'.repeat(60));
businesses.forEach((b, i) => {
  console.log(`${i+1}. ${b.name} (ID: ${b.id})`);
  console.log(`   Owner ID: ${b.owner_id}`);
  console.log(`   Created: ${b.created_at}`);
  console.log('');
});

// Check products
const products = db.prepare('SELECT COUNT(*) as count FROM products').get();
console.log(`\n📦 Products: ${products.count}`);

// Check sales
const sales = db.prepare('SELECT COUNT(*) as count FROM sales').get();
console.log(`💰 Sales: ${sales.count}`);

// Check inventory
const inventories = db.prepare('SELECT COUNT(*) as count FROM goods_inventories').get();
console.log(`📋 Goods Inventories: ${inventories.count}`);

console.log('\n' + '='.repeat(60));
console.log('\n✅ This is what will be migrated to PostgreSQL\n');

db.close();

