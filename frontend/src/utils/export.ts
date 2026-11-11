import { Product, Sale, GoodsInventory } from '../types';
import { formatCurrency } from './format';
import { effectiveQuantity, marginPercent, saleProfit, saleRevenue } from './saleMath';

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle nested objects, arrays, and special characters
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportProductsToCSV(products: Product[], currency: string) {
  const data = products.map(p => ({
    'Product Name': p.name,
    'Category': p.category || 'Uncategorized',
    'Quantity': p.quantity,
    'Price': formatCurrency(p.price, currency),
    'Total Value': formatCurrency(p.quantity * p.price, currency),
    'Batches': p.batches.length,
    'Stock History Entries': p.stockHistory.length,
  }));
  exportToCSV(data, `products_${new Date().toISOString().split('T')[0]}.csv`);
}

export function salesExportRows(sales: Sale[], currency: string) {
  return sales.map(s => {
    const saleCurrency = s.currency || currency;
    const revenue = saleRevenue(s);
    const profit = saleProfit(s);
    return {
      'Date': new Date(s.date).toLocaleDateString(),
      'Time': new Date(s.date).toLocaleTimeString(),
      'Product': s.productName,
      'Quantity Sold': s.quantity,
      'Refunded Quantity': s.refundedQuantity || 0,
      'Net Quantity': effectiveQuantity(s),
      'Selling Price': formatCurrency(s.sellingPrice, saleCurrency),
      'Purchase Price': formatCurrency(s.purchasePrice || 0, saleCurrency),
      'Total': formatCurrency(revenue, saleCurrency),
      'Profit': formatCurrency(profit, saleCurrency),
      'Margin': revenue ? `${marginPercent(profit, revenue).toFixed(1)}%` : 'N/A',
      'Refunded': s.refunded ? 'Yes' : 'No',
      'Currency': saleCurrency,
    };
  });
}

export function exportSalesToCSV(sales: Sale[], currency: string) {
  exportToCSV(salesExportRows(sales, currency), `sales_${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportInventoryToCSV(inventories: GoodsInventory[], currency: string) {
  const data: any[] = [];
  
  inventories.forEach(inv => {
    inv.goods.forEach(good => {
      const goodCurrency = good.currency || currency;
      data.push({
        'Inventory': inv.name,
        'Inventory Date': new Date(inv.date).toLocaleDateString(),
        'Product Name': good.name,
        'Quantity': good.quantity,
        'Remaining': good.remainingQuantity,
        'Sold': good.quantity - good.remainingQuantity,
        'Unit Price': formatCurrency(Number(good.unitPrice || 0), goodCurrency),
        'Total Value': formatCurrency(good.remainingQuantity * Number(good.unitPrice || 0), goodCurrency),
        'Currency': goodCurrency,
      });
    });
  });
  
  exportToCSV(data, `inventory_${new Date().toISOString().split('T')[0]}.csv`);
}


















