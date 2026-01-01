import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import Database from 'better-sqlite3';
import { verifyToken } from './auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../database/novagadget.db');
const backupDir = join(__dirname, '../database/backups');

// Ensure backup directory exists
if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
}

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.isSuperAdmin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

// Create backup (Super Admin Only)
router.post('/', verifyToken, requireSuperAdmin, (req, res) => {
  try {
    if (!existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database not found' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                      new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const backupFilename = `business-record_backup_${timestamp}.db`;
    const backupPath = join(backupDir, backupFilename);

    copyFileSync(dbPath, backupPath);
    const stats = statSync(backupPath);

    res.json({
      success: true,
      filename: backupFilename,
      size: `${(stats.size / 1024).toFixed(2)} KB`,
      date: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// List backups (Super Admin Only)
router.get('/', verifyToken, requireSuperAdmin, (req, res) => {
  try {
    const files = readdirSync(backupDir)
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filePath = join(backupDir, file);
        const stats = statSync(filePath);
        return {
          filename: file,
          date: stats.birthtime.toISOString(),
          size: `${(stats.size / 1024).toFixed(2)} KB`,
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(files);
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// Download backup (Super Admin Only)
router.get('/download', verifyToken, requireSuperAdmin, (req, res) => {
  try {
    const { file } = req.query;
    if (!file) {
      return res.status(400).json({ error: 'Filename required' });
    }

    // Sanitize filename - prevent path traversal attacks
    const sanitizedFile = basename(file);
    if (sanitizedFile !== file || !file.endsWith('.db')) {
      return res.status(400).json({ error: 'Invalid filename format' });
    }

    const filePath = join(backupDir, sanitizedFile);
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.download(filePath, sanitizedFile, (err) => {
      if (err) {
        console.error('Error downloading backup:', err);
        res.status(500).json({ error: 'Failed to download backup' });
      }
    });
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

// Restore backup (Super Admin Only)
router.post('/restore', verifyToken, requireSuperAdmin, (req, res) => {
  try {
    const { file } = req.query;
    if (!file) {
      return res.status(400).json({ error: 'Filename required' });
    }

    // Sanitize filename - prevent path traversal attacks
    const sanitizedFile = basename(file);
    if (sanitizedFile !== file || !file.endsWith('.db')) {
      return res.status(400).json({ error: 'Invalid filename format' });
    }

    const backupPath = join(backupDir, sanitizedFile);
    if (!existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Create a backup of current database before restoring
    const currentBackupPath = join(backupDir, `pre-restore_${Date.now()}.db`);
    if (existsSync(dbPath)) {
      copyFileSync(dbPath, currentBackupPath);
    }

    // Restore the backup
    copyFileSync(backupPath, dbPath);

    // Migrate old backup data: Add business_id columns and assign to default business
    const restoreDb = new Database(dbPath);
    restoreDb.pragma('foreign_keys = ON');

    try {
      // Check if businesses table exists, if not create it
      const businessesExists = restoreDb.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='businesses'
      `).get();

      let defaultBusinessId = null;

      if (!businessesExists) {
        // Create businesses table
        restoreDb.exec(`
          CREATE TABLE IF NOT EXISTS businesses (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `);
      }

      // Get or create default business (NovaGadget)
      // Use a consistent ID so it matches across restores
      const existingBusiness = restoreDb.prepare(`
        SELECT id FROM businesses WHERE name = 'NovaGadget' LIMIT 1
      `).get();

      if (existingBusiness) {
        defaultBusinessId = existingBusiness.id;
      } else {
        // Create default business with a consistent ID
        defaultBusinessId = 'business_novagadget_default';
        try {
          restoreDb.prepare(`
            INSERT INTO businesses (id, name, owner_id, created_at, updated_at)
            VALUES (?, 'NovaGadget', ?, datetime('now'), datetime('now'))
          `).run(defaultBusinessId, 'system');
        } catch (insertError) {
          // If insert fails (maybe ID exists), get the existing one
          const existing = restoreDb.prepare(`
            SELECT id FROM businesses WHERE id = ? LIMIT 1
          `).get(defaultBusinessId);
          if (existing) {
            defaultBusinessId = existing.id;
          }
        }
      }

      // Update all users to be linked to the default business if they don't have one
      try {
        restoreDb.prepare(`
          UPDATE users 
          SET business_id = ? 
          WHERE business_id IS NULL OR business_id = '' OR business_id = 'null'
        `).run(defaultBusinessId);
        console.log(`Updated users to be linked to business ${defaultBusinessId}`);
      } catch (userError) {
        console.log(`Note: Could not update users: ${userError.message}`);
      }

      // Add business_id columns to tables if they don't exist
      const tablesToMigrate = ['users', 'products', 'sales', 'goods_inventories', 'settings'];
      
      for (const tableName of tablesToMigrate) {
        try {
          // Check if table exists
          const tableExists = restoreDb.prepare(`
            SELECT name FROM sqlite_master WHERE type='table' AND name=?
          `).get(tableName);

          if (!tableExists) continue;

          // Check if business_id column exists
          const tableInfo = restoreDb.prepare(`PRAGMA table_info(${tableName})`).all();
          const hasBusinessId = tableInfo.some(col => col.name === 'business_id');

          if (!hasBusinessId) {
            // Add business_id column
            restoreDb.exec(`ALTER TABLE ${tableName} ADD COLUMN business_id TEXT;`);
            console.log(`Added business_id column to ${tableName}`);
          }

          // Update NULL or empty business_id values to default business
          restoreDb.prepare(`
            UPDATE ${tableName} 
            SET business_id = ? 
            WHERE business_id IS NULL OR business_id = '' OR business_id = 'null'
          `).run(defaultBusinessId);
          
          console.log(`Migrated ${tableName} data to business ${defaultBusinessId}`);
        } catch (tableError) {
          console.log(`Note: Could not migrate ${tableName}: ${tableError.message}`);
        }
      }

      // Create indexes for business_id
      const indexStatements = [
        'CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id)',
        'CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id)',
        'CREATE INDEX IF NOT EXISTS idx_sales_business ON sales(business_id)',
        'CREATE INDEX IF NOT EXISTS idx_goods_inventories_business ON goods_inventories(business_id)',
        'CREATE INDEX IF NOT EXISTS idx_settings_business ON settings(business_id)'
      ];

      for (const idxStmt of indexStatements) {
        try {
          restoreDb.exec(idxStmt + ';');
        } catch (idxError) {
          // Ignore index errors
        }
      }

      restoreDb.close();
      console.log('✅ Backup restored and migrated successfully');
    } catch (migrationError) {
      console.error('Error migrating restored backup:', migrationError);
      restoreDb.close();
      // Still return success - the backup was restored, migration is optional
    }

    res.json({ success: true, message: 'Backup restored successfully. Old data has been migrated to the default business.' });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

// Delete backup (Super Admin Only)
router.delete('/', verifyToken, requireSuperAdmin, (req, res) => {
  try {
    const { file } = req.query;
    if (!file) {
      return res.status(400).json({ error: 'Filename required' });
    }

    const filePath = join(backupDir, file);
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    unlinkSync(filePath);
    res.json({ success: true, message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

export default router;



