import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Product, GoodsInventory } from '../types';
import { formatCurrency, formatNumber } from './format';
import { effectiveQuantity, marginPercent, roundMoney, saleProfit, saleRevenue } from './saleMath';

interface ReportOptions {
  title: string;
  dateRange?: { start: string; end: string };
  currency: string;
}

export function generateSalesReport(
  sales: Sale[],
  options: ReportOptions
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.text(options.title, pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });
  
  if (options.dateRange) {
    doc.text(
      `Period: ${options.dateRange.start} to ${options.dateRange.end}`,
      pageWidth / 2,
      35,
      { align: 'center' }
    );
  }

  // Summary statistics
  const validSales = sales.filter(s => s && s !== null);
  const reportSales = validSales.filter((s) => (s.currency || options.currency) === options.currency);
  const otherCurrencyCount = validSales.length - reportSales.length;
  const totalRevenue = reportSales.reduce((sum, s) => sum + saleRevenue(s), 0);
  const totalProfit = reportSales.reduce((sum, s) => sum + saleProfit(s), 0);
  const totalItems = reportSales.reduce((sum, s) => sum + effectiveQuantity(s), 0);

  doc.setFontSize(12);
  doc.text('Summary', 14, 50);
  doc.setFontSize(10);
  doc.text(`Total Revenue: ${formatCurrency(totalRevenue, options.currency)}`, 14, 60);
  doc.text(`Total Profit: ${formatCurrency(totalProfit, options.currency)}`, 14, 65);
  doc.text(`Total Items Sold: ${formatNumber(totalItems)}`, 14, 70);
  doc.text(`Number of Sales: ${reportSales.length}`, 14, 75);
  if (otherCurrencyCount > 0) {
    doc.text(`${otherCurrencyCount} sale(s) in another currency are listed below and excluded from these totals.`, 14, 80);
  }

  const tableData = validSales.map(sale => {
    const saleCurrency = sale.currency || options.currency;
    return [
      new Date(sale.date).toLocaleDateString(),
      sale.productName,
      formatNumber(effectiveQuantity(sale)),
      formatCurrency(sale.sellingPrice, saleCurrency),
      formatCurrency(saleRevenue(sale), saleCurrency),
      formatCurrency(saleProfit(sale), saleCurrency),
      sale.refunded ? 'Yes' : 'No'
    ];
  });

  autoTable(doc, {
    startY: otherCurrencyCount > 0 ? 88 : 85,
    head: [['Date', 'Product', 'Quantity', 'Unit Price', 'Total', 'Profit', 'Refunded']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 }
  });

  // Save PDF
  doc.save(`sales-report-${new Date().toISOString().split('T')[0]}.pdf`);
}

export function generateInventoryReport(
  products: Product[],
  _inventories: GoodsInventory[],
  options: ReportOptions
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.text(options.title, pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });

  // Summary
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalValue = products.reduce((sum, p) => sum + (p.quantity * (p.price || 0)), 0);

  doc.setFontSize(12);
  doc.text('Summary', 14, 50);
  doc.setFontSize(10);
  doc.text(`Total Products: ${totalProducts}`, 14, 60);
  doc.text(`Total Stock: ${formatNumber(totalStock)} units`, 14, 65);
  doc.text(`Total Value: ${formatCurrency(totalValue, options.currency)}`, 14, 70);

  // Products table
  const tableData = products.map(product => [
    product.name,
    formatNumber(product.quantity),
    formatCurrency(product.price || 0, options.currency),
    formatCurrency(product.quantity * (product.price || 0), options.currency),
    product.quantity < 10 ? 'Low' : product.quantity === 0 ? 'Out' : 'Good'
  ]);

  autoTable(doc, {
    startY: 80,
    head: [['Product', 'Stock', 'Unit Price', 'Total Value', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 }
  });

  // Save PDF
  doc.save(`inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
}

export function generateFinancialReport(
  sales: Sale[],
  options: ReportOptions
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.text(options.title, pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });

  const validSales = sales.filter(s => s && s !== null);
  const reportSales = validSales.filter((s) => (s.currency || options.currency) === options.currency);
  const otherCurrencyCount = validSales.length - reportSales.length;
  
  const totalRevenue = reportSales.reduce((sum, s) => sum + saleRevenue(s), 0);
  const totalProfit = reportSales.reduce((sum, s) => sum + saleProfit(s), 0);
  const totalCost = roundMoney(totalRevenue - totalProfit);
  const profitMargin = marginPercent(totalProfit, totalRevenue);

  // Financial summary
  doc.setFontSize(12);
  doc.text('Financial Summary', 14, 50);
  doc.setFontSize(10);
  doc.text(`Total Revenue: ${formatCurrency(totalRevenue, options.currency)}`, 14, 60);
  doc.text(`Total Cost: ${formatCurrency(totalCost, options.currency)}`, 14, 65);
  doc.text(`Total Profit: ${formatCurrency(totalProfit, options.currency)}`, 14, 70);
  doc.text(`Profit Margin: ${profitMargin.toFixed(2)}%`, 14, 75);
  if (otherCurrencyCount > 0) {
    doc.text(`${otherCurrencyCount} sale(s) in another currency are excluded from these totals.`, 14, 80);
  }

  const monthlyData: Record<string, { revenue: number; profit: number }> = {};
  reportSales.forEach(s => {
    const month = new Date(s.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const revenue = saleRevenue(s);
    const profit = saleProfit(s);

    if (!monthlyData[month]) {
      monthlyData[month] = { revenue: 0, profit: 0 };
    }
    monthlyData[month].revenue += revenue;
    monthlyData[month].profit += profit;
  });

  const monthlyTableData = Object.entries(monthlyData).map(([month, data]) => [
    month,
    formatCurrency(data.revenue, options.currency),
    formatCurrency(data.profit, options.currency),
    data.revenue > 0 ? `${marginPercent(data.profit, data.revenue).toFixed(2)}%` : '0%'
  ]);

  autoTable(doc, {
    startY: otherCurrencyCount > 0 ? 88 : 85,
    head: [['Month', 'Revenue', 'Profit', 'Margin']],
    body: monthlyTableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 }
  });

  // Save PDF
  doc.save(`financial-report-${new Date().toISOString().split('T')[0]}.pdf`);
}

