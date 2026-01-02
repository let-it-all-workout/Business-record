import Database from 'better-sqlite3';
import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SQLite database path
const sqlitePath = join(__dirname, '../database/novagadget.db');
const sqliteDb = new Database(sqlitePath);

// PostgreSQL connection
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('   Set it with: export DATABASE_URL="postgresql://user:pass@host:port/db"');
  process.exit(1);
}

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ID mapping: SQLite TEXT IDs -> PostgreSQL UUIDs
const idMap = {
  users: {},
  businesses: {},
  products: {},
  stock_batches: {},
  sales: {},
  goods_inventories: {},
  goods: {},
  sessions: {},
  activity_logs: {},
  sale_batch_details: {},
  refund_history: {},
};

// Helper to generate or get mapped UUID
function getMappedId(table, oldId) {
  if (!oldId) return null;
  if (!idMap[table][oldId]) {
    idMap[table][oldId] = randomUUID();
  }
  return idMap[table][oldId];
}

async function migrateUsers() {
  console.log('📦 Migrating users...');
  const users = sqliteDb.prepare('SELECT * FROM users').all();
  
  for (const user of users) {
    const newId = getMappedId('users', user.id);
    const businessId = user.business_id ? getMappedId('businesses', user.business_id) : null;
    
    await pgPool.query(`
      INSERT INTO users (id, username, email, password_hash, full_name, role, business_id, is_active, created_at, updated_at, last_login, pin_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING
    `, [
      newId,
      user.username,
      user.email,
      user.password_hash,
      user.full_name,
      user.role,
      businessId,
      user.is_active === 1 || user.is_active === true,
      user.created_at || new Date().toISOString(),
      user.updated_at || new Date().toISOString(),
      user.last_login || null,
      user.pin_hash || null
    ]);
  }
  
  console.log(`✅ Migrated ${users.length} users`);
}

async function migrateBusinesses() {
  console.log('📦 Migrating businesses...');
  const businesses = sqliteDb.prepare('SELECT * FROM businesses').all();
  
  for (const business of businesses) {
    const newId = getMappedId('businesses', business.id);
    const ownerId = getMappedId('users', business.owner_id);
    
    await pgPool.query(`
      INSERT INTO businesses (id, name, owner_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `, [
      newId,
      business.name,
      ownerId,
      business.created_at || new Date().toISOString(),
      business.updated_at || new Date().toISOString()
    ]);
  }
  
  console.log(`✅ Migrated ${businesses.length} businesses`);
}

async function migrateProducts() {
  console.log('📦 Migrating products...');
  const products = sqliteDb.prepare('SELECT * FROM products').all();
  
  for (const product of products) {
    const newId = getMappedId('products', product.id);
    const businessId = getMappedId('businesses', product.business_id);
    
    await pgPool.query(`
      INSERT INTO products (id, name, category, price, quantity, business_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [
      newId,
      product.name,
      product.category || null,
      product.price,
      product.quantity || 0,
      businessId,
      product.created_at || new Date().toISOString(),
      product.updated_at || new Date().toISOString()
    ]);
  }
  
  console.log(`✅ Migrated ${products.length} products`);
}

async function migrateStockBatches() {
  console.log('📦 Migrating stock batches...');
  const batches = sqliteDb.prepare('SELECT * FROM stock_batches').all();
  
  for (const batch of batches) {
    const newId = getMappedId('stock_batches', batch.id);
    const productId = getMappedId('products', batch.product_id);
    
    await pgPool.query(`
      INSERT INTO stock_batches (id, product_id, purchase_date, quantity, remaining_quantity, purchase_price, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `, [
      newId,
      productId,
      batch.purchase_date,
      batch.quantity,
      batch.remaining_quantity,
      batch.purchase_price,
      batch.created_at || new Date().toISOString()
    ]);
  }
  
  console.log(`✅ Migrated ${batches.length} stock batches`);
}

async function migrateStockHistory() {
  console.log('📦 Migrating stock history...');
  const history = sqliteDb.prepare('SELECT * FROM stock_history').all();
  
  for (const record of history) {
    const newId = getMappedId('stock_history', record.id);
    const productId = getMappedId('products', record.product_id);
    const batchId = record.batch_id ? getMappedId('stock_batches', record.batch_id) : null;
    
    await pgPool.query(`
      INSERT INTO stock_history (id, product_id, batch_id, date, quantity, type, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `, [
      newId,
      productId,
      batchId,
      record.date,
      record.quantity,
      record.type,
      record.created_at || new Date().toISOString()
    ]);
  }
  
  console.log(`✅ Migrated ${history.length} stock history records`);
}

async function migrateSales() {
  console.log('📦 Migrating sales...');
  const sales = sqliteDb.prepare('SELECT * FROM sales').all();
  
  for (const sale of sales) {
    const newId = getMappedId('sales', sale.id);
    const productId = sale.product_id ? getMappedId('products', sale.product_id) : null;
    const businessId = getMappedId('businesses', sale.business_id);
    
    await pgPool.query(`
      INSERT INTO sales (id, product_id, product_name, inventory_id, good_id, quantity, selling_price, purchase_price, profit, currency, date, refunded, refunded_quantity, refund_date, business_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO NOTHING
    `, [
      newId,
      productId,
      sale.product_name,
      sale.inventory_id || null,
      sale.good_id || null,
      sale.quantity,
      sale.selling_price,
      sale.purchase_price,
      sale.profit,
      sale.currency || 'USD',
      sale.date,
      sale.refunded === 1 || sale.refunded === true,
      sale.refunded_quantity || 0,
      sale.refund_date || null,
      businessId,
      sale.created_at || new Date().toISOString(),
      sale.updated_at || new Date().toISOString()
    ]);
  }
  
  console.log(`✅ Migrated ${sales.length} sales`);
}

async function migrateSaleBatchDetails() {
  console.log('📦 Migrating sale batch details...');
  const details = sqliteDb.prepare('SELECT * FROM sale_batch_details').all();
  
  for (const detail of details) {
    const newId = getMappedId('sale_batch_details', detail.id);
    const saleId = getMappedId('sales', detail.sale_id);
    const batchId = getMappedId('stock_batches', detail.batch_id);
    
    await pgPool.query(`
      INSERT INTO sale_batch_details (id, sale_id, batch_id, quantity, purchase_price, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [
      newId,
      saleId,
      batchId,
      detail.quantity,
      detail.purchase_price,
      detail.created_at || new Date().toISOString()
    ]);
  }
  
  console.log(`✅ Migrated ${details.length} sale batch details`);
}

async function migrateRefundHistory() {
  console.log('📦 Migrating refund history...');
  const refunds = sqliteDb.prepare('SELECT * FROM refund_history').all();
  
  for (const refund of refunds) {
    const newId = getMappedId('refund_history', refund.id);
    const saleId = getMappedId('sales', refund.sale_id);
    
    await pgPool.query(`
      INSERT INTO refund_history (id, sale_id, date, quantity, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `, [
      newId,
      saleId,
      refund.date,
      refund.quantity,
      refund.created_at || new Date().toISOString()
    ]);
  }
  
  console.log(`✅ Migrated ${refunds.length} refund history records`);
}

async function migrateGoodsInventories() {
  console.log('📦 Migrating goods inventories...');
  const inventories = sqliteDb.prepare('SELECT * FROM goods_inventories').all();
  
  for (const inventory of inventories) {
    const newId = getMappedId('goods_inventories', inventory.id);
    const businessId = getMappedId('businesses', inventory.business_id);
    
    await pgPool.query(`
      INSERT INTO goods_inventories (id, name, date, business_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [
      newId,
      inventory.name,
      inventory.date,
      businessId,
      inventory.created_at || new Date().toISOString(),
      inventory.updated_at || new Date().toISOString()
    ]);
  }
  
  console.log(`✅ Migrated ${inventories.length} goods inventories`);
}

async function migrateGoods() {
  console.log('📦 Migrating goods...');
  const goods = sqliteDb.prepare('SELECT * FROM goods').all();
  
  for (const good of goods) {
    const newId = getMappedId('goods', good.id);
    const inventoryId = getMappedId('goods_inventories', good.inventory_id);
    
    await pgPool.query(`
      INSERT INTO goods (id, inventory_id, name, quantity, remaining_quantity, unit_price, currency, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
    `, [
      newId,
      inventoryId,
      good.name,
      good.quantity,
      good.remaining_quantity,
      good.unit_price,
      good.currency || 'USD',
      good.created_at || new Date().toISOString(),
      good.updated_at || new Date().toISOString()
    ]);
  }
  
  console.log(`✅ Migrated ${goods.length} goods`);
}

async function migrateSettings() {
  console.log('📦 Migrating settings...');
  const settings = sqliteDb.prepare('SELECT * FROM settings').all();
  
  for (const setting of settings) {
    const businessId = setting.business_id ? getMappedId('businesses', setting.business_id) : null;
    
    await pgPool.query(`
      INSERT INTO settings (key, value, business_id, updated_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (key, business_id) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
    `, [
      setting.key,
      setting.value,
      businessId,
      setting.updated_at || new Date().toISOString()
    ]);
  }
  
  console.log(`✅ Migrated ${settings.length} settings`);
}

async function migrateSessions() {
  console.log('📦 Migrating sessions...');
  const sessions = sqliteDb.prepare('SELECT * FROM sessions').all();
  
  for (const session of sessions) {
    const newId = getMappedId('sessions', session.id);
    const userId = getMappedId('users', session.user_id);
    
    await pgPool.query(`
      INSERT INTO sessions (id, user_id, token, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO NOTHING
    `, [
      newId,
      userId,
      session.token,
      session.expires_at,
      session.created_at || new Date().toISOString()
    ]);
  }
  
  console.log(`✅ Migrated ${sessions.length} sessions`);
}

async function migrateActivityLogs() {
  console.log('📦 Migrating activity logs...');
  const logs = sqliteDb.prepare('SELECT * FROM activity_logs').all();
  
  for (const log of logs) {
    const newId = getMappedId('activity_logs', log.id);
    const userId = getMappedId('users', log.user_id);
    const resourceId = log.resource_id ? getMappedId('products', log.resource_id) : null; // Simplified
    
    await pgPool.query(`
      INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
    `, [
      newId,
      userId,
      log.action,
      log.resource_type || null,
      resourceId,
      log.details || null,
      log.ip_address || null,
      log.user_agent || null,
      log.created_at || new Date().toISOString()
    ]);
  }
  
  console.log(`✅ Migrated ${logs.length} activity logs`);
}

async function main() {
  console.log('🚀 Starting SQLite to PostgreSQL migration...\n');
  
  try {
    // Test PostgreSQL connection
    await pgPool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL\n');
    
    // Migrate in order (respecting foreign key dependencies)
    await migrateUsers();
    await migrateBusinesses();
    await migrateProducts();
    await migrateStockBatches();
    await migrateStockHistory();
    await migrateGoodsInventories();
    await migrateGoods();
    await migrateSales();
    await migrateSaleBatchDetails();
    await migrateRefundHistory();
    await migrateSettings();
    await migrateSessions();
    await migrateActivityLogs();
    
    console.log('\n✅ Migration completed successfully!');
    
    // Print summary
    const userCount = await pgPool.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n📊 Summary:`);
    console.log(`   Users in PostgreSQL: ${userCount.rows[0].count}`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

