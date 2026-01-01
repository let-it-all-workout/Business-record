import { Product, Sale, GoodsInventory } from '../types';
import { productsAPI, salesAPI, inventoryAPI, settingsAPI } from './api';

// Get API base URL (same logic as api.ts)
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : '/api');

// Helper function to check API availability and throw meaningful errors
const ensureAPI = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error('API server is not responding. Please check your backend connection.');
    }
  } catch (error) {
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
      const apiUrl = API_BASE_URL || 'backend server';
      throw new Error(`Cannot connect to API server at ${apiUrl}. Please check your VITE_API_URL environment variable and ensure the backend is running.`);
    }
    throw error;
  }
};

export const dataService = {
  // Products
  async getProducts(): Promise<Product[]> {
    await ensureAPI();
    try {
      return await productsAPI.getAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch products from database';
      throw new Error(`Database Error: ${message}. Please check that the SQLite database is accessible.`);
    }
  },

  async createProduct(product: Omit<Product, 'id' | 'stockHistory' | 'batches'> & { 
    stockHistory?: Product['stockHistory']; 
    batches?: Product['batches'] 
  }): Promise<string> {
    await ensureAPI();
    try {
      const result = await productsAPI.create(product);
      return result.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create product';
      throw new Error(`Database Error: ${message}. Product was not saved to database.`);
    }
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    await ensureAPI();
    try {
      await productsAPI.update(id, product);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update product';
      throw new Error(`Database Error: ${message}. Changes were not saved to database.`);
    }
  },

  async deleteProduct(id: string): Promise<void> {
    await ensureAPI();
    try {
      await productsAPI.delete(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete product';
      throw new Error(`Database Error: ${message}. Product was not deleted from database.`);
    }
  },

  async addStock(productId: string, quantity: number, purchasePrice: number, purchaseDate: string, batchId?: string): Promise<void> {
    await ensureAPI();
    try {
      await productsAPI.addStock(productId, quantity, purchasePrice, purchaseDate, batchId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add stock';
      throw new Error(`Database Error: ${message}. Stock was not saved to database.`);
    }
  },

  // Sales
  async getSales(): Promise<Sale[]> {
    await ensureAPI();
    try {
      return await salesAPI.getAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch sales from database';
      throw new Error(`Database Error: ${message}. Please check that the SQLite database is accessible.`);
    }
  },

  async createSale(sale: Omit<Sale, 'id' | 'date'>): Promise<string> {
    await ensureAPI();
    try {
      const result = await salesAPI.create(sale);
      return result.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create sale';
      throw new Error(`Database Error: ${message}. Sale was not saved to database.`);
    }
  },

  async updateSale(id: string, sale: Partial<Sale>): Promise<void> {
    await ensureAPI();
    try {
      await salesAPI.update(id, sale);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update sale';
      throw new Error(`Database Error: ${message}. Changes were not saved to database.`);
    }
  },

  async refundSale(id: string, quantity: number): Promise<{
    message: string;
    refundedQuantity: number;
    isFullyRefunded: boolean;
    stockRestored?: boolean;
    updatedStock?: any;
  }> {
    await ensureAPI();
    try {
      return await salesAPI.refund(id, quantity);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process refund';
      throw new Error(`Database Error: ${message}. Refund was not saved to database.`);
    }
  },

  // Inventory
  async getInventories(): Promise<GoodsInventory[]> {
    await ensureAPI();
    try {
      return await inventoryAPI.getAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch inventories from database';
      throw new Error(`Database Error: ${message}. Please check that the SQLite database is accessible.`);
    }
  },

  async createInventory(inventory: Omit<GoodsInventory, 'id' | 'createdAt'>): Promise<string> {
    await ensureAPI();
    try {
      const result = await inventoryAPI.create(inventory);
      return result.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create inventory';
      throw new Error(`Database Error: ${message}. Inventory was not saved to database.`);
    }
  },

  async updateInventory(id: string, inventory: Partial<GoodsInventory>): Promise<void> {
    await ensureAPI();
    try {
      await inventoryAPI.update(id, inventory);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update inventory';
      throw new Error(`Database Error: ${message}. Changes were not saved to database.`);
    }
  },

  async deleteInventory(id: string): Promise<void> {
    await ensureAPI();
    try {
      await inventoryAPI.delete(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete inventory';
      throw new Error(`Database Error: ${message}. Inventory was not deleted from database.`);
    }
  },

  // Settings
  async getCurrency(): Promise<string> {
    await ensureAPI();
    try {
      const currency = await settingsAPI.get('currency');
      return currency || 'USD';
    } catch (error) {
      // For currency, fallback to USD if API fails (non-critical)
      console.warn('Failed to load currency from database, using USD as default:', error);
      return 'USD';
    }
  },

  async setCurrency(currency: string): Promise<void> {
    await ensureAPI();
    try {
      await settingsAPI.set('currency', currency);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save currency';
      throw new Error(`Database Error: ${message}. Currency setting was not saved to database.`);
    }
  },
};
