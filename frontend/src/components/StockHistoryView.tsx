import { Product } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';

interface StockHistoryViewProps {
  product: Product;
  onClose: () => void;
  globalCurrency: string;
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

export default function StockHistoryView({ product, onClose, globalCurrency }: StockHistoryViewProps) {
  // currencySymbol may be used in future updates
  // const currencySymbol = CURRENCIES.find(c => c.code === globalCurrency)?.symbol || '$';
  const sortedHistory = [...(product.stockHistory || [])].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getBatchInfo = (batchId?: string) => {
    if (!batchId) return null;
    const batch = product.batches.find(b => b.id === batchId);
    return batch;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Stock History</h2>
            <p className="text-slate-300 text-sm mt-1">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-slate-200 transition-colors p-2 rounded-lg hover:bg-white/10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {sortedHistory.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No stock history recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedHistory.map((entry) => {
                const batch = getBatchInfo(entry.batchId);
                return (
                  <div
                    key={entry.id}
                    className={`border rounded-lg p-4 ${
                      entry.type === 'added'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              entry.type === 'added'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-red-600 text-white'
                            }`}
                          >
                            {entry.type === 'added' ? 'Added' : 'Sold'}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            {formatNumber(entry.quantity)} {entry.quantity === 1 ? 'unit' : 'units'}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600">
                          <p>
                            <strong>Date:</strong>{' '}
                            {new Date(entry.date).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                          <p>
                            <strong>Time:</strong>{' '}
                            {new Date(entry.date).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {batch && (
                            <div className="mt-2 p-2 bg-white rounded border border-slate-200">
                              <p className="text-xs font-medium text-slate-700 mb-1">Batch Details:</p>
                              <p className="text-xs text-slate-600">
                                Purchase Date: {new Date(batch.purchaseDate).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-slate-600">
                                Purchase Price: {formatCurrency(batch.purchasePrice, globalCurrency)}/unit
                              </p>
                              <p className="text-xs text-slate-600">
                                Remaining: {formatNumber(batch.remainingQuantity)} / {formatNumber(batch.quantity)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

