import { useState, useEffect, useMemo } from 'react';
import { Sale } from '../types';
import EditSaleForm from './EditSaleForm';
import PartialRefundForm from './PartialRefundForm';
import { formatCurrency, formatNumber } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import PINVerification from './PINVerification';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

interface SalesHistoryProps {
  sales: Sale[];
  onUpdateSale: (sale: Sale) => void;
  onRefundSale: (sale: Sale, quantity: number) => void;
  globalCurrency: string;
}

export default function SalesHistory({ sales, onUpdateSale, onRefundSale, globalCurrency }: SalesHistoryProps) {
  const { user, canSeeFinancialData } = useAuth();
  const isBusinessAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const canSeeFinancial = canSeeFinancialData();
  const [showPINVerification, setShowPINVerification] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pinError, setPinError] = useState('');
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [refundingSale, setRefundingSale] = useState<Sale | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Debug on mount and when sales change
  useEffect(() => {
    console.log('SalesHistory - sales prop changed:', sales);
    console.log('SalesHistory - sales length:', sales?.length);
    console.log('SalesHistory - is array?', Array.isArray(sales));
    if (sales && sales.length > 0) {
      console.log('SalesHistory - first sale:', sales[0]);
    }
  }, [sales]);
  
  // Ensure sales is an array
  const salesArray = Array.isArray(sales) ? sales : [];
  
  // Filter out any invalid sales - be very lenient
  const validSales = salesArray.filter(sale => {
    try {
      if (!sale) return false;
      if (!sale.id) return false;
      if (!sale.productName) return false;
      if (!sale.quantity || sale.quantity <= 0) return false;
      if (sale.sellingPrice === undefined || sale.sellingPrice === null || sale.sellingPrice < 0) return false;
      // Ensure batchDetails exists (can be empty array)
      if (!sale.batchDetails) {
        (sale as any).batchDetails = [];
      }
      // Ensure currency exists
      if (!sale.currency) {
        (sale as any).currency = 'USD';
      }
      return true;
    } catch (error) {
      console.error('Error validating sale:', error, sale);
      return false;
    }
  });
  
  console.log('SalesHistory - valid sales count:', validSales.length);
  
  if (validSales.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <p className="text-gray-500 text-lg">No sales recorded yet.</p>
        <p className="text-gray-400 text-sm mt-2">Record your first sale to see it here!</p>
        {salesArray.length > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>Debug:</strong> {salesArray.length} sales found but filtered out. Check console for details.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Calculate totals accounting for refunds
  // Revenue: Only count non-refunded sales
  const totalRevenue = validSales.reduce((sum, sale) => {
    const refundedQty = sale.refundedQuantity || 0;
    const effectiveQty = sale.quantity - refundedQty;
    return sum + (effectiveQty * sale.sellingPrice);
  }, 0);
  
  // Items sold: Only count non-refunded items
  const totalItemsSold = validSales.reduce((sum, sale) => {
    const refundedQty = sale.refundedQuantity || 0;
    return sum + (sale.quantity - refundedQty);
  }, 0);
  
  // Profit: Use recalculated profit from database (already accounts for refunds)
  // The profit field in the database is recalculated when refunds occur
  const totalProfit = validSales.reduce((sum, sale) => {
    // The sale.profit is already recalculated in the database to reflect refunds
    // So we can use it directly
    return sum + (sale.profit || 0);
  }, 0);

  // Filter by date range
  const filteredByDate = useMemo(() => {
    if (!startDate && !endDate) return validSales;
    
    return validSales.filter(sale => {
      const saleDate = new Date(sale.date);
      saleDate.setHours(0, 0, 0, 0);
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return saleDate >= start && saleDate <= end;
      } else if (startDate) {
        const start = new Date(startDate);
        return saleDate >= start;
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return saleDate <= end;
      }
      return true;
    });
  }, [validSales, startDate, endDate]);

  // Sort by date, most recent first
  const sortedSales = [...filteredByDate].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  // Recalculate totals for filtered sales
  const filteredTotalRevenue = sortedSales.reduce((sum, sale) => {
    const refundedQty = sale.refundedQuantity || 0;
    const effectiveQty = sale.quantity - refundedQty;
    return sum + (effectiveQty * sale.sellingPrice);
  }, 0);
  
  const filteredTotalItemsSold = sortedSales.reduce((sum, sale) => {
    const refundedQty = sale.refundedQuantity || 0;
    return sum + (sale.quantity - refundedQty);
  }, 0);
  
  // Profit: Use recalculated profit from database (already accounts for refunds)
  const filteredTotalProfit = sortedSales.reduce((sum, sale) => {
    // The sale.profit is already recalculated in the database to reflect refunds
    return sum + (sale.profit || 0);
  }, 0);

  const handleExportFiltered = () => {
    let filename = `sales_${new Date().toISOString().split('T')[0]}`;
    if (startDate || endDate) {
      const start = startDate ? startDate.replace(/-/g, '') : 'all';
      const end = endDate ? endDate.replace(/-/g, '') : 'all';
      filename = `sales_${start}_to_${end}`;
    }
    // Create a custom export with filename
    const currencySymbol = CURRENCIES.find(c => c.code === globalCurrency)?.symbol || '$';
    const data = sortedSales.map(s => ({
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
    
    // Use the export utility
    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => 
        Object.values(row).map(value => {
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleEditSale = (updatedSale: Sale) => {
    onUpdateSale(updatedSale);
    setEditingSale(null);
  };

  const handleRefundSale = (sale: Sale) => {
    const remainingQuantity = sale.quantity - (sale.refundedQuantity || 0);
    
    if (remainingQuantity === 0) {
      alert('This sale has already been fully refunded.');
      return;
    }
    
    // If only 1 unit remaining, offer quick refund or partial refund option
    if (remainingQuantity === 1) {
      if (window.confirm(`Refund the remaining 1 unit of ${sale.productName}?`)) {
        onRefundSale(sale, 1);
      }
    } else {
      // Show partial refund form for multiple units
      setRefundingSale(sale);
    }
  };

  const handlePartialRefund = (quantity: number) => {
    if (refundingSale) {
      onRefundSale(refundingSale, quantity);
      setRefundingSale(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Filter Controls - Moved outside header for better visibility */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Filter Sales by Date</h3>
            <p className="text-slate-600 text-sm">Select a date range to filter and export sales records</p>
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClearFilters}
                className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
              >
                Clear Filters
              </button>
              <button
                onClick={handleExportFiltered}
                disabled={sortedSales.length === 0}
                className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-sm ${
                  sortedSales.length === 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
                title={sortedSales.length === 0 ? 'No sales to export' : `Export ${sortedSales.length} sales`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export {sortedSales.length > 0 && `(${sortedSales.length})`}
              </button>
            </div>
          </div>
          {(startDate || endDate) && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">
                Showing <span className="font-bold">{sortedSales.length}</span> of <span className="font-bold">{validSales.length}</span> sales
                {startDate && endDate && ` from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`}
                {startDate && !endDate && ` from ${new Date(startDate).toLocaleDateString()}`}
                {!startDate && endDate && ` until ${new Date(endDate).toLocaleDateString()}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sales History Card */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Sales History</h2>
              <p className="text-slate-300 text-sm">Complete transaction records and analytics</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <p className="text-slate-300 text-xs font-medium mb-1">Total Sales</p>
            <p className="text-2xl font-bold text-white">{sortedSales.length}</p>
            {(startDate || endDate) && validSales.length !== sortedSales.length && (
              <p className="text-xs text-slate-400 mt-1">of {validSales.length} total</p>
            )}
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <p className="text-slate-300 text-xs font-medium mb-1">Items Sold</p>
            <p className="text-2xl font-bold text-white">{filteredTotalItemsSold}</p>
            {(startDate || endDate) && totalItemsSold !== filteredTotalItemsSold && (
              <p className="text-xs text-slate-400 mt-1">of {totalItemsSold} total</p>
            )}
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <p className="text-slate-300 text-xs font-medium mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-white">{CURRENCIES.find(c => c.code === globalCurrency)?.symbol || '$'}{filteredTotalRevenue.toFixed(2)} {globalCurrency}</p>
            {(startDate || endDate) && totalRevenue !== filteredTotalRevenue && (
              <p className="text-xs text-slate-400 mt-1">of {formatCurrency(totalRevenue, globalCurrency)} total</p>
            )}
          </div>
          {canSeeFinancial && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-slate-300 text-xs font-medium mb-1">Total Profit</p>
              <p className={`text-2xl font-bold ${filteredTotalProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {formatCurrency(filteredTotalProfit, globalCurrency)} {globalCurrency}
              </p>
              {(startDate || endDate) && totalProfit !== filteredTotalProfit && (
                <p className="text-xs text-slate-400 mt-1">of {formatCurrency(totalProfit, globalCurrency)} total</p>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {editingSale && (
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <EditSaleForm
            sale={editingSale}
            onSubmit={handleEditSale}
            onCancel={() => setEditingSale(null)}
            globalCurrency={globalCurrency}
          />
        </div>
      )}

      {refundingSale && (
        <div className="p-6 border-b border-amber-200 bg-amber-50/50">
          <PartialRefundForm
            sale={refundingSale}
            onSubmit={handlePartialRefund}
            onCancel={() => setRefundingSale(null)}
            globalCurrency={globalCurrency}
          />
        </div>
      )}

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-slate-200">
              <th className="table-header text-left py-3 px-4 whitespace-nowrap">Date</th>
              <th className="table-header text-left py-3 px-4 min-w-[200px]">Product</th>
              <th className="table-header text-center py-3 px-4 whitespace-nowrap">Qty</th>
              <th className="table-header text-right py-3 px-4 whitespace-nowrap">Price</th>
              <th className="table-header text-right py-3 px-4 whitespace-nowrap">Total</th>
              {canSeeFinancial && <th className="table-header text-right py-3 px-4 whitespace-nowrap">Profit</th>}
              <th className="table-header text-center py-3 px-4 whitespace-nowrap">Batches</th>
              <th className="table-header text-right py-3 px-4 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {sortedSales.map((sale) => {
              // Calculate profit margin - use effective quantity (accounting for refunds)
              const refundedQty = sale.refundedQuantity || 0;
              const effectiveQty = sale.quantity - refundedQty;
              const effectiveCost = sale.purchasePrice * effectiveQty;
              const profitMargin = sale.purchasePrice && sale.purchasePrice > 0 && effectiveQty > 0
                ? ((sale.profit || 0) / effectiveCost) * 100
                : 0;
              
              // Profit is already recalculated in database to account for refunds
              const effectiveProfit = sale.profit || 0;
              const effectiveTotal = effectiveQty * sale.sellingPrice;
              
              return (
                <tr key={sale.id} className={`hover:bg-slate-50/50 transition-colors ${sale.refunded ? 'opacity-60 bg-red-50/20' : ''}`}>
                  <td className="table-cell py-3 px-4">
                    <div className="text-sm font-medium text-slate-900">
                      {new Date(sale.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(sale.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {sale.refundedQuantity && sale.refundedQuantity > 0 && sale.refundDate && (
                      <div className="text-xs text-orange-600 font-medium mt-1">
                        {sale.refundedQuantity} refunded
                      </div>
                    )}
                  </td>
                  <td className="table-cell py-3 px-4">
                    <div className="font-semibold text-slate-900 text-sm">{sale.productName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {sale.refunded && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                          REFUNDED
                        </span>
                      )}
                      {sale.refundedQuantity && sale.refundedQuantity > 0 && !sale.refunded && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                          PARTIAL
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell py-3 px-4 text-center">
                    <div className="text-sm font-medium text-slate-900">
                      {sale.quantity}
                    </div>
                    {sale.refundedQuantity && sale.refundedQuantity > 0 && (
                      <div className="text-xs text-orange-600 mt-0.5">
                        -{sale.refundedQuantity}
                      </div>
                    )}
                  </td>
                  <td className="table-cell py-3 px-4 text-right">
                    <div className="text-sm font-medium text-slate-900">
                      {formatCurrency(sale.sellingPrice, globalCurrency)}
                    </div>
                    <div className="text-xs text-slate-500">{globalCurrency}</div>
                  </td>
                  <td className="table-cell py-3 px-4 text-right">
                    <div className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(effectiveTotal, globalCurrency)}
                    </div>
                    {sale.refundedQuantity && sale.refundedQuantity > 0 && (
                      <div className="text-xs text-amber-600 line-through mt-0.5">
                        {formatCurrency(sale.quantity * sale.sellingPrice, globalCurrency)}
                      </div>
                    )}
                  </td>
                  {canSeeFinancial && (
                    <td className="table-cell py-3 px-4 text-right">
                      <div className={`text-sm font-semibold flex items-center justify-end gap-1 ${
                        effectiveProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {effectiveProfit >= 0 ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          </svg>
                        )}
                        {formatCurrency(effectiveProfit, globalCurrency)}
                      </div>
                      {profitMargin !== 0 && (
                        <div className={`text-xs font-medium mt-0.5 flex items-center justify-end gap-1 ${
                          profitMargin >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {profitMargin >= 0 ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            </svg>
                          )}
                          {profitMargin.toFixed(1)}%
                        </div>
                      )}
                    </td>
                  )}
                  <td className="table-cell py-3 px-4 text-center">
                    {sale.batchDetails && sale.batchDetails.length > 0 ? (
                      <div className="inline-flex flex-col items-center gap-1">
                        {sale.batchDetails.length === 1 ? (
                          <div className="text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                            <div className="font-medium">{formatNumber(sale.batchDetails[0].quantity)}</div>
                            <div className="text-slate-600">{formatCurrency(sale.batchDetails[0].purchasePrice, globalCurrency)}</div>
                          </div>
                        ) : (
                          <div className="group relative">
                            <button className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 transition-colors">
                              {sale.batchDetails.length} batches
                            </button>
                            <div className="hidden group-hover:block absolute z-10 right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 p-2">
                              <div className="text-xs font-semibold text-slate-700 mb-1">Batch Details:</div>
                              {sale.batchDetails.map((batch, idx) => (
                                <div key={idx} className="text-xs text-slate-600 py-1 border-b border-slate-100 last:border-0">
                                  <span className="font-medium">Batch {idx + 1}:</span> {formatNumber(batch.quantity)} @ {formatCurrency(batch.purchasePrice, globalCurrency)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="table-cell py-3 px-4 text-right">
                    {!sale.refunded ? (
                      isBusinessAdmin ? (
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => {
                              setPendingAction(() => () => setEditingSale(sale));
                              setShowPINVerification(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                            title="Edit sale"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setPendingAction(() => () => handleRefundSale(sale));
                              setShowPINVerification(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded transition-colors"
                            title={sale.refundedQuantity && sale.refundedQuantity > 0 ? 'Refund more' : 'Refund sale'}
                          >
                            {sale.refundedQuantity && sale.refundedQuantity > 0 ? 'More' : 'Refund'}
                          </button>
                        </div>
                      ) : null
                    ) : (
                      <span className="text-xs text-slate-400 italic">Refunded</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PINVerification
        isOpen={showPINVerification}
        onClose={() => {
          setShowPINVerification(false);
          setPendingAction(null);
          setPinError('');
        }}
        onVerify={async (pin) => {
          try {
            const token = localStorage.getItem('auth_token');
            const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '/api');
            const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;
            
            const response = await fetch(`${API_BASE_URL}/auth/verify-pin`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ pin }),
            });

            if (response.ok) {
              setShowPINVerification(false);
              setPinError('');
              if (pendingAction) {
                pendingAction();
                setPendingAction(null);
              }
            } else {
              const error = await response.json().catch(() => ({ error: 'Invalid PIN' }));
              setPinError(error.error || 'Invalid PIN');
            }
          } catch (error) {
            console.error('PIN verification error:', error);
            if (error instanceof TypeError && error.message.includes('fetch')) {
              setPinError('Network error: Cannot connect to server. Please check your connection.');
            } else {
              setPinError('Failed to verify PIN. Please try again.');
            }
          }
        }}
        title="Enter PIN to Continue"
        message="Please enter your PIN to perform this action"
        error={pinError}
      />
    </div>
  );
}
