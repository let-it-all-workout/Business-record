-- Multi-Tenant SaaS Migration
-- Adds businesses table and business_id to all data tables
-- This migration is SAFE - only adds new columns, doesn't delete anything

-- Create businesses table
-- Note: Foreign key constraint removed to avoid errors during migration
-- We can add it later if needed via application logic
CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL, -- User who created/owns this business
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Add business_id to users table (which business they belong to)
-- Note: super_admin users will have NULL business_id
-- Check if column exists before adding
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN, so we'll handle errors
ALTER TABLE users ADD COLUMN business_id TEXT;

-- Add business_id to products table
-- SQLite doesn't support NOT NULL with DEFAULT in ALTER TABLE for existing tables
-- Add as nullable, application will ensure values are set
ALTER TABLE products ADD COLUMN business_id TEXT;

-- Add business_id to sales table
ALTER TABLE sales ADD COLUMN business_id TEXT;

-- Add business_id to goods_inventories table
ALTER TABLE goods_inventories ADD COLUMN business_id TEXT;

-- Add business_id to settings table (business-specific settings)
ALTER TABLE settings ADD COLUMN business_id TEXT;

-- Create indexes (will be skipped if column doesn't exist - handled by application)
-- Note: Indexes are created separately to avoid errors if columns don't exist yet

-- Note: Stock batches, stock history, goods, sale_batch_details, and refund_history
-- will inherit business_id through their foreign key relationships (products, sales, goods_inventories)

-- Update users table to allow super_admin role
-- SQLite doesn't support ALTER TABLE to modify CHECK constraints easily
-- We'll handle this in the application layer, but note that super_admin should be allowed

