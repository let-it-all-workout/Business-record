#!/bin/bash

# PostgreSQL Migration Script Runner
# This script helps you set DATABASE_URL and run the migration

echo "🚀 PostgreSQL Migration Script"
echo "================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL environment variable is not set."
    echo ""
    echo "To get your PostgreSQL URL from Railway:"
    echo "1. Go to Railway Dashboard → Your PostgreSQL service"
    echo "2. Go to Variables tab"
    echo "3. Copy the DATABASE_URL value"
    echo ""
    echo "Then run:"
    echo "  export DATABASE_URL='your-postgresql-url-here'"
    echo "  node scripts/migrate-sqlite-to-postgres.js"
    echo ""
    echo "Or set it inline:"
    echo "  DATABASE_URL='your-url' node scripts/migrate-sqlite-to-postgres.js"
    echo ""
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""
echo "Starting migration from SQLite to PostgreSQL..."
echo "This will transfer:"
echo "  - 2 users"
echo "  - 1 business"
echo "  - All products, sales, and inventory data"
echo ""

# Run the migration
node scripts/migrate-sqlite-to-postgres.js

