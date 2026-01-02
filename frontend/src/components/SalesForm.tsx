import { useState } from 'react';
import { Product } from '../types';

interface SalesFormProps {
  products: Product[];
  onSubmit: (productId: string, quantity: number, sellingPrice: number) => void;
  onCancel: () => void;
}

export default function SalesForm({ products, onSubmit, onCancel }: SalesFormProps) {
  // #region agent log
  console.log('[DEBUG] SalesForm component mounted:', {productsCount:products.length,products:products.map(p=>({id:p.id,name:p.name,quantity:p.quantity}))});
  fetch('http://127.0.0.1:7243/ingest/f872cd0a-6ab4-4d06-95aa-1c2786551c1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SalesForm.tsx:10',message:'SalesForm mounted',data:{productsCount:products.length,products:products.map(p=>({id:p.id,name:p.name,quantity:p.quantity}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const availableProducts = products.filter(p => p.quantity > 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // #region agent log
    const submitData = {selectedProductId,quantity,sellingPrice,hasSelectedProduct:!!selectedProduct};
    console.log('[DEBUG] SalesForm handleSubmit called:', submitData);
    fetch('http://127.0.0.1:7243/ingest/f872cd0a-6ab4-4d06-95aa-1c2786551c1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SalesForm.tsx:18',message:'SalesForm handleSubmit called',data:submitData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    const onSubmitData = {productId:selectedProductId,quantity:quantityNum,price:priceNum};
    console.log('[DEBUG] SalesForm calling onSubmit:', onSubmitData);
    fetch('http://127.0.0.1:7243/ingest/f872cd0a-6ab4-4d06-95aa-1c2786551c1b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SalesForm.tsx:43',message:'SalesForm calling onSubmit',data:onSubmitData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    onSubmit(selectedProductId, quantityNum, priceNum);
  };

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
              setSelectedProductId(e.target.value);
              if (selectedProduct) {
                setSellingPrice(selectedProduct.price.toString());
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          >
            <option value="">Select a product</option>
            {availableProducts.map((product) => (
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

