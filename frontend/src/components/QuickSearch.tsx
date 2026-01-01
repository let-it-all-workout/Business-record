import { useState, useEffect, useRef } from 'react';
import { Product, GoodsInventory } from '../types';

interface QuickSearchProps {
  products: Product[];
  inventories: GoodsInventory[];
  onSelectProduct?: (product: Product) => void;
  onSelectInventory?: (inventory: GoodsInventory) => void;
}

export default function QuickSearch({ products, inventories, onSelectProduct, onSelectInventory }: QuickSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<{ products: Product[]; inventories: GoodsInventory[] }>({ products: [], inventories: [] });
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length > 0) {
      const lowerQuery = query.toLowerCase();
      const matchedProducts = products.filter(p => 
        p.name.toLowerCase().includes(lowerQuery) ||
        p.category?.toLowerCase().includes(lowerQuery)
      ).slice(0, 5);
      
      const matchedInventories = inventories.filter(inv =>
        inv.name.toLowerCase().includes(lowerQuery)
      ).slice(0, 3);
      
      setResults({ products: matchedProducts, inventories: matchedInventories });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [query, products, inventories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length > 0 && setIsOpen(true)}
          placeholder="Search products, inventories..."
          className="search-input"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      {isOpen && (results.products.length > 0 || results.inventories.length > 0) && (
        <div className="absolute top-full mt-1 w-full card z-50 max-h-80 overflow-y-auto shadow-lg">
          {results.products.length > 0 && (
            <div className="p-2">
              <h3 className="text-xs font-semibold text-slate-500 mb-2 px-2 uppercase tracking-wider">Products</h3>
              {results.products.map(product => (
                <div
                  key={product.id}
                  onClick={() => {
                    onSelectProduct?.(product);
                    setQuery('');
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 rounded-md hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{product.name}</p>
                      {product.category && (
                        <p className="text-xs text-slate-500">{product.category}</p>
                      )}
                    </div>
                    <span className="badge badge-neutral text-xs">Qty: {product.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {results.inventories.length > 0 && (
            <div className="p-2 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 mb-2 px-2 uppercase tracking-wider">Inventories</h3>
              {results.inventories.map(inventory => (
                <div
                  key={inventory.id}
                  onClick={() => {
                    onSelectInventory?.(inventory);
                    setQuery('');
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 rounded-md hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{inventory.name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(inventory.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="badge badge-neutral text-xs">
                      {inventory.goods.length} items
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
