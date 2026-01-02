# 🚀 How to Run the PostgreSQL Migration

## Quick Steps

### Step 1: Get Your PostgreSQL URL from Railway

1. Go to **Railway Dashboard** → Your **PostgreSQL service**
2. Click **Variables** tab
3. Copy the `DATABASE_URL` value (the entire connection string)

### Step 2: Set DATABASE_URL and Run Migration

**Option A: Set and run in one command**
```bash
cd backend
DATABASE_URL="your-postgresql-url-here" node scripts/migrate-sqlite-to-postgres.js
```

**Option B: Export first, then run**
```bash
cd backend
export DATABASE_URL="your-postgresql-url-here"
node scripts/migrate-sqlite-to-postgres.js
```

**Option C: Use the helper script**
```bash
cd backend
export DATABASE_URL="your-postgresql-url-here"
./scripts/run-migration.sh
```

## What Will Be Migrated

- ✅ 2 users (novagadget, superadmin)
- ✅ 1 business (NovaGadget)
- ✅ 1 product
- ✅ 30 sales
- ✅ 6 goods inventories
- ✅ All related data (batches, history, etc.)

## Example

```bash
cd /home/kevin/Desktop/Business-record/backend
export DATABASE_URL="postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway"
node scripts/migrate-sqlite-to-postgres.js
```

## Expected Output

You should see:
```
🚀 Starting SQLite to PostgreSQL migration...

✅ Connected to PostgreSQL

📦 Migrating users...
✅ Migrated 2 users

📦 Migrating businesses...
✅ Migrated 1 businesses

📦 Migrating products...
✅ Migrated 1 products

... (and so on)

✅ Migration completed successfully!

📊 Summary:
   Users in PostgreSQL: 2
```

## Troubleshooting

### "DATABASE_URL not set"
- Make sure you've copied the entire connection string from Railway
- No trailing slash at the end
- Should start with `postgresql://`

### "Connection refused" or "Authentication failed"
- Verify the URL is correct
- Check if PostgreSQL service is running in Railway
- Make sure you copied the entire string

### "Table already exists"
- This means the schema was already initialized
- The migration will still transfer your data
- You can ignore these warnings

## After Migration

1. **Verify in Railway**
   - Check Railway logs for successful connection
   - Test login with your migrated users

2. **Test the API**
   ```bash
   curl https://your-railway-url.up.railway.app/api/health
   ```

3. **Login with migrated users**
   - Username: `novagadget` or `superadmin`
   - Use the same passwords as before

