export interface Good {
  id: string;
  name: string;
  quantity: number;
  remainingQuantity: number;
  unitPrice: number; // Price per unit
  currency: string; // Currency code (e.g., 'USD', 'EUR', 'NGN')
}

export interface StockBatch {
  id: string;
  purchaseDate: string;
  quantity: number;
  remainingQuantity: number;
  purchasePrice: number; // Price per unit when purchased
}

export interface StockHistory {
  id: string;
  date: string;
  quantity: number;
  type: 'added' | 'sold';
  batchId?: string; // Reference to which batch was sold from
}

export interface GoodsInventory {
  id: string;
  name: string; // e.g., "Dec 12 2025 products"
  date: string; // Date of this inventory entry
  goods: Good[]; // List of products in this inventory
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category?: string; // Product category
  tags?: string[]; // Product tags for flexible organization
  quantity: number; // Total quantity (sum of all batches)
  price: number; // Base/selling price (can differ from purchase price)
  batches: StockBatch[]; // All purchase batches
  stockHistory: StockHistory[];
  reorderPoint?: number; // Minimum stock level before reordering
  eoq?: number; // Economic Order Quantity
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  totalPurchases: number;
  totalSpent: number;
  lastPurchaseDate?: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  customerId?: string; // Link to customer
  inventoryId?: string; // For goods inventory sales
  goodId?: string; // For goods inventory sales
  quantity: number;
  sellingPrice: number;
  purchasePrice: number; // Purchase price per unit (for profit calculation)
  profit: number; // Total profit made on this sale
  currency: string; // Currency code (e.g., 'USD', 'EUR', 'NGN')
  date: string;
  refunded: boolean; // Whether this sale has been fully refunded
  refundedQuantity: number; // How many units have been refunded
  refundDate?: string; // Date of last refund
  refundHistory?: Array<{ date: string; quantity: number }>; // History of refunds
  batchDetails: Array<{ batchId: string; quantity: number; purchasePrice: number }>; // Which batches items came from
}

// Authentication Types
export type UserRole = 'super_admin' | 'admin' | 'manager' | 'staff' | 'viewer';

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  businessId?: string; // NULL for super_admin
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  permissions?: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  role: UserRole;
  token: string;
  expiresAt: string;
}

// Permission types
export type Permission = 
  | 'products:read'
  | 'products:write'
  | 'products:delete'
  | 'sales:read'
  | 'sales:write'
  | 'sales:refund'
  | 'inventory:read'
  | 'inventory:write'
  | 'customers:read'
  | 'customers:write'
  | 'reports:read'
  | 'reports:export'
  | 'settings:read'
  | 'settings:write'
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'backup:create'
  | 'backup:restore';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    // Super admin has all permissions across all businesses
    'products:read', 'products:write', 'products:delete',
    'sales:read', 'sales:write', 'sales:refund',
    'inventory:read', 'inventory:write',
    'customers:read', 'customers:write',
    'reports:read', 'reports:export',
    'settings:read', 'settings:write',
    'users:read', 'users:write', 'users:delete',
    'backup:create', 'backup:restore',
  ],
  admin: [
    'products:read', 'products:write', 'products:delete',
    'sales:read', 'sales:write', 'sales:refund',
    'inventory:read', 'inventory:write',
    'customers:read', 'customers:write',
    'reports:read', 'reports:export',
    'settings:read', 'settings:write',
    'users:read', 'users:write', 'users:delete',
    'backup:create', 'backup:restore',
  ],
  manager: [
    'products:read', 'products:write',
    'sales:read', 'sales:write', 'sales:refund',
    'inventory:read', 'inventory:write',
    'customers:read', 'customers:write',
    'reports:read', 'reports:export',
    'settings:read',
  ],
  staff: [
    'products:read',
    'sales:read', 'sales:write',
    'inventory:read',
    'customers:read',
  ],
  viewer: [
    'products:read',
    'sales:read',
    'inventory:read',
    'customers:read',
    'reports:read',
  ],
};
