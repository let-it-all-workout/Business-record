#!/usr/bin/env node
/**
 * Clear Database Script
 * Deletes all data from all tables while preserving schema and backup files
 * 
 * Usage: node server/scripts/clear-database.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const dbPath = join(__dirname, '../database/novagadget.db');

// Tables to clear (in order to respect foreign key constraints)
const tablesToClear = [
  'refund_history',      // References sales
  'sale_batch_details',  // References sales and stock_batches
  'sales',               // References products and goods
  'stock_history',       // References products and stock_batches
  'stock_batches',       // References products
  'products',            // Base table
  'goods',               // References goods_inventories
  'goods_inventories',   // Base table
  'settings',            // Standalone
];

try {
  // Check if database exists
  if (!existsSync(dbPath)) {
    console.log('⚠️  Database file not found. Nothing to clear.');
    process.exit(0);
  }

  console.log('🗑️  Clearing all data from database...\n');

  // Open database
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Get current counts before deletion
  console.log('📊 Current data counts:');
  const counts = {};
  for (const table of tablesToClear) {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      counts[table] = count.count;
      if (count.count > 0) {
        console.log(`   ${table}: ${count.count} records`);
      }
    } catch (error) {
      // Table might not exist, skip
      counts[table] = 0;
    }
  }

  const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
  console.log(`\n   Total records: ${totalRecords}\n`);

  if (totalRecords === 0) {
    console.log('✅ Database is already empty.');
    db.close();
    process.exit(0);
  }

  // Confirm deletion
  console.log('⚠️  WARNING: This will delete ALL data from the database!');
  console.log('   Schema and backup files will be preserved.\n');

  // Delete data from all tables
  console.log('🗑️  Deleting data...');
  let deletedCount = 0;

  for (const table of tablesToClear) {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      if (count.count > 0) {
        db.prepare(`DELETE FROM ${table}`).run();
        deletedCount += count.count;
        console.log(`   ✅ Cleared ${table}: ${count.count} records deleted`);
      }
    } catch (error) {
      console.log(`   ⚠️  Skipped ${table}: ${error.message}`);
    }
  }

  // Reset SQLite sequences (for auto-increment if any)
  try {
    db.prepare('DELETE FROM sqlite_sequence').run();
    console.log('   ✅ Reset SQLite sequences');
  } catch (error) {
    // sqlite_sequence might not exist, that's fine
  }

  // Verify deletion
  console.log('\n📊 Verifying deletion...');
  let remainingRecords = 0;
  for (const table of tablesToClear) {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      if (count.count > 0) {
        remainingRecords += count.count;
        console.log(`   ⚠️  ${table} still has ${count.count} records`);
      }
    } catch (error) {
      // Table might not exist, skip
    }
  }

  db.close();

  if (remainingRecords === 0) {
    console.log('\n✅ Database cleared successfully!');
    console.log(`   Total records deleted: ${deletedCount}`);
    console.log('   Schema preserved ✓');
    console.log('   Backup files preserved ✓');
  } else {
    console.log('\n⚠️  Some records may still remain. Please check manually.');
  }

} catch (error) {
  console.error('❌ Error clearing database:', error.message);
  console.error(error.stack);
  process.exit(1);
}

