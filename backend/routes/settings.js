import express from 'express';
import db from '../database/db-postgres.js';
import { verifyToken } from './auth.js';
import { handleError } from '../middleware/errorHandler.js';

const router = express.Router();

// Get setting (requires authentication)
router.get('/:key', verifyToken, async (req, res) => {
  try {
    const setting = await db.prepare('SELECT value FROM settings WHERE key = $1').get(req.params.key);
    
    if (!setting) {
      return res.json({ value: null });
    }

    res.json({ value: setting.value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    const errorResponse = handleError(error, req, res, 'Failed to fetch setting. Please try again.');
    res.status(500).json(errorResponse);
  }
});

// Set setting (requires authentication)
router.post('/:key', verifyToken, async (req, res) => {
  try {
    const { value, businessId } = req.body;
    const now = new Date().toISOString();
    
    // Use business_id from user if not provided, or null for global settings
    const targetBusinessId = businessId || req.user.businessId || null;

    await db.prepare(`
      INSERT INTO settings (key, value, business_id, updated_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT(key, business_id) DO UPDATE SET value = $2, updated_at = $4
    `).run(req.params.key, value, targetBusinessId, now);

    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Error updating setting:', error);
    const errorResponse = handleError(error, req, res, 'Failed to update setting. Please try again.');
    res.status(500).json(errorResponse);
  }
});

export default router;

















