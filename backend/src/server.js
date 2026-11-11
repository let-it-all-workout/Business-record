import 'dotenv/config';
import http from 'node:http';
import { createApp } from './app.js';

const PORT = process.env.PORT || 3002;
const app = createApp();
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  const db = process.env.DATABASE_URL ? 'PostgreSQL' : 'PostgreSQL (DATABASE_URL is not set)';
  console.log(`Business Record running on http://0.0.0.0:${PORT}`);
  console.log(`Database: ${db}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set PORT to another value.`);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
