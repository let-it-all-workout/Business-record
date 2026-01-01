import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Product, GoodsInventory } from '../types';
import { formatCurrency, formatNumber } from './format';

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
  const totalRevenue = validSales.reduce((sum, s) => {
    const refundedQty = s.refundedQuantity || 0;
    const effectiveQty = s.quantity - refundedQty;
    return sum + (effectiveQty * s.sellingPrice);
  }, 0);
  
  const totalProfit = validSales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const totalItems = validSales.reduce((sum, s) => {
    const refundedQty = s.refundedQuantity || 0;
    return sum + (s.quantity - refundedQty);
  }, 0);

  doc.setFontSize(12);
  doc.text('Summary', 14, 50);
  doc.setFontSize(10);
  doc.text(`Total Revenue: ${formatCurrency(totalRevenue, options.currency)}`, 14, 60);
  doc.text(`Total Profit: ${formatCurrency(totalProfit, options.currency)}`, 14, 65);
  doc.text(`Total Items Sold: ${formatNumber(totalItems)}`, 14, 70);
  doc.text(`Number of Sales: ${validSales.length}`, 14, 75);

  // Sales table
  const tableData = validSales.map(sale => {
    const refundedQty = sale.refundedQuantity || 0;
    const effectiveQty = sale.quantity - refundedQty;
    const totalAmount = effectiveQty * sale.sellingPrice;
    return [
      new Date(sale.date).toLocaleDateString(),
      sale.productName,
      formatNumber(effectiveQty),
      formatCurrency(sale.sellingPrice, options.currency),
      formatCurrency(totalAmount, options.currency),
      formatCurrency(sale.profit || 0, options.currency),
      sale.refunded ? 'Yes' : 'No'
    ];
  });

  autoTable(doc, {
    startY: 85,
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
  
  // Calculate metrics
  const totalRevenue = validSales.reduce((sum, s) => {
    const refundedQty = s.refundedQuantity || 0;
    const effectiveQty = s.quantity - refundedQty;
    return sum + (effectiveQty * s.sellingPrice);
  }, 0);
  
  const totalProfit = validSales.reduce((sum, s) => sum + (s.profit || 0), 0);
  const totalCost = totalRevenue - totalProfit;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Financial summary
  doc.setFontSize(12);
  doc.text('Financial Summary', 14, 50);
  doc.setFontSize(10);
  doc.text(`Total Revenue: ${formatCurrency(totalRevenue, options.currency)}`, 14, 60);
  doc.text(`Total Cost: ${formatCurrency(totalCost, options.currency)}`, 14, 65);
  doc.text(`Total Profit: ${formatCurrency(totalProfit, options.currency)}`, 14, 70);
  doc.text(`Profit Margin: ${profitMargin.toFixed(2)}%`, 14, 75);

  // Monthly breakdown
  const monthlyData: Record<string, { revenue: number; profit: number }> = {};
  validSales.forEach(s => {
    const month = new Date(s.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const refundedQty = s.refundedQuantity || 0;
    const effectiveQty = s.quantity - refundedQty;
    const revenue = effectiveQty * s.sellingPrice;
    const profit = s.profit || 0;

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
    data.revenue > 0 ? `${((data.profit / data.revenue) * 100).toFixed(2)}%` : '0%'
  ]);

  autoTable(doc, {
    startY: 85,
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

