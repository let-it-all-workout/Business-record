import { useMemo } from 'react';
import { Sale, Product } from '../types';
import { formatCurrency } from '../utils/format';
import { effectiveQuantity, marginPercent, saleProfit, saleRevenue } from '../utils/saleMath';

interface AdvancedAnalyticsProps {
  sales: Sale[];
  products: Product[];
  globalCurrency: string;
}

export default function AdvancedAnalytics({ sales, products, globalCurrency }: AdvancedAnalyticsProps) {
  const validSales = sales.filter((s) => s && (s.currency || globalCurrency) === globalCurrency);

  // Sales Forecasting (Simple linear trend)
  const salesForecast = useMemo(() => {
    if (validSales.length < 2) return null;

    const last30Days = validSales
      .filter(s => {
        const saleDate = new Date(s.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return saleDate >= thirtyDaysAgo;
      })
      .map(s => ({
        date: new Date(s.date).getTime(),
        revenue: saleRevenue(s),
      }))
      .sort((a, b) => a.date - b.date);

    if (last30Days.length < 2) return null;

    // Simple linear regression
    const n = last30Days.length;
    const sumX = last30Days.reduce((sum, d) => sum + d.date, 0);
    const sumY = last30Days.reduce((sum, d) => sum + d.revenue, 0);
    const sumXY = last30Days.reduce((sum, d) => sum + d.date * d.revenue, 0);
    const sumX2 = last30Days.reduce((sum, d) => sum + d.date * d.date, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Forecast next 7 days
    const today = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    const forecast = [];
    for (let i = 1; i <= 7; i++) {
      const futureDate = today + (i * oneDay);
      const predictedRevenue = slope * futureDate + intercept;
      forecast.push({
        date: new Date(futureDate).toLocaleDateString(),
        revenue: Math.max(0, predictedRevenue), // Don't allow negative
      });
    }

    return {
      next7Days: forecast,
      averageDaily: sumY / n,
      trend: slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable',
    };
  }, [validSales]);

  // Inventory Turnover Rate
  const inventoryTurnover = useMemo(() => {
    const productTurnover: Array<{ name: string; turnover: number; days: number }> = [];

    products.forEach(product => {
      const productSales = validSales.filter(s => s.productId === product.id);
      if (productSales.length === 0) return;

      const totalSold = productSales.reduce((sum, s) => {
        const refundedQty = s.refundedQuantity || 0;
        return sum + (s.quantity - refundedQty);
      }, 0);

      const averageStock = product.quantity; // Simplified - could use average over time
      const turnover = averageStock > 0 ? totalSold / averageStock : 0;
      const daysToTurnover = turnover > 0 ? 365 / turnover : Infinity;

      productTurnover.push({
        name: product.name,
        turnover,
        days: daysToTurnover,
      });
    });

    return productTurnover.sort((a, b) => a.days - b.days);
  }, [products, validSales]);

  // Seasonal Trends
  const seasonalTrends = useMemo(() => {
    const monthlyRevenue: Record<string, number> = {};

    validSales.forEach(s => {
      const month = new Date(s.date).toLocaleDateString('en-US', { month: 'long' });
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + saleRevenue(s);
    });

    return Object.entries(monthlyRevenue)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => {
        const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      });
  }, [validSales]);

  // Best/Worst Performing Products
  const productPerformance = useMemo(() => {
    const performance: Record<string, { revenue: number; profit: number; quantity: number }> = {};

    validSales.forEach(s => {
      const revenue = saleRevenue(s);
      const profit = saleProfit(s);

      if (!performance[s.productName]) {
        performance[s.productName] = { revenue: 0, profit: 0, quantity: 0 };
      }
      performance[s.productName].revenue += revenue;
      performance[s.productName].profit += profit;
      performance[s.productName].quantity += effectiveQuantity(s);
    });

    const sorted = Object.entries(performance)
      .map(([name, data]) => ({
        name,
        ...data,
        margin: marginPercent(data.profit, data.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      best: sorted.slice(0, 5),
      worst: sorted.slice(-5).reverse(),
    };
  }, [validSales]);

  return (
    <div className="space-y-6">
      {/* Sales Forecasting */}
      {salesForecast && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Sales Forecast (Next 7 Days)</h3>
          <div className="mb-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Average Daily Revenue:</span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(salesForecast.averageDaily, globalCurrency)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-slate-600">Trend:</span>
              <span className={`text-sm font-medium ${
                salesForecast.trend === 'up' ? 'text-emerald-600' :
                salesForecast.trend === 'down' ? 'text-red-600' : 'text-slate-600'
              }`}>
                {salesForecast.trend === 'up' ? '↑ Increasing' :
                 salesForecast.trend === 'down' ? '↓ Decreasing' : '→ Stable'}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {salesForecast.next7Days.map((day, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-sm text-slate-700">{day.date}</span>
                <span className="text-sm font-medium text-slate-900">
                  {formatCurrency(day.revenue, globalCurrency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Turnover */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Inventory Turnover Analysis</h3>
        <div className="space-y-2">
          {inventoryTurnover.slice(0, 10).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500">
                  Turnover: {item.turnover.toFixed(2)}x per year
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">
                  {item.days === Infinity ? 'N/A' : `${item.days.toFixed(0)} days`}
                </p>
                <p className="text-xs text-slate-500">to turnover</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top 5 Products</h3>
          <div className="space-y-3">
            {productPerformance.best.map((product, idx) => (
              <div key={idx} className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">#{idx + 1} {product.name}</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {formatCurrency(product.revenue, globalCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Profit: {formatCurrency(product.profit, globalCurrency)}</span>
                  <span>Margin: {product.margin.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Lowest 5 Products</h3>
          <div className="space-y-3">
            {productPerformance.worst.map((product, idx) => (
              <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">{product.name}</span>
                  <span className="text-sm font-bold text-red-600">
                    {formatCurrency(product.revenue, globalCurrency)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Profit: {formatCurrency(product.profit, globalCurrency)}</span>
                  <span>Margin: {product.margin.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seasonal Trends */}
      {seasonalTrends.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Seasonal Trends</h3>
          <div className="space-y-2">
            {seasonalTrends.map((trend, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-24 text-sm text-slate-700">{trend.month}</div>
                <div className="flex-1 bg-slate-200 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full flex items-center justify-end pr-2"
                    style={{
                      width: `${(trend.revenue / Math.max(...seasonalTrends.map(t => t.revenue))) * 100}%`
                    }}
                  >
                    <span className="text-xs text-white font-medium">
                      {formatCurrency(trend.revenue, globalCurrency, true)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

