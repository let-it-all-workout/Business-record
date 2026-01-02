import express from 'express';
import db from '../database/db-postgres.js';
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
router.get('/', verifyToken, async (req, res) => {
  try {
    const filter = getBusinessFilter(req);
    
    if (!filter.businessId && !filter.isSuperAdmin) {
      return res.status(403).json({ error: 'Business context required' });
    }

    // For regular users, include data with NULL business_id (old data compatibility)
    // For super admin selecting a business, also include NULL business_id (legacy data)
    const query = filter.isSuperAdmin && filter.businessId
      ? `SELECT * FROM products WHERE (business_id = $1 OR business_id IS NULL) ORDER BY created_at DESC`
      : filter.isSuperAdmin
      ? `SELECT * FROM products ORDER BY created_at DESC`
      : `SELECT * FROM products WHERE (business_id = $1 OR business_id IS NULL) ORDER BY created_at DESC`;
    
    const products = filter.isSuperAdmin && !filter.businessId
      ? await db.prepare(query).all()
      : await db.prepare(query).all(filter.businessId);

    // Get batches for each product (async)
    const productsWithBatches = await Promise.all(
      products.map(async (product) => {
        const batches = await db.prepare(`
          SELECT * FROM stock_batches WHERE product_id = $1 ORDER BY purchase_date ASC
        `).all(product.id);

        const stockHistory = await db.prepare(`
          SELECT * FROM stock_history WHERE product_id = $1 ORDER BY date DESC
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
      })
    );

    res.json(productsWithBatches);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const product = await db.prepare('SELECT * FROM products WHERE id = $1').get(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check business access (super admin can access any, regular users only their business)
    if (!req.isSuperAdmin && product.business_id !== req.user.businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const batches = await db.prepare(`
      SELECT * FROM stock_batches WHERE product_id = $1 ORDER BY purchase_date ASC
    `).all(product.id);

    const stockHistory = await db.prepare(`
      SELECT * FROM stock_history WHERE product_id = $1 ORDER BY date DESC
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
router.post('/', verifyToken, async (req, res) => {
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

    const now = new Date().toISOString();

    // Insert product (PostgreSQL will generate UUID)
    const productResult = await db.prepare(`
      INSERT INTO products (name, category, price, quantity, business_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `).get(name, category || null, price, quantity || 0, targetBusinessId, now, now);
    
    const id = productResult.id;

    // Insert batches if provided
    if (batches && batches.length > 0) {
      for (const batch of batches) {
        await db.prepare(`
          INSERT INTO stock_batches (product_id, purchase_date, quantity, remaining_quantity, purchase_price)
          VALUES ($1, $2, $3, $4, $5)
        `).run(id, batch.purchaseDate, batch.quantity, batch.remainingQuantity, batch.purchasePrice);
      }
    }

    // Insert stock history if provided
    if (stockHistory && stockHistory.length > 0) {
      for (const history of stockHistory) {
        await db.prepare(`
          INSERT INTO stock_history (product_id, batch_id, date, quantity, type)
          VALUES ($1, $2, $3, $4, $5)
        `).run(id, history.batchId || null, history.date, history.quantity, history.type);
      }
    }

    res.status(201).json({ id, message: 'Product created successfully' });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', verifyToken, async (req, res) => {
  try {
    // Check product exists and user has access
    const product = await db.prepare('SELECT business_id FROM products WHERE id = $1').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check business access
    if (!req.isSuperAdmin && product.business_id !== req.user.businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, category, price } = req.body;
    const now = new Date().toISOString();

    const result = await db.prepare(`
      UPDATE products 
      SET name = $1, category = $2, price = $3, updated_at = $4
      WHERE id = $5
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
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    // Check product exists and user has access
    const product = await db.prepare('SELECT business_id FROM products WHERE id = $1').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check business access
    if (!req.isSuperAdmin && product.business_id !== req.user.businessId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.prepare('DELETE FROM products WHERE id = $1').run(req.params.id);

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
router.post('/:id/stock', verifyToken, async (req, res) => {
  try {
    // Check product exists and user has access
    const product = await db.prepare('SELECT business_id FROM products WHERE id = $1').get(req.params.id);
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
      await db.prepare(`
        UPDATE stock_batches 
        SET quantity = quantity + $1, remaining_quantity = remaining_quantity + $2
        WHERE id = $3
      `).run(quantity, quantity, batchId);
      batchIdToUse = batchId;
    } else {
      // Create new batch (PostgreSQL will generate UUID)
      const batchResult = await db.prepare(`
        INSERT INTO stock_batches (product_id, purchase_date, quantity, remaining_quantity, purchase_price)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `).run(productId, purchaseDate || new Date().toISOString().split('T')[0], quantity, quantity, purchasePrice);
      batchIdToUse = batchResult.id;
    }

    // Add stock history
    await db.prepare(`
      INSERT INTO stock_history (product_id, batch_id, date, quantity, type)
      VALUES ($1, $2, $3, $4, 'added')
    `).run(productId, batchIdToUse, now, quantity);

    // Update product quantity
    const batches = await db.prepare('SELECT remaining_quantity FROM stock_batches WHERE product_id = $1').all(productId);
    const newQuantity = batches.reduce((sum, b) => sum + parseInt(b.remaining_quantity), 0);
    
    await db.prepare('UPDATE products SET quantity = $1, updated_at = $2 WHERE id = $3')
      .run(newQuantity, now, productId);

    res.json({ message: 'Stock added successfully', batchId: batchIdToUse });
  } catch (error) {
    console.error('Error adding stock:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

export default router;

















