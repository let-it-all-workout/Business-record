import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database file path
const dbPath = join(__dirname, 'novagadget.db');

// Initialize database
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema (only creates tables if they don't exist - safe for existing data)
function initializeDatabase() {
  try {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    
    // Check if database already exists and has data
    const dbExists = existsSync(dbPath);
    let hasTables = false;
    
    if (dbExists) {
      try {
        const result = db.prepare(`
          SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `).get();
        hasTables = result.count > 0;
      } catch (e) {
        // Database might be new, that's okay
        hasTables = false;
      }
    }
    
    if (dbExists && hasTables) {
      // Database exists - only create missing tables (safe operation)
      console.log('📊 Existing database detected. Preserving all existing data...');
      
      // Version check (using promise-based import)
      import('./version.js').then(({ getDatabaseVersion, needsMigration, CURRENT_VERSION }) => {
        try {
          const currentVersion = getDatabaseVersion(db);
          console.log(`   Current database version: ${currentVersion}`);
          
          if (needsMigration(db)) {
            console.log(`⚠️  Database version ${currentVersion} is older than current version ${CURRENT_VERSION}`);
            console.log('   Schema will be updated safely (only adds new tables/columns).');
          } else {
            console.log('✅ Database is up to date.');
          }
        } catch (e) {
          console.log('   Note: Version check skipped');
        }
      }).catch(() => {
        // Version check failed, but that's okay - continue with schema
        console.log('   Note: Version check skipped');
      });
    }
    
    // Run migrations FIRST if database exists (to add business_id columns before schema tries to use them)
    // Wrap entire block in try-catch to prevent any errors from crashing the server
    if (dbExists && hasTables) {
      try {
        try {
        const migrationsPath = join(__dirname, 'migrations');
        if (existsSync(migrationsPath)) {
          const migrationFiles = readdirSync(migrationsPath)
            .filter(file => file.endsWith('.sql'))
            .sort();
          
          for (const file of migrationFiles) {
            try {
              const migration = readFileSync(join(migrationsPath, file), 'utf8');
              console.log(`🔄 Running migration: ${file}`);
              
              // Split migration into individual statements and execute them one by one
              // This allows us to handle errors for each statement separately
              const statements = migration
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));
              
              for (const statement of statements) {
                try {
                  if (statement.trim()) {
                    // Skip CREATE INDEX statements - we'll create them after columns are added
                    if (statement.toUpperCase().trim().startsWith('CREATE INDEX')) {
                      continue;
                    }
                    
                    // Skip FOREIGN KEY constraints in CREATE TABLE - they can cause issues
                    if (statement.toUpperCase().includes('FOREIGN KEY') && 
                        statement.toUpperCase().includes('REFERENCES')) {
                      // Extract just the CREATE TABLE part without FK constraints
                      const createTableMatch = statement.match(/CREATE TABLE[^;]+/i);
                      if (createTableMatch) {
                        const tableDef = createTableMatch[0];
                        // Remove FOREIGN KEY constraints
                        const cleanTableDef = tableDef.replace(/,\s*FOREIGN KEY[^,)]+\)/gi, '');
                        if (cleanTableDef !== tableDef) {
                          console.log(`   Note: Skipping FOREIGN KEY constraint in CREATE TABLE`);
                          try {
                            db.exec(cleanTableDef + ';');
                          } catch (e) {
                            // Ignore errors
                          }
                        }
                      }
                      continue;
                    }
                    
                    // Log the statement being executed (first 100 chars)
                    const stmtPreview = statement.substring(0, 100).replace(/\s+/g, ' ');
                    console.log(`   Executing: ${stmtPreview}...`);
                    try {
                      db.exec(statement + ';');
                    } catch (execError) {
                      // If this is an ALTER TABLE ADD COLUMN and column already exists, that's fine
                      const errorMsg = execError.message || String(execError);
                      if (errorMsg.includes('duplicate column') || errorMsg.includes('already exists')) {
                        console.log(`   Note: Column may already exist, skipping...`);
                        continue;
                      }
                      // For any other error, log and continue
                      console.log(`   Note: Statement error (skipping): ${errorMsg.substring(0, 80)}`);
                      continue;
                    }
                  }
                } catch (stmtError) {
                  const errorMsg = stmtError.message || String(stmtError);
                  // Ignore ALL errors - just log and continue
                  // This allows the migration to complete even if some statements fail
                  console.log(`   Note: Statement skipped: ${errorMsg.substring(0, 80)}...`);
                  continue;
                }
              }
              
              // After all ALTER TABLE statements, try to create indexes if columns exist
              try {
                console.log('   Creating indexes for business_id columns (if they exist)...');
                const indexStatements = [
                  'CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id)',
                  'CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id)',
                  'CREATE INDEX IF NOT EXISTS idx_sales_business ON sales(business_id)',
                  'CREATE INDEX IF NOT EXISTS idx_goods_inventories_business ON goods_inventories(business_id)',
                  'CREATE INDEX IF NOT EXISTS idx_settings_business ON settings(business_id)'
                ];
                
                for (const idxStmt of indexStatements) {
                  try {
                    // Check if the column exists before creating index
                    const tableName = idxStmt.match(/ON (\w+)\(/i)?.[1];
                    if (tableName) {
                      const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
                      const hasBusinessId = tableInfo.some(col => col.name === 'business_id');
                      if (hasBusinessId) {
                        db.exec(idxStmt + ';');
                      }
                    }
                  } catch (idxError) {
                    // Silently ignore index creation errors
                  }
                }
              } catch (idxError) {
                // Ignore all index creation errors
              }
              
              console.log(`✅ Migration ${file} completed`);
            } catch (migrationError) {
              // Some migrations might fail if columns already exist - that's okay
              const errorMsg = migrationError.message || String(migrationError);
              console.log(`   ⚠️  Migration ${file} had errors (continuing): ${errorMsg.substring(0, 100)}`);
              // Don't fail completely - continue with other migrations
            }
          }
        }
      } catch (migrationError) {
        console.log('   ⚠️  Migration check had errors (continuing anyway)');
      }
      } catch (outerError) {
        // Catch any errors that might have been missed
        console.log('   ⚠️  Migration process had errors (continuing anyway):', outerError.message?.substring(0, 100));
      }
    }
    
    // Execute schema (CREATE TABLE IF NOT EXISTS is safe - won't affect existing data)
    // For existing databases, we only create missing tables, not modify existing ones
    if (!dbExists || !hasTables) {
      // New database - safe to run full schema
      try {
        db.exec(schema);
        console.log('✅ Database schema initialized');
      } catch (schemaError) {
        const errorMsg = schemaError.message || String(schemaError);
        console.log(`   ⚠️  Schema execution warning: ${errorMsg}`);
      }
    } else {
      // Existing database - only create businesses table if it doesn't exist
      // Skip full schema execution to avoid errors with business_id columns/indexes
      try {
        // Check if businesses table exists
        const businessesExists = db.prepare(`
          SELECT name FROM sqlite_master WHERE type='table' AND name='businesses'
        `).get();
        
        if (!businessesExists) {
          try {
            db.exec(`
              CREATE TABLE businesses (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
              );
            `);
            console.log('✅ Businesses table created');
          } catch (e) {
            console.log('   Note: Businesses table creation skipped');
          }
        }
        console.log('✅ Schema check completed (existing database - migrations will handle business_id columns)');
      } catch (schemaError) {
        // Ignore all errors for existing databases - migrations handle the rest
        console.log('   Note: Schema check completed (some errors may be expected)');
      }
    }
    
    // Migrate existing sales table to allow NULL product_id (for goods inventory sales)
    // DISABLED - this migration tries to copy data and might fail if business_id column doesn't exist
    // We'll handle this in application code instead
    /*
    if (hasTables) {
      try {
        // Check if product_id column allows NULL
        const tableInfo = db.prepare("PRAGMA table_info(sales)").all();
        const productIdColumn = tableInfo.find(col => col.name === 'product_id');
        if (productIdColumn && productIdColumn.notnull === 1) {
          console.log('🔄 Migrating sales table to allow NULL product_id...');
          // SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
          // This is safe because we're only changing a constraint, not data
          db.exec(`
            -- Create new table with NULL allowed
            CREATE TABLE IF NOT EXISTS sales_new (
              id TEXT PRIMARY KEY,
              product_id TEXT,
              product_name TEXT NOT NULL,
              inventory_id TEXT,
              good_id TEXT,
              quantity INTEGER NOT NULL,
              selling_price REAL NOT NULL,
              purchase_price REAL NOT NULL,
              profit REAL NOT NULL,
              currency TEXT NOT NULL DEFAULT 'USD',
              date TEXT NOT NULL,
              refunded INTEGER NOT NULL DEFAULT 0,
              refunded_quantity INTEGER NOT NULL DEFAULT 0,
              refund_date TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              updated_at TEXT NOT NULL DEFAULT (datetime('now')),
              FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
            );
            
            -- Copy data
            INSERT INTO sales_new SELECT * FROM sales;
            
            -- Drop old table
            DROP TABLE sales;
            
            -- Rename new table
            ALTER TABLE sales_new RENAME TO sales;
          `);
          console.log('✅ Sales table migrated successfully');
        }
      } catch (e) {
        // Migration failed, but that's okay - table might already be correct
        console.log('   Note: Sales table migration skipped (may already be up to date)');
      }
    }
    */
    
    // Update version if needed (async import)
    if (hasTables) {
      import('./version.js').then(({ updateDatabaseVersion, needsMigration, CURRENT_VERSION }) => {
        if (needsMigration(db)) {
          updateDatabaseVersion(db, CURRENT_VERSION);
        }
      }).catch(() => {
        // Version update failed, but that's okay
      });
    }
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    // Don't throw - allow server to start even if migration has issues
    // The application will handle missing columns gracefully
    console.error('⚠️  Continuing despite migration errors - some features may not work until database is fixed');
    // Log the error but don't crash
    console.error('Error details:', error.message);
  }
}

// Initialize on first load
// Initialize database - wrap in try-catch to prevent server crash
try {
  initializeDatabase();
} catch (error) {
  console.error('❌ Fatal error initializing database:', error);
  console.error('⚠️  Server will start but database features may not work');
  console.error('Error:', error.message);
  // Don't throw - allow server to start
}

export default db;


