/**
 * Database Version Management
 * Tracks database schema version to ensure safe migrations
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'novagadget.db');
const CURRENT_VERSION = 1; // Increment this when making schema changes

/**
 * Get current database version
 */
export function getDatabaseVersion(db) {
  try {
    // Check if version table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='database_version'
    `).get();
    
    if (!tableExists) {
      // Create version table if it doesn't exist
      db.prepare(`
        CREATE TABLE IF NOT EXISTS database_version (
          version INTEGER PRIMARY KEY,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `).run();
      
      // Set initial version
      db.prepare('INSERT INTO database_version (version) VALUES (?)').run(CURRENT_VERSION);
      return CURRENT_VERSION;
    }
    
    const version = db.prepare('SELECT version FROM database_version ORDER BY updated_at DESC LIMIT 1').get();
    return version ? version.version : 1;
  } catch (error) {
    console.error('Error getting database version:', error);
    return 1; // Default to version 1
  }
}

/**
 * Update database version
 */
export function updateDatabaseVersion(db, version) {
  try {
    db.prepare('INSERT INTO database_version (version, updated_at) VALUES (?, datetime("now"))').run(version);
    console.log(`✅ Database version updated to ${version}`);
  } catch (error) {
    console.error('Error updating database version:', error);
    throw error;
  }
}

/**
 * Check if database needs migration
 */
export function needsMigration(db) {
  const currentVersion = getDatabaseVersion(db);
  return currentVersion < CURRENT_VERSION;
}

export { CURRENT_VERSION };


