import { useState } from 'react';
import { Good } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { marginPercent, roundMoney, wholeQuantity } from '../utils/saleMath';

interface SaleGoodFormProps {
  good: Good;
  onSubmit: (quantity: number, sellingPrice: number) => void;
  onCancel: () => void;
  globalCurrency: string;
}

export default function SaleGoodForm({ good, onSubmit, onCancel, globalCurrency: _globalCurrency }: SaleGoodFormProps) {
  const { canSeeFinancialData } = useAuth();
  const canSeeFinancial = canSeeFinancialData();
  const [quantity, setQuantity] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantityNum = wholeQuantity(quantity);
    const priceNum = Number(sellingPrice);

    if (!quantityNum) {
      alert('Enter a whole number of units.');
      return;
    }

    if (quantityNum > good.remainingQuantity) {
      alert(`Insufficient stock! Only ${good.remainingQuantity} available.`);
      return;
    }

    if (!Number.isFinite(priceNum) || priceNum < 0) {
      alert('Please enter a valid selling price (0 or greater)');
      return;
    }

    onSubmit(quantityNum, roundMoney(priceNum));
  };

  const unitPriceNum = Number(good.unitPrice || 0);
  const units = wholeQuantity(quantity);
  const priceNum = Number(sellingPrice);
  const revenue = units && Number.isFinite(priceNum) ? roundMoney(units * priceNum) : 0;
  const profit = units && Number.isFinite(priceNum) ? roundMoney(units * (priceNum - unitPriceNum)) : 0;
  const profitMargin = marginPercent(profit, revenue);

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg border border-green-200">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Record Sale</h3>
      
      <div className="bg-green-50 p-3 rounded-md mb-3">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Product:</span> {good.name}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">Available:</span> {good.remainingQuantity} units
        </p>
        {canSeeFinancial && (
          <p className="text-sm text-gray-700">
            <span className="font-medium">Unit Price:</span> {formatCurrency(unitPriceNum, good.currency)}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="saleQuantity" className="block text-sm font-medium text-gray-700 mb-1">
            Quantity to Sell
          </label>
          <input
            type="number"
            id="saleQuantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter quantity"
            min="1"
            step="1"
            max={good.remainingQuantity}
            required
          />
        </div>

        <div>
          <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700 mb-1">
            Selling Price (per unit)
          </label>
          <input
            type="number"
            id="salePrice"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter selling price"
            min="0"
            step="0.01"
            required
          />
          {units && Number.isFinite(priceNum) && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-600">
                Total Sale: {formatCurrency(revenue, good.currency)}
              </p>
              {canSeeFinancial && (
              <>
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
                Profit: {formatCurrency(profit, good.currency)}
                <span className={profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ({profitMargin >= 0 ? '+' : ''}{profitMargin.toFixed(1)}% margin)
                </span>
              </p>
              <p className="text-xs text-gray-500">
                Cost: {formatCurrency(roundMoney(unitPriceNum * units), good.currency)}
              </p>
              </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-slate-200">
        <button
          type="submit"
          className="flex-1 btn-success min-w-0 whitespace-nowrap text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Record Sale
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 btn-secondary min-w-0 whitespace-nowrap text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </div>
    </form>
  );
}

