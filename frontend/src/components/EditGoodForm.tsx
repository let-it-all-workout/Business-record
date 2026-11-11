import { useState, useEffect } from 'react';
import { Good } from '../types';
import { formatCurrency } from '../utils/format';
import { roundMoney, wholeQuantity } from '../utils/saleMath';

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

interface EditGoodFormProps {
  good: Good;
  onSubmit: (good: Good) => void;
  onCancel: () => void;
  globalCurrency: string;
}

export default function EditGoodForm({ good, onSubmit, onCancel, globalCurrency: _globalCurrency }: EditGoodFormProps) {
  const [name, setName] = useState(good.name);
  const [quantity, setQuantity] = useState(good.quantity.toString());
  const [remainingQuantity, setRemainingQuantity] = useState(good.remainingQuantity.toString());
  const [unitPrice, setUnitPrice] = useState(good.unitPrice.toString());
  const [currency, setCurrency] = useState(good.currency || 'USD');

  useEffect(() => {
    setName(good.name);
    setQuantity(good.quantity.toString());
    setRemainingQuantity(good.remainingQuantity.toString());
    setUnitPrice(good.unitPrice.toString());
    setCurrency(good.currency || 'USD');
  }, [good]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantityNum = wholeQuantity(quantity);
    const remainingNum = wholeQuantity(remainingQuantity, 0);
    const priceNum = Number(unitPrice);

    if (!name.trim()) {
      alert('Please enter a product name');
      return;
    }

    if (!quantityNum) {
      alert('Enter a whole number of units.');
      return;
    }

    if (remainingNum === null || remainingNum > quantityNum) {
      alert(`Enter a whole remaining quantity from 0 to ${quantityNum}.`);
      return;
    }

    if (!Number.isFinite(priceNum) || priceNum < 0) {
      alert('Please enter a valid unit price (0 or greater)');
      return;
    }

    // Ensure remaining quantity doesn't exceed total quantity
    const finalRemaining = Math.min(remainingNum, quantityNum);
    
    onSubmit({
      ...good,
      name: name.trim(),
      quantity: quantityNum,
      remainingQuantity: finalRemaining, // Balance: ensure remaining <= total
      unitPrice: roundMoney(priceNum),
      currency,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg border border-blue-200">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">Edit Product</h3>
      
      <div className="space-y-3">
        <div>
          <label htmlFor="editName" className="block text-sm font-medium text-gray-700 mb-1">
            Product Name
          </label>
          <input
            type="text"
            id="editName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter product name"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="editQuantity" className="block text-sm font-medium text-gray-700 mb-1">
              Total Quantity
            </label>
            <input
              type="number"
              id="editQuantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Qty"
              min="1"
              required
            />
          </div>

          <div>
            <label htmlFor="editRemaining" className="block text-sm font-medium text-gray-700 mb-1">
              Remaining Quantity
            </label>
            <input
              type="number"
              id="editRemaining"
              value={remainingQuantity}
              onChange={(e) => setRemainingQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Remaining"
              min="0"
              max={quantity}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label htmlFor="editUnitPrice" className="block text-sm font-medium text-gray-700 mb-1">
              Unit Price
            </label>
            <input
              type="number"
              id="editUnitPrice"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Price"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <label htmlFor="editCurrency" className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              id="editCurrency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CURRENCIES.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} - {curr.name} ({curr.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {wholeQuantity(remainingQuantity, 0) !== null && Number.isFinite(Number(unitPrice)) && (
          <p className="text-xs text-gray-500">
            Total Value: {formatCurrency(roundMoney((wholeQuantity(remainingQuantity, 0) || 0) * Number(unitPrice)), currency)}
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Update Product
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

