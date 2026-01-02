import express from 'express';
import db from '../database/db-postgres.js';
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
router.get('/', verifyToken, async (req, res) => {
  try {
    const filter = getBusinessFilter(req);
    
    if (!filter.businessId && !filter.isSuperAdmin) {
      return res.status(403).json({ error: 'Business context required' });
    }

    // For regular users, include data with NULL business_id (old data compatibility)
    const query = filter.isSuperAdmin && filter.businessId
      ? `SELECT * FROM sales WHERE (business_id = $1 OR business_id IS NULL) ORDER BY date DESC`
      : filter.isSuperAdmin
      ? `SELECT * FROM sales ORDER BY date DESC`
      : `SELECT * FROM sales WHERE (business_id = $1 OR business_id IS NULL) ORDER BY date DESC`;
    
    const sales = filter.isSuperAdmin && !filter.businessId
      ? await db.prepare(query).all()
      : await db.prepare(query).all(filter.businessId);

    // Get batch details and refund history for each sale (async)
    const salesWithDetails = await Promise.all(
      sales.map(async (sale) => {
        const batchDetails = (await db.prepare(`
          SELECT batch_id, quantity, purchase_price 
          FROM sale_batch_details 
          WHERE sale_id = $1
        `).all(sale.id)).map(bd => ({
          batchId: bd.batch_id,
          quantity: bd.quantity,
          purchasePrice: bd.purchase_price,
        }));

        const refundHistory = (await db.prepare(`
          SELECT date, quantity FROM refund_history WHERE sale_id = $1 ORDER BY date ASC
        `).all(sale.id)).map(rh => ({
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
          refunded: sale.refunded === true || sale.refunded === 1,
          refundedQuantity: sale.refunded_quantity,
          refundDate: sale.refund_date,
          refundHistory,
          batchDetails,
        };
      })
    );

    res.json(salesWithDetails);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Get single sale
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const sale = await db.prepare('SELECT * FROM sales WHERE id = $1').get(req.params.id);
    
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

    const batchDetails = (await db.prepare(`
      SELECT batch_id, quantity, purchase_price 
      FROM sale_batch_details 
      WHERE sale_id = $1
    `).all(sale.id)).map(bd => ({
      batchId: bd.batch_id,
      quantity: bd.quantity,
      purchasePrice: bd.purchase_price,
    }));

    const refundHistory = (await db.prepare(`
      SELECT date, quantity FROM refund_history WHERE sale_id = $1 ORDER BY date ASC
    `).all(sale.id)).map(rh => ({
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
      refunded: sale.refunded === true || sale.refunded === 1,
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
router.post('/', verifyToken, async (req, res) => {
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

    // Use a transaction to ensure all operations happen atomically (async)
    const transactionFn = db.transaction(async (txDb) => {
      const now = new Date().toISOString();

      // Determine if this is a goods inventory sale
      const isGoodsInventorySale = !!(inventoryId && goodId);

      // For goods inventory sales, productId should be null
      // For regular product sales, productId must be valid
      const actualProductId = isGoodsInventorySale ? null : productId;

      // Insert sale (PostgreSQL will generate UUID)
      const saleResult = await txDb.prepare(`
        INSERT INTO sales (
          product_id, product_name, inventory_id, good_id,
          quantity, selling_price, purchase_price, profit, currency, date, business_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `).get(
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

      const id = saleResult.id;

      // Handle goods inventory sale
      if (isGoodsInventorySale && goodId) {
        // Get current good state
        const good = await txDb.prepare('SELECT remaining_quantity, quantity FROM goods WHERE id = $1').get(goodId);
        if (!good) {
          throw new Error(`Good with id ${goodId} not found`);
        }
        
        // Check if there's enough stock
        if (parseInt(good.remaining_quantity) < quantity) {
          throw new Error(`Insufficient stock! Only ${good.remaining_quantity} units available, but trying to sell ${quantity}`);
        }
        
        // Update good's remaining quantity
        const newRemainingQuantity = parseInt(good.remaining_quantity) - quantity;
        if (newRemainingQuantity < 0) {
          throw new Error(`Cannot sell ${quantity} units. Only ${good.remaining_quantity} units remaining.`);
        }
        
        await txDb.prepare(`
          UPDATE goods 
          SET remaining_quantity = $1, updated_at = $2
          WHERE id = $3
        `).run(newRemainingQuantity, now, goodId);
        
        console.log(`✅ Sale created: Deducted ${quantity} from good ${goodId}. Remaining: ${newRemainingQuantity}`);
      } else {
        // Handle regular product sale with batches
        // Insert batch details if provided
        if (batchDetails && batchDetails.length > 0) {
          for (const detail of batchDetails) {
            await txDb.prepare(`
              INSERT INTO sale_batch_details (sale_id, batch_id, quantity, purchase_price)
              VALUES ($1, $2, $3, $4)
            `).run(id, detail.batchId, detail.quantity, detail.purchasePrice);
          }
        }

        // Update product batches (reduce remaining quantity)
        if (batchDetails && batchDetails.length > 0) {
          for (const detail of batchDetails) {
            await txDb.prepare(`
              UPDATE stock_batches 
              SET remaining_quantity = remaining_quantity - $1
              WHERE id = $2
            `).run(detail.quantity, detail.batchId);
          }

          // Update product quantity
          const product = await txDb.prepare('SELECT id FROM products WHERE id = $1').get(productId);
          if (product) {
            const batches = await txDb.prepare('SELECT remaining_quantity FROM stock_batches WHERE product_id = $1').all(productId);
            const newQuantity = batches.reduce((sum, b) => sum + parseInt(b.remaining_quantity), 0);
            await txDb.prepare('UPDATE products SET quantity = $1, updated_at = $2 WHERE id = $3')
              .run(newQuantity, now, productId);
          }
        }

        // Add stock history entry (only for regular products, not goods)
        if (productId) {
          await txDb.prepare(`
            INSERT INTO stock_history (product_id, date, quantity, type)
            VALUES ($1, $2, $3, 'sold')
          `).run(productId, now, quantity);
        }
      }

      return { id, message: 'Sale created successfully' };
    });
    
    const result = await transactionFn({
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
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const saleId = req.params.id;
    
    // Check sale exists and user has access
    const sale = await db.prepare('SELECT business_id FROM sales WHERE id = $1').get(saleId);
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
    
    // Use a transaction to ensure all operations happen atomically (async)
    const transactionFn = db.transaction(async (txDb) => {
      const now = new Date().toISOString();

      // Get original sale
      const originalSale = await txDb.prepare('SELECT * FROM sales WHERE id = $1').get(saleId);
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
      const purchasePrice = parseFloat(originalSale.purchase_price) || 0;
      const profitPerUnit = parseFloat(newSellingPrice) - purchasePrice;
      const effectiveQuantity = newQuantity - refundedQuantity; // Only count non-refunded
      const newProfit = profitPerUnit * effectiveQuantity;

      console.log(`[UPDATE SALE] Processing update for sale ${saleId}:`);
      console.log(`  - Old quantity: ${oldQuantity}, New quantity: ${newQuantity}`);
      console.log(`  - Refunded quantity: ${refundedQuantity}`);
      console.log(`  - Effective quantity (non-refunded): ${effectiveQuantity}`);
      console.log(`  - Profit: ${originalSale.profit} -> ${newProfit}`);

      // Update sale with new values and recalculated profit
      const result = await txDb.prepare(`
        UPDATE sales 
        SET selling_price = $1, quantity = $2, profit = $3, updated_at = $4
        WHERE id = $5
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
          const allSalesForGood = await txDb.prepare(`
            SELECT quantity, refunded_quantity FROM sales WHERE good_id = $1
          `).all(originalSale.good_id);
          
          const totalNetSold = allSalesForGood.reduce((sum, s) => {
            const refunded = s.refunded_quantity || 0;
            return sum + (s.quantity - refunded);
          }, 0);
          
          const good = await txDb.prepare('SELECT quantity FROM goods WHERE id = $1').get(originalSale.good_id);
          if (!good) {
            throw new Error(`Good not found: ${originalSale.good_id}`);
          }
          
          const correctRemainingQuantity = parseInt(good.quantity) - totalNetSold;
          
          console.log(`[UPDATE SALE] Good stock recalculation:`);
          console.log(`  - Total quantity: ${good.quantity}`);
          console.log(`  - Total net sold: ${totalNetSold}`);
          console.log(`  - Correct remaining: ${correctRemainingQuantity}`);
          
          await txDb.prepare(`
            UPDATE goods 
            SET remaining_quantity = $1, updated_at = $2
            WHERE id = $3
          `).run(correctRemainingQuantity, now, originalSale.good_id);
          
          console.log(`[UPDATE SALE] ✅ Stock updated for good`);
        } 
        // Handle regular product sale with batches
        else if (originalSale.product_id) {
          console.log(`[UPDATE SALE] Updating stock for product_id: ${originalSale.product_id}`);
          
          const batchDetails = await txDb.prepare(`
            SELECT batch_id, quantity FROM sale_batch_details WHERE sale_id = $1
          `).all(saleId);

          if (batchDetails.length > 0) {
            // Calculate ratio for each batch
            if (oldQuantity === 0) {
              throw new Error('Cannot update sale: original quantity is 0, cannot calculate batch ratio');
            }
            const ratio = quantityDifference / oldQuantity;
            
            for (const detail of batchDetails) {
              const batchQuantityChange = Math.round(detail.quantity * ratio);
              await txDb.prepare(`
                UPDATE stock_batches 
                SET remaining_quantity = remaining_quantity - $1
                WHERE id = $2
              `).run(batchQuantityChange, detail.batch_id);
            }

            // Update product quantity from batches
            const batches = await txDb.prepare('SELECT remaining_quantity FROM stock_batches WHERE product_id = $1').all(originalSale.product_id);
            const newProductQuantity = batches.reduce((sum, b) => sum + parseInt(b.remaining_quantity), 0);
            await txDb.prepare('UPDATE products SET quantity = $1, updated_at = $2 WHERE id = $3')
              .run(newProductQuantity, now, originalSale.product_id);
            
            console.log(`[UPDATE SALE] ✅ Stock updated for product with batches`);
          } else {
            // No batch details - update product quantity directly (legacy products)
            const product = await txDb.prepare('SELECT quantity FROM products WHERE id = $1').get(originalSale.product_id);
            if (product) {
              const newProductQuantity = Math.max(0, parseInt(product.quantity) - quantityDifference);
              await txDb.prepare('UPDATE products SET quantity = $1, updated_at = $2 WHERE id = $3')
                .run(newProductQuantity, now, originalSale.product_id);
              
              console.log(`[UPDATE SALE] ✅ Stock updated for legacy product`);
            }
          }
        }
      }

      return { message: 'Sale updated successfully' };
    });
    
    // Execute the transaction
    const result = await transactionFn({ sellingPrice, quantity, saleId });
    
    console.log(`[UPDATE SALE] ✅ Transaction completed successfully`);
    
    res.json(result);
  } catch (error) {
    console.error('[UPDATE SALE] ❌ Error updating sale:', error);
    console.error('[UPDATE SALE] Error stack:', error.stack);
    res.status(500).json({ error: `Failed to update sale: ${error.message || 'Unknown error'}` });
  }
});

// Refund sale
router.post('/:id/refund', verifyToken, async (req, res) => {
  try {
    const saleId = req.params.id;
    
    // Check sale exists and user has access
    const saleCheck = await db.prepare('SELECT business_id FROM sales WHERE id = $1').get(saleId);
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
    
    // Use a transaction to ensure all operations happen atomically (async)
    // This ensures the sale update and stock restoration happen together
    const transactionFn = db.transaction(async (txDb) => {
      const now = new Date().toISOString();

      // Get sale
      const sale = await txDb.prepare('SELECT * FROM sales WHERE id = $1').get(saleId);
      if (!sale) {
        throw new Error('Sale not found');
      }

      const currentRefunded = sale.refunded_quantity || 0;
      const newRefundedQuantity = currentRefunded + quantity;
      const isFullyRefunded = newRefundedQuantity >= sale.quantity;

      // Recalculate profit based on remaining (non-refunded) quantity
      const profitPerUnit = parseFloat(sale.selling_price) - parseFloat(sale.purchase_price);
      const remainingQuantity = sale.quantity - newRefundedQuantity;
      const recalculatedProfit = profitPerUnit * remainingQuantity;

      console.log(`[REFUND] Processing refund for sale ${saleId}:`);
      console.log(`  - Quantity to refund: ${quantity}`);
      console.log(`  - Current refunded: ${currentRefunded}`);
      console.log(`  - New refunded total: ${newRefundedQuantity}`);
      console.log(`  - Profit: ${sale.profit} -> ${recalculatedProfit}`);

      // Update sale with recalculated profit
      await txDb.prepare(`
        UPDATE sales 
        SET refunded = $1, refunded_quantity = $2, refund_date = $3, profit = $4, updated_at = $5
        WHERE id = $6
      `).run(isFullyRefunded, newRefundedQuantity, now, recalculatedProfit, now, saleId);

      // Add refund history (PostgreSQL will generate UUID)
      await txDb.prepare(`
        INSERT INTO refund_history (sale_id, date, quantity)
        VALUES ($1, $2, $3)
      `).run(saleId, now, quantity);

      // Restore stock - handle both goods inventory and regular products
      let stockRestored = false;
      let updatedStockInfo = null;

      if (sale.good_id) {
        // Handle goods inventory refund
        console.log(`[REFUND] Restoring stock for good_id: ${sale.good_id}`);
        
        const good = await txDb.prepare('SELECT remaining_quantity, name, quantity FROM goods WHERE id = $1').get(sale.good_id);
        if (good) {
          const oldRemainingQuantity = parseInt(good.remaining_quantity);
          
          // Recalculate remaining quantity from ALL sales (now includes the updated refunded_quantity)
          // This ensures accuracy by calculating from the source of truth (all sales)
          const allSalesForGood = await txDb.prepare(`
            SELECT quantity, refunded_quantity FROM sales WHERE good_id = $1
          `).all(sale.good_id);
          
          const totalNetSold = allSalesForGood.reduce((sum, s) => {
            const refunded = s.refunded_quantity || 0;
            return sum + (s.quantity - refunded);
          }, 0);
          
          const correctRemainingQuantity = parseInt(good.quantity) - totalNetSold;
          
          console.log(`[REFUND] Good "${good.name}":`);
          console.log(`  - Total Quantity: ${good.quantity}`);
          console.log(`  - Old remaining: ${oldRemainingQuantity}`);
          console.log(`  - Total net sold: ${totalNetSold}`);
          console.log(`  - Correct remaining: ${correctRemainingQuantity}`);
          
          // Update goods with the correct remaining quantity
          const updateResult = await txDb.prepare(`
            UPDATE goods 
            SET remaining_quantity = $1, updated_at = $2
            WHERE id = $3
          `).run(correctRemainingQuantity, now, sale.good_id);
          
          console.log(`[REFUND] Stock update executed. Rows changed: ${updateResult.changes}`);
          
          if (updateResult.changes === 0) {
            throw new Error(`Failed to update good ${sale.good_id} - no rows changed`);
          }
          
          // Verify the update
          const updated = await txDb.prepare('SELECT remaining_quantity, quantity FROM goods WHERE id = $1').get(sale.good_id);
          if (!updated || parseInt(updated.remaining_quantity) !== correctRemainingQuantity) {
            throw new Error(`Stock update verification failed for good ${sale.good_id}`);
          }
          
          stockRestored = true;
          updatedStockInfo = {
            type: 'good',
            id: sale.good_id,
            name: good.name,
            oldRemaining: oldRemainingQuantity,
            newRemaining: correctRemainingQuantity,
            totalQuantity: parseInt(good.quantity)
          };
          
          console.log(`[REFUND] ✅ Stock successfully restored for good "${good.name}"`);
        } else {
          throw new Error(`Good not found: ${sale.good_id}`);
        }
      } else if (sale.product_id) {
        // Handle regular product refund
        console.log(`[REFUND] Restoring stock for product_id: ${sale.product_id}`);
        
        const batchDetails = await txDb.prepare(`
          SELECT batch_id, quantity FROM sale_batch_details WHERE sale_id = $1
        `).all(saleId);

        if (batchDetails.length > 0) {
          // Restore to batches proportionally
          const refundRatio = quantity / sale.quantity;
          
          for (const detail of batchDetails) {
            const batchRefundQuantity = Math.round(detail.quantity * refundRatio);
            await txDb.prepare(`
              UPDATE stock_batches 
              SET remaining_quantity = remaining_quantity + $1
              WHERE id = $2
            `).run(batchRefundQuantity, detail.batch_id);
          }

          // Update product quantity from batches
          const batches = await txDb.prepare('SELECT remaining_quantity FROM stock_batches WHERE product_id = $1').all(sale.product_id);
          const newQuantity = batches.reduce((sum, b) => sum + parseInt(b.remaining_quantity), 0);
          const product = await txDb.prepare('SELECT name FROM products WHERE id = $1').get(sale.product_id);
          await txDb.prepare('UPDATE products SET quantity = $1, updated_at = $2 WHERE id = $3')
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
          const product = await txDb.prepare('SELECT quantity, name FROM products WHERE id = $1').get(sale.product_id);
          if (product) {
            const oldQuantity = parseInt(product.quantity);
            const newProductQuantity = oldQuantity + quantity;
            await txDb.prepare('UPDATE products SET quantity = $1, updated_at = $2 WHERE id = $3')
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
    const result = await transactionFn({ quantity, saleId });
    
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







