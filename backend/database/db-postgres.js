import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { statementsFromSchema } from './schema-sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// One small pool. Neon closes idle sockets; exiting on that error restarts the
// whole site, which is the long wait after a quiet minute.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 8,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

let loggedConnect = false;
pool.on('connect', () => {
  if (loggedConnect) return;
  loggedConnect = true;
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Idle PostgreSQL client error:', err.message);
});

// Neon suspends after about 5 minutes without a query. Ping while this
// process is up so the next click does not wait for compute to wake.
function startKeepAlive() {
  if (!process.env.DATABASE_URL) return;
  const timer = setInterval(() => {
    pool.query('SELECT 1').catch((err) => {
      console.error('Database keep-alive failed:', err.message);
    });
  }, 4 * 60 * 1000);
  timer.unref();
}

async function schemaAlreadyPresent() {
  const ready = await pool.query(`
    SELECT
      to_regclass('public.users') AS users,
      to_regclass('public.businesses') AS businesses,
      to_regclass('public.products') AS products,
      to_regclass('public.sales') AS sales,
      to_regclass('public.goods') AS goods,
      to_regclass('public.sessions') AS sessions
  `);
  const row = ready.rows[0] || {};
  return Boolean(row.users && row.businesses && row.products && row.sales && row.goods && row.sessions);
}

// Initialize database schema
async function initializeDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      return;
    }

    let present = null;
    for (let attempt = 0; attempt < 2 && present === null; attempt += 1) {
      try {
        present = await schemaAlreadyPresent();
      } catch (error) {
        console.error('Schema check failed:', error.message);
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }
    if (present === true) {
      console.log('PostgreSQL schema already present');
      return;
    }
    if (present === null) return;

    const schemaPath = join(__dirname, 'schema-postgres.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    const statements = statementsFromSchema(schema);
    let failed = 0;

    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (error) {
        const message = error.message || '';
        if (message.includes('already exists') || message.includes('duplicate')) continue;
        failed += 1;
        console.error(`Schema statement failed: ${message}`);
        console.error(statement.slice(0, 180));
        if (message.includes('timeout') || message.includes('ECONN') || message.includes('ENOTFOUND')) {
          break;
        }
      }
    }

    if (failed > 0) {
      console.error(`PostgreSQL schema finished with ${failed} failed statement(s)`);
    } else {
      console.log('PostgreSQL schema initialized');
    }
  } catch (error) {
    console.error('❌ Error initializing PostgreSQL database:', error.message);
    // Don't throw - allow server to start even if schema has minor issues
    console.error('⚠️  Continuing despite schema errors - some features may not work');
  } finally {
    startKeepAlive();
  }
}

export const databaseReady = initializeDatabase().catch((err) => {
  console.error('Fatal error initializing database:', err.message);
});

// Helper functions to match better-sqlite3 API for easier migration
const db = {
  // Prepare a query (returns a statement-like object)
  prepare: (query) => {
    // Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
    let paramIndex = 1;
    const pgQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
    
    return {
      // Execute query with parameters and return first row
      get: async (...params) => {
        try {
          const result = await pool.query(pgQuery, params);
          return result.rows[0] || null;
        } catch (error) {
          console.error('Database query error (get):', error.message);
          throw error;
        }
      },
      // Execute query with parameters and return all rows
      all: async (...params) => {
        try {
          const result = await pool.query(pgQuery, params);
          return result.rows;
        } catch (error) {
          console.error('Database query error (all):', error.message);
          throw error;
        }
      },
      // Execute query with parameters (for INSERT/UPDATE/DELETE)
      run: async (...params) => {
        try {
          const result = await pool.query(pgQuery, params);
          return {
            changes: result.rowCount || 0,
            lastInsertRowid: null // PostgreSQL doesn't have this concept
          };
        } catch (error) {
          console.error('Database query error (run):', error.message);
          throw error;
        }
      }
    };
  },
  
  // Execute raw SQL (for migrations, etc.)
  exec: async (sql) => {
    try {
      await pool.query(sql);
    } catch (error) {
      console.error('Database exec error:', error.message);
      throw error;
    }
  },
  
  // Transaction support
  transaction: (callback) => {
    return async (...args) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Create a transaction-aware db object
        const txDb = {
          prepare: (query) => {
            let paramIndex = 1;
            const pgQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
            return {
              get: async (...params) => {
                const result = await client.query(pgQuery, params);
                return result.rows[0] || null;
              },
              all: async (...params) => {
                const result = await client.query(pgQuery, params);
                return result.rows;
              },
              run: async (...params) => {
                const result = await client.query(pgQuery, params);
                return {
                  changes: result.rowCount || 0,
                  lastInsertRowid: null
                };
              }
            };
          },
          exec: async (sql) => {
            await client.query(sql);
          }
        };
        
        const result = await callback(txDb, ...args);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    };
  },
  
  // Direct pool access for complex queries
  query: pool.query.bind(pool),
  pool: pool,
  
  // Close connection pool (for cleanup)
  close: async () => {
    await pool.end();
  }
};

export default db;

