# 🔧 Vercel Environment Variable Setup

## Setting VITE_API_URL in Vercel

### Step 1: Get Your Railway Backend URL

1. Go to **Railway Dashboard**
2. Select your backend service
3. Go to **Settings** → **Networking**
4. Find your **Public Domain** (e.g., `https://your-app.up.railway.app`)
5. **Copy the URL** (without trailing slash)

### Step 2: Set Environment Variable in Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings**
2. Click **"Environment Variables"** in left sidebar
3. Click **"Add New"**
4. Fill in:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://your-railway-backend.up.railway.app` (NO trailing slash!)
5. Select environments:
   - ✅ **Production**
   - ✅ **Preview**  
   - ✅ **Development**
6. Click **"Save"**

### Step 3: Redeploy

After setting the environment variable:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on latest deployment
3. **Uncheck** "Use existing build cache"
4. Click **"Redeploy"**

**Important:** Environment variables are injected at **build time** for Vite, so you MUST redeploy after setting/changing them.

---

## ⚠️ Common Mistakes

### ❌ Wrong: Trailing Slash
```
VITE_API_URL = https://xxx.railway.app/
```
**Problem:** Creates double slashes in URLs (`https://xxx.railway.app//auth/login`)

### ✅ Correct: No Trailing Slash
```
VITE_API_URL = https://xxx.railway.app
```

### ❌ Wrong: Missing Protocol
```
VITE_API_URL = xxx.railway.app
```
**Problem:** Browser treats it as relative path

### ✅ Correct: Full URL with Protocol
```
VITE_API_URL = https://xxx.railway.app
```

### ❌ Wrong: Including /api Path
```
VITE_API_URL = https://xxx.railway.app/api
```
**Problem:** Code already adds `/api` prefix, creates `/api/api/auth/login`

### ✅ Correct: Just the Base URL
```
VITE_API_URL = https://xxx.railway.app
```
**Note:** The code will automatically add `/api` prefix for endpoints

---

## 🔍 How to Verify

### Check in Browser Console

1. Open your Vercel app
2. Open **DevTools** (F12) → **Console**
3. Look for: `🔍 API Configuration:`
4. Verify:
   - `VITE_API_URL`: Should show your Railway URL
   - `API_BASE_URL`: Should match (no trailing slash)

### Check Debug Panel

On the login page, you should see:
- **VITE_API_URL:** `https://xxx.railway.app` (or "NOT SET")
- **API_BASE_URL:** `https://xxx.railway.app` (or `/api` if not set)

---

## 🎯 Expected Result

After setting `VITE_API_URL` correctly:
- ✅ Frontend connects to Railway backend
- ✅ Login works
- ✅ No "Cannot connect" errors
- ✅ API calls succeed

---

## 📝 Quick Checklist

- [ ] Railway backend URL copied (no trailing slash)
- [ ] `VITE_API_URL` set in Vercel
- [ ] Set for Production, Preview, and Development
- [ ] Redeployed after setting env var
- [ ] Verified in browser console
- [ ] Tested login functionality

