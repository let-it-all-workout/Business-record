import { useState } from 'react';
import { Good } from '../types';
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
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'RWF', symbol: 'RF', name: 'Rwandan Franc' },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr' },
  { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc' },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso' },
  { code: 'COP', symbol: '$', name: 'Colombian Peso' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
  { code: 'NPR', symbol: 'Rs', name: 'Nepalese Rupee' },
];

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
    const quantityNum = parseInt(quantity, 10);
    const priceNum = parseFloat(sellingPrice);

    if (isNaN(quantityNum) || quantityNum <= 0) {
      alert('Please enter a valid quantity (greater than 0)');
      return;
    }

    if (quantityNum > good.remainingQuantity) {
      alert(`Insufficient stock! Only ${good.remainingQuantity} available.`);
      return;
    }

    if (isNaN(priceNum) || priceNum < 0) {
      alert('Please enter a valid selling price (0 or greater)');
      return;
    }

    onSubmit(quantityNum, priceNum);
  };

  const profit = sellingPrice && quantity 
    ? (parseFloat(sellingPrice) - good.unitPrice) * parseInt(quantity, 10)
    : 0;
  const profitMargin = sellingPrice && good.unitPrice > 0
    ? ((parseFloat(sellingPrice) - good.unitPrice) / good.unitPrice) * 100
    : 0;

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
        <p className="text-sm text-gray-700">
          <span className="font-medium">Unit Price:</span> {CURRENCIES.find(c => c.code === good.currency)?.symbol || '$'}{good.unitPrice.toFixed(2)} {good.currency}
        </p>
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
          {sellingPrice && quantity && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-600">
                Total Sale: {CURRENCIES.find(c => c.code === good.currency)?.symbol || '$'}{(parseFloat(sellingPrice || '0') * parseInt(quantity || '0', 10)).toFixed(2)} {good.currency}
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
                Profit: {CURRENCIES.find(c => c.code === good.currency)?.symbol || '$'}{profit.toFixed(2)} {good.currency} 
                <span className={profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ({profitMargin >= 0 ? '+' : ''}{profitMargin.toFixed(1)}%)
                </span>
              </p>
              <p className="text-xs text-gray-500">
                Cost: {CURRENCIES.find(c => c.code === good.currency)?.symbol || '$'}{(good.unitPrice * parseInt(quantity || '0', 10)).toFixed(2)} {good.currency}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
        >
          Record Sale
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

