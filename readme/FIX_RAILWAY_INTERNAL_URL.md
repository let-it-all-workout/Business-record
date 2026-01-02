# 🔧 Fix: postgres.railway.internal Error

## Problem

You're getting this error:
```
Error: getaddrinfo ENOTFOUND postgres.railway.internal
```

This happens because Railway provides **two different URLs**:
- **Internal URL** (`postgres.railway.internal`) - Only works inside Railway network
- **External/Public URL** - Works from anywhere (your local machine)

## Solution: Get the External URL

### Method 1: Railway Dashboard (Easiest)

1. **Go to Railway Dashboard**
   - Visit: https://railway.app
   - Open your project

2. **Click on PostgreSQL Service**
   - Click the PostgreSQL service (not backend)

3. **Go to Settings Tab**
   - Click **"Settings"** tab at the top

4. **Find "Networking" Section**
   - Scroll down to **"Networking"** or **"Connection"** section
   - Look for **"Public Networking"** or **"External Connection"**
   - You should see a public URL like: `containers-us-west-xxx.railway.app`

5. **Construct the External URL**
   - Format: `postgresql://postgres:PASSWORD@PUBLIC_HOST:5432/railway`
   - Get PASSWORD from Variables tab (`PGPASSWORD`)
   - Get PUBLIC_HOST from Settings → Networking
   - Port is usually `5432`

### Method 2: Use Railway CLI

```bash
# Install Railway CLI if not installed
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Get PostgreSQL connection info
railway connect postgres
```

### Method 3: Check All Variables

1. In PostgreSQL service → **Variables** tab
2. Look for these variables:
   - `PGHOST` - This might have the public hostname
   - `PGPORT` - Usually 5432
   - `PGPASSWORD` - The password
   - `PGDATABASE` - Usually "railway"
   - `PGUSER` - Usually "postgres"

3. **Construct URL manually:**
   ```
   postgresql://PGUSER:PGPASSWORD@PGHOST:PGPORT/PGDATABASE
   ```

### Method 4: Railway Service Settings

1. PostgreSQL service → **Settings** tab
2. Look for **"Connection Pooling"** or **"Public URL"**
3. Railway sometimes shows the public connection string there

---

## Quick Fix: Use Railway's Public Domain

If you can't find the public URL, Railway PostgreSQL services usually have a public domain. Check:

1. PostgreSQL service → **Settings** → **Networking**
2. Look for a domain like: `containers-us-west-xxx.railway.app`
3. Use that in your connection string

**Example External URL:**
```
postgresql://postgres:your-password@containers-us-west-123.railway.app:5432/railway
```

**NOT the internal one:**
```
postgresql://postgres:password@postgres.railway.internal:5432/railway  ❌
```

---

## Alternative: Run Migration from Railway

If you can't get the external URL, you can run the migration **inside Railway**:

### Option 1: Railway CLI Shell

```bash
railway shell
export DATABASE_URL="postgresql://postgres:password@postgres.railway.internal:5432/railway"
node scripts/migrate-sqlite-to-postgres.js
```

### Option 2: One-off Service

1. Create a temporary service in Railway
2. Upload your migration script
3. Set DATABASE_URL to use `postgres.railway.internal`
4. Run it, then delete the service

---

## Verify You Have the Right URL

The external URL should:
- ✅ NOT contain `railway.internal`
- ✅ Contain a domain like `containers-xxx.railway.app` or `xxx.up.railway.app`
- ✅ Work when you test it locally

Test the connection:
```bash
# Test if URL works (replace with your external URL)
psql "postgresql://postgres:pass@containers-xxx.railway.app:5432/railway" -c "SELECT version();"
```

---

## Most Common Solution

Usually, Railway shows the public hostname in:
- **PostgreSQL Service** → **Settings** → **Networking** section
- Or in the **Variables** tab as `PGHOST` (if it's the public one)

Look for a hostname that's NOT `postgres.railway.internal` but something like:
- `containers-us-west-xxx.railway.app`
- `xxx.proxy.railway.app`
- Any domain ending in `.railway.app`

Then use that in your connection string!

