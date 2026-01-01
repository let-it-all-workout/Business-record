import { useState } from 'react';
import { Product } from '../types';

interface SalesFormProps {
  products: Product[];
  onSubmit: (productId: string, quantity: number, sellingPrice: number) => void;
  onCancel: () => void;
}

export default function SalesForm({ products, onSubmit, onCancel }: SalesFormProps) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantityNum = parseInt(quantity, 10);
    const priceNum = parseFloat(sellingPrice);

    if (!selectedProductId) {
      alert('Please select a product');
      return;
    }

    if (isNaN(quantityNum) || quantityNum <= 0) {
      alert('Please enter a valid quantity (greater than 0)');
      return;
    }

    if (selectedProduct && quantityNum > selectedProduct.quantity) {
      alert(`Insufficient stock! Only ${selectedProduct.quantity} available.`);
      return;
    }

    if (isNaN(priceNum) || priceNum < 0) {
      alert('Please enter a valid selling price (0 or greater)');
      return;
    }

    onSubmit(selectedProductId, quantityNum, priceNum);
  };

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
              setSelectedProductId(e.target.value);
              if (selectedProduct) {
                setSellingPrice(selectedProduct.price.toString());
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          >
            <option value="">Select a product</option>
            {products
              .filter(p => p.quantity > 0)
              .map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (Stock: {product.quantity}, Base Price: ${product.price.toFixed(2)})
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
              <span className="font-medium">Base Price:</span> ${selectedProduct.price.toFixed(2)} per unit
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
          {selectedProduct && sellingPrice && (
            <p className="text-xs text-gray-500 mt-1">
              Total: ${(parseFloat(sellingPrice || '0') * parseInt(quantity || '0', 10)).toFixed(2)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors font-medium"
        >
          Record Sale
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

