import { useState, useEffect } from 'react';
import { Product } from '../types';

interface AddStockFormProps {
  products: Product[];
  onSubmit: (productId: string, quantity: number, purchasePrice: number, purchaseDate: string, batchId?: string) => void;
  onCancel: () => void;
}

export default function AddStockForm({ products, onSubmit, onCancel }: AddStockFormProps) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addToExisting, setAddToExisting] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const existingBatches = selectedProduct?.batches || [];

  // When product changes, reset form
  useEffect(() => {
    if (selectedProductId) {
      setAddToExisting(false);
      setSelectedBatchId('');
      setQuantity('');
      setPurchasePrice('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
    }
  }, [selectedProductId]);

  // When selecting to add to existing batch, auto-fill price and date
  useEffect(() => {
    if (addToExisting && selectedBatchId) {
      const batch = existingBatches.find(b => b.id === selectedBatchId);
      if (batch) {
        setPurchasePrice(batch.purchasePrice.toString());
        setPurchaseDate(batch.purchaseDate);
      }
    }
  }, [addToExisting, selectedBatchId, existingBatches]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quantityNum = parseInt(quantity, 10);
    const purchasePriceNum = parseFloat(purchasePrice);

    if (!selectedProductId) {
      alert('Please select a product');
      return;
    }

    if (isNaN(quantityNum) || quantityNum <= 0) {
      alert('Please enter a valid quantity (greater than 0)');
      return;
    }

    if (isNaN(purchasePriceNum) || purchasePriceNum < 0) {
      alert('Please enter a valid purchase price (0 or greater)');
      return;
    }

    if (!addToExisting && !purchaseDate) {
      alert('Please select a purchase date');
      return;
    }

    if (addToExisting && !selectedBatchId) {
      alert('Please select a batch to add to');
      return;
    }

    // If adding to existing batch, pass batchId. Otherwise, undefined for new batch
    onSubmit(selectedProductId, quantityNum, purchasePriceNum, purchaseDate, addToExisting ? selectedBatchId : undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Add Stock</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1">
            Product
          </label>
          <select
            id="product"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} (Current Stock: {product.quantity})
              </option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className="bg-purple-50 p-3 rounded-md">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Current Total Stock:</span> {selectedProduct.quantity} units
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">After adding:</span> {selectedProduct.quantity + parseInt(quantity || '0', 10)} units
            </p>
          </div>
        )}

        {existingBatches.length > 0 && (
          <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={addToExisting}
                onChange={(e) => {
                  setAddToExisting(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedBatchId('');
                  }
                }}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Add to existing batch
              </span>
            </label>
            
            {addToExisting && (
              <div className="mt-3">
                <label htmlFor="batchSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Batch
                </label>
                <select
                  id="batchSelect"
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required={addToExisting}
                >
                  <option value="">Select a batch</option>
                  {existingBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {new Date(batch.purchaseDate).toLocaleDateString()} - 
                      ${batch.purchasePrice.toFixed(2)}/unit - 
                      {batch.remainingQuantity}/{batch.quantity} remaining
                    </option>
                  ))}
                </select>
                {selectedBatchId && (
                  <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded">
                    <p>Selected batch: {new Date(existingBatches.find(b => b.id === selectedBatchId)?.purchaseDate || '').toLocaleDateString()}</p>
                    <p>Current remaining: {existingBatches.find(b => b.id === selectedBatchId)?.remainingQuantity} units</p>
                    <p>After adding: {(existingBatches.find(b => b.id === selectedBatchId)?.remainingQuantity || 0) + parseInt(quantity || '0', 10)} units</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!addToExisting && (
          <div>
            <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              id="purchaseDate"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required={!addToExisting}
              disabled={addToExisting}
            />
          </div>
        )}

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
            Quantity Purchased
          </label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter quantity purchased"
            min="1"
            required
          />
        </div>

        <div>
          <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Price (per unit)
          </label>
          <input
            type="number"
            id="purchasePrice"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter purchase price per unit"
            min="0"
            step="0.01"
            required
            disabled={addToExisting && selectedBatchId ? true : false}
          />
          {addToExisting && selectedBatchId && (
            <p className="text-xs text-blue-600 mt-1">
              Using purchase price from selected batch
            </p>
          )}
          {purchasePrice && quantity && (
            <p className="text-xs text-gray-500 mt-1">
              Total Purchase Cost: ${(parseFloat(purchasePrice || '0') * parseInt(quantity || '0', 10)).toFixed(2)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors font-medium"
        >
          Add Stock
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

