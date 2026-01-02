import { useState, useMemo } from 'react';
import { Product } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';
import { useAuth } from '../contexts/AuthContext';
import PINVerification from './PINVerification';

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onAddStock: (product: Product) => void;
  onRecordSale: (product: Product) => void;
  onViewStockHistory: (product: Product) => void;
  globalCurrency: string;
}

export default function ProductList({ products, onEdit, onDelete, onAddStock, onRecordSale, onViewStockHistory, globalCurrency }: ProductListProps) {
  const { user, canSeeFinancialData } = useAuth();
  const [showPINVerification, setShowPINVerification] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pinError, setPinError] = useState('');

  // Check if user is business admin (can edit/delete with PIN)
  const isBusinessAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  // Check if user can see financial data (purchase prices, profits)
  const canSeeFinancial = canSeeFinancialData();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = products
      .map(p => p.category)
      .filter((cat): cat is string => !!cat);
    return Array.from(new Set(cats));
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category filter
      const matchesCategory = categoryFilter === 'all' || 
        (categoryFilter === 'uncategorized' && !product.category) ||
        product.category === categoryFilter;

      // Stock filter
      let matchesStock = true;
      if (stockFilter === 'in_stock') {
        matchesStock = product.quantity > 0;
      } else if (stockFilter === 'low_stock') {
        const totalOriginalQuantity = product.batches.reduce((sum, b) => sum + b.quantity, 0);
        matchesStock = totalOriginalQuantity > 0 && product.quantity / totalOriginalQuantity < 0.3;
      } else if (stockFilter === 'out_of_stock') {
        matchesStock = product.quantity === 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, categoryFilter, stockFilter]);
  if (products.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-slate-600 text-lg font-medium mb-2">No products in inventory yet.</p>
          <p className="text-slate-400 text-sm">Add your first product to get started!</p>
        </div>
      </div>
    );
  }

  const totalValue = products.reduce((sum, product) => {
    const batchValue = product.batches.reduce((batchSum, batch) => 
      batchSum + (batch.remainingQuantity * batch.purchasePrice), 0
    );
    return sum + batchValue;
  }, 0);


  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Inventory Overview</h2>
              <p className="text-slate-300 text-sm">Complete product and stock management</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/20">
              <p className="text-slate-300 text-xs font-medium mb-1">Total Inventory Value</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalValue, globalCurrency)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-slate-300 text-sm">
              <span className="font-semibold">{filteredProducts.length}</span> of <span className="font-semibold">{products.length}</span> {products.length === 1 ? 'product' : 'products'} shown
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-semibold text-slate-700 mb-2">
              Search Products
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
                placeholder="Search by name or category..."
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-2">
              Category
            </label>
            <select
              id="category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Categories</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="stock" className="block text-sm font-semibold text-slate-700 mb-2">
              Stock Status
            </label>
            <select
              id="stock"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500 text-lg">No products match your filters.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setStockFilter('all');
            }}
            className="mt-4 text-slate-600 hover:text-slate-900 underline"
          >
            Clear filters
          </button>
        </div>
      ) : filteredProducts.map((product) => {
        const sortedBatches = [...(product.batches || [])].sort((a, b) => 
          new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
        );

        return (
          <div key={product.id} className="card">
            <div className="card-header">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-white">{product.name}</h3>
                    {product.category && (
                      <span className="px-2 py-1 bg-white/20 text-white text-xs font-semibold rounded">
                        {product.category}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm">
                    Total Stock: <span className="font-semibold">{formatNumber(product.quantity)}</span> units • 
                    Selling Price: <span className="font-semibold">{formatCurrency(product.price, globalCurrency)}</span>/unit
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => onViewStockHistory(product)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-semibold shadow-sm hover:shadow-md"
                    title="View Stock History"
                  >
                    History
                  </button>
                  <button
                    onClick={() => onRecordSale(product)}
                    disabled={product.quantity === 0}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm ${
                      product.quantity === 0
                        ? 'bg-slate-600 text-slate-300 cursor-not-allowed opacity-50'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'
                    }`}
                  >
                    Sell
                  </button>
                  {/* Only show Add Stock, Edit, Delete for business admins */}
                  {isBusinessAdmin && (
                    <>
                      <button
                        onClick={() => {
                          setPendingAction(() => () => onAddStock(product));
                          setShowPINVerification(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 text-sm font-semibold shadow-sm hover:shadow-md"
                      >
                        Add Stock
                      </button>
                      <button
                        onClick={() => {
                          setPendingAction(() => () => onEdit(product));
                          setShowPINVerification(true);
                        }}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all duration-200 text-sm font-semibold shadow-sm hover:shadow-md"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
                            setPendingAction(() => () => onDelete(product.id));
                            setShowPINVerification(true);
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-sm font-semibold shadow-sm hover:shadow-md"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6">
              {sortedBatches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500">No stock batches recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Stock Batches</h4>
                  {sortedBatches.map((batch) => (
                    <div
                      key={batch.id}
                      className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 bg-slate-50/50"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold text-slate-900">
                            Batch - {new Date(batch.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </h4>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            batch.remainingQuantity === 0 
                              ? 'bg-red-100 text-red-700 border border-red-200' 
                              : batch.remainingQuantity < batch.quantity * 0.3
                              ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {batch.remainingQuantity === 0 ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            ) : batch.remainingQuantity < batch.quantity * 0.3 ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {batch.remainingQuantity} / {batch.quantity} remaining
                          </span>
                        </div>
                      </div>
                      <div className={`grid gap-4 text-sm ${canSeeFinancial ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {canSeeFinancial && (
                          <div>
                            <span className="text-slate-500 text-xs font-medium">Purchase Price</span>
                            <p className="font-semibold text-slate-900 mt-0.5">{formatCurrency(batch.purchasePrice, globalCurrency)}/unit</p>
                          </div>
                        )}
                        {canSeeFinancial && (
                          <div>
                            <span className="text-slate-500 text-xs font-medium">Batch Value</span>
                            <p className="font-semibold text-slate-900 mt-0.5">
                              {formatCurrency(batch.remainingQuantity * batch.purchasePrice, globalCurrency)}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500 text-xs font-medium">Purchase Date</span>
                          <p className="font-semibold text-slate-900 mt-0.5">
                            {new Date(batch.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        {!canSeeFinancial && (
                          <div>
                            <span className="text-slate-500 text-xs font-medium">Stock Level</span>
                            <p className="font-semibold text-slate-900 mt-0.5">
                              {formatNumber(batch.remainingQuantity)} units
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

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
      {pinError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">
          {pinError}
        </div>
      )}
    </div>
  );
}
