import { useState, useEffect } from 'react';
import { GoodsInventory } from '../types';

interface GoodsInventoryFormProps {
  inventory?: GoodsInventory | null;
  onSubmit: (inventory: Omit<GoodsInventory, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  onSuccess?: () => void;
}

export default function GoodsInventoryForm({ inventory, onSubmit, onCancel, onSuccess }: GoodsInventoryFormProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (inventory) {
      setName(inventory.name);
      setDate(inventory.date);
    } else {
      // Auto-generate name based on date
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setName(formatInventoryName(today));
    }
  }, [inventory]);

  // Update name when date changes (if not editing existing)
  useEffect(() => {
    if (!inventory) {
      setName(formatInventoryName(date));
    }
  }, [date, inventory]);

  function formatInventoryName(dateString: string): string {
    const date = new Date(dateString);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day} ${year} products`;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Show confirmation
    const confirmMessage = inventory
      ? `Are you sure you want to update "${inventory.name}"?`
      : 'Are you sure you want to create this inventory?';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    if (!name.trim()) {
      alert('Please enter an inventory name');
      return;
    }

    if (!date) {
      alert('Please select a date');
      return;
    }

    onSubmit({
      name: name.trim(),
      date,
      goods: inventory?.goods || [],
    });
    
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
          <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl">
            <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {inventory ? 'Edit Inventory' : 'Create New Inventory'}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {inventory ? 'Update inventory details' : 'Create a new inventory section'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-5">
        <div>
          <label htmlFor="date" className="block text-sm font-semibold text-slate-700 mb-2">
            Inventory Date
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field"
            required
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
            Inventory Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="e.g., Dec 12 2025 products"
            required
          />
          {!inventory && (
            <p className="text-xs text-slate-500 mt-2">
              Name will auto-generate based on date, but you can customize it
            </p>
          )}
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
          {inventory ? 'Update Inventory' : 'Create Inventory'}
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
