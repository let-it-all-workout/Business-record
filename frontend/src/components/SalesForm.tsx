import { useState } from 'react';
import { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { marginPercent, roundMoney, wholeQuantity } from '../utils/saleMath';

interface SalesFormProps {
  products: Product[];
  currency: string;
  onSubmit: (productId: string, quantity: number, sellingPrice: number) => void;
  onCancel: () => void;
}

function fifoPreview(product: Product, units: number) {
  let remaining = units;
  let cost = 0;
  for (const batch of product.batches || []) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, batch.remainingQuantity);
    if (take <= 0) continue;
    cost += take * batch.purchasePrice;
    remaining -= take;
  }
  return {
    cost: roundMoney(cost),
    covered: remaining === 0 && (product.batches || []).length > 0,
  };
}

export default function SalesForm({ products, currency, onSubmit, onCancel }: SalesFormProps) {
  const { canSeeFinancialData } = useAuth();
  const canSeeFinancial = canSeeFinancialData();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const availableProducts = products.filter(p => p.quantity > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantityNum = wholeQuantity(quantity);
    const priceNum = Number(sellingPrice);

    if (!selectedProductId) {
      alert('Please select a product');
      return;
    }

    if (!quantityNum) {
      alert('Enter a whole number of units.');
      return;
    }

    if (selectedProduct && quantityNum > selectedProduct.quantity) {
      alert(`Insufficient stock! Only ${selectedProduct.quantity} available.`);
      return;
    }

    if (!Number.isFinite(priceNum) || priceNum < 0) {
      alert('Please enter a valid selling price (0 or greater)');
      return;
    }

    const preview = selectedProduct ? fifoPreview(selectedProduct, quantityNum) : null;
    if (preview && !preview.covered) {
      alert('Stock batches do not cover this quantity. Add stock before selling.');
      return;
    }

    onSubmit(selectedProductId, quantityNum, roundMoney(priceNum));
  };

  const units = wholeQuantity(quantity);
  const priceNum = Number(sellingPrice);
  const preview = selectedProduct && units ? fifoPreview(selectedProduct, units) : null;
  const revenue = units && Number.isFinite(priceNum) ? roundMoney(units * priceNum) : 0;
  const profit = preview?.covered && units ? roundMoney(revenue - preview.cost) : 0;

  if (availableProducts.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Record Sale</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-yellow-800">No products with available stock to sell.</p>
        </div>
        <button
          onClick={onCancel}
          className="btn-secondary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Record Sale</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1">
            Product
          </label>
          <select
            id="product"
            value={selectedProductId}
            onChange={(e) => {
              const productId = e.target.value;
              setSelectedProductId(productId);
              const product = availableProducts.find((item) => item.id === productId);
              setSellingPrice(product ? String(product.price) : '');
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          >
            <option value="">Select a product</option>
            {availableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (Stock: {product.quantity}, Base Price: {formatCurrency(product.price, currency)})
                </option>
              ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Available Stock:</span> {selectedProduct.quantity} units
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Base Price:</span> {formatCurrency(selectedProduct.price, currency)} per unit
            </p>
          </div>
        )}

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
            Quantity Sold
          </label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter quantity sold"
            min="1"
            step="1"
            max={selectedProduct?.quantity || undefined}
            required
          />
        </div>

        <div>
          <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700 mb-1">
            Selling Price (per unit)
          </label>
          <input
            type="number"
            id="sellingPrice"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter selling price"
            min="0"
            step="0.01"
            required
          />
          {selectedProduct && units && Number.isFinite(priceNum) && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-gray-600">
                Total: {formatCurrency(revenue, currency)}
              </p>
              {preview?.covered && canSeeFinancial ? (
                <p className={`text-xs font-medium ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  Profit: {formatCurrency(profit, currency)} ({marginPercent(profit, revenue).toFixed(1)}% margin)
                </p>
              ) : preview && !preview.covered ? (
                <p className="text-xs text-amber-700">Stock batches do not cover this quantity.</p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 pt-6 border-t-2 border-slate-200">
        <button
          type="submit"
          className="flex-1 btn-success min-w-0 whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Record Sale
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 btn-secondary min-w-0 whitespace-nowrap"
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

