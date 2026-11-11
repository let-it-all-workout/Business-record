/**
 * Postgres is the only database. Set DATABASE_URL to Railway Postgres
 * or to a local Postgres URL. There is no SQLite fallback.
 */
if (!process.env.DATABASE_URL) {
  console.warn(
    'DATABASE_URL is not set. The API will start, but queries will fail until Postgres is configured.',
  );
}

const db = (await import('./db-postgres.js')).default;
export const engine = 'postgres';
export default db;
