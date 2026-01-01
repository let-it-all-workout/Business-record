import { useState, useEffect } from 'react';
import { Product, GoodsInventory } from '../types';
import { formatNumber, parseFormattedNumber } from '../utils/format';

interface ProductFormProps {
  product?: Product | null;
  inventories?: GoodsInventory[];
  onSubmit: (product: Omit<Product, 'id' | 'stockHistory' | 'batches'> & { stockHistory?: Product['stockHistory']; batches?: Product['batches']; inventoryId?: string }) => void;
  onCancel: () => void;
  onSuccess?: () => void;
}

export default function ProductForm({ product, inventories = [], onSubmit, onCancel, onSuccess }: ProductFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategory(product.category || '');
      setQuantity(formatNumber(product.quantity));
      setPrice(formatNumber(product.price));
    } else {
      setName('');
      setCategory('');
      setQuantity('');
      setPrice('');
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show confirmation
    // const _action = product ? 'update' : 'create';
    const confirmMessage = product 
      ? `Are you sure you want to update "${product.name}"?`
      : 'Are you sure you want to create this product?';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    const quantityNum = parseInt(quantity.replace(/,/g, ''), 10);
    const priceNum = parseFormattedNumber(price);

    if (!name.trim()) {
      alert('Please enter a product name');
      return;
    }

    if (isNaN(quantityNum) || quantityNum < 0) {
      alert('Please enter a valid quantity (0 or greater)');
      return;
    }

    if (isNaN(priceNum) || priceNum < 0) {
      alert('Please enter a valid price (0 or greater)');
      return;
    }

    // Require inventory selection when creating a new product
    if (!product && !selectedInventoryId) {
      alert('Please select an inventory to add this product to. All products must be added to an inventory.');
      return;
    }

    const productData: Omit<Product, 'id' | 'stockHistory' | 'batches'> & { stockHistory?: Product['stockHistory']; batches?: Product['batches']; inventoryId?: string } = {
      name: name.trim(),
      category: category.trim() || undefined,
      quantity: quantityNum,
      price: priceNum,
      inventoryId: selectedInventoryId || undefined,
    };
    
    // Preserve batches and stockHistory when editing
    if (product) {
      if (product.stockHistory) {
        productData.stockHistory = product.stockHistory;
      }
      if (product.batches) {
        productData.batches = product.batches;
      }
    }
    
    onSubmit(productData);
    
    // Show success and close
    if (onSuccess) {
      setTimeout(() => {
        onSuccess();
      }, 100);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-elevated p-8 animate-scale-in">
      <div className="mb-8 pb-6 border-b-2 border-slate-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl">
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {product ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {product ? 'Update product information' : 'Create a new product entry'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
            Product Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Enter product name"
            required
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-2">
            Category <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field"
            placeholder="e.g., Electronics, Clothing, Food"
          />
        </div>

        {!product && (
          <div>
            <label htmlFor="inventory" className="block text-sm font-semibold text-slate-700 mb-2">
              Select Inventory <span className="text-red-500">*</span>
            </label>
            {inventories.length === 0 ? (
              <div className="input-field bg-amber-50 border-amber-200 text-amber-800">
                <p className="text-sm font-medium">
                  No inventories available. Please create an inventory first before adding products.
                </p>
              </div>
            ) : (
              <>
                <select
                  id="inventory"
                  value={selectedInventoryId}
                  onChange={(e) => setSelectedInventoryId(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">-- Select an Inventory (Required) --</option>
                  {inventories.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} ({new Date(inv.date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  All products must be added to an inventory. Select which inventory this product belongs to.
                </p>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="quantity" className="block text-sm font-semibold text-slate-700 mb-2">
              Quantity in Stock
            </label>
            <input
              type="text"
              id="quantity"
              value={quantity}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9,]/g, '');
                setQuantity(value);
              }}
              onBlur={(e) => {
                const num = parseFormattedNumber(e.target.value);
                if (!isNaN(num) && num >= 0) {
                  setQuantity(formatNumber(num));
                }
              }}
              className="input-field"
              placeholder="0"
              required
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-semibold text-slate-700 mb-2">
              Price (per unit)
            </label>
            <input
              type="text"
              id="price"
              value={price}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9,.]/g, '');
                setPrice(value);
              }}
              onBlur={(e) => {
                const num = parseFormattedNumber(e.target.value);
                if (!isNaN(num) && num >= 0) {
                  setPrice(formatNumber(num));
                }
              }}
              className="input-field"
              placeholder="0.00"
              required
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-3 pt-6 border-t-2 border-slate-100">
        <button
          type="submit"
          className="btn-primary flex-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {product ? 'Update Product' : 'Add Product'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary flex-1"
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
