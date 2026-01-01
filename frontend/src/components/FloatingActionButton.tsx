import { useState } from 'react';

interface FloatingActionButtonProps {
  onQuickAdd?: () => void;
  onQuickSale?: () => void;
  onQuickInventory?: () => void;
}

export default function FloatingActionButton({ onQuickAdd, onQuickSale, onQuickInventory }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 space-y-2 mb-2">
          {onQuickAdd && (
            <button
              onClick={() => {
                onQuickAdd();
                setIsOpen(false);
              }}
              className="btn-primary w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
              title="Add Product"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          {onQuickSale && (
            <button
              onClick={() => {
                onQuickSale();
                setIsOpen(false);
              }}
              className="btn-success w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
              title="Record Sale"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          )}
          {onQuickInventory && (
            <button
              onClick={() => {
                onQuickInventory();
                setIsOpen(false);
              }}
              className="btn-primary w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
              title="Create Inventory"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </button>
          )}
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-primary w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
        title={isOpen ? 'Close menu' : 'Quick actions'}
      >
        <svg 
          className={`w-6 h-6 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
