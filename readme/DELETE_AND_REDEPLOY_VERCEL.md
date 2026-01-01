# 🗑️ How to Delete and Redeploy on Vercel

## Step 1: Push Latest Code to GitHub ✅

Your code is now pushed to GitHub with all the latest fixes.

---

## Step 2: Delete Vercel Deployment

### Option A: Delete via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Log in to your account

2. **Navigate to Your Project:**
   - Find "Business-record" (or your project name)
   - Click on it

3. **Go to Deployments:**
   - Click on the **"Deployments"** tab at the top

4. **Delete Deployment:**
   - Find the latest deployment (or the one you want to delete)
   - Click the **⋯** (three dots) menu on the right
   - Select **"Delete"** or **"Remove"**
   - Confirm deletion

### Option B: Delete Entire Project (Nuclear Option)

If you want to completely start fresh:

1. **Go to Project Settings:**
   - Vercel Dashboard → Your Project → **Settings**

2. **Delete Project:**
   - Scroll to the bottom
   - Click **"Delete Project"**
   - Confirm deletion

3. **Reconnect GitHub:**
   - After deletion, create a new project
   - Connect to your GitHub repository again
   - Configure settings (Root Directory, Build Command, etc.)

---

## Step 3: Redeploy from GitHub

### If You Deleted a Single Deployment:

1. **Trigger New Deployment:**
   - Vercel should automatically detect the GitHub push
   - Or manually trigger: **Deployments** → **"Redeploy"** → Select latest commit

2. **Force Fresh Build:**
   - When redeploying, **uncheck "Use existing build cache"**
   - This ensures a completely fresh build

### If You Deleted the Entire Project:

1. **Create New Project:**
   - Vercel Dashboard → **"Add New"** → **"Project"**
   - Import from GitHub → Select your repository

2. **Configure Project Settings:**
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend` (or `.` if vercel.json is in root)
   - **Build Command:** `npm run build` (or leave default)
   - **Output Directory:** `dist` (if root is `frontend/`) or `frontend/dist` (if root is `.`)
   - **Install Command:** `npm install` (or leave default)

3. **Set Environment Variables:**
   - Go to **Settings** → **Environment Variables**
   - Add: `VITE_API_URL` = `https://your-railway-backend-url.up.railway.app`
   - Make sure it's set for **Production**, **Preview**, and **Development**

4. **Deploy:**
   - Click **"Deploy"**
   - Wait for build to complete

---

## Step 4: Verify Deployment

1. **Check Build Logs:**
   - Go to **Deployments** → Latest deployment
   - Click on it to see build logs
   - Verify:
     - ✅ Build succeeded
     - ✅ No errors
     - ✅ Latest commit is deployed

2. **Test the App:**
   - Visit your Vercel URL
   - Open DevTools (F12) → Console
   - Check for any errors
   - Try logging in

3. **Check Debug Panel:**
   - If you see the debug panel on login page:
     - Verify `VITE_API_URL` is set correctly
     - Verify `API_BASE_URL` matches your Railway backend

---

## ⚠️ Important Notes

### Root Directory Configuration:

- **If Root Directory = `frontend/`:**
  - Build runs from `frontend/` directory
  - Output should be `dist/` (relative to frontend/)
  - `vercel.json` should be in `frontend/` OR root (Vercel will find it)

- **If Root Directory = `.` (root):**
  - Build runs from repo root
  - Output should be `frontend/dist/` (relative to root)
  - `vercel.json` should be in root

### Current Setup:

Your `vercel.json` is in the **root** and has:
```json
{
  "outputDirectory": "frontend/dist"
}
```

This means:
- **Root Directory should be `.` (root)** in Vercel Dashboard
- Build command runs from root: `npm run build` (which does `cd frontend && vite build`)
- Output goes to `frontend/dist/`

---

## 🔍 Troubleshooting

### Build Fails:
- Check build logs for errors
- Verify `package.json` has correct build script
- Check if `node_modules` are installed correctly

### Still Seeing Old Error:
- Clear browser cache (hard refresh: Ctrl+Shift+R)
- Unregister service worker (DevTools → Application → Service Workers)
- Check if deployment actually completed (look at build logs)

### Environment Variables Not Working:
- Verify `VITE_API_URL` is set in Vercel
- Note: Vite env vars must start with `VITE_`
- Redeploy after setting env vars (they're injected at build time)

---

## ✅ Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Old deployment deleted (or project deleted)
- [ ] New deployment created/triggered
- [ ] Build cache disabled (unchecked)
- [ ] Environment variables set (`VITE_API_URL`)
- [ ] Build succeeded (check logs)
- [ ] Tested in browser (hard refresh)
- [ ] Service worker cleared (if needed)

---

## 🎯 Expected Result

After redeploy:
- ✅ No "port 3002" error message
- ✅ Error messages reference `VITE_API_URL` instead
- ✅ Debug panel shows correct `VITE_API_URL` value
- ✅ App connects to Railway backend successfully

