import { Product, Sale, GoodsInventory } from '../types';

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
  const currencySymbol = getCurrencySymbol(currency);
  const data = products.map(p => ({
    'Product Name': p.name,
    'Category': p.category || 'Uncategorized',
    'Quantity': p.quantity,
    'Price': `${currencySymbol}${p.price.toFixed(2)}`,
    'Total Value': `${currencySymbol}${(p.quantity * p.price).toFixed(2)}`,
    'Batches': p.batches.length,
    'Stock History Entries': p.stockHistory.length,
  }));
  exportToCSV(data, `products_${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportSalesToCSV(sales: Sale[], currency: string) {
  const currencySymbol = getCurrencySymbol(currency);
  const data = sales.map(s => ({
    'Date': new Date(s.date).toLocaleDateString(),
    'Time': new Date(s.date).toLocaleTimeString(),
    'Product': s.productName,
    'Quantity': s.quantity,
    'Selling Price': `${currencySymbol}${s.sellingPrice.toFixed(2)}`,
    'Purchase Price': `${currencySymbol}${(s.purchasePrice || 0).toFixed(2)}`,
    'Total': `${currencySymbol}${(s.quantity * s.sellingPrice).toFixed(2)}`,
    'Profit': `${currencySymbol}${(s.profit || 0).toFixed(2)}`,
    'Profit Margin': s.purchasePrice && s.purchasePrice > 0 
      ? `${(((s.profit || 0) / (s.purchasePrice * s.quantity)) * 100).toFixed(1)}%`
      : 'N/A',
    'Refunded': s.refunded ? 'Yes' : 'No',
    'Refunded Quantity': s.refundedQuantity || 0,
    'Currency': s.currency,
  }));
  exportToCSV(data, `sales_${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportInventoryToCSV(inventories: GoodsInventory[], currency: string) {
  const currencySymbol = getCurrencySymbol(currency);
  const data: any[] = [];
  
  inventories.forEach(inv => {
    inv.goods.forEach(good => {
      data.push({
        'Inventory': inv.name,
        'Inventory Date': new Date(inv.date).toLocaleDateString(),
        'Product Name': good.name,
        'Quantity': good.quantity,
        'Remaining': good.remainingQuantity,
        'Sold': good.quantity - good.remainingQuantity,
        'Unit Price': `${currencySymbol}${Number(good.unitPrice || 0).toFixed(2)}`,
        'Total Value': `${currencySymbol}${(good.remainingQuantity * Number(good.unitPrice || 0)).toFixed(2)}`,
        'Currency': good.currency,
      });
    });
  });
  
  exportToCSV(data, `inventory_${new Date().toISOString().split('T')[0]}.csv`);
}

function getCurrencySymbol(currency: string): string {
  const currencies: Record<string, string> = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'NGN': '₦', 'KES': 'KSh',
    'GHS': '₵', 'ZAR': 'R', 'INR': '₹', 'CNY': '¥', 'JPY': '¥',
  };
  return currencies[currency] || '$';
}


















