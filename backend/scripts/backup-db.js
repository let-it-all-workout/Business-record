#!/usr/bin/env node
/**
 * Database Backup Script
 * Creates a timestamped backup of the SQLite database before any updates
 * 
 * Usage: node server/scripts/backup-db.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const dbPath = join(__dirname, '../database/business-record.db');
const backupDir = join(__dirname, '../database/backups');

// Create backup directory if it doesn't exist
if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
}

// Generate backup filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                  new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
const backupPath = join(backupDir, `business-record_backup_${timestamp}.db`);

try {
  // Check if database exists
  if (!existsSync(dbPath)) {
    console.log('⚠️  Database file not found. Nothing to backup.');
    process.exit(0);
  }

  // Create backup
  copyFileSync(dbPath, backupPath);
  
  // Get database info
  const db = new Database(dbPath, { readonly: true });
  const stats = db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type=?').get('table');
  db.close();

  const backupSize = statSync(backupPath).size;
  console.log('✅ Database backup created successfully!');
  console.log(`   Backup location: ${backupPath}`);
  console.log(`   Database tables: ${stats.count}`);
  console.log(`   Backup size: ${(backupSize / 1024).toFixed(2)} KB`);
  
  // List recent backups
  const backups = readdirSync(backupDir)
    .filter(f => f.startsWith('business-record_backup_') && f.endsWith('.db'))
    .sort()
    .reverse()
    .slice(0, 5);
  
  if (backups.length > 0) {
    console.log('\n📦 Recent backups:');
    backups.forEach((backup, i) => {
      const backupFilePath = join(backupDir, backup);
      const size = (statSync(backupFilePath).size / 1024).toFixed(2);
      console.log(`   ${i + 1}. ${backup} (${size} KB)`);
    });
  }
  
  // Keep only last 10 backups to save space
  const allBackups = readdirSync(backupDir)
    .filter(f => f.startsWith('business-record_backup_') && f.endsWith('.db'))
    .sort()
    .reverse();
  
  if (allBackups.length > 10) {
    const toDelete = allBackups.slice(10);
    toDelete.forEach(backup => {
      unlinkSync(join(backupDir, backup));
      console.log(`   🗑️  Deleted old backup: ${backup}`);
    });
  }
  
} catch (error) {
  console.error('❌ Error creating backup:', error.message);
  process.exit(1);
}

