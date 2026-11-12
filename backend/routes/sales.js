import express from 'express';
import db from '../database/index.js';
import { verifyToken } from './auth.js';
import { validateUUIDParam, validateUUID, validateNumeric, sanitizeString } from '../middleware/validation.js';
import { handleError } from '../middleware/errorHandler.js';
import {
  allocateIntegers,
  inputError,
  profitForUnits,
  roundMoney,
  weightedPurchasePrice,
  wholeUnits,
} from '../src/calculations.js';

const router = express.Router();

function sendRouteError(req, res, error, fallback) {
  if (error?.statusCode === 400) {
    return res.status(400).json({ error: error.message });
  }
  const errorResponse = handleError(error, req, res, fallback);
  return res.status(500).json(errorResponse);
}

async function syncProductQuantity(txDb, productId, now) {
  const batches = await txDb.prepare(
    'SELECT remaining_quantity FROM stock_batches WHERE product_id = $1',
  ).all(productId);
  const newQuantity = batches.reduce((sum, batch) => sum + Number(batch.remaining_quantity), 0);
  await txDb.prepare('UPDATE products SET quantity = $1, updated_at = $2 WHERE id = $3')
    .run(newQuantity, now, productId);
  return newQuantity;
}

async function saleBatchCost(txDb, saleId) {
  const lines = await txDb.prepare(
    'SELECT quantity, purchase_price FROM sale_batch_details WHERE sale_id = $1',
  ).all(saleId);
  const units = lines.reduce((sum, line) => sum + Number(line.quantity), 0);
  const cost = roundMoney(lines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.purchase_price), 0));
  return {
    units,
    cost,
    purchasePrice: units > 0 ? roundMoney(cost / units) : 0,
  };
}

async function reduceSaleDetails(txDb, saleId, units, restoreStock) {
  const details = await txDb.prepare(
    'SELECT id, batch_id, quantity FROM sale_batch_details WHERE sale_id = $1 ORDER BY id',
  ).all(saleId);
  if (details.length === 0) return false;
  const shares = allocateIntegers(units, details.map((detail) => Number(detail.quantity)));
  for (let i = 0; i < details.length; i += 1) {
    const share = shares[i];
    if (share === 0) continue;
    if (restoreStock) {
      await txDb.prepare(
        'UPDATE stock_batches SET remaining_quantity = remaining_quantity + $1 WHERE id = $2',
      ).run(share, details[i].batch_id);
    }
    const left = Number(details[i].quantity) - share;
    if (left === 0) {
      await txDb.prepare('DELETE FROM sale_batch_details WHERE id = $1').run(details[i].id);
    } else {
      await txDb.prepare('UPDATE sale_batch_details SET quantity = $1 WHERE id = $2').run(left, details[i].id);
    }
  }
  return true;
}

/** Drop detail rows that still list units already returned by an older refund. */
async function alignDetailsToOutstanding(txDb, saleId, outstanding) {
  const current = await saleBatchCost(txDb, saleId);
  const extra = current.units - outstanding;
  if (extra > 0) {
    await reduceSaleDetails(txDb, saleId, extra, false);
  }
}

async function takeUnitsFromBatches(txDb, saleId, productId, units) {
  let need = units;
  const batches = await txDb.prepare(`
    SELECT id, remaining_quantity, purchase_price
    FROM stock_batches
    WHERE product_id = $1 AND remaining_quantity > 0
    ORDER BY purchase_date ASC, id ASC
  `).all(productId);
  for (const batch of batches) {
    if (need <= 0) break;
    const take = Math.min(need, Number(batch.remaining_quantity));
    if (take <= 0) continue;
    await txDb.prepare(
      'UPDATE stock_batches SET remaining_quantity = remaining_quantity - $1 WHERE id = $2',
    ).run(take, batch.id);
    await txDb.prepare(`
      INSERT INTO sale_batch_details (sale_id, batch_id, quantity, purchase_price)
      VALUES ($1, $2, $3, $4)
    `).run(saleId, batch.id, take, roundMoney(batch.purchase_price));
    need -= take;
  }
  if (need > 0) {
    throw inputError(`Insufficient stock. Short by ${need} units.`);
  }
}

// Helper to get business filter
function getBusinessFilter(req) {
  // Regular users only see their business
  return { businessId: req.user.businessId };
}

// Get all sales
router.get('/', verifyToken, async (req, res) => {
  try {
    const filter = getBusinessFilter(req);
    
    if (!filter.businessId) {
      return res.status(403).json({ error: 'Business context required' });
    }

    // Include data with NULL business_id (old data compatibility)
    const sales = await db.prepare(`
      SELECT * FROM sales 
      WHERE (business_id = $1 OR business_id IS NULL) 
      ORDER BY date DESC
    `).all(filter.businessId);

    const ids = sales.map((sale) => sale.id);
    const [batchRows, refundRows] = ids.length === 0 ? [[], []] : await Promise.all([
      db.prepare(`
        SELECT sale_id, batch_id, quantity, purchase_price
        FROM sale_batch_details
        WHERE sale_id = ANY($1::uuid[])
      `).all(ids),
      db.prepare(`
        SELECT sale_id, date, quantity
        FROM refund_history
        WHERE sale_id = ANY($1::uuid[])
        ORDER BY date ASC
      `).all(ids),
    ]);

    const batchesBySale = new Map();
    for (const row of batchRows) {
      const list = batchesBySale.get(row.sale_id);
      const detail = {
        batchId: row.batch_id,
        quantity: row.quantity,
        purchasePrice: row.purchase_price,
      };
      if (list) list.push(detail);
      else batchesBySale.set(row.sale_id, [detail]);
    }
    const refundsBySale = new Map();
    for (const row of refundRows) {
      const list = refundsBySale.get(row.sale_id);
      const detail = { date: row.date, quantity: row.quantity };
      if (list) list.push(detail);
      else refundsBySale.set(row.sale_id, [detail]);
    }

    const salesWithDetails = sales.map((sale) => ({
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
      refundHistory: refundsBySale.get(sale.id) || [],
      batchDetails: batchesBySale.get(sale.id) || [],
    }));

    res.json(salesWithDetails);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Get single sale
router.get('/:id', verifyToken, validateUUIDParam('id'), async (req, res) => {
  try {
    const sale = await db.prepare('SELECT * FROM sales WHERE id = $1').get(req.params.id);
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Verify business access - always check against database
    const saleBusinessId = sale.business_id;
    const userBusinessId = req.user.businessId;
    const isOldData = !saleBusinessId || saleBusinessId === '' || saleBusinessId === 'null';
    
    if (isOldData && userBusinessId) {
      // Old data - allow access for backward compatibility
    } else if (saleBusinessId !== userBusinessId) {
      // Additional verification: check user's business_id in database
      const userBusiness = await db.prepare('SELECT business_id FROM users WHERE id = $1').get(req.user.id);
      if (!userBusiness || userBusiness.business_id !== userBusinessId || saleBusinessId !== userBusinessId) {
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
    let {
      productId,
      productName,
      inventoryId,
      goodId,
      quantity,
      sellingPrice,
      purchasePrice,
      currency,
      batchDetails,
    } = req.body;
    
    // Validate and sanitize inputs
    if (productId && !validateUUID(productId)) {
      return res.status(400).json({ error: 'Invalid productId format' });
    }
    if (inventoryId && !validateUUID(inventoryId)) {
      return res.status(400).json({ error: 'Invalid inventoryId format' });
    }
    if (goodId && !validateUUID(goodId)) {
      return res.status(400).json({ error: 'Invalid goodId format' });
    }
    productName = sanitizeString(productName, 200);
    
    const units = wholeUnits(quantity, 'Quantity');
    if (units < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }
    const price = roundMoney(sellingPrice);
    if (price < 0) {
      return res.status(400).json({ error: 'Invalid selling price' });
    }

    // Use user's business_id
    const targetBusinessId = req.user.businessId;

    if (!targetBusinessId) {
      return res.status(400).json({ error: 'Business context required' });
    }

    // Profit and cost are calculated here. The client preview is not trusted.
    const transactionFn = db.transaction(async (txDb) => {
      const now = new Date().toISOString();
      const isGoodsInventorySale = !!(inventoryId && goodId);
      const actualProductId = isGoodsInventorySale ? null : productId;
      let cost = roundMoney(purchasePrice || 0);
      let saleCurrency = currency || 'USD';
      let pricedBatches = [];

      if (isGoodsInventorySale) {
        const good = await txDb.prepare(`
          SELECT g.remaining_quantity, g.unit_price, g.currency
          FROM goods g
          JOIN goods_inventories i ON i.id = g.inventory_id
          WHERE g.id = $1 AND i.id = $2 AND i.business_id = $3
        `).get(goodId, inventoryId, targetBusinessId);
        if (!good) {
          throw inputError('That product is not in this inventory');
        }
        const onHand = wholeUnits(good.remaining_quantity, 'Stock');
        if (units > onHand) {
          throw inputError(`Insufficient stock. Only ${onHand} units available.`);
        }
        cost = roundMoney(good.unit_price);
        saleCurrency = good.currency || saleCurrency;
        await txDb.prepare(`
          UPDATE goods
          SET remaining_quantity = $1, updated_at = $2
          WHERE id = $3
        `).run(onHand - units, now, goodId);
      } else if (productId) {
        const product = await txDb.prepare(
          'SELECT id FROM products WHERE id = $1 AND (business_id = $2 OR business_id IS NULL)',
        ).get(productId, targetBusinessId);
        if (!product) {
          throw inputError('Product not found');
        }
        const batchCountRow = await txDb.prepare(
          'SELECT COUNT(*)::int AS count FROM stock_batches WHERE product_id = $1',
        ).get(productId);
        const batchCount = Number(batchCountRow?.count || 0);
        if (batchCount > 0) {
          if (!Array.isArray(batchDetails) || batchDetails.length === 0) {
            throw inputError('Choose stock batches that cover the full quantity');
          }
          let covered = 0;
          const claimed = new Map();
          for (const detail of batchDetails) {
            const batchUnits = wholeUnits(detail.quantity, 'Batch quantity');
            if (batchUnits < 1) {
              throw inputError('Batch quantity must be at least 1');
            }
            if (!validateUUID(detail.batchId)) {
              throw inputError('Invalid batch');
            }
            const batch = await txDb.prepare(
              'SELECT remaining_quantity, purchase_price, product_id FROM stock_batches WHERE id = $1',
            ).get(detail.batchId);
            if (!batch || batch.product_id !== productId) {
              throw inputError('A selected batch does not belong to this product');
            }
            const available = Number(batch.remaining_quantity);
            const alreadyClaimed = claimed.get(detail.batchId) || 0;
            if (alreadyClaimed + batchUnits > available) {
              throw inputError(`Insufficient stock in a batch. Only ${available} left.`);
            }
            claimed.set(detail.batchId, alreadyClaimed + batchUnits);
            covered += batchUnits;
            pricedBatches.push({
              batchId: detail.batchId,
              quantity: batchUnits,
              purchasePrice: roundMoney(batch.purchase_price),
            });
          }
          if (covered !== units) {
            throw inputError('Batch quantities must add up to the sale quantity');
          }
          cost = weightedPurchasePrice(pricedBatches);
        } else {
          const stock = await txDb.prepare('SELECT quantity FROM products WHERE id = $1').get(productId);
          const onHand = Number(stock?.quantity || 0);
          if (units > onHand) {
            throw inputError(`Insufficient stock. Only ${onHand} units available.`);
          }
          await txDb.prepare('UPDATE products SET quantity = $1, updated_at = $2 WHERE id = $3')
            .run(onHand - units, now, productId);
        }
      } else {
        throw inputError('A product is required');
      }

      // Profit uses the rounded unit cost stored on the sale, so the screen matches the database.
      const profitAmount = profitForUnits(units, price, cost);

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
        units,
        price,
        cost,
        profitAmount,
        saleCurrency,
        now,
        targetBusinessId,
      );

      const id = saleResult.id;

      if (pricedBatches.length > 0) {
        for (const detail of pricedBatches) {
          await txDb.prepare(`
            INSERT INTO sale_batch_details (sale_id, batch_id, quantity, purchase_price)
            VALUES ($1, $2, $3, $4)
          `).run(id, detail.batchId, detail.quantity, detail.purchasePrice);
          await txDb.prepare(`
            UPDATE stock_batches
            SET remaining_quantity = remaining_quantity - $1
            WHERE id = $2
          `).run(detail.quantity, detail.batchId);
        }
        await syncProductQuantity(txDb, productId, now);
        await txDb.prepare(`
          INSERT INTO stock_history (product_id, date, quantity, type)
          VALUES ($1, $2, $3, 'sold')
        `).run(productId, now, units);
      } else if (productId) {
        await txDb.prepare(`
          INSERT INTO stock_history (product_id, date, quantity, type)
          VALUES ($1, $2, $3, 'sold')
        `).run(productId, now, units);
      }

      return {
        id,
        message: 'Sale created successfully',
        profit: profitAmount,
        purchasePrice: cost,
        sellingPrice: price,
        quantity: units,
        currency: saleCurrency,
      };
    });

    const result = await transactionFn();
    res.status(201).json(result);
  } catch (error) {
    sendRouteError(req, res, error, 'Failed to create sale. Please try again.');
  }
});

// Update sale
router.put('/:id', verifyToken, validateUUIDParam('id'), async (req, res) => {
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
    
    {
      if (isOldData && userBusinessId) {
        // Old data - allow access for backward compatibility
        console.log(`[UPDATE SALE] Allowing access to old data (NULL business_id) for user: ${req.user.id}`);
      } else if (saleBusinessId !== userBusinessId) {
        return res.status(403).json({ error: 'Access denied. You do not have permission to update this sale.' });
      }
    }

    const sellingPrice = req.body.sellingPrice ?? req.body.selling_price;
    const quantity = req.body.quantity;
    
    // Use a transaction to ensure all operations happen atomically (async)
    const transactionFn = db.transaction(async (txDb) => {
      const now = new Date().toISOString();

      // Get original sale
      const originalSale = await txDb.prepare('SELECT * FROM sales WHERE id = $1').get(saleId);
      if (!originalSale) {
        throw new Error('Sale not found');
      }

      const oldQuantity = wholeUnits(originalSale.quantity, 'Sale quantity');
      const refundedQuantity = wholeUnits(originalSale.refunded_quantity || 0, 'Refunded quantity');
      const newQuantity = quantity === undefined || quantity === null || quantity === ''
        ? oldQuantity
        : wholeUnits(quantity, 'Quantity');
      const newSellingPrice = sellingPrice === undefined || sellingPrice === null || sellingPrice === ''
        ? roundMoney(originalSale.selling_price)
        : roundMoney(sellingPrice);
      if (newQuantity < 1) {
        throw inputError('Quantity must be at least 1');
      }
      if (newSellingPrice < 0) {
        throw inputError('Invalid selling price');
      }
      if (newQuantity < refundedQuantity) {
        throw inputError(`Cannot set quantity to ${newQuantity}. ${refundedQuantity} units have already been refunded.`);
      }

      const quantityDifference = newQuantity - oldQuantity;
      const effectiveQuantity = newQuantity - refundedQuantity;

      // Write the new quantity before goods stock is rebuilt from every sale.
      await txDb.prepare(`
        UPDATE sales
        SET selling_price = $1, quantity = $2, updated_at = $3
        WHERE id = $4
      `).run(newSellingPrice, newQuantity, now, saleId);

      let purchasePrice = roundMoney(originalSale.purchase_price);

      if (quantityDifference !== 0 && originalSale.good_id) {
        const allSalesForGood = await txDb.prepare(`
          SELECT quantity, refunded_quantity FROM sales WHERE good_id = $1
        `).all(originalSale.good_id);
        const totalNetSold = allSalesForGood.reduce((sum, row) => {
          return sum + (Number(row.quantity) - Number(row.refunded_quantity || 0));
        }, 0);
        const good = await txDb.prepare('SELECT quantity FROM goods WHERE id = $1').get(originalSale.good_id);
        if (!good) {
          throw inputError('Product not found');
        }
        const correctRemainingQuantity = Number(good.quantity) - totalNetSold;
        if (correctRemainingQuantity < 0) {
          throw inputError(`Insufficient stock. This edit needs ${-correctRemainingQuantity} more units than are on hand.`);
        }
        await txDb.prepare(`
          UPDATE goods
          SET remaining_quantity = $1, updated_at = $2
          WHERE id = $3
        `).run(correctRemainingQuantity, now, originalSale.good_id);
      } else if (originalSale.product_id && quantityDifference !== 0) {
        const detailCount = await txDb.prepare(
          'SELECT COUNT(*)::int AS count FROM sale_batch_details WHERE sale_id = $1',
        ).get(saleId);
        const hasBatches = Number(detailCount?.count || 0) > 0;
        if (quantityDifference < 0) {
          if (hasBatches) {
            await alignDetailsToOutstanding(txDb, saleId, oldQuantity - refundedQuantity);
            await reduceSaleDetails(txDb, saleId, -quantityDifference, true);
            await syncProductQuantity(txDb, originalSale.product_id, now);
          } else {
            const product = await txDb.prepare('SELECT quantity FROM products WHERE id = $1').get(originalSale.product_id);
            if (product) {
              await txDb.prepare('UPDATE products SET quantity = $1, updated_at = $2 WHERE id = $3')
                .run(Number(product.quantity) - quantityDifference, now, originalSale.product_id);
            }
          }
        } else if (hasBatches) {
          await takeUnitsFromBatches(txDb, saleId, originalSale.product_id, quantityDifference);
          await syncProductQuantity(txDb, originalSale.product_id, now);
        } else {
          const product = await txDb.prepare('SELECT quantity FROM products WHERE id = $1').get(originalSale.product_id);
          const onHand = Number(product?.quantity || 0);
          if (quantityDifference > onHand) {
            throw inputError(`Insufficient stock. Only ${onHand} units available.`);
          }
          if (product) {
            await txDb.prepare('UPDATE products SET quantity = $1, updated_at = $2 WHERE id = $3')
              .run(onHand - quantityDifference, now, originalSale.product_id);
          }
        }
      }

      if (originalSale.product_id) {
        await alignDetailsToOutstanding(txDb, saleId, effectiveQuantity);
        const batchCost = await saleBatchCost(txDb, saleId);
        if (batchCost.units > 0) {
          purchasePrice = batchCost.purchasePrice;
        }
      }
      const newProfit = profitForUnits(effectiveQuantity, newSellingPrice, purchasePrice);

      await txDb.prepare(`
        UPDATE sales
        SET purchase_price = $1, profit = $2, updated_at = $3
        WHERE id = $4
      `).run(purchasePrice, newProfit, now, saleId);

      return { message: 'Sale updated successfully', profit: newProfit, purchasePrice };
    });
    
    // Execute the transaction
    const result = await transactionFn({ sellingPrice, quantity, saleId });
    
    console.log(`[UPDATE SALE] ✅ Transaction completed successfully`);
    
    res.json(result);
  } catch (error) {
    sendRouteError(req, res, error, 'Failed to update sale. Please try again.');
  }
});

// Refund sale
router.post('/:id/refund', verifyToken, validateUUIDParam('id'), async (req, res) => {
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
    
    {
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

      const refundUnits = wholeUnits(quantity, 'Refund quantity');
      if (refundUnits < 1) {
        throw inputError('Refund quantity must be at least 1');
      }
      const sold = wholeUnits(sale.quantity, 'Sale quantity');
      const currentRefunded = wholeUnits(sale.refunded_quantity || 0, 'Refunded quantity');
      if (currentRefunded + refundUnits > sold) {
        throw inputError(`Only ${sold - currentRefunded} units can still be refunded.`);
      }
      const newRefundedQuantity = currentRefunded + refundUnits;
      const remainingQuantity = sold - newRefundedQuantity;
      const isFullyRefunded = remainingQuantity === 0;
      let purchasePrice = roundMoney(sale.purchase_price);

      if (sale.product_id) {
        await alignDetailsToOutstanding(txDb, saleId, sold - currentRefunded);
        const restored = await reduceSaleDetails(txDb, saleId, refundUnits, true);
        if (restored) {
          await syncProductQuantity(txDb, sale.product_id, now);
          const batchCost = await saleBatchCost(txDb, saleId);
          if (batchCost.units > 0) purchasePrice = batchCost.purchasePrice;
        } else {
          const product = await txDb.prepare('SELECT quantity FROM products WHERE id = $1').get(sale.product_id);
          if (!product) throw inputError('Product not found');
          await txDb.prepare('UPDATE products SET quantity = $1, updated_at = $2 WHERE id = $3')
            .run(Number(product.quantity) + refundUnits, now, sale.product_id);
        }
      }
      const recalculatedProfit = profitForUnits(
        remainingQuantity,
        roundMoney(sale.selling_price),
        purchasePrice,
      );

      await txDb.prepare(`
        UPDATE sales
        SET refunded = $1, refunded_quantity = $2, refund_date = $3, profit = $4, purchase_price = $5, updated_at = $6
        WHERE id = $7
      `).run(isFullyRefunded, newRefundedQuantity, now, recalculatedProfit, purchasePrice, now, saleId);

      await txDb.prepare(`
        INSERT INTO refund_history (sale_id, date, quantity)
        VALUES ($1, $2, $3)
      `).run(saleId, now, refundUnits);

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
            const refunded = Number(s.refunded_quantity || 0);
            return sum + (Number(s.quantity) - refunded);
          }, 0);
          
          const correctRemainingQuantity = Number(good.quantity) - totalNetSold;
          if (correctRemainingQuantity < 0) {
            throw inputError('Stock records do not cover this refund. Check the product quantity.');
          }
          
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
          if (!updated || Number(updated.remaining_quantity) !== correctRemainingQuantity) {
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
        const product = await txDb.prepare('SELECT name, quantity FROM products WHERE id = $1').get(sale.product_id);
        stockRestored = true;
        updatedStockInfo = {
          type: 'product',
          id: sale.product_id,
          name: product?.name || 'Unknown',
          newQuantity: Number(product?.quantity || 0),
        };
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
    console.error('[REFUND] Error processing refund:', error);
    sendRouteError(req, res, error, 'Failed to process refund');
  }
});

export default router;







