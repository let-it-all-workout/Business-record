# 🚀 Complete Guide: Setting Up PostgreSQL on Railway

## Step-by-Step Setup

### Step 1: Add PostgreSQL Service to Railway

1. **Go to Railway Dashboard**
   - Visit: https://railway.app
   - Login to your account

2. **Open Your Project**
   - Click on your project (e.g., "Business-record")

3. **Add PostgreSQL Database**
   - Click the **"+ New"** button (top right or in the project)
   - Select **"Database"** → **"Add PostgreSQL"**
   - OR go to **"Marketplace"** → Search **"PostgreSQL"** → Click **"Add PostgreSQL"**

4. **Wait for Provisioning**
   - Railway will create the PostgreSQL service
   - This takes 1-2 minutes
   - You'll see a new service appear in your project

---

### Step 2: Get the DATABASE_URL

1. **Click on Your PostgreSQL Service**
   - In your project, click on the newly created **PostgreSQL** service

2. **Go to Variables Tab**
   - Click the **"Variables"** tab at the top

3. **Find DATABASE_URL**
   - Look for `DATABASE_URL` in the list
   - It should be automatically created by Railway
   - **Copy the entire value** (it's a long connection string)

   It will look like:
   ```
   postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
   ```

4. **Note the Format**
   - Make sure there's **NO trailing slash** at the end
   - Should start with `postgresql://`
   - Contains username, password, host, port, and database name

---

### Step 3: Add DATABASE_URL to Backend Service

1. **Go to Your Backend Service**
   - Click on your **backend service** (not the PostgreSQL one)
   - This is the service that runs your Node.js backend

2. **Open Variables Tab**
   - Click the **"Variables"** tab

3. **Add New Variable**
   - Click **"+ New Variable"** or **"Raw Editor"** button
   - Add:
     - **Variable Name**: `DATABASE_URL`
     - **Value**: Paste the PostgreSQL URL you copied in Step 2
   - Click **"Add"** or **"Save"**

4. **Verify It's Added**
   - You should see `DATABASE_URL` in your environment variables list
   - The value should be your PostgreSQL connection string

---

### Step 4: Verify Setup

1. **Check Both Services**
   - ✅ PostgreSQL service exists and is running
   - ✅ Backend service has `DATABASE_URL` variable set

2. **Railway Will Auto-Restart**
   - Railway automatically restarts your backend when you add environment variables
   - Wait for the deployment to complete

3. **Check Logs**
   - Go to your backend service → **"Deployments"** tab
   - Click on the latest deployment
   - Look for logs that say:
     - ✅ "Connected to PostgreSQL database"
     - ✅ "PostgreSQL schema initialized"
     - ❌ If you see errors, check the troubleshooting section

---

## Visual Guide

```
Railway Project
├── Backend Service (Node.js)
│   └── Variables:
│       └── DATABASE_URL = postgresql://...
│
└── PostgreSQL Service
    └── Variables:
        └── DATABASE_URL = postgresql://... (copy this!)
```

**Flow:**
1. PostgreSQL service creates its own `DATABASE_URL`
2. You copy that URL
3. You paste it into your Backend service's `DATABASE_URL` variable

---

## Quick Checklist

- [ ] PostgreSQL service added to Railway project
- [ ] PostgreSQL service is running (green status)
- [ ] Copied `DATABASE_URL` from PostgreSQL service
- [ ] Added `DATABASE_URL` to backend service variables
- [ ] Backend service restarted (automatic)
- [ ] Checked logs for successful connection

---

## Troubleshooting

### "PostgreSQL service not found"
- Make sure you clicked "+ New" → "Database" → "Add PostgreSQL"
- Check if it's still provisioning (wait a minute)

### "DATABASE_URL not in PostgreSQL variables"
- Sometimes Railway names it differently
- Look for any variable containing "postgres", "database", or "connection"
- If missing, you can create it manually (see below)

### "How to create DATABASE_URL manually"
If Railway didn't create it automatically:

1. In PostgreSQL service → Variables tab
2. Click "+ New Variable"
3. Name: `DATABASE_URL`
4. Value: Construct it from the connection details:
   ```
   postgresql://postgres:PASSWORD@HOST:PORT/railway
   ```
   - Get PASSWORD from `PGPASSWORD` variable
   - Get HOST from `PGHOST` variable  
   - Get PORT from `PGPORT` variable (usually 5432)
   - Database is usually `railway`

### "Backend still using SQLite"
- Verify `DATABASE_URL` is set in backend service (not just PostgreSQL service)
- Check the variable name is exactly `DATABASE_URL` (case-sensitive)
- Restart the backend service manually if needed

### "Connection errors in logs"
- Verify the `DATABASE_URL` is correct (no trailing slash)
- Check if PostgreSQL service is running
- Make sure SSL is enabled (handled automatically in code)

---

## After Setup

Once `DATABASE_URL` is set:

1. **Railway will deploy your code** (if you've pushed to GitHub)
2. **Backend will connect to PostgreSQL** automatically
3. **Schema will be initialized** on first connection
4. **You can run the migration script** to transfer your 2 users

---

## Next Steps After Setup

1. **Push your code to GitHub** (if not done yet)
2. **Wait for Railway to deploy**
3. **Run migration script** to transfer your 2 users:
   ```bash
   # You can do this locally or via Railway CLI
   export DATABASE_URL="your-postgresql-url"
   node backend/scripts/migrate-sqlite-to-postgres.js
   ```
4. **Test the API** to make sure everything works

---

## Need Help?

If you get stuck:
1. Check Railway logs for specific error messages
2. Verify both services are running
3. Double-check the `DATABASE_URL` format
4. Make sure there's no trailing slash in the URL

