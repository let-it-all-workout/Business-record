import { useState } from 'react';
import { Product } from '../types';

interface CategoryManagerProps {
  products: Product[];
  onCategoryChange: (productId: string, category: string) => void;
  onTagChange: (productId: string, tags: string[]) => void;
}

export default function CategoryManager({ products, onCategoryChange, onTagChange }: CategoryManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');

  // Get all unique categories
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  
  // Get all unique tags
  const allTags = new Set<string>();
  products.forEach(p => {
    if (p.tags) {
      p.tags.forEach(tag => allTags.add(tag));
    }
  });

  const handleAddCategory = (productId: string) => {
    if (newCategory.trim()) {
      onCategoryChange(productId, newCategory.trim());
      setNewCategory('');
    }
  };

  const handleAddTag = (productId: string) => {
    if (newTag.trim()) {
      const product = products.find(p => p.id === productId);
      const currentTags = product?.tags || [];
      if (!currentTags.includes(newTag.trim())) {
        onTagChange(productId, [...currentTags, newTag.trim()]);
      }
      setNewTag('');
    }
  };

  const handleRemoveTag = (productId: string, tag: string) => {
    const product = products.find(p => p.id === productId);
    const currentTags = product?.tags || [];
    onTagChange(productId, currentTags.filter(t => t !== tag));
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">Categories & Tags</h2>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          {isOpen ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-6">
          {/* Category Overview */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.length > 0 ? (
                categories.map(cat => {
                  const count = products.filter(p => p.category === cat).length;
                  return (
                    <span
                      key={cat}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {cat} ({count})
                    </span>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">No categories yet</p>
              )}
            </div>
          </div>

          {/* Tags Overview */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {allTags.size > 0 ? (
                Array.from(allTags).map(tag => {
                  const count = products.filter(p => p.tags?.includes(tag)).length;
                  return (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                    >
                      {tag} ({count})
                    </span>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">No tags yet</p>
              )}
            </div>
          </div>

          {/* Product Category/Tag Editor */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Edit Product Categories & Tags</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Product</label>
                <select
                  value={selectedProduct?.id || ''}
                  onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value);
                    setSelectedProduct(product || null);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Enter category name..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddCategory(selectedProduct.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAddCategory(selectedProduct.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Set
                      </button>
                    </div>
                    {selectedProduct.category && (
                      <p className="mt-2 text-sm text-slate-600">
                        Current: <span className="font-medium">{selectedProduct.category}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Enter tag name..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddTag(selectedProduct.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleAddTag(selectedProduct.id)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Add Tag
                      </button>
                    </div>
                    {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedProduct.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2"
                          >
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(selectedProduct.id, tag)}
                              className="text-purple-700 hover:text-purple-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

