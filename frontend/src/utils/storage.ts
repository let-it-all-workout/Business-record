import { Product, Sale, GoodsInventory } from '../types';

const PRODUCTS_STORAGE_KEY = 'business-record-inventory';
const SALES_STORAGE_KEY = 'business-record-sales';
const GOODS_INVENTORY_STORAGE_KEY = 'business-record-goods-inventory';

export const saveProducts = (products: Product[]): void => {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
};

export const loadProducts = (): Product[] => {
  const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const saveSales = (sales: Sale[]): void => {
  localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
};

export const loadSales = (): Sale[] => {
  const stored = localStorage.getItem(SALES_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const saveGoodsInventory = (inventories: GoodsInventory[]): void => {
  localStorage.setItem(GOODS_INVENTORY_STORAGE_KEY, JSON.stringify(inventories));
};

export const loadGoodsInventory = (): GoodsInventory[] => {
  const stored = localStorage.getItem(GOODS_INVENTORY_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

