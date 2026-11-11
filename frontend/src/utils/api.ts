import { Product, Sale, GoodsInventory } from '../types';

// Same-origin `/api` in both Vite (proxied) and production (Express serves the SPA).
// Set VITE_API_URL only if you split the UI onto another host.
const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
const API_BASE_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

// Helper function to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Helper function to get selected business ID (for super admin)
function getSelectedBusinessId(): string | null {
  return localStorage.getItem('selected_business_id');
}

// Helper function for API calls
async function apiCall<T>(endpoint: string, options?: RequestInit, includeBusinessId = true): Promise<T> {
  const token = getAuthToken();
  const businessId = includeBusinessId ? getSelectedBusinessId() : null;
  
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Add businessId query param if super admin has selected a business
  let url = `${API_BASE_URL}${normalizedEndpoint}`;
  if (businessId && includeBusinessId) {
    const separator = normalizedEndpoint.includes('?') ? '&' : '?';
    url = `${url}${separator}businessId=${encodeURIComponent(businessId)}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Products API
export const productsAPI = {
  getAll: async (): Promise<Product[]> => {
    return apiCall<Product[]>('/products');
  },

  getById: async (id: string): Promise<Product> => {
    return apiCall<Product>(`/products/${id}`);
  },

  create: async (product: Omit<Product, 'id' | 'stockHistory' | 'batches'> & { 
    stockHistory?: Product['stockHistory']; 
    batches?: Product['batches'] 
  }): Promise<{ id: string }> => {
    return apiCall<{ id: string }>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  update: async (id: string, product: Partial<Product>): Promise<void> => {
    return apiCall<void>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  },

  delete: async (id: string): Promise<void> => {
    return apiCall<void>(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  addStock: async (
    productId: string,
    quantity: number,
    purchasePrice: number,
    purchaseDate: string,
    batchId?: string
  ): Promise<void> => {
    return apiCall<void>(`/products/${productId}/stock`, {
      method: 'POST',
      body: JSON.stringify({
        quantity,
        purchasePrice,
        purchaseDate,
        batchId,
      }),
    });
  },
};

// Sales API
export const salesAPI = {
  getAll: async (): Promise<Sale[]> => {
    return apiCall<Sale[]>('/sales', undefined, true);
  },

  getById: async (id: string): Promise<Sale> => {
    return apiCall<Sale>(`/sales/${id}`);
  },

  create: async (sale: Omit<Sale, 'id' | 'date'>): Promise<{ id: string }> => {
    return apiCall<{ id: string }>('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
    });
  },

  update: async (id: string, sale: Partial<Sale>): Promise<void> => {
    return apiCall<void>(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sale),
    });
  },

  refund: async (id: string, quantity: number): Promise<{
    message: string;
    refundedQuantity: number;
    isFullyRefunded: boolean;
    stockRestored?: boolean;
    updatedStock?: any;
  }> => {
    return apiCall<{
      message: string;
      refundedQuantity: number;
      isFullyRefunded: boolean;
      stockRestored?: boolean;
      updatedStock?: any;
    }>(`/sales/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    });
  },
};

// Inventory API
export const inventoryAPI = {
  getAll: async (): Promise<GoodsInventory[]> => {
    return apiCall<GoodsInventory[]>('/inventory', undefined, true);
  },

  getById: async (id: string): Promise<GoodsInventory> => {
    return apiCall<GoodsInventory>(`/inventory/${id}`);
  },

  create: async (inventory: Omit<GoodsInventory, 'id' | 'createdAt'>): Promise<{ id: string }> => {
    return apiCall<{ id: string }>('/inventory', {
      method: 'POST',
      body: JSON.stringify(inventory),
    });
  },

  update: async (id: string, inventory: Partial<GoodsInventory>): Promise<void> => {
    return apiCall<void>(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(inventory),
    });
  },

  delete: async (id: string): Promise<void> => {
    return apiCall<void>(`/inventory/${id}`, {
      method: 'DELETE',
    });
  },
};

// Settings API
export const settingsAPI = {
  get: async (key: string): Promise<string | null> => {
    const result = await apiCall<{ value: string | null }>(`/settings/${key}`);
    return result.value;
  },

  set: async (key: string, value: string): Promise<void> => {
    return apiCall<void>(`/settings/${key}`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    });
  },
};

// Legacy localStorage functions (for migration)
export const legacyStorage = {
  loadProducts: (): Product[] => {
    const stored = localStorage.getItem('business-record-inventory');
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  loadSales: (): Sale[] => {
    const stored = localStorage.getItem('business-record-sales');
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  loadGoodsInventory: (): GoodsInventory[] => {
    const stored = localStorage.getItem('business-record-goods-inventory');
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  loadCurrency: (): string => {
    const stored = localStorage.getItem('business-record-currency');
    return stored || 'USD';
  },
};






