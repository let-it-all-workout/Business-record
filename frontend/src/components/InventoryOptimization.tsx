import { useState } from 'react';
import { Product } from '../types';
import { formatNumber } from '../utils/format';

interface InventoryOptimizationProps {
  products: Product[];
  onUpdateProduct: (productId: string, updates: Partial<Product>) => void;
  globalCurrency: string;
}

export default function InventoryOptimization({ products, onUpdateProduct, globalCurrency }: InventoryOptimizationProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [reorderPoint, setReorderPoint] = useState<number>(0);
  const [demandRate, setDemandRate] = useState<number>(0);
  const [orderingCost, setOrderingCost] = useState<number>(0);
  const [holdingCost, setHoldingCost] = useState<number>(0);

  // Calculate EOQ (Economic Order Quantity)
  const calculateEOQ = (demand: number, orderingCost: number, holdingCost: number): number => {
    if (demand <= 0 || orderingCost <= 0 || holdingCost <= 0) return 0;
    return Math.sqrt((2 * demand * orderingCost) / holdingCost);
  };

  // Calculate Reorder Point (for future use)
  // const calculateReorderPoint = (demandRate: number, leadTime: number, safetyStock: number): number => {
  //   return (demandRate * leadTime) + safetyStock;
  // };

  const handleCalculateEOQ = () => {
    if (!selectedProduct || demandRate <= 0 || orderingCost <= 0 || holdingCost <= 0) return;
    
    const eoq = calculateEOQ(demandRate, orderingCost, holdingCost);
    onUpdateProduct(selectedProduct.id, { eoq: Math.round(eoq) });
    alert(`EOQ calculated: ${Math.round(eoq)} units`);
  };

  const handleSetReorderPoint = () => {
    if (!selectedProduct) return;
    onUpdateProduct(selectedProduct.id, { reorderPoint });
    alert(`Reorder point set to ${reorderPoint} units for ${selectedProduct.name}`);
  };

  // Products needing reorder
  const needsReorder = products.filter(p => {
    if (!p.reorderPoint) return false;
    return p.quantity <= p.reorderPoint;
  });

  return (
    <div className="space-y-6">
      {/* Reorder Alerts */}
      {needsReorder.length > 0 && (
        <div className="card p-6 bg-red-50 border-2 border-red-200">
          <h3 className="text-lg font-semibold text-red-900 mb-4">⚠️ Products Need Reordering</h3>
          <div className="space-y-2">
            {needsReorder.map(product => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{product.name}</p>
                  <p className="text-sm text-slate-600">
                    Current: {product.quantity} | Reorder Point: {product.reorderPoint}
                  </p>
                </div>
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  Low Stock
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EOQ Calculator */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Economic Order Quantity (EOQ) Calculator</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Product</label>
            <select
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                const product = products.find(p => p.id === e.target.value);
                setSelectedProduct(product || null);
                if (product) {
                  setReorderPoint(product.reorderPoint || 0);
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">Select a product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Annual Demand (units)
                  </label>
                  <input
                    type="number"
                    value={demandRate}
                    onChange={(e) => setDemandRate(parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 1000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ordering Cost ({globalCurrency})
                  </label>
                  <input
                    type="number"
                    value={orderingCost}
                    onChange={(e) => setOrderingCost(parseFloat(e.target.value) || 0)}
                    placeholder="Cost per order"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Holding Cost per Unit ({globalCurrency})
                  </label>
                  <input
                    type="number"
                    value={holdingCost}
                    onChange={(e) => setHoldingCost(parseFloat(e.target.value) || 0)}
                    placeholder="Storage cost per unit"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current EOQ
                  </label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg">
                    {selectedProduct.eoq ? formatNumber(selectedProduct.eoq) : 'Not set'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleCalculateEOQ}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Calculate & Set EOQ
              </button>

              {demandRate > 0 && orderingCost > 0 && holdingCost > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <strong>Recommended EOQ:</strong> {formatNumber(Math.round(calculateEOQ(demandRate, orderingCost, holdingCost)))}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    This minimizes total inventory costs (ordering + holding)
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Reorder Point Manager */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Reorder Point Manager</h3>
        <div className="space-y-4">
          {selectedProduct && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Reorder Point (units)
                  </label>
                  <input
                    type="number"
                    value={reorderPoint}
                    onChange={(e) => setReorderPoint(parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Stock level at which to reorder
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Stock
                  </label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg">
                    {formatNumber(selectedProduct.quantity)} units
                  </div>
                </div>
              </div>

              <button
                onClick={handleSetReorderPoint}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Set Reorder Point
              </button>

              {selectedProduct.reorderPoint && (
                <div className={`p-4 rounded-lg border ${
                  selectedProduct.quantity <= selectedProduct.reorderPoint
                    ? 'bg-red-50 border-red-200'
                    : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    selectedProduct.quantity <= selectedProduct.reorderPoint
                      ? 'text-red-900'
                      : 'text-emerald-900'
                  }`}>
                    {selectedProduct.quantity <= selectedProduct.reorderPoint
                      ? '⚠️ Stock is at or below reorder point!'
                      : '✓ Stock is above reorder point'}
                  </p>
                </div>
              )}
            </>
          )}

          {!selectedProduct && (
            <p className="text-sm text-slate-500 text-center py-4">
              Select a product from the EOQ calculator above to set reorder points
            </p>
          )}
        </div>
      </div>

      {/* Product Summary */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Product Optimization Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Product</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Stock</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Reorder Point</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">EOQ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => {
                const needsReorder = product.reorderPoint ? product.quantity <= product.reorderPoint : false;
                return (
                  <tr key={product.id} className="border-b border-slate-100">
                    <td className="py-3 px-4 font-medium text-slate-900">{product.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{formatNumber(product.quantity)}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {product.reorderPoint ? formatNumber(product.reorderPoint) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">
                      {product.eoq ? formatNumber(product.eoq) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {needsReorder ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                          Reorder
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

