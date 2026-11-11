import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { statementsFromSchema } from './schema-sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

if (process.env.DATABASE_URL) {
  pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle PostgreSQL client', err);
    process.exit(1);
  });
}

// Initialize database schema
async function initializeDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      return;
    }

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

