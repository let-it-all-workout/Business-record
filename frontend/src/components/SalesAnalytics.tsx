import { Sale } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';

interface SalesAnalyticsProps {
  sales: Sale[];
  globalCurrency: string;
  revenueViewMode?: 'overall' | 'yearly';
}

// CURRENCIES may be used in future updates
// const CURRENCIES = [
//   { code: 'USD', symbol: '$', name: 'US Dollar' },
//   { code: 'EUR', symbol: '€', name: 'Euro' },
//   { code: 'GBP', symbol: '£', name: 'British Pound' },
//   { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
//   { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
//   { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' },
//   { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
//   { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
//   { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
//   { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
// ];

export default function SalesAnalytics({ sales, globalCurrency, revenueViewMode = 'overall' }: SalesAnalyticsProps) {

  // Filter valid sales (exclude fully refunded sales, but include partially refunded)
  const validSales = sales.filter(s => s && s !== null);

  if (validSales.length === 0) {
    return null;
  }

  // Calculate metrics accounting for refunds
  const totalRevenue = validSales.reduce((sum, s) => {
    const refundedQty = s.refundedQuantity || 0;
    const effectiveQty = s.quantity - refundedQty;
    return sum + (effectiveQty * s.sellingPrice);
  }, 0);
  
  const averageOrderValue = validSales.length > 0 ? totalRevenue / validSales.length : 0;
  const averageProfitMargin = validSales.length > 0
    ? validSales.reduce((sum, s) => {
        const refundedQty = s.refundedQuantity || 0;
        const effectiveQty = s.quantity - refundedQty;
        const effectiveCost = s.purchasePrice * effectiveQty;
        if (s.purchasePrice && s.purchasePrice > 0 && effectiveQty > 0) {
          return sum + ((s.profit || 0) / effectiveCost) * 100;
        }
        return sum;
      }, 0) / validSales.length
    : 0;

  // Top products by revenue (accounting for refunds)
  const productRevenue = validSales.reduce((acc, s) => {
    const refundedQty = s.refundedQuantity || 0;
    const effectiveQty = s.quantity - refundedQty;
    const revenue = effectiveQty * s.sellingPrice;
    acc[s.productName] = (acc[s.productName] || 0) + revenue;
    return acc;
  }, {} as Record<string, number>);

  const topProducts = Object.entries(productRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Sales by day (last 30 days)
  const salesByDay: Record<string, { revenue: number; count: number }> = {};
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  validSales
    .filter(s => new Date(s.date) >= thirtyDaysAgo)
    .forEach(s => {
      const date = new Date(s.date).toLocaleDateString();
      if (!salesByDay[date]) {
        salesByDay[date] = { revenue: 0, count: 0 };
      }
      // Account for refunds in daily revenue
      const refundedQty = s.refundedQuantity || 0;
      const effectiveQty = s.quantity - refundedQty;
      salesByDay[date].revenue += effectiveQty * s.sellingPrice;
      salesByDay[date].count += 1;
    });

  const dailyAverages = Object.values(salesByDay);
  const avgDailyRevenue = dailyAverages.length > 0
    ? dailyAverages.reduce((sum, d) => sum + d.revenue, 0) / dailyAverages.length
    : 0;
  const avgDailySales = dailyAverages.length > 0
    ? dailyAverages.reduce((sum, d) => sum + d.count, 0) / dailyAverages.length
    : 0;

  return (
    <div className="card mb-6">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Sales Analytics</h2>
            <p className="text-slate-300 text-sm">
              {revenueViewMode === 'yearly' 
                ? `Detailed insights for ${new Date().getFullYear()}`
                : 'Detailed insights and performance metrics'
              }
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-1">Average Order Value</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(averageOrderValue, globalCurrency)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-1">Avg. Profit Margin</p>
            <p className="text-2xl font-bold text-emerald-600">
              {averageProfitMargin.toFixed(1)}%
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-1">Avg. Daily Revenue</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(avgDailyRevenue, globalCurrency)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-1">Avg. Daily Sales</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatNumber(avgDailySales)}
            </p>
          </div>
        </div>

        {topProducts.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Products by Revenue</h3>
            <div className="space-y-2">
              {topProducts.map(([product, revenue], idx) => (
                <div key={product} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-sm">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-slate-900">{product}</span>
                  </div>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(revenue, globalCurrency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

