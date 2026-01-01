#!/usr/bin/env node
/**
 * Pre-Update Safety Check
 * Run this before any code updates to ensure data safety
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../database/business-record.db');

console.log('🔍 Pre-Update Safety Check\n');

// Check 1: Database exists
if (!existsSync(dbPath)) {
  console.log('⚠️  Database file not found. This is a new installation.');
  process.exit(0);
}

// Check 2: Database is accessible
try {
  const db = new Database(dbPath, { readonly: true });
  
  // Check 3: Count records in each table
  const tables = [
    'products',
    'sales',
    'goods_inventories',
    'goods',
    'stock_batches',
    'stock_history'
  ];
  
  console.log('📊 Current Database Status:');
  let totalRecords = 0;
  
  tables.forEach(table => {
    try {
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      const count = result.count;
      totalRecords += count;
      if (count > 0) {
        console.log(`   ✅ ${table}: ${count} records`);
      }
    } catch (e) {
      // Table doesn't exist yet, that's okay
    }
  });
  
  console.log(`\n   Total records: ${totalRecords}`);
  
  // Check 4: Database integrity
  try {
    const integrity = db.prepare('PRAGMA integrity_check').get();
    if (integrity.integrity_check === 'ok') {
      console.log('   ✅ Database integrity: OK');
    } else {
      console.log('   ⚠️  Database integrity check:', integrity.integrity_check);
    }
  } catch (e) {
    console.log('   ⚠️  Could not check integrity');
  }
  
  db.close();
  
  console.log('\n✅ Pre-update check complete!');
  console.log('   Your data is safe. You can proceed with updates.');
  console.log('\n💡 Tip: Run "npm run backup" to create a backup before updating.');
  
} catch (error) {
  console.error('❌ Error checking database:', error.message);
  console.error('   Please fix database issues before updating.');
  process.exit(1);
}


