#!/bin/bash

# PostgreSQL Migration Helper Script
# Usage: ./run-migration.sh "your-postgresql-url"

if [ -z "$1" ]; then
    echo "❌ Error: DATABASE_URL required"
    echo ""
    echo "Usage:"
    echo "  ./run-migration.sh 'postgresql://user:pass@host:port/db'"
    echo ""
    echo "Or set it as environment variable:"
    echo "  export DATABASE_URL='your-url'"
    echo "  node scripts/migrate-sqlite-to-postgres.js"
    exit 1
fi

export DATABASE_URL="$1"
echo "🚀 Starting migration with DATABASE_URL set..."
echo ""
node scripts/migrate-sqlite-to-postgres.js

