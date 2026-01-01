import { Product, Sale, GoodsInventory } from '../types';

interface SmartInsightsProps {
  products: Product[];
  sales: Sale[];
  inventories: GoodsInventory[];
  currency: string;
  currencySymbol: string;
}

export default function SmartInsights({ products, sales, inventories: _inventories, currency: _currency, currencySymbol }: SmartInsightsProps) {
  // Calculate revenue and profit accounting for refunds
  const totalRevenue = sales.reduce((sum, sale) => {
    const refundedQty = sale.refundedQuantity || 0;
    const effectiveQty = sale.quantity - refundedQty;
    return sum + (effectiveQty * sale.sellingPrice);
  }, 0);
  
  // Profit: Use recalculated profit from database (already accounts for refunds)
  const totalProfit = sales.reduce((sum, sale) => {
    return sum + (sale.profit || 0);
  }, 0);
  
  const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  
  const lowStockProducts = products.filter(p => p.quantity < 10 && p.quantity > 0);
  const outOfStockProducts = products.filter(p => p.quantity === 0);
  
  const topSellingProducts = sales
    .reduce((acc, sale) => {
      const refundedQty = sale.refundedQuantity || 0;
      const effectiveQty = sale.quantity - refundedQty;
      const effectiveRevenue = effectiveQty * sale.sellingPrice;
      
      const existing = acc.find(item => item.productId === sale.productId);
      if (existing) {
        existing.quantity += effectiveQty;
        existing.revenue += effectiveRevenue;
      } else {
        acc.push({
          productId: sale.productId,
          quantity: effectiveQty,
          revenue: effectiveRevenue,
        });
      }
      return acc;
    }, [] as Array<{ productId: string; quantity: number; revenue: number }>)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 3);

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">Business Insights</h3>
      
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Profit Margin</p>
            <p className="text-lg font-semibold text-slate-900">{avgProfitMargin.toFixed(1)}%</p>
          </div>
          <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${
            avgProfitMargin > 30 ? 'bg-emerald-50 text-emerald-700' : 
            avgProfitMargin > 15 ? 'bg-amber-50 text-amber-700' : 
            'bg-red-50 text-red-700'
          }`}>
            {avgProfitMargin > 30 ? 'Excellent' : avgProfitMargin > 15 ? 'Good' : 'Low'}
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Low Stock Items</p>
            <p className="text-lg font-semibold text-slate-900">{lowStockProducts.length}</p>
          </div>
          {lowStockProducts.length > 0 && (
            <span className="badge badge-warning">Action Needed</span>
          )}
        </div>
        
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Out of Stock</p>
            <p className="text-lg font-semibold text-slate-900">{outOfStockProducts.length}</p>
          </div>
          {outOfStockProducts.length > 0 && (
            <span className="badge badge-danger">Urgent</span>
          )}
        </div>
      </div>
      
      {topSellingProducts.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Top Selling Products</h4>
          <div className="space-y-2">
            {topSellingProducts.map((item, index) => {
              const product = products.find(p => p.id === item.productId);
              return (
                <div key={item.productId} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-md transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-400 w-4">#{index + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {product?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} units sold
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {currencySymbol}{item.revenue.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
