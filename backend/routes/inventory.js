import express from 'express';
import db from '../database/db.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Helper to get business filter
function getBusinessFilter(req) {
  // Super admin can view any business via ?businessId query param, or all if no businessId
  if (req.isSuperAdmin) {
    return { 
      businessId: req.query.businessId || null, 
      isSuperAdmin: true 
    };
  }
  // Regular users only see their business
  return { businessId: req.user.businessId, isSuperAdmin: false };
}

// Get all goods inventories
router.get('/', verifyToken, (req, res) => {
  try {
    const filter = getBusinessFilter(req);
    
    if (!filter.businessId && !filter.isSuperAdmin) {
      return res.status(403).json({ error: 'Business context required' });
    }

    // For regular users, include data with NULL/empty business_id (old data compatibility)
    // For super admin selecting a business, also include NULL/empty business_id (legacy data)
    const query = filter.isSuperAdmin && filter.businessId
      ? `SELECT * FROM goods_inventories WHERE (business_id = ? OR business_id IS NULL OR business_id = '') ORDER BY created_at DESC`
      : filter.isSuperAdmin
      ? `SELECT * FROM goods_inventories ORDER BY created_at DESC`
      : `SELECT * FROM goods_inventories WHERE (business_id = ? OR business_id IS NULL OR business_id = '') ORDER BY created_at DESC`;
    
    const inventories = filter.isSuperAdmin && !filter.businessId
      ? db.prepare(query).all()
      : db.prepare(query).all(filter.businessId);

    // Get goods for each inventory
    const inventoriesWithGoods = inventories.map(inventory => {
      const goods = db.prepare(`
        SELECT * FROM goods WHERE inventory_id = ? ORDER BY created_at ASC
      `).all(inventory.id);

      return {
        id: inventory.id,
        name: inventory.name,
        date: inventory.date,
        createdAt: inventory.created_at,
        goods: goods.map(good => ({
          id: good.id,
          name: good.name,
          quantity: good.quantity,
          remainingQuantity: good.remaining_quantity,
          unitPrice: good.unit_price,
          currency: good.currency,
        })),
      };
    });

    res.json(inventoriesWithGoods);
  } catch (error) {
    console.error('Error fetching inventories:', error);
    res.status(500).json({ error: 'Failed to fetch inventories' });
  }
});

// Get single inventory
router.get('/:id', verifyToken, (req, res) => {
  try {
    const inventory = db.prepare('SELECT * FROM goods_inventories WHERE id = ?').get(req.params.id);
    
    if (!inventory) {
      return res.status(404).json({ error: 'Inventory not found' });
    }

    // Check business access
    if (!req.isSuperAdmin && inventory.business_id !== req.user.businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const goods = db.prepare('SELECT * FROM goods WHERE inventory_id = ?').all(inventory.id);

    res.json({
      ...inventory,
      goods: goods.map(good => ({
        id: good.id,
        name: good.name,
        quantity: good.quantity,
        remainingQuantity: good.remaining_quantity,
        unitPrice: good.unit_price,
        currency: good.currency,
      })),
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Create goods inventory
router.post('/', verifyToken, (req, res) => {
  try {
    const { name, date, goods, businessId } = req.body;
    
    // Determine which business_id to use
    let targetBusinessId = businessId;
    if (req.isSuperAdmin && businessId) {
      targetBusinessId = businessId;
    } else {
      targetBusinessId = req.user.businessId;
    }

    if (!targetBusinessId) {
      return res.status(400).json({ error: 'Business context required' });
    }

    const id = Date.now().toString();
    const now = new Date().toISOString();

    // Insert inventory
    db.prepare(`
      INSERT INTO goods_inventories (id, name, date, business_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, date, targetBusinessId, now, now);

    // Insert goods if provided
    if (goods && goods.length > 0) {
      const insertGood = db.prepare(`
        INSERT INTO goods (id, inventory_id, name, quantity, remaining_quantity, unit_price, currency)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const good of goods) {
        insertGood.run(
          good.id || `good-${Date.now()}-${Math.random()}`,
          id,
          good.name,
          good.quantity,
          good.remainingQuantity || good.quantity,
          good.unitPrice,
          good.currency || 'USD'
        );
      }
    }

    res.status(201).json({ id, message: 'Inventory created successfully' });
  } catch (error) {
    console.error('Error creating inventory:', error);
    res.status(500).json({ error: 'Failed to create inventory' });
  }
});

// Update goods inventory
router.put('/:id', verifyToken, (req, res) => {
  try {
    // Check inventory exists and user has access
    const inventory = db.prepare('SELECT business_id FROM goods_inventories WHERE id = ?').get(req.params.id);
    if (!inventory) {
      return res.status(404).json({ error: 'Inventory not found' });
    }

    // Check business access
    if (!req.isSuperAdmin && inventory.business_id !== req.user.businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, date, goods } = req.body;
    const now = new Date().toISOString();

    // Update inventory
    db.prepare(`
      UPDATE goods_inventories 
      SET name = ?, date = ?, updated_at = ?
      WHERE id = ?
    `).run(name, date, now, req.params.id);

    // Update goods if provided
    if (goods) {
      // Delete existing goods
      db.prepare('DELETE FROM goods WHERE inventory_id = ?').run(req.params.id);

      // Insert updated goods
      if (goods.length > 0) {
        const insertGood = db.prepare(`
          INSERT INTO goods (id, inventory_id, name, quantity, remaining_quantity, unit_price, currency)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const good of goods) {
          insertGood.run(
            good.id || `good-${Date.now()}-${Math.random()}`,
            req.params.id,
            good.name,
            good.quantity,
            good.remainingQuantity || good.quantity,
            good.unitPrice,
            good.currency || 'USD'
          );
        }
      }
    }

    res.json({ message: 'Inventory updated successfully' });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

// Delete goods inventory
router.delete('/:id', verifyToken, (req, res) => {
  try {
    // Check inventory exists and user has access
    const inventory = db.prepare('SELECT business_id FROM goods_inventories WHERE id = ?').get(req.params.id);
    if (!inventory) {
      return res.status(404).json({ error: 'Inventory not found' });
    }

    // Check business access
    if (!req.isSuperAdmin && inventory.business_id !== req.user.businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const result = db.prepare('DELETE FROM goods_inventories WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Inventory not found' });
    }

    res.json({ message: 'Inventory deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory:', error);
    res.status(500).json({ error: 'Failed to delete inventory' });
  }
});

export default router;

















