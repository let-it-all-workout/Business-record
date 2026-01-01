# 🔧 Troubleshooting: "Server is not responding correctly. Please ensure the server is running on port 3002."

## Why You're Seeing This Error

This error appears when:
1. **Vercel hasn't redeployed** with the latest code yet
2. **`VITE_API_URL` is not set** in Vercel environment variables
3. **Browser is showing cached JavaScript** from the old build

---

## ✅ Step-by-Step Fix

### Step 1: Verify Code is Pushed

```bash
# Check if you've pushed all changes
git status

# If there are uncommitted changes, commit and push:
git add .
git commit -m "Your message"
git push origin main
```

### Step 2: Check Vercel Deployment

1. Go to **Vercel Dashboard** → Your Project
2. Check **Deployments** tab
3. Look for the latest deployment
4. Verify it shows your latest commit (e.g., "Fix: Use VITE_API_URL for all auth API calls")
5. If not deployed, wait 2-3 minutes or trigger a redeploy

### Step 3: Verify Environment Variable

**Critical:** `VITE_API_URL` MUST be set in Vercel!

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Look for `VITE_API_URL`
3. **If missing or wrong:**
   - Click **Add New**
   - Name: `VITE_API_URL`
   - Value: Your Railway backend URL (e.g., `https://your-app.up.railway.app`)
   - Environment: Select **Production, Preview, Development**
   - Click **Save**
4. **After adding/updating:** Vercel will automatically redeploy

### Step 4: Clear Browser Cache

The browser might be showing old JavaScript:

**Chrome/Edge:**
- Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- OR: Open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

**Firefox:**
- Press `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (Mac)

**Safari:**
- Press `Cmd+Option+E` to empty cache, then refresh

### Step 5: Check Browser Console

1. Open your Vercel URL
2. Press `F12` → **Console** tab
3. Look for errors
4. Check what URL is being used for API calls

**Expected (after fix):**
```
API calls should go to: https://your-app.up.railway.app/api/auth/login
```

**Wrong (old code or missing env var):**
```
API calls go to: /api/auth/login (relative path - doesn't work in production!)
```

---

## 🔍 Debugging Steps

### Check What API_BASE_URL is Being Used

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Type:
   ```javascript
   console.log('API URL:', import.meta.env.VITE_API_URL);
   ```
4. Press Enter

**Expected output:**
- If set: `API URL: https://your-app.up.railway.app`
- If not set: `API URL: undefined` ← **This is the problem!**

### Check Network Requests

1. Open DevTools (F12) → **Network** tab
2. Try to log in
3. Look for the login request

**What you should see:**
- ✅ Request URL: `https://your-app.up.railway.app/api/auth/login`
- ❌ Request URL: `https://business-record.vercel.app/api/auth/login` (wrong!)

---

## 🎯 Quick Fix Checklist

- [ ] **Code pushed to GitHub?** (`git push origin main`)
- [ ] **Vercel deployed latest commit?** (Check Deployments tab)
- [ ] **`VITE_API_URL` set in Vercel?** (Settings → Environment Variables)
- [ ] **Vercel redeployed after setting env var?** (Should auto-redeploy)
- [ ] **Browser cache cleared?** (Hard refresh: Ctrl+Shift+R)
- [ ] **Tested in incognito/private window?** (Bypasses cache)

---

## 🚨 Common Issues

### Issue 1: "VITE_API_URL is undefined"

**Cause:** Environment variable not set in Vercel

**Fix:**
1. Go to Vercel → Settings → Environment Variables
2. Add `VITE_API_URL` with your Railway URL
3. Wait for redeploy

### Issue 2: "Still seeing old error message"

**Cause:** Browser cache or Vercel hasn't redeployed

**Fix:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Check Vercel deployments - wait for latest to finish
3. Try incognito window

### Issue 3: "API calls go to /api instead of Railway URL"

**Cause:** `VITE_API_URL` not set, code falls back to `/api`

**Fix:**
1. Set `VITE_API_URL` in Vercel
2. Redeploy
3. Clear browser cache

### Issue 4: "CORS error"

**Cause:** Railway `ALLOWED_ORIGINS` not set

**Fix:**
1. Go to Railway → Variables
2. Add `ALLOWED_ORIGINS` = Your Vercel URL
3. Railway will restart automatically

---

## ✅ Verification

After fixing, you should see:

1. **Browser Console:**
   - No errors
   - API calls go to Railway URL

2. **Network Tab:**
   - Login request: `https://your-app.up.railway.app/api/auth/login`
   - Status: `200 OK` (or `401` if wrong password, but connection works!)

3. **Login:**
   - Can enter credentials
   - No "port 3002" error
   - Either logs in successfully OR shows "Invalid credentials" (but connection works!)

---

## 🆘 Still Not Working?

1. **Check Vercel build logs:**
   - Vercel Dashboard → Deployments → Latest → Build Logs
   - Look for errors

2. **Check Railway logs:**
   - Railway Dashboard → Your Service → Deployments → Latest → Logs
   - Verify backend is running

3. **Test Railway directly:**
   ```bash
   curl https://your-app.up.railway.app/api/health
   ```
   Should return: `{"status":"ok","message":"NovaGadget API is running"}`

4. **Check environment variables:**
   - Vercel: `VITE_API_URL` = Railway URL
   - Railway: `ALLOWED_ORIGINS` = Vercel URL

---

## 📝 Summary

**The error "port 3002" means:**
- Old code is running (not deployed yet)
- OR `VITE_API_URL` is not set (using `/api` which doesn't work in production)

**The fix:**
1. ✅ Push code to GitHub
2. ✅ Set `VITE_API_URL` in Vercel
3. ✅ Wait for redeploy
4. ✅ Clear browser cache
5. ✅ Test again

