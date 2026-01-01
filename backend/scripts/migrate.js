// Migration script to import data from localStorage JSON files
import db from '../database/db.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function migrateFromJSON(jsonPath, type) {
  if (!existsSync(jsonPath)) {
    console.log(`No ${type} data file found at ${jsonPath}`);
    return;
  }

  try {
    const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
    console.log(`Migrating ${data.length} ${type} records...`);

    if (type === 'products') {
      for (const product of data) {
        // Insert product
        db.prepare(`
          INSERT OR REPLACE INTO products (id, name, category, price, quantity, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          product.id,
          product.name,
          product.category || null,
          product.price,
          product.quantity || 0
        );

        // Insert batches
        if (product.batches && product.batches.length > 0) {
          const insertBatch = db.prepare(`
            INSERT OR REPLACE INTO stock_batches 
            (id, product_id, purchase_date, quantity, remaining_quantity, purchase_price)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          for (const batch of product.batches) {
            insertBatch.run(
              batch.id,
              product.id,
              batch.purchaseDate,
              batch.quantity,
              batch.remainingQuantity,
              batch.purchasePrice
            );
          }
        }

        // Insert stock history
        if (product.stockHistory && product.stockHistory.length > 0) {
          const insertHistory = db.prepare(`
            INSERT OR REPLACE INTO stock_history 
            (id, product_id, batch_id, date, quantity, type)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          for (const history of product.stockHistory) {
            insertHistory.run(
              history.id,
              product.id,
              history.batchId || null,
              history.date,
              history.quantity,
              history.type
            );
          }
        }
      }
    } else if (type === 'sales') {
      for (const sale of data) {
        // Insert sale
        db.prepare(`
          INSERT OR REPLACE INTO sales (
            id, product_id, product_name, inventory_id, good_id,
            quantity, selling_price, purchase_price, profit, currency, date,
            refunded, refunded_quantity, refund_date
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          sale.id,
          sale.productId,
          sale.productName,
          sale.inventoryId || null,
          sale.goodId || null,
          sale.quantity,
          sale.sellingPrice,
          sale.purchasePrice || 0,
          sale.profit || 0,
          sale.currency || 'USD',
          sale.date,
          sale.refunded ? 1 : 0,
          sale.refundedQuantity || 0,
          sale.refundDate || null
        );

        // Insert batch details
        if (sale.batchDetails && sale.batchDetails.length > 0) {
          const insertBatchDetail = db.prepare(`
            INSERT OR REPLACE INTO sale_batch_details 
            (id, sale_id, batch_id, quantity, purchase_price)
            VALUES (?, ?, ?, ?, ?)
          `);

          for (const detail of sale.batchDetails) {
            insertBatchDetail.run(
              `detail-${sale.id}-${detail.batchId}`,
              sale.id,
              detail.batchId,
              detail.quantity,
              detail.purchasePrice
            );
          }
        }

        // Insert refund history
        if (sale.refundHistory && sale.refundHistory.length > 0) {
          const insertRefund = db.prepare(`
            INSERT OR REPLACE INTO refund_history 
            (id, sale_id, date, quantity)
            VALUES (?, ?, ?, ?)
          `);

          for (const refund of sale.refundHistory) {
            insertRefund.run(
              `refund-${sale.id}-${refund.date}`,
              sale.id,
              refund.date,
              refund.quantity
            );
          }
        }
      }
    } else if (type === 'inventory') {
      for (const inventory of data) {
        // Insert inventory
        db.prepare(`
          INSERT OR REPLACE INTO goods_inventories 
          (id, name, date, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          inventory.id,
          inventory.name,
          inventory.date,
          inventory.createdAt,
          inventory.createdAt
        );

        // Insert goods
        if (inventory.goods && inventory.goods.length > 0) {
          const insertGood = db.prepare(`
            INSERT OR REPLACE INTO goods 
            (id, inventory_id, name, quantity, remaining_quantity, unit_price, currency)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);

          for (const good of inventory.goods) {
            insertGood.run(
              good.id,
              inventory.id,
              good.name,
              good.quantity,
              good.remainingQuantity || good.quantity,
              good.unitPrice,
              good.currency || 'USD'
            );
          }
        }
      }
    }

    console.log(`✅ Successfully migrated ${data.length} ${type} records`);
  } catch (error) {
    console.error(`❌ Error migrating ${type}:`, error);
  }
}

// Run migration
console.log('🔄 Starting data migration...');

// Note: You'll need to export your localStorage data first
// You can do this by opening browser console and running:
// localStorage.getItem('novagadget-inventory')
// Then save the JSON to files

const dataDir = join(__dirname, '../../data');
migrateFromJSON(join(dataDir, 'products.json'), 'products');
migrateFromJSON(join(dataDir, 'sales.json'), 'sales');
migrateFromJSON(join(dataDir, 'inventory.json'), 'inventory');

console.log('✅ Migration complete!');


















