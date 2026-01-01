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

// Get all sales
router.get('/', verifyToken, (req, res) => {
  try {
    const filter = getBusinessFilter(req);
    
    if (!filter.businessId && !filter.isSuperAdmin) {
      return res.status(403).json({ error: 'Business context required' });
    }

    // For regular users, include data with NULL/empty business_id (old data compatibility)
    // For super admin selecting a business, also include NULL/empty business_id (legacy data)
    const query = filter.isSuperAdmin && filter.businessId
      ? `SELECT * FROM sales WHERE (business_id = ? OR business_id IS NULL OR business_id = '') ORDER BY date DESC`
      : filter.isSuperAdmin
      ? `SELECT * FROM sales ORDER BY date DESC`
      : `SELECT * FROM sales WHERE (business_id = ? OR business_id IS NULL OR business_id = '') ORDER BY date DESC`;
    
    const sales = filter.isSuperAdmin && !filter.businessId
      ? db.prepare(query).all()
      : db.prepare(query).all(filter.businessId);

    // Get batch details and refund history for each sale
    const salesWithDetails = sales.map(sale => {
      const batchDetails = db.prepare(`
        SELECT batch_id, quantity, purchase_price 
        FROM sale_batch_details 
        WHERE sale_id = ?
      `).all(sale.id).map(bd => ({
        batchId: bd.batch_id,
        quantity: bd.quantity,
        purchasePrice: bd.purchase_price,
      }));

      const refundHistory = db.prepare(`
        SELECT date, quantity FROM refund_history WHERE sale_id = ? ORDER BY date ASC
      `).all(sale.id).map(rh => ({
        date: rh.date,
        quantity: rh.quantity,
      }));

      return {
        id: sale.id,
        productId: sale.product_id,
        productName: sale.product_name,
        inventoryId: sale.inventory_id,
        goodId: sale.good_id,
        quantity: sale.quantity,
        sellingPrice: sale.selling_price,
        purchasePrice: sale.purchase_price,
        profit: sale.profit,
        currency: sale.currency,
        date: sale.date,
        refunded: sale.refunded === 1,
        refundedQuantity: sale.refunded_quantity,
        refundDate: sale.refund_date,
        refundHistory,
        batchDetails,
      };
    });

    res.json(salesWithDetails);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Get single sale
router.get('/:id', verifyToken, (req, res) => {
  try {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Check business access
    // Allow access if:
    // 1. User is super admin, OR
    // 2. Sale's business_id matches user's businessId, OR
    // 3. Sale has NULL/empty business_id (old data) and user has a businessId (backward compatibility)
    const saleBusinessId = sale.business_id;
    const userBusinessId = req.user.businessId;
    const isOldData = !saleBusinessId || saleBusinessId === '' || saleBusinessId === 'null';
    
    if (!req.isSuperAdmin) {
      if (isOldData && userBusinessId) {
        // Old data - allow access for backward compatibility
        console.log(`[GET SALE] Allowing access to old data (NULL business_id) for user: ${req.user.id}`);
      } else if (saleBusinessId !== userBusinessId) {
        return res.status(403).json({ error: 'Access denied. You do not have permission to view this sale.' });
      }
    }

    const batchDetails = db.prepare(`
      SELECT batch_id, quantity, purchase_price 
      FROM sale_batch_details 
      WHERE sale_id = ?
    `).all(sale.id).map(bd => ({
      batchId: bd.batch_id,
      quantity: bd.quantity,
      purchasePrice: bd.purchase_price,
    }));

    const refundHistory = db.prepare(`
      SELECT date, quantity FROM refund_history WHERE sale_id = ? ORDER BY date ASC
    `).all(sale.id).map(rh => ({
      date: rh.date,
      quantity: rh.quantity,
    }));

    res.json({
      id: sale.id,
      productId: sale.product_id,
      productName: sale.product_name,
      inventoryId: sale.inventory_id,
      goodId: sale.good_id,
      quantity: sale.quantity,
      sellingPrice: sale.selling_price,
      purchasePrice: sale.purchase_price,
      profit: sale.profit,
      currency: sale.currency,
      date: sale.date,
      refunded: sale.refunded === 1,
      refundedQuantity: sale.refunded_quantity,
      refundDate: sale.refund_date,
      refundHistory,
      batchDetails,
    });
  } catch (error) {
    console.error('Error fetching sale:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

// Create sale
router.post('/', verifyToken, (req, res) => {
  try {
    const {
      productId,
      productName,
      inventoryId,
      goodId,
      quantity,
      sellingPrice,
      purchasePrice,
      profit,
      currency,
      batchDetails,
      businessId,
    } = req.body;

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

    // Use a transaction to ensure all operations happen atomically
    const transaction = db.transaction((saleData) => {
      const {
        productId,
        productName,
        inventoryId,
        goodId,
        quantity,
        sellingPrice,
        purchasePrice,
        profit,
        currency,
        batchDetails,
        targetBusinessId,
      } = saleData;

      const id = Date.now().toString();
      const now = new Date().toISOString();

      // Determine if this is a goods inventory sale
      const isGoodsInventorySale = !!(inventoryId && goodId);

      // For goods inventory sales, productId should be null (or a placeholder)
      // For regular product sales, productId must be valid
      const actualProductId = isGoodsInventorySale ? null : productId;

      // Insert sale
      db.prepare(`
        INSERT INTO sales (
          id, product_id, product_name, inventory_id, good_id,
          quantity, selling_price, purchase_price, profit, currency, date, business_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        actualProductId,
        productName,
        inventoryId || null,
        goodId || null,
        quantity,
        sellingPrice,
        purchasePrice,
        profit,
        currency || 'USD',
        now,
        targetBusinessId
      );

      // Handle goods inventory sale
      if (isGoodsInventorySale && goodId) {
        // Get current good state
        const good = db.prepare('SELECT remaining_quantity, quantity FROM goods WHERE id = ?').get(goodId);
        if (!good) {
          throw new Error(`Good with id ${goodId} not found`);
        }
        
        // Check if there's enough stock
        if (good.remaining_quantity < quantity) {
          throw new Error(`Insufficient stock! Only ${good.remaining_quantity} units available, but trying to sell ${quantity}`);
        }
        
        // Update good's remaining quantity
        const newRemainingQuantity = good.remaining_quantity - quantity;
        if (newRemainingQuantity < 0) {
          throw new Error(`Cannot sell ${quantity} units. Only ${good.remaining_quantity} units remaining.`);
        }
        
        db.prepare(`
          UPDATE goods 
          SET remaining_quantity = ?, updated_at = ?
          WHERE id = ?
        `).run(newRemainingQuantity, now, goodId);
        
        console.log(`✅ Sale created: Deducted ${quantity} from good ${goodId}. Remaining: ${newRemainingQuantity}`);
      } else {
        // Handle regular product sale with batches
        // Insert batch details if provided
        if (batchDetails && batchDetails.length > 0) {
          const insertBatchDetail = db.prepare(`
            INSERT INTO sale_batch_details (id, sale_id, batch_id, quantity, purchase_price)
            VALUES (?, ?, ?, ?, ?)
          `);

          for (const detail of batchDetails) {
            insertBatchDetail.run(
              `detail-${Date.now()}-${Math.random()}`,
              id,
              detail.batchId,
              detail.quantity,
              detail.purchasePrice
            );
          }
        }

        // Update product batches (reduce remaining quantity)
        if (batchDetails && batchDetails.length > 0) {
          const updateBatch = db.prepare(`
            UPDATE stock_batches 
            SET remaining_quantity = remaining_quantity - ?
            WHERE id = ?
          `);

          for (const detail of batchDetails) {
            updateBatch.run(detail.quantity, detail.batchId);
          }

          // Update product quantity
          const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
          if (product) {
            const batches = db.prepare('SELECT remaining_quantity FROM stock_batches WHERE product_id = ?').all(productId);
            const newQuantity = batches.reduce((sum, b) => sum + b.remaining_quantity, 0);
            db.prepare('UPDATE products SET quantity = ?, updated_at = ? WHERE id = ?')
              .run(newQuantity, now, productId);
          }
        }

        // Add stock history entry (only for regular products, not goods)
        if (productId) {
          const historyId = `history-${Date.now()}`;
          db.prepare(`
            INSERT INTO stock_history (id, product_id, date, quantity, type)
            VALUES (?, ?, ?, ?, 'sold')
          `).run(historyId, productId, now, quantity);
        }
      }

      return { id, message: 'Sale created successfully' };
    });

    // Execute the transaction
    const result = transaction({
      productId,
      productName,
      inventoryId,
      goodId,
      quantity,
      sellingPrice,
      purchasePrice,
      profit,
      currency,
      batchDetails,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating sale:', error);
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({ 
      error: 'Failed to create sale',
      ...(isDevelopment && { details: error.message })
    });
  }
});

// Update sale
router.put('/:id', verifyToken, (req, res) => {
  try {
    const saleId = req.params.id;
    
    // Check sale exists and user has access
    const sale = db.prepare('SELECT business_id FROM sales WHERE id = ?').get(saleId);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Check business access
    // Allow access if:
    // 1. User is super admin, OR
    // 2. Sale's business_id matches user's businessId, OR
    // 3. Sale has NULL/empty business_id (old data) and user has a businessId (backward compatibility)
    const saleBusinessId = sale.business_id;
    const userBusinessId = req.user.businessId;
    const isOldData = !saleBusinessId || saleBusinessId === '' || saleBusinessId === 'null';
    
    if (!req.isSuperAdmin) {
      if (isOldData && userBusinessId) {
        // Old data - allow access for backward compatibility
        console.log(`[UPDATE SALE] Allowing access to old data (NULL business_id) for user: ${req.user.id}`);
      } else if (saleBusinessId !== userBusinessId) {
        return res.status(403).json({ error: 'Access denied. You do not have permission to update this sale.' });
      }
    }

    const sellingPrice = req.body.sellingPrice || req.body.selling_price;
    const quantity = req.body.quantity;
    
    // Use a transaction to ensure all operations happen atomically
    const transaction = db.transaction(({ sellingPrice, quantity, saleId }) => {
      const now = new Date().toISOString();

      // Get original sale
      const originalSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
      if (!originalSale) {
        throw new Error('Sale not found');
      }

      const oldQuantity = originalSale.quantity;
      const newQuantity = quantity || oldQuantity;
      const newSellingPrice = sellingPrice || originalSale.selling_price;
      const quantityDifference = newQuantity - oldQuantity;
      const refundedQuantity = originalSale.refunded_quantity || 0;

      // Validation: Cannot set quantity below refunded quantity
      if (newQuantity < refundedQuantity) {
        throw new Error(`Cannot set quantity to ${newQuantity}. ${refundedQuantity} units have already been refunded.`);
      }

      // Recalculate profit - account for refunded quantities
      const purchasePrice = originalSale.purchase_price || 0;
      const profitPerUnit = newSellingPrice - purchasePrice;
      const effectiveQuantity = newQuantity - refundedQuantity; // Only count non-refunded
      const newProfit = profitPerUnit * effectiveQuantity;

      console.log(`[UPDATE SALE] Processing update for sale ${saleId}:`);
      console.log(`  - Old quantity: ${oldQuantity}, New quantity: ${newQuantity}`);
      console.log(`  - Refunded quantity: ${refundedQuantity}`);
      console.log(`  - Effective quantity (non-refunded): ${effectiveQuantity}`);
      console.log(`  - Profit: ${originalSale.profit} -> ${newProfit}`);

      // Update sale with new values and recalculated profit
      const result = db.prepare(`
        UPDATE sales 
        SET selling_price = ?, quantity = ?, profit = ?, updated_at = ?
        WHERE id = ?
      `).run(newSellingPrice, newQuantity, newProfit, now, saleId);

      if (result.changes === 0) {
        throw new Error('Sale not found or update failed');
      }

      // Handle stock quantity changes
      if (quantityDifference !== 0) {
        // Handle goods inventory sale
        if (originalSale.good_id) {
          console.log(`[UPDATE SALE] Updating stock for good_id: ${originalSale.good_id}`);
          
          // Recalculate remaining quantity from ALL sales (like refund does)
          // This ensures accuracy even if database was in inconsistent state
          const allSalesForGood = db.prepare(`
            SELECT quantity, refunded_quantity FROM sales WHERE good_id = ?
          `).all(originalSale.good_id);
          
          const totalNetSold = allSalesForGood.reduce((sum, s) => {
            const refunded = s.refunded_quantity || 0;
            return sum + (s.quantity - refunded);
          }, 0);
          
          const good = db.prepare('SELECT quantity FROM goods WHERE id = ?').get(originalSale.good_id);
          if (!good) {
            throw new Error(`Good not found: ${originalSale.good_id}`);
          }
          
          const correctRemainingQuantity = good.quantity - totalNetSold;
          
          console.log(`[UPDATE SALE] Good stock recalculation:`);
          console.log(`  - Total quantity: ${good.quantity}`);
          console.log(`  - Total net sold: ${totalNetSold}`);
          console.log(`  - Correct remaining: ${correctRemainingQuantity}`);
          
          db.prepare(`
            UPDATE goods 
            SET remaining_quantity = ?, updated_at = ?
            WHERE id = ?
          `).run(correctRemainingQuantity, now, originalSale.good_id);
          
          console.log(`[UPDATE SALE] ✅ Stock updated for good`);
        } 
        // Handle regular product sale with batches
        else if (originalSale.product_id) {
          console.log(`[UPDATE SALE] Updating stock for product_id: ${originalSale.product_id}`);
          
          const batchDetails = db.prepare(`
            SELECT batch_id, quantity FROM sale_batch_details WHERE sale_id = ?
          `).all(saleId);

          if (batchDetails.length > 0) {
            // Calculate ratio for each batch
            if (oldQuantity === 0) {
              throw new Error('Cannot update sale: original quantity is 0, cannot calculate batch ratio');
            }
            const ratio = quantityDifference / oldQuantity;
            const updateBatch = db.prepare(`
              UPDATE stock_batches 
              SET remaining_quantity = remaining_quantity - ?
              WHERE id = ?
            `);

            for (const detail of batchDetails) {
              const batchQuantityChange = Math.round(detail.quantity * ratio);
              updateBatch.run(batchQuantityChange, detail.batch_id);
            }

            // Update product quantity from batches
            const batches = db.prepare('SELECT remaining_quantity FROM stock_batches WHERE product_id = ?').all(originalSale.product_id);
            const newProductQuantity = batches.reduce((sum, b) => sum + b.remaining_quantity, 0);
            db.prepare('UPDATE products SET quantity = ?, updated_at = ? WHERE id = ?')
              .run(newProductQuantity, now, originalSale.product_id);
            
            console.log(`[UPDATE SALE] ✅ Stock updated for product with batches`);
          } else {
            // No batch details - update product quantity directly (legacy products)
            const product = db.prepare('SELECT quantity FROM products WHERE id = ?').get(originalSale.product_id);
            if (product) {
              const newProductQuantity = Math.max(0, product.quantity - quantityDifference);
              db.prepare('UPDATE products SET quantity = ?, updated_at = ? WHERE id = ?')
                .run(newProductQuantity, now, originalSale.product_id);
              
              console.log(`[UPDATE SALE] ✅ Stock updated for legacy product`);
            }
          }
        }
      }

      return { message: 'Sale updated successfully' };
    });

    // Execute the transaction
    const result = transaction({ sellingPrice, quantity, saleId });
    
    console.log(`[UPDATE SALE] ✅ Transaction completed successfully`);
    
    res.json(result);
  } catch (error) {
    console.error('[UPDATE SALE] ❌ Error updating sale:', error);
    console.error('[UPDATE SALE] Error stack:', error.stack);
    res.status(500).json({ error: `Failed to update sale: ${error.message || 'Unknown error'}` });
  }
});

// Refund sale
router.post('/:id/refund', verifyToken, (req, res) => {
  try {
    const saleId = req.params.id;
    
    // Check sale exists and user has access
    const saleCheck = db.prepare('SELECT business_id FROM sales WHERE id = ?').get(saleId);
    if (!saleCheck) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Check business access
    // Allow access if:
    // 1. User is super admin, OR
    // 2. Sale's business_id matches user's businessId, OR
    // 3. Sale has NULL/empty business_id (old data) and user has a businessId (backward compatibility)
    const saleBusinessId = saleCheck.business_id;
    const userBusinessId = req.user.businessId;
    const isOldData = !saleBusinessId || saleBusinessId === '' || saleBusinessId === 'null';
    
    if (!req.isSuperAdmin) {
      if (isOldData && userBusinessId) {
        // Old data - allow access for backward compatibility
        console.log(`[REFUND] Allowing access to old data (NULL business_id) for user: ${req.user.id}`);
      } else if (saleBusinessId !== userBusinessId) {
        return res.status(403).json({ error: 'Access denied. You do not have permission to refund this sale.' });
      }
    }

    const { quantity } = req.body;
    
    // Use a transaction to ensure all operations happen atomically
    // This ensures the sale update and stock restoration happen together
    const transaction = db.transaction(({ quantity, saleId }) => {
      const now = new Date().toISOString();

      // Get sale
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
      if (!sale) {
        throw new Error('Sale not found');
      }

      const currentRefunded = sale.refunded_quantity || 0;
      const newRefundedQuantity = currentRefunded + quantity;
      const isFullyRefunded = newRefundedQuantity >= sale.quantity;

      // Recalculate profit based on remaining (non-refunded) quantity
      const profitPerUnit = sale.selling_price - sale.purchase_price;
      const remainingQuantity = sale.quantity - newRefundedQuantity;
      const recalculatedProfit = profitPerUnit * remainingQuantity;

      console.log(`[REFUND] Processing refund for sale ${saleId}:`);
      console.log(`  - Quantity to refund: ${quantity}`);
      console.log(`  - Current refunded: ${currentRefunded}`);
      console.log(`  - New refunded total: ${newRefundedQuantity}`);
      console.log(`  - Profit: ${sale.profit} -> ${recalculatedProfit}`);

      // Update sale with recalculated profit
      db.prepare(`
        UPDATE sales 
        SET refunded = ?, refunded_quantity = ?, refund_date = ?, profit = ?, updated_at = ?
        WHERE id = ?
      `).run(isFullyRefunded ? 1 : 0, newRefundedQuantity, now, recalculatedProfit, now, saleId);

      // Add refund history
      const refundHistoryId = `refund-${Date.now()}`;
      db.prepare(`
        INSERT INTO refund_history (id, sale_id, date, quantity)
        VALUES (?, ?, ?, ?)
      `).run(refundHistoryId, saleId, now, quantity);

      // Restore stock - handle both goods inventory and regular products
      let stockRestored = false;
      let updatedStockInfo = null;

      if (sale.good_id) {
        // Handle goods inventory refund
        console.log(`[REFUND] Restoring stock for good_id: ${sale.good_id}`);
        
        const good = db.prepare('SELECT remaining_quantity, name, quantity FROM goods WHERE id = ?').get(sale.good_id);
        if (good) {
          const oldRemainingQuantity = good.remaining_quantity;
          
          // Recalculate remaining quantity from ALL sales (now includes the updated refunded_quantity)
          // This ensures accuracy by calculating from the source of truth (all sales)
          const allSalesForGood = db.prepare(`
            SELECT quantity, refunded_quantity FROM sales WHERE good_id = ?
          `).all(sale.good_id);
          
          const totalNetSold = allSalesForGood.reduce((sum, s) => {
            const refunded = s.refunded_quantity || 0;
            return sum + (s.quantity - refunded);
          }, 0);
          
          const correctRemainingQuantity = good.quantity - totalNetSold;
          
          console.log(`[REFUND] Good "${good.name}":`);
          console.log(`  - Total Quantity: ${good.quantity}`);
          console.log(`  - Old remaining: ${oldRemainingQuantity}`);
          console.log(`  - Total net sold: ${totalNetSold}`);
          console.log(`  - Correct remaining: ${correctRemainingQuantity}`);
          
          // Update goods with the correct remaining quantity
          const updateResult = db.prepare(`
            UPDATE goods 
            SET remaining_quantity = ?, updated_at = ?
            WHERE id = ?
          `).run(correctRemainingQuantity, now, sale.good_id);
          
          console.log(`[REFUND] Stock update executed. Rows changed: ${updateResult.changes}`);
          
          if (updateResult.changes === 0) {
            throw new Error(`Failed to update good ${sale.good_id} - no rows changed`);
          }
          
          // Verify the update
          const updated = db.prepare('SELECT remaining_quantity, quantity FROM goods WHERE id = ?').get(sale.good_id);
          if (!updated || updated.remaining_quantity !== correctRemainingQuantity) {
            throw new Error(`Stock update verification failed for good ${sale.good_id}`);
          }
          
          stockRestored = true;
          updatedStockInfo = {
            type: 'good',
            id: sale.good_id,
            name: good.name,
            oldRemaining: oldRemainingQuantity,
            newRemaining: correctRemainingQuantity,
            totalQuantity: good.quantity
          };
          
          console.log(`[REFUND] ✅ Stock successfully restored for good "${good.name}"`);
        } else {
          throw new Error(`Good not found: ${sale.good_id}`);
        }
      } else if (sale.product_id) {
        // Handle regular product refund
        console.log(`[REFUND] Restoring stock for product_id: ${sale.product_id}`);
        
        const batchDetails = db.prepare(`
          SELECT batch_id, quantity FROM sale_batch_details WHERE sale_id = ?
        `).all(saleId);

        if (batchDetails.length > 0) {
          // Restore to batches proportionally
          const refundRatio = quantity / sale.quantity;
          const updateBatch = db.prepare(`
            UPDATE stock_batches 
            SET remaining_quantity = remaining_quantity + ?
            WHERE id = ?
          `);

          for (const detail of batchDetails) {
            const batchRefundQuantity = Math.round(detail.quantity * refundRatio);
            updateBatch.run(batchRefundQuantity, detail.batch_id);
          }

          // Update product quantity from batches
          const batches = db.prepare('SELECT remaining_quantity FROM stock_batches WHERE product_id = ?').all(sale.product_id);
          const newQuantity = batches.reduce((sum, b) => sum + b.remaining_quantity, 0);
          const product = db.prepare('SELECT name FROM products WHERE id = ?').get(sale.product_id);
          db.prepare('UPDATE products SET quantity = ?, updated_at = ? WHERE id = ?')
            .run(newQuantity, now, sale.product_id);
          
          stockRestored = true;
          updatedStockInfo = {
            type: 'product',
            id: sale.product_id,
            name: product?.name || 'Unknown',
            newQuantity: newQuantity
          };
          
          console.log(`[REFUND] ✅ Stock successfully restored for product`);
        } else {
          // No batch details - restore directly to product (legacy products)
          const product = db.prepare('SELECT quantity, name FROM products WHERE id = ?').get(sale.product_id);
          if (product) {
            const oldQuantity = product.quantity;
            const newProductQuantity = product.quantity + quantity;
            db.prepare('UPDATE products SET quantity = ?, updated_at = ? WHERE id = ?')
              .run(newProductQuantity, now, sale.product_id);
            
            stockRestored = true;
            updatedStockInfo = {
              type: 'product',
              id: sale.product_id,
              name: product.name,
              oldQuantity: oldQuantity,
              newQuantity: newProductQuantity
            };
            
            console.log(`[REFUND] ✅ Stock successfully restored for product`);
          } else {
            throw new Error(`Product not found: ${sale.product_id}`);
          }
        }
      } else {
        throw new Error('Sale has neither good_id nor product_id');
      }

      return {
        message: 'Refund processed successfully',
        refundedQuantity: newRefundedQuantity,
        isFullyRefunded,
        stockRestored,
        updatedStock: updatedStockInfo,
      };
    });

    // Execute the transaction
    const result = transaction({ quantity, saleId });
    
    console.log(`[REFUND] ✅ Transaction completed successfully`);
    console.log(`[REFUND] Response:`, JSON.stringify(result, null, 2));
    
    res.json(result);
  } catch (error) {
    console.error('[REFUND] ❌ Error processing refund:', error);
    console.error('[REFUND] Error stack:', error.stack);
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({ 
      error: 'Failed to process refund',
      ...(isDevelopment && { details: error.message })
    });
  }
});

export default router;







