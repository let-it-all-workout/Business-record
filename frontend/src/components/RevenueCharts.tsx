import { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sale } from '../types';
import { formatCurrency } from '../utils/format';

interface RevenueChartsProps {
  sales: Sale[];
  globalCurrency: string;
  revenueViewMode?: 'overall' | 'yearly';
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function RevenueCharts({ sales, globalCurrency }: RevenueChartsProps) {
  // Filter valid sales
  const validSales = sales.filter(s => s && s !== null);

  if (validSales.length === 0) {
    return null;
  }

  // Revenue trends (daily for last 30 days, weekly for last 12 weeks, monthly for last 12 months)
  const revenueTrends = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyData: Record<string, { revenue: number; profit: number; date: string }> = {};
    
    validSales
      .filter(s => {
        const saleDate = new Date(s.date);
        return saleDate >= thirtyDaysAgo;
      })
      .forEach(s => {
        const date = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const refundedQty = s.refundedQuantity || 0;
        const effectiveQty = s.quantity - refundedQty;
        const revenue = effectiveQty * s.sellingPrice;
        const profit = s.profit || 0;

        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, profit: 0, date };
        }
        dailyData[date].revenue += revenue;
        dailyData[date].profit += profit;
      });

    return Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [validSales]);

  // Sales distribution by product
  const salesDistribution = useMemo(() => {
    const productRevenue: Record<string, number> = {};
    
    validSales.forEach(s => {
      const refundedQty = s.refundedQuantity || 0;
      const effectiveQty = s.quantity - refundedQty;
      const revenue = effectiveQty * s.sellingPrice;
      productRevenue[s.productName] = (productRevenue[s.productName] || 0) + revenue;
    });

    return Object.entries(productRevenue)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [validSales]);

  // Profit margins over time
  const profitMargins = useMemo(() => {
    const monthlyData: Record<string, { revenue: number; profit: number; month: string }> = {};
    
    validSales.forEach(s => {
      const saleDate = new Date(s.date);
      const month = saleDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const refundedQty = s.refundedQuantity || 0;
      const effectiveQty = s.quantity - refundedQty;
      const revenue = effectiveQty * s.sellingPrice;
      const profit = s.profit || 0;

      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, profit: 0, month };
      }
      monthlyData[month].revenue += revenue;
      monthlyData[month].profit += profit;
    });

    return Object.values(monthlyData)
      .map(d => ({
        ...d,
        margin: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-12);
  }, [validSales]);

  // Stock levels visualization (if we have product data)
  // const stockLevels = useMemo(() => {
  //   // This would need products data - placeholder for now
  //   return [];
  // }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value, globalCurrency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Revenue Trends Chart */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenue Trends (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => formatCurrency(value, globalCurrency, true)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Revenue"
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="profit" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Profit"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Distribution Pie Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Sales Distribution by Product</h3>
          <div className="w-full" style={{ minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={salesDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => {
                    // Show shortened labels or just percentage
                    const productName = name || 'Unknown';
                    const shortName = productName.length > 15 ? productName.substring(0, 12) + '...' : productName;
                    return `${shortName}: ${percent ? (percent * 100).toFixed(0) : 0}%`;
                  }}
                  outerRadius="70%"
                  innerRadius="30%"
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {salesDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                          <p className="font-semibold text-slate-900 mb-1">{data.name}</p>
                          <p className="text-sm text-blue-600">
                            {formatCurrency(data.value, globalCurrency)}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {payload[0].payload.percent ? ((payload[0].payload.percent * 100).toFixed(1)) : 0}% of total
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => {
                    const item = salesDistribution.find(d => d.name === value);
                    return `${value || 'Unknown'} (${formatCurrency(item?.value || 0, globalCurrency, true)})`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Product List Below Chart for Better Mobile View */}
          <div className="mt-4 space-y-2 lg:hidden">
            {salesDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-slate-900">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  {formatCurrency(item.value, globalCurrency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Profit Margins Bar Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Profit Margins by Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profitMargins}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="month" 
                stroke="#64748b"
                style={{ fontSize: '12px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#64748b"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
                        <p className="font-semibold text-slate-900 mb-2">{data.month}</p>
                        <p className="text-sm text-blue-600">Margin: {data.margin.toFixed(1)}%</p>
                        <p className="text-sm text-slate-600">Revenue: {formatCurrency(data.revenue, globalCurrency)}</p>
                        <p className="text-sm text-emerald-600">Profit: {formatCurrency(data.profit, globalCurrency)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="margin" fill="#10b981" name="Profit Margin %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

