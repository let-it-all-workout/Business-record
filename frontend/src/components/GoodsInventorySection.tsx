import { useState } from 'react';
import { GoodsInventory, Good, Sale } from '../types';
import AddGoodForm from './AddGoodForm';
import EditGoodForm from './EditGoodForm';
import SaleGoodForm from './SaleGoodForm';
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

interface GoodsInventorySectionProps {
  inventory: GoodsInventory;
  onUpdate: (inventory: GoodsInventory) => void;
  onDelete: (id: string) => void;
  onEditInventory: (inventory: GoodsInventory) => void;
  onRecordSale: (inventoryId: string, goodId: string, quantity: number, sellingPrice: number, purchasePrice: number, profit: number) => void;
  globalCurrency: string;
  searchQuery?: string;
  sales?: Sale[];
}

export default function GoodsInventorySection({ inventory, onUpdate, onDelete, onEditInventory, onRecordSale, globalCurrency, searchQuery = '', sales = [] }: GoodsInventorySectionProps) {
  const { user, canSeeFinancialData } = useAuth();
  const isBusinessAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const canSeeFinancial = canSeeFinancialData();
  const [showPINVerification, setShowPINVerification] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pinError, setPinError] = useState('');
  // Calculate sold quantity from actual sales records for each good
  // This is the accurate way - uses actual sales data, not quantity difference
  const getSoldQuantity = (goodId: string): number => {
    // Always use sales records if available (most accurate)
    // Only use fallback if sales array is empty (no sales data loaded yet)
    if (sales && sales.length > 0) {
      const goodSales = sales.filter(sale => sale.goodId === goodId);
      
      // Calculate from actual sales records
      const totalSold = goodSales.reduce((total, sale) => {
        const refunded = sale.refundedQuantity || 0;
        const effectiveSold = sale.quantity - refunded;
        return total + effectiveSold;
      }, 0);
      
      // Return the calculated value (even if 0, because that means no sales for this good)
      return totalSold;
    }
    
    // Fallback: only use quantity difference if sales array is empty
    // This means sales data hasn't been loaded yet
    const good = inventory.goods.find(g => g.id === goodId);
    if (good && good.quantity > good.remainingQuantity) {
      return good.quantity - good.remainingQuantity;
    }
    
    return 0;
  };
  const [showAddGoodForm, setShowAddGoodForm] = useState(false);
  const [editingGood, setEditingGood] = useState<Good | null>(null);
  const [sellingGood, setSellingGood] = useState<Good | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter goods based on search query
  const filteredGoods = searchQuery.trim()
    ? inventory.goods.filter(good =>
        good.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : inventory.goods;

  const handleAddGood = (goodData: { name: string; quantity: number; unitPrice: number; currency: string }) => {
    const newGood: Good = {
      id: `good-${Date.now()}-${Math.random()}`,
      name: goodData.name,
      quantity: goodData.quantity,
      remainingQuantity: goodData.quantity,
      unitPrice: goodData.unitPrice,
      currency: globalCurrency,
    };

    const updatedInventory: GoodsInventory = {
      ...inventory,
      goods: [...inventory.goods, newGood],
    };

    onUpdate(updatedInventory);
    setShowAddGoodForm(false);
    
    // Show success message
    const currencySymbol = CURRENCIES.find(c => c.code === globalCurrency)?.symbol || '$';
    alert(`Product "${goodData.name}" added successfully!\n${goodData.quantity} units @ ${currencySymbol}${Number(goodData.unitPrice || 0).toFixed(2)} ${globalCurrency} per unit`);
  };

  const handleEditGood = (updatedGood: Good) => {
    const updatedInventory: GoodsInventory = {
      ...inventory,
      goods: inventory.goods.map(g => g.id === updatedGood.id ? updatedGood : g),
    };
    onUpdate(updatedInventory);
    setEditingGood(null);
    // Note: Stats will automatically update because handleUpdateInventory reloads all inventories
  };

  const handleRecordSale = (quantity: number, sellingPrice: number) => {
    if (!sellingGood) return;
    
    // Validate stock availability
    if (quantity > sellingGood.remainingQuantity) {
      alert(`Insufficient stock! Only ${sellingGood.remainingQuantity} units available.`);
      return;
    }
    
    // Calculate profit
    const profit = (sellingPrice - sellingGood.unitPrice) * quantity;
    
    // Note: We don't update local state here anymore - the server will update the database
    // and we'll reload from the database after the sale is created
    // This ensures the data is always in sync with the database
    
    onRecordSale(inventory.id, sellingGood.id, quantity, sellingPrice, sellingGood.unitPrice, profit);
    setSellingGood(null);
    
    // Success message will be shown by the parent component after data reload
  };

  const handleDeleteGood = (goodId: string) => {
    // Confirmation and PIN verification are handled before this function is called
    const updatedInventory: GoodsInventory = {
      ...inventory,
      goods: inventory.goods.filter(g => g.id !== goodId),
    };
    onUpdate(updatedInventory);
  };

  const totalValue = inventory.goods.reduce((sum, good) => {
    return sum + (good.remainingQuantity * good.unitPrice);
  }, 0);

  const totalItems = inventory.goods.reduce((sum, good) => sum + good.remainingQuantity, 0);

  return (
    <div className="card-elevated">
      {/* Inventory Header - Rectangular Box Design */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 border-b-2 border-slate-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg className={`w-5 h-5 transition-transform ${isExpanded ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-1">{inventory.name}</h3>
              <p className="text-sm text-slate-300">
                Created: {new Date(inventory.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <p className="text-slate-300 text-xs font-medium mb-1 uppercase tracking-wide">Products</p>
                <p className="text-xl font-bold text-white">{inventory.goods.length}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-300 text-xs font-medium mb-1 uppercase tracking-wide">Total Items</p>
                <p className="text-xl font-bold text-white">{formatNumber(totalItems)}</p>
              </div>
              {canSeeFinancial && (
                <div className="text-center">
                  <p className="text-slate-300 text-xs font-medium mb-1 uppercase tracking-wide">Total Value</p>
                  <p className="text-xl font-bold text-white">{formatCurrency(totalValue, globalCurrency)}</p>
                </div>
              )}
            </div>
          </div>
          {/* Only show Edit/Delete buttons for business admins */}
          {isBusinessAdmin && (
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => {
                  setPendingAction(() => () => onEditInventory(inventory));
                  setShowPINVerification(true);
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-semibold border border-white/20"
              >
                <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete "${inventory.name}"?`)) {
                    setPendingAction(() => () => onDelete(inventory.id));
                    setShowPINVerification(true);
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          {showAddGoodForm ? (
            <div className="mb-6">
              <AddGoodForm
                onSubmit={handleAddGood}
                onCancel={() => setShowAddGoodForm(false)}
                globalCurrency={globalCurrency}
              />
            </div>
          ) : editingGood ? (
            <div className="mb-6">
              <EditGoodForm
                good={editingGood}
                onSubmit={handleEditGood}
                onCancel={() => setEditingGood(null)}
                globalCurrency={globalCurrency}
              />
            </div>
          ) : sellingGood ? (
            <div className="mb-6">
              <SaleGoodForm
                good={sellingGood}
                onSubmit={handleRecordSale}
                onCancel={() => setSellingGood(null)}
                globalCurrency={globalCurrency}
              />
            </div>
          ) : (
            isBusinessAdmin ? (
              <button
                onClick={() => {
                  setPendingAction(() => () => setShowAddGoodForm(true));
                  setShowPINVerification(true);
                }}
                className="mb-6 w-full btn-success py-3 shadow-md hover:shadow-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Product to This Inventory
                </span>
              </button>
            ) : null
          )}

          {inventory.goods.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium mb-1">No products in this inventory yet.</p>
              <p className="text-slate-400 text-sm">Click "Add Product" to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Product Name</th>
                    <th className="table-header">Stock Status</th>
                    {canSeeFinancial && <th className="table-header">Unit Price</th>}
                    {canSeeFinancial && <th className="table-header">Total Value</th>}
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredGoods.length === 0 ? (
                    <tr>
                      <td colSpan={canSeeFinancial ? 5 : 3} className="table-cell text-center py-8 text-slate-500">
                        {searchQuery ? `No products found matching "${searchQuery}"` : 'No products in this inventory'}
                      </td>
                    </tr>
                  ) : (
                    filteredGoods.map((good) => (
                      <tr key={good.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell">
                        <div className="font-semibold text-slate-900">{good.name}</div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            good.remainingQuantity === 0 
                              ? 'bg-red-100 text-red-700 border-red-200' 
                              : good.remainingQuantity < good.quantity * 0.3
                              ? 'bg-amber-100 text-amber-700 border-amber-200' 
                              : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}>
                            {good.remainingQuantity === 0 ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            ) : good.remainingQuantity < good.quantity * 0.3 ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {formatNumber(good.remainingQuantity)} / {formatNumber(good.quantity)}
                          </span>
                          {(() => {
                            const soldQty = getSoldQuantity(good.id);
                            return soldQty > 0 && (
                              <span className="text-xs text-slate-500">
                                ({formatNumber(soldQty)} sold)
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      {canSeeFinancial && (
                        <td className="table-cell">
                          <div className="font-medium text-slate-900">
                            {formatCurrency(good.unitPrice, globalCurrency)} <span className="text-slate-500 text-xs">{globalCurrency}</span>
                          </div>
                        </td>
                      )}
                      {canSeeFinancial && (
                        <td className="table-cell">
                          <div className="font-semibold text-slate-900">
                            {formatCurrency(good.remainingQuantity * good.unitPrice, globalCurrency)} <span className="text-slate-500 text-xs">{globalCurrency}</span>
                          </div>
                        </td>
                      )}
                      <td className="table-cell text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setSellingGood(good)}
                            disabled={good.remainingQuantity === 0}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                              good.remainingQuantity === 0
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                          >
                            Sale
                          </button>
                          {isBusinessAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setPendingAction(() => () => setEditingGood(good));
                                  setShowPINVerification(true);
                                }}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this product?')) {
                                    setPendingAction(() => () => handleDeleteGood(good.id));
                                    setShowPINVerification(true);
                                  }
                                }}
                                className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
              const error = await response.json().catch(() => ({ error: 'AUTH-005: PIN verification failed' }));
              setPinError(error.error || 'AUTH-005: PIN verification failed');
            }
          } catch (error) {
            console.error('PIN verification error:', error);
            if (error instanceof TypeError && error.message.includes('fetch')) {
              setPinError('NET-001: Error: try again later');
            } else {
              setPinError('AUTH-005: PIN verification failed');
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
