import { Product, GoodsInventory } from '../types';

export interface InventoryAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'high_value';
  productName: string;
  message: string;
  severity: 'warning' | 'error' | 'info';
  timestamp: string;
}

const LOW_STOCK_THRESHOLD = 0.3; // 30% of original quantity
const HIGH_VALUE_THRESHOLD = 10000; // $10,000

export function checkInventoryAlerts(
  products: Product[],
  inventories: GoodsInventory[],
  currency: string
): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];

  // Check legacy products
  products.forEach(product => {
    // Check for out of stock
    if (product.quantity === 0) {
      alerts.push({
        id: `alert-${product.id}-out`,
        type: 'out_of_stock',
        productName: product.name,
        message: `${product.name} is out of stock`,
        severity: 'error',
        timestamp: new Date().toISOString(),
      });
    }
    // Check for low stock
    else if (product.batches && product.batches.length > 0) {
      const totalOriginalQuantity = product.batches.reduce((sum, b) => sum + b.quantity, 0);
      if (totalOriginalQuantity > 0 && product.quantity / totalOriginalQuantity < LOW_STOCK_THRESHOLD) {
        alerts.push({
          id: `alert-${product.id}-low`,
          type: 'low_stock',
          productName: product.name,
          message: `${product.name} is running low (${product.quantity} units remaining)`,
          severity: 'warning',
          timestamp: new Date().toISOString(),
        });
      }
    }
    // Check for high value items
    const totalValue = product.batches.reduce((sum, b) => 
      sum + (b.remainingQuantity * b.purchasePrice), 0
    );
    if (totalValue > HIGH_VALUE_THRESHOLD) {
      alerts.push({
        id: `alert-${product.id}-value`,
        type: 'high_value',
        productName: product.name,
        message: `${product.name} has high inventory value (${getCurrencySymbol(currency)}${totalValue.toFixed(2)})`,
        severity: 'info',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Check goods inventories
  inventories.forEach(inventory => {
    inventory.goods.forEach(good => {
      if (good.remainingQuantity === 0) {
        alerts.push({
          id: `alert-${inventory.id}-${good.id}-out`,
          type: 'out_of_stock',
          productName: `${good.name} (${inventory.name})`,
          message: `${good.name} in ${inventory.name} is out of stock`,
          severity: 'error',
          timestamp: new Date().toISOString(),
        });
      } else if (good.remainingQuantity < good.quantity * LOW_STOCK_THRESHOLD) {
        alerts.push({
          id: `alert-${inventory.id}-${good.id}-low`,
          type: 'low_stock',
          productName: `${good.name} (${inventory.name})`,
          message: `${good.name} in ${inventory.name} is running low (${good.remainingQuantity} units remaining)`,
          severity: 'warning',
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  return alerts.sort((a, b) => {
    // Sort by severity: error > warning > info
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

function getCurrencySymbol(currency: string): string {
  const currencies: Record<string, string> = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'NGN': '₦', 'KES': 'KSh',
    'GHS': '₵', 'ZAR': 'R', 'INR': '₹', 'CNY': '¥', 'JPY': '¥',
  };
  return currencies[currency] || '$';
}


















