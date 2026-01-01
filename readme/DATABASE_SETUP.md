# Database Setup Guide

NovaGadget now uses SQLite database for data storage, which can be managed with DBeaver.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the backend server:**
   ```bash
   npm run server
   ```

3. **Start the frontend (in another terminal):**
   ```bash
   npm run dev
   ```

   Or run both together:
   ```bash
   npm run dev:full
   ```

4. **The database file will be created at:**
   ```
   server/database/novagadget.db
   ```

## Connecting with DBeaver

1. **Open DBeaver** and create a new connection

2. **Select SQLite** as the database type

3. **Configure the connection:**
   - **Path:** Navigate to `server/database/novagadget.db`
   - Or use absolute path: `/home/kevin/Desktop/Business-record/backend/database/business-record.db`

4. **Test Connection** and click Finish

5. **You can now:**
   - Browse all tables (products, sales, stock_batches, etc.)
   - Run SQL queries
   - View and edit data
   - Export data to various formats
   - Create backups

## Database Schema

The database includes the following tables:

- **products** - Main product information
- **stock_batches** - Purchase batches for each product
- **stock_history** - Complete stock movement history
- **sales** - All sales records
- **sale_batch_details** - Which batches items were sold from
- **refund_history** - Refund records
- **goods_inventories** - Goods inventory collections
- **goods** - Individual goods in inventories
- **settings** - Application settings (currency, etc.)

See `server/database/schema.sql` for complete schema definition.

## Migrating from localStorage

If you have existing data in localStorage:

1. **Export your data** from the browser console:
   ```javascript
   // Open browser console (F12) and run:
   const products = JSON.parse(localStorage.getItem('novagadget-inventory') || '[]');
   const sales = JSON.parse(localStorage.getItem('novagadget-sales') || '[]');
   const inventory = JSON.parse(localStorage.getItem('novagadget-goods-inventory') || '[]');
   
   // Copy the JSON and save to files:
   // - data/products.json
   // - data/sales.json
   // - data/inventory.json
   ```

2. **Create the data directory:**
   ```bash
   mkdir -p data
   ```

3. **Save the JSON files** in the `data/` directory

4. **Run the migration script:**
   ```bash
   npm run migrate
   ```

## API Endpoints

The backend provides REST API endpoints:

- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/stock` - Add stock

- `GET /api/sales` - Get all sales
- `POST /api/sales` - Create sale
- `PUT /api/sales/:id` - Update sale
- `POST /api/sales/:id/refund` - Process refund

- `GET /api/inventory` - Get all goods inventories
- `POST /api/inventory` - Create inventory
- `PUT /api/inventory/:id` - Update inventory
- `DELETE /api/inventory/:id` - Delete inventory

- `GET /api/settings/:key` - Get setting
- `POST /api/settings/:key` - Set setting

## Environment Variables

Create a `.env` file (optional):
```
VITE_API_URL=http://localhost:3001/api
PORT=3001
```

## Database Backup

To backup your database:

```bash
# Copy the database file
cp server/database/novagadget.db server/database/novagadget.backup.db

# Or use DBeaver's export feature
```

## Troubleshooting

**Database locked error:**
- Make sure only one instance of the server is running
- Close DBeaver connection before starting the server

**Port already in use:**
- Change the PORT in `.env` or server/index.js
- Kill the process using port 3001: `lsof -ti:3001 | xargs kill`

**Migration issues:**
- Ensure JSON files are valid JSON
- Check file paths in migrate.js
- Review server logs for detailed error messages

## Production Deployment

For production:
1. Use PostgreSQL or MySQL instead of SQLite
2. Update database connection in `server/database/db.js`
3. Update schema.sql for your database type
4. Set up proper environment variables
5. Use connection pooling
6. Set up database backups


















