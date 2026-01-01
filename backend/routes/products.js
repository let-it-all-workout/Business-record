import express from 'express';
import db from '../database/db.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Helper to get business filter (for super_admin, allow viewing any business via query param)
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

// Get all products
router.get('/', verifyToken, (req, res) => {
  try {
    const filter = getBusinessFilter(req);
    
    if (!filter.businessId && !filter.isSuperAdmin) {
      return res.status(403).json({ error: 'Business context required' });
    }

    // For regular users, include data with NULL/empty business_id (old data compatibility)
    // For super admin selecting a business, also include NULL/empty business_id (legacy data)
    const query = filter.isSuperAdmin && filter.businessId
      ? `SELECT * FROM products WHERE (business_id = ? OR business_id IS NULL OR business_id = '') ORDER BY created_at DESC`
      : filter.isSuperAdmin
      ? `SELECT * FROM products ORDER BY created_at DESC`
      : `SELECT * FROM products WHERE (business_id = ? OR business_id IS NULL OR business_id = '') ORDER BY created_at DESC`;
    
    const products = filter.isSuperAdmin && !filter.businessId
      ? db.prepare(query).all()
      : db.prepare(query).all(filter.businessId);

    // Get batches for each product
    const productsWithBatches = products.map(product => {
      const batches = db.prepare(`
        SELECT * FROM stock_batches WHERE product_id = ? ORDER BY purchase_date ASC
      `).all(product.id);

      const stockHistory = db.prepare(`
        SELECT * FROM stock_history WHERE product_id = ? ORDER BY date DESC
      `).all(product.id);

      return {
        ...product,
        batches: batches.map(batch => ({
          id: batch.id,
          purchaseDate: batch.purchase_date,
          quantity: batch.quantity,
          remainingQuantity: batch.remaining_quantity,
          purchasePrice: batch.purchase_price,
        })),
        stockHistory: stockHistory.map(history => ({
          id: history.id,
          date: history.date,
          quantity: history.quantity,
          type: history.type,
          batchId: history.batch_id,
        })),
      };
    });

    res.json(productsWithBatches);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
router.get('/:id', verifyToken, (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check business access (super admin can access any, regular users only their business)
    if (!req.isSuperAdmin && product.business_id !== req.user.businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const batches = db.prepare(`
      SELECT * FROM stock_batches WHERE product_id = ? ORDER BY purchase_date ASC
    `).all(product.id);

    const stockHistory = db.prepare(`
      SELECT * FROM stock_history WHERE product_id = ? ORDER BY date DESC
    `).all(product.id);

    res.json({
      ...product,
      batches: batches.map(batch => ({
        id: batch.id,
        purchaseDate: batch.purchase_date,
        quantity: batch.quantity,
        remainingQuantity: batch.remaining_quantity,
        purchasePrice: batch.purchase_price,
      })),
      stockHistory: stockHistory.map(history => ({
        id: history.id,
        date: history.date,
        quantity: history.quantity,
        type: history.type,
        batchId: history.batch_id,
      })),
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product
router.post('/', verifyToken, (req, res) => {
  try {
    const { name, category, quantity, price, batches, stockHistory, businessId } = req.body;
    
    // Determine which business_id to use
    let targetBusinessId = businessId;
    if (req.isSuperAdmin && businessId) {
      // Super admin can create products for any business
      targetBusinessId = businessId;
    } else {
      // Regular users create products for their own business
      targetBusinessId = req.user.businessId;
    }

    if (!targetBusinessId) {
      return res.status(400).json({ error: 'Business context required' });
    }

    const id = Date.now().toString();
    const now = new Date().toISOString();

    // Insert product
    db.prepare(`
      INSERT INTO products (id, name, category, price, quantity, business_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, category || null, price, quantity || 0, targetBusinessId, now, now);

    // Insert batches if provided
    if (batches && batches.length > 0) {
      const insertBatch = db.prepare(`
        INSERT INTO stock_batches (id, product_id, purchase_date, quantity, remaining_quantity, purchase_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const batch of batches) {
        insertBatch.run(
          batch.id,
          id,
          batch.purchaseDate,
          batch.quantity,
          batch.remainingQuantity,
          batch.purchasePrice
        );
      }
    }

    // Insert stock history if provided
    if (stockHistory && stockHistory.length > 0) {
      const insertHistory = db.prepare(`
        INSERT INTO stock_history (id, product_id, batch_id, date, quantity, type)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const history of stockHistory) {
        insertHistory.run(
          history.id,
          id,
          history.batchId || null,
          history.date,
          history.quantity,
          history.type
        );
      }
    }

    res.status(201).json({ id, message: 'Product created successfully' });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', verifyToken, (req, res) => {
  try {
    // Check product exists and user has access
    const product = db.prepare('SELECT business_id FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check business access
    if (!req.isSuperAdmin && product.business_id !== req.user.businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, category, price } = req.body;
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE products 
      SET name = ?, category = ?, price = ?, updated_at = ?
      WHERE id = ?
    `).run(name, category || null, price, now, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', verifyToken, (req, res) => {
  try {
    // Check product exists and user has access
    const product = db.prepare('SELECT business_id FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check business access
    if (!req.isSuperAdmin && product.business_id !== req.user.businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Add stock to product
router.post('/:id/stock', verifyToken, (req, res) => {
  try {
    // Check product exists and user has access
    const product = db.prepare('SELECT business_id FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check business access
    if (!req.isSuperAdmin && product.business_id !== req.user.businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { quantity, purchasePrice, purchaseDate, batchId } = req.body;
    const productId = req.params.id;
    const now = new Date().toISOString();

    let batchIdToUse = batchId;

    if (batchId) {
      // Add to existing batch
      db.prepare(`
        UPDATE stock_batches 
        SET quantity = quantity + ?, remaining_quantity = remaining_quantity + ?
        WHERE id = ?
      `).run(quantity, quantity, batchId);
    } else {
      // Create new batch
      batchIdToUse = `batch-${Date.now()}-${Math.random()}`;
      db.prepare(`
        INSERT INTO stock_batches (id, product_id, purchase_date, quantity, remaining_quantity, purchase_price)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(batchIdToUse, productId, purchaseDate || new Date().toISOString().split('T')[0], quantity, quantity, purchasePrice);
    }

    // Add stock history
    const historyId = `history-${Date.now()}`;
    db.prepare(`
      INSERT INTO stock_history (id, product_id, batch_id, date, quantity, type)
      VALUES (?, ?, ?, ?, ?, 'added')
    `).run(historyId, productId, batchIdToUse, now, quantity);

    // Update product quantity
    const batches = db.prepare('SELECT remaining_quantity FROM stock_batches WHERE product_id = ?').all(productId);
    const newQuantity = batches.reduce((sum, b) => sum + b.remaining_quantity, 0);
    
    db.prepare('UPDATE products SET quantity = ?, updated_at = ? WHERE id = ?')
      .run(newQuantity, now, productId);

    res.json({ message: 'Stock added successfully', batchId: batchIdToUse });
  } catch (error) {
    console.error('Error adding stock:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

export default router;

















