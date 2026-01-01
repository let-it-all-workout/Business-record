import { useState } from 'react';
import { Product, GoodsInventory } from '../types';
import { parseFormattedNumber } from '../utils/format';

interface BulkProductFormProps {
  inventories?: GoodsInventory[];
  onSubmit: (products: Array<Omit<Product, 'id' | 'stockHistory' | 'batches'> & { stockHistory?: Product['stockHistory']; batches?: Product['batches']; inventoryId?: string }>) => void;
  onCancel: () => void;
  onSuccess?: () => void;
}

export default function BulkProductForm({ inventories = [], onSubmit, onCancel, onSuccess }: BulkProductFormProps) {
  const [productsText, setProductsText] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [category, setCategory] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!productsText.trim()) {
      alert('Please enter product data');
      return;
    }

    // Parse bulk input - support multiple formats:
    // Format 1: CSV-like: Name, Quantity, Price
    // Format 2: One per line: Name | Quantity | Price
    // Format 3: Tab-separated
    const lines = productsText.trim().split('\n').filter(line => line.trim());
    const parsedProducts: Array<Omit<Product, 'id' | 'stockHistory' | 'batches'> & { inventoryId?: string }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Try different separators
      let parts: string[] = [];
      if (trimmed.includes('\t')) {
        parts = trimmed.split('\t');
      } else if (trimmed.includes('|')) {
        parts = trimmed.split('|').map(p => p.trim());
      } else if (trimmed.includes(',')) {
        parts = trimmed.split(',').map(p => p.trim());
      } else {
        // Single product name only
        parts = [trimmed];
      }

      if (parts.length < 1) continue;

      const name = parts[0].trim();
      if (!name) continue;

      const quantity = parts.length > 1 ? parseInt(parts[1].replace(/,/g, ''), 10) : 0;
      const price = parts.length > 2 ? parseFormattedNumber(parts[2]) : 0;

      if (isNaN(quantity) || quantity < 0) {
        alert(`Invalid quantity for "${name}". Skipping.`);
        continue;
      }

      if (isNaN(price) || price < 0) {
        alert(`Invalid price for "${name}". Skipping.`);
        continue;
      }

      parsedProducts.push({
        name,
        category: category.trim() || undefined,
        quantity,
        price,
        inventoryId: selectedInventoryId || undefined,
      });
    }

    if (parsedProducts.length === 0) {
      alert('No valid products found. Please check your input format.');
      return;
    }

    // Require inventory selection for bulk products
    if (!selectedInventoryId) {
      alert('Please select an inventory to add these products to. All products must be added to an inventory.');
      return;
    }

    const confirmMessage = `Are you sure you want to create ${parsedProducts.length} product(s) in the selected inventory?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    onSubmit(parsedProducts);

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
          <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl">
            <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Bulk Add Products
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Add multiple products at once. One product per line.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="bulk-inventory" className="block text-sm font-semibold text-slate-700 mb-2">
            Select Inventory <span className="text-red-500">*</span>
          </label>
          {inventories.length === 0 ? (
            <div className="input-field bg-amber-50 border-amber-200 text-amber-800">
              <p className="text-sm font-medium">
                No inventories available. Please create an inventory first before adding products.
              </p>
            </div>
          ) : (
            <select
              id="bulk-inventory"
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
          )}
          <p className="text-xs text-slate-500 mt-2">
            All products must be added to an inventory. Select which inventory these products belong to.
          </p>
        </div>

        <div>
          <label htmlFor="bulk-category" className="block text-sm font-semibold text-slate-700 mb-2">
            Default Category <span className="text-slate-400 font-normal">(optional, applies to all products)</span>
          </label>
          <input
            type="text"
            id="bulk-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field"
            placeholder="e.g., Electronics, Clothing, Food"
          />
        </div>

        <div>
          <label htmlFor="products-text" className="block text-sm font-semibold text-slate-700 mb-2">
            Product Data
          </label>
          <textarea
            id="products-text"
            value={productsText}
            onChange={(e) => setProductsText(e.target.value)}
            className="input-field min-h-[300px] font-mono text-sm"
            placeholder={`Enter products, one per line. Format options:

Option 1 (CSV): Name, Quantity, Price
Option 2 (Pipe): Name | Quantity | Price
Option 3 (Tab): Name	Quantity	Price

Examples:
iPhone 15, 10, 999.99
Samsung Galaxy, 5, 899.99
Laptop | 3 | 1299.99
Tablet	8	499.99

If quantity or price is missing, defaults to 0.`}
            required
          />
          <p className="text-xs text-slate-500 mt-2">
            <strong>Format:</strong> Name, Quantity, Price (separated by comma, pipe, or tab)
            <br />
            <strong>Example:</strong> Product Name, 10, 99.99
          </p>
        </div>
      </div>

      <div className="mt-8 flex gap-3 pt-6 border-t-2 border-slate-100">
        <button
          type="submit"
          className="btn-primary flex-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add All Products
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

