import { useState } from 'react';
import { GoodsInventory } from '../types';

interface BulkInventoryFormProps {
  onSubmit: (inventories: Array<Omit<GoodsInventory, 'id' | 'createdAt'>>) => void;
  onCancel: () => void;
  onSuccess?: () => void;
}

export default function BulkInventoryForm({ onSubmit, onCancel, onSuccess }: BulkInventoryFormProps) {
  const [inventoriesText, setInventoriesText] = useState('');

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

    if (!inventoriesText.trim()) {
      alert('Please enter inventory data');
      return;
    }

    // Parse bulk input - support multiple formats:
    // Format 1: Date only (one per line)
    // Format 2: Date, Name (comma or pipe separated)
    const lines = inventoriesText.trim().split('\n').filter(line => line.trim());
    const parsedInventories: Array<Omit<GoodsInventory, 'id' | 'createdAt'>> = [];

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
        // Single date only
        parts = [trimmed];
      }

      if (parts.length < 1) continue;

      const dateStr = parts[0].trim();
      if (!dateStr) continue;

      // Validate date
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        alert(`Invalid date: "${dateStr}". Skipping.`);
        continue;
      }

      const formattedDate = date.toISOString().split('T')[0];
      const name = parts.length > 1 ? parts[1].trim() : formatInventoryName(formattedDate);

      parsedInventories.push({
        name,
        date: formattedDate,
        goods: [],
      });
    }

    if (parsedInventories.length === 0) {
      alert('No valid inventories found. Please check your input format.');
      return;
    }

    const confirmMessage = `Are you sure you want to create ${parsedInventories.length} inventory/inventories?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    onSubmit(parsedInventories);

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
              Bulk Create Inventories
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Create multiple inventories at once. One inventory per line.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="inventories-text" className="block text-sm font-semibold text-slate-700 mb-2">
            Inventory Data
          </label>
          <textarea
            id="inventories-text"
            value={inventoriesText}
            onChange={(e) => setInventoriesText(e.target.value)}
            className="input-field min-h-[300px] font-mono text-sm"
            placeholder={`Enter inventories, one per line. Format options:

Option 1: Date only (name auto-generated)
Option 2: Date, Name (comma or pipe separated)

Examples:
2025-12-15
2025-12-16
2025-12-17, December 16 Inventory
2025-12-18 | Custom Inventory Name

Date format: YYYY-MM-DD`}
            required
          />
          <p className="text-xs text-slate-500 mt-2">
            <strong>Format:</strong> Date, Name (separated by comma or pipe)
            <br />
            <strong>Example:</strong> 2025-12-15, December 15 Inventory
            <br />
            <strong>Or:</strong> Just date (2025-12-15) and name will be auto-generated
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
          Create All Inventories
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

