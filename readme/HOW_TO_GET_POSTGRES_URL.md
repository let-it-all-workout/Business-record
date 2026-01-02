# 🔍 How to Get Your PostgreSQL URL (DATABASE_URL)

## Method 1: Railway Dashboard (Recommended)

### Step 1: Go to Railway Dashboard
1. Visit: https://railway.app
2. Login to your account

### Step 2: Find Your PostgreSQL Service
1. Click on your **project**
2. Look for a service named **PostgreSQL** or **Postgres**
   - If you don't have one, you need to add it first (see "Adding PostgreSQL Service" below)

### Step 3: Get the Connection String
1. Click on your **PostgreSQL service**
2. Go to the **Variables** tab
3. Look for `DATABASE_URL` or `POSTGRES_URL`
4. **Copy the entire connection string**

The URL will look like:
```
postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
```

### Step 4: Use It
- **For Railway backend service**: Add it as an environment variable
- **For local testing**: Export it in your terminal:
  ```bash
  export DATABASE_URL="postgresql://postgres:password@host:port/database"
  ```

---

## Method 2: Railway CLI

If you have Railway CLI installed:

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Get variables
railway variables
```

This will show all environment variables including `DATABASE_URL`.

---

## Method 3: Railway Service Settings

1. Go to Railway Dashboard
2. Select your **PostgreSQL service**
3. Click on **Settings** tab
4. Look for **Connection** or **Database URL** section
5. Copy the connection string

---

## Adding PostgreSQL Service (If You Don't Have One)

### Option 1: Add from Template
1. In Railway Dashboard, click **+ New**
2. Select **Database** → **Add PostgreSQL**
3. Railway will create a PostgreSQL service
4. The `DATABASE_URL` will be automatically available

### Option 2: Add from Marketplace
1. In your project, click **+ New**
2. Go to **Marketplace**
3. Search for **PostgreSQL**
4. Click **Add PostgreSQL**
5. Railway will provision it and provide the connection string

---

## Setting DATABASE_URL in Railway Backend Service

Once you have the PostgreSQL URL:

1. Go to Railway Dashboard
2. Select your **backend service** (not PostgreSQL)
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Add:
   - **Name**: `DATABASE_URL`
   - **Value**: Paste your PostgreSQL connection string
6. Click **Add**
7. Railway will automatically restart your service

---

## For Local Testing

If you want to test locally with PostgreSQL:

### Option 1: Use Railway's PostgreSQL (Recommended)
Just use the Railway PostgreSQL URL locally:
```bash
export DATABASE_URL="postgresql://postgres:password@host:port/database"
npm start
```

### Option 2: Install PostgreSQL Locally
1. Install PostgreSQL on your machine
2. Create a database:
   ```bash
   createdb novagadget
   ```
3. Use local connection string:
   ```bash
   export DATABASE_URL="postgresql://localhost:5432/novagadget"
   ```

---

## Verifying Your DATABASE_URL

Test if your DATABASE_URL works:

```bash
# Set the URL
export DATABASE_URL="your-postgresql-url-here"

# Test connection (using psql if installed)
psql $DATABASE_URL -c "SELECT version();"

# Or test with Node.js
node -e "
import('pg').then(({ Pool }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT NOW()').then(r => {
    console.log('✅ Connected!', r.rows[0]);
    pool.end();
  }).catch(e => {
    console.error('❌ Connection failed:', e.message);
    process.exit(1);
  });
});
"
```

---

## Important Notes

1. **Keep it Secret**: The DATABASE_URL contains your database password. Never commit it to Git!

2. **Format**: Railway's DATABASE_URL should look like:
   ```
   postgresql://postgres:PASSWORD@HOST:PORT/railway
   ```

3. **SSL**: Railway PostgreSQL requires SSL. The connection pool in `db-postgres.js` handles this automatically.

4. **No Trailing Slash**: Make sure there's no trailing slash in the URL:
   - ✅ `postgresql://host:port/db`
   - ❌ `postgresql://host:port/db/`

---

## Quick Checklist

- [ ] PostgreSQL service exists in Railway
- [ ] DATABASE_URL copied from PostgreSQL service variables
- [ ] DATABASE_URL added to backend service environment variables
- [ ] Backend service restarted (automatic in Railway)
- [ ] Tested connection (optional)

---

## Troubleshooting

### "DATABASE_URL not found"
- Make sure you're looking at the **PostgreSQL service**, not the backend service
- Check the **Variables** tab
- If it doesn't exist, Railway might name it differently - look for any variable containing "postgres" or "database"

### "Connection refused"
- Check if PostgreSQL service is running in Railway
- Verify the URL is correct
- Make sure SSL is enabled (handled automatically in code)

### "Authentication failed"
- Verify the password in the URL is correct
- Check if the database user has proper permissions

