# 🔍 How to Get External PostgreSQL URL from Railway

## The Problem

Railway provides **two different URLs**:
- ❌ **Internal**: `postgres.railway.internal` - Only works inside Railway
- ✅ **External**: `containers-xxx.railway.app` - Works from your local machine

You need the **external URL** to run the migration locally.

---

## Step-by-Step: Get External URL

### Step 1: Go to PostgreSQL Service
1. Railway Dashboard → Your project
2. Click on **PostgreSQL service** (not backend)

### Step 2: Check Settings → Networking
1. Click **"Settings"** tab
2. Scroll to **"Networking"** section
3. Look for **"Public Domain"** or **"Public Networking"**
4. You should see something like: `containers-us-west-123.railway.app`

### Step 3: Get Password from Variables
1. Go to **"Variables"** tab
2. Find `PGPASSWORD` or `POSTGRES_PASSWORD`
3. Copy the password value

### Step 4: Construct the External URL

Format:
```
postgresql://postgres:PASSWORD@PUBLIC_HOST:5432/railway
```

Example:
```
postgresql://postgres:abc123xyz@containers-us-west-123.railway.app:5432/railway
```

---

## Alternative: Check All Variables

In PostgreSQL service → Variables tab, look for:
- `PGHOST` - If this is NOT `postgres.railway.internal`, use it!
- `PGPORT` - Usually `5432`
- `PGPASSWORD` - The password
- `PGDATABASE` - Usually `railway`
- `PGUSER` - Usually `postgres`

If `PGHOST` shows a public domain (like `containers-xxx.railway.app`), use that!

---

## Quick Test

Once you have the external URL, test it:

```bash
# Replace with your actual external URL
psql "postgresql://postgres:password@containers-xxx.railway.app:5432/railway" -c "SELECT version();"
```

If this works, you have the correct external URL!

---

## If You Can't Find External URL

### Option 1: Enable Public Networking
1. PostgreSQL service → **Settings** → **Networking**
2. Look for **"Public Networking"** toggle
3. Enable it if available
4. Railway will generate a public domain

### Option 2: Use Railway CLI
```bash
railway connect postgres
```
This will show you the connection details including the external URL.

### Option 3: Run Migration Inside Railway
If you can't get external URL, you can run the migration from within Railway using Railway CLI shell.

---

## What the External URL Should Look Like

✅ **Correct (External):**
```
postgresql://postgres:password@containers-us-west-123.railway.app:5432/railway
postgresql://postgres:password@xxx.proxy.railway.app:5432/railway
```

❌ **Wrong (Internal - won't work locally):**
```
postgresql://postgres:password@postgres.railway.internal:5432/railway
```

---

## After You Get the External URL

Run the migration:
```bash
cd backend
export DATABASE_URL="postgresql://postgres:password@containers-xxx.railway.app:5432/railway"
node scripts/migrate-sqlite-to-postgres.js
```

