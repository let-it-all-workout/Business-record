import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'server/database/novagadget.db');
const db = new Database(dbPath);

console.log('Fixing sessions table foreign key...\n');

// Get all existing sessions
const sessions = db.prepare('SELECT * FROM sessions').all();
console.log(`Found ${sessions.length} existing sessions`);

// Drop old sessions table
console.log('Dropping old sessions table...');
db.exec('DROP TABLE IF EXISTS sessions_old');
db.exec('ALTER TABLE sessions RENAME TO sessions_old');

// Create new sessions table with correct foreign key
console.log('Creating new sessions table...');
db.exec(`
  CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Copy data back
if (sessions.length > 0) {
  console.log('Copying existing sessions...');
  const insert = db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  for (const session of sessions) {
    insert.run(
      session.id,
      session.user_id,
      session.token,
      session.expires_at,
      session.created_at
    );
  }
  console.log(`✅ Copied ${sessions.length} sessions`);
}

// Recreate index
db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)');

// Drop old table
db.exec('DROP TABLE sessions_old');

console.log('✅ Sessions table fixed!');
console.log('   Foreign key now references "users" table correctly\n');

// Verify
const verify = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sessions'").get();
console.log('Verification:');
console.log(verify.sql);

db.close();

