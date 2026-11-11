import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statementsFromSchema } from './schema-sql.js';

const schema = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'schema-postgres.sql'), 'utf8');
const statements = statementsFromSchema(schema);

assert.ok(statements.some((statement) => statement.startsWith('CREATE TABLE IF NOT EXISTS users')));
assert.ok(statements.some((statement) => statement.startsWith('CREATE TABLE IF NOT EXISTS businesses')));
assert.equal(statements.some((statement) => statement.startsWith('--')), false);
assert.ok(statements.length > 15);

console.log('schema statement checks passed');
