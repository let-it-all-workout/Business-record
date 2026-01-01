import { useState } from 'react';
import { Sale } from '../types';

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

interface PartialRefundFormProps {
  sale: Sale;
  onSubmit: (quantity: number) => void;
  onCancel: () => void;
  globalCurrency: string;
}

export default function PartialRefundForm({ sale, onSubmit, onCancel, globalCurrency: _globalCurrency }: PartialRefundFormProps) {
  const [refundQuantity, setRefundQuantity] = useState('');
  
  const maxRefundable = sale.quantity - (sale.refundedQuantity || 0);
  const remainingQuantity = sale.quantity - (sale.refundedQuantity || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantityNum = parseInt(refundQuantity, 10);

    if (isNaN(quantityNum) || quantityNum <= 0) {
      alert('Please enter a valid quantity (greater than 0)');
      return;
    }

    if (quantityNum > maxRefundable) {
      alert(`You can only refund up to ${maxRefundable} units. ${sale.refundedQuantity || 0} units have already been refunded.`);
      return;
    }

    onSubmit(quantityNum);
  };

  const refundAmount = refundQuantity 
    ? parseFloat(refundQuantity) * sale.sellingPrice
    : 0;
  const refundProfit = refundQuantity
    ? (sale.sellingPrice - sale.purchasePrice) * parseFloat(refundQuantity)
    : 0;

  const currencySymbol = CURRENCIES.find(c => c.code === sale.currency)?.symbol || '$';
  const totalSaleAmount = sale.quantity * sale.sellingPrice;
  const alreadyRefundedAmount = (sale.refundedQuantity || 0) * sale.sellingPrice;

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg border border-orange-200">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Refund Sale</h3>
      
      <div className="bg-orange-50 p-3 rounded-md mb-3 space-y-2">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Product:</span> {sale.productName}
        </p>
        <div className="border-t border-orange-200 pt-2 mt-2">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Quantity Sold:</span> <span className="font-semibold">{sale.quantity} units</span>
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Selling Price:</span> {currencySymbol}{sale.sellingPrice.toFixed(2)} per unit
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Total Sale Amount:</span> {currencySymbol}{totalSaleAmount.toFixed(2)}
          </p>
        </div>
        <div className="border-t border-orange-200 pt-2 mt-2">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Already Refunded:</span> {sale.refundedQuantity || 0} units ({currencySymbol}{alreadyRefundedAmount.toFixed(2)})
          </p>
          <p className="text-sm font-semibold text-orange-700">
            <span className="font-medium">Available to Refund:</span> {remainingQuantity} units (max: {maxRefundable})
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="refundQuantity" className="block text-sm font-medium text-gray-700 mb-1">
            Quantity to Refund
          </label>
          <input
            type="number"
            id="refundQuantity"
            value={refundQuantity}
            onChange={(e) => setRefundQuantity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder={`Enter quantity (max: ${maxRefundable})`}
            min="1"
            max={maxRefundable}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum refundable: {maxRefundable} units
          </p>
        </div>

        {refundQuantity && parseInt(refundQuantity, 10) > 0 && (
          <div className="bg-gray-50 p-3 rounded-md space-y-2 border border-gray-200">
            <div className="space-y-1">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Refund Amount:</span> <span className="font-semibold text-gray-900">{currencySymbol}{refundAmount.toFixed(2)}</span>
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Remaining Sale Amount:</span> {currencySymbol}{(totalSaleAmount - alreadyRefundedAmount - refundAmount).toFixed(2)}
              </p>
            </div>
            <div className="border-t border-gray-300 pt-2">
              <p className={`text-sm font-medium flex items-center gap-1 ${
                refundProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {refundProfit >= 0 ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                )}
                <span>Profit Impact: {currencySymbol}{Math.abs(refundProfit).toFixed(2)}</span>
                <span className="text-xs text-gray-500 ml-1">({refundProfit >= 0 ? 'reduction' : 'increase'} in profit)</span>
              </p>
            </div>
            {parseInt(refundQuantity, 10) === maxRefundable && (
              <p className="text-xs text-orange-600 font-medium bg-orange-50 p-2 rounded">
                ⚠️ This will fully refund the entire sale
              </p>
            )}
            <p className="text-xs text-gray-500 pt-1 border-t border-gray-200">
              After refund: {sale.quantity - (sale.refundedQuantity || 0) - parseInt(refundQuantity, 10)} units will remain sold
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors text-sm font-medium"
        >
          Refund {refundQuantity || '0'} Units
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

