import express from 'express';
import { verifyToken } from './auth.js';

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.get('/', verifyToken, requireAdmin, (_req, res) => {
  res.json({
    backups: [],
    message: 'Backups are the Railway Postgres backups. This app no longer stores SQLite file copies.',
  });
});

router.post('/', verifyToken, requireAdmin, (_req, res) => {
  res.status(501).json({
    error: 'App-level file backup is not used. Back up the Postgres database from the Railway dashboard.',
  });
});

router.post('/restore', verifyToken, requireAdmin, (_req, res) => {
  res.status(501).json({
    error: 'Restore from the Postgres provider, not from an uploaded .db file.',
  });
});

export default router;
