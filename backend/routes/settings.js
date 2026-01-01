import express from 'express';
import db from '../database/db.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Get setting (requires authentication)
router.get('/:key', verifyToken, (req, res) => {
  try {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
    
    if (!setting) {
      return res.json({ value: null });
    }

    res.json({ value: setting.value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Set setting (requires authentication)
router.post('/:key', verifyToken, (req, res) => {
  try {
    const { value } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
    `).run(req.params.key, value, now, value, now);

    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;

















