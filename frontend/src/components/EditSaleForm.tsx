import { useState, useEffect } from 'react';
import { Sale } from '../types';
import { useAuth } from '../contexts/AuthContext';

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

interface EditSaleFormProps {
  sale: Sale;
  onSubmit: (sale: Sale) => void;
  onCancel: () => void;
  globalCurrency: string;
}

export default function EditSaleForm({ sale, onSubmit, onCancel, globalCurrency: _globalCurrency }: EditSaleFormProps) {
  const { canSeeFinancialData } = useAuth();
  const canSeeFinancial = canSeeFinancialData();
  const [quantity, setQuantity] = useState(sale.quantity.toString());
  const [sellingPrice, setSellingPrice] = useState(sale.sellingPrice.toString());

  useEffect(() => {
    setQuantity(sale.quantity.toString());
    setSellingPrice(sale.sellingPrice.toString());
  }, [sale]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantityNum = parseInt(quantity, 10);
    const priceNum = parseFloat(sellingPrice);
    const refundedQty = sale.refundedQuantity || 0;

    if (isNaN(quantityNum) || quantityNum <= 0) {
      alert('Please enter a valid quantity (greater than 0)');
      return;
    }

    // Validation: Cannot set quantity below refunded quantity
    if (quantityNum < refundedQty) {
      alert(`Cannot set quantity to ${quantityNum}. ${refundedQty} units have already been refunded.`);
      return;
    }

    if (isNaN(priceNum) || priceNum < 0) {
      alert('Please enter a valid selling price (0 or greater)');
      return;
    }

    // Recalculate profit - account for refunded quantities
    // Profit should only be calculated for non-refunded quantity
    const effectiveQuantity = quantityNum - refundedQty;
    const profit = (priceNum - sale.purchasePrice) * effectiveQuantity;

    const updatedSale: Sale = {
      ...sale,
      quantity: quantityNum,
      sellingPrice: priceNum,
      profit,
    };

    onSubmit(updatedSale);
  };

  // Calculate profit accounting for refunds
  const refundedQty = sale.refundedQuantity || 0;
  const quantityNum = quantity ? parseInt(quantity, 10) : sale.quantity;
  const effectiveQuantity = Math.max(0, quantityNum - refundedQty);
  const profit = sellingPrice && quantity 
    ? (parseFloat(sellingPrice) - sale.purchasePrice) * effectiveQuantity
    : 0;

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg border border-blue-200">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Edit Sale</h3>
      
      <div className="bg-blue-50 p-3 rounded-md mb-3">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Product:</span> {sale.productName}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Original Sale Date:</span> {new Date(sale.date).toLocaleDateString()}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Purchase Price:</span> {CURRENCIES.find(c => c.code === sale.currency)?.symbol || '$'}{sale.purchasePrice.toFixed(2)} {sale.currency}/unit
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Currency:</span> {sale.currency}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="editSaleQuantity" className="block text-sm font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            type="number"
            id="editSaleQuantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter quantity"
            min="1"
            required
          />
        </div>

        <div>
          <label htmlFor="editSalePrice" className="block text-sm font-medium text-gray-700 mb-1">
            Selling Price (per unit)
          </label>
          <input
            type="number"
            id="editSalePrice"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter selling price"
            min="0"
            step="0.01"
            required
          />
          {sellingPrice && quantity && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-600">
                Total Sale: {CURRENCIES.find(c => c.code === sale.currency)?.symbol || '$'}{(parseFloat(sellingPrice || '0') * parseInt(quantity || '0', 10)).toFixed(2)} {sale.currency}
                {refundedQty > 0 && (
                  <span className="text-amber-600 ml-1">
                    ({effectiveQuantity} effective after {refundedQty} refunded)
                  </span>
                )}
              </p>
              <p className={`text-xs font-medium flex items-center gap-1 ${
                profit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {profit >= 0 ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                )}
                Profit: {CURRENCIES.find(c => c.code === sale.currency)?.symbol || '$'}{profit.toFixed(2)} {sale.currency}
                {effectiveQuantity > 0 && (
                  <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ({profit >= 0 ? '+' : ''}{((profit / (sale.purchasePrice * effectiveQuantity)) * 100).toFixed(1)}%)
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Update Sale
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

