import { Product, Sale, GoodsInventory } from '../types';
import { productsAPI, salesAPI, inventoryAPI, settingsAPI } from './api';

export const dataService = {
  // Products
  async getProducts(): Promise<Product[]> {
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
    try {
      const result = await productsAPI.create(product);
      return result.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create product';
      throw new Error(`Database Error: ${message}. Product was not saved to database.`);
    }
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<void> {
    try {
      await productsAPI.update(id, product);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update product';
      throw new Error(`Database Error: ${message}. Changes were not saved to database.`);
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      await productsAPI.delete(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete product';
      throw new Error(`Database Error: ${message}. Product was not deleted from database.`);
    }
  },

  async addStock(productId: string, quantity: number, purchasePrice: number, purchaseDate: string, batchId?: string): Promise<void> {
    try {
      await productsAPI.addStock(productId, quantity, purchasePrice, purchaseDate, batchId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add stock';
      throw new Error(`Database Error: ${message}. Stock was not saved to database.`);
    }
  },

  // Sales
  async getSales(): Promise<Sale[]> {
    try {
      return await salesAPI.getAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch sales from database';
      throw new Error(`Database Error: ${message}. Please check that the SQLite database is accessible.`);
    }
  },

  async createSale(sale: Omit<Sale, 'id' | 'date'>): Promise<string> {
    try {
      const result = await salesAPI.create(sale);
      return result.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create sale';
      throw new Error(`Database Error: ${message}. Sale was not saved to database.`);
    }
  },

  async updateSale(id: string, sale: Partial<Sale>): Promise<void> {
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
    try {
      return await salesAPI.refund(id, quantity);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process refund';
      throw new Error(`Database Error: ${message}. Refund was not saved to database.`);
    }
  },

  // Inventory
  async getInventories(): Promise<GoodsInventory[]> {
    try {
      return await inventoryAPI.getAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch inventories from database';
      throw new Error(`Database Error: ${message}. Please check that the SQLite database is accessible.`);
    }
  },

  async createInventory(inventory: Omit<GoodsInventory, 'id' | 'createdAt'>): Promise<string> {
    try {
      const result = await inventoryAPI.create(inventory);
      return result.id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create inventory';
      throw new Error(`Database Error: ${message}. Inventory was not saved to database.`);
    }
  },

  async updateInventory(id: string, inventory: Partial<GoodsInventory>): Promise<void> {
    try {
      await inventoryAPI.update(id, inventory);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update inventory';
      throw new Error(`Database Error: ${message}. Changes were not saved to database.`);
    }
  },

  async deleteInventory(id: string): Promise<void> {
    try {
      await inventoryAPI.delete(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete inventory';
      throw new Error(`Database Error: ${message}. Inventory was not deleted from database.`);
    }
  },

  // Settings
  async getCurrency(): Promise<string> {
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
    try {
      await settingsAPI.set('currency', currency);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save currency';
      throw new Error(`Database Error: ${message}. Currency setting was not saved to database.`);
    }
  },
};
