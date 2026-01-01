# 🔍 Diagnose "Cannot Connect to API Server" Error

## Quick Diagnosis Steps

### Step 1: Check Vercel Environment Variable

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `VITE_API_URL`
3. Check the value:
   - ❌ **Wrong:** `https://business-record-production.up.railway.app/` (has trailing slash)
   - ✅ **Correct:** `https://business-record-production.up.railway.app` (no trailing slash)

**If it has a trailing slash:**
- Click **Edit**
- Remove the trailing slash
- Click **Save**
- **Redeploy** (Deployments → Redeploy → Uncheck cache)

### Step 2: Test Backend Directly

Open in browser or use curl:
```bash
curl https://business-record-production.up.railway.app/api/health
```

**Expected response:**
```json
{"status":"ok","message":"NovaGadget API is running"}
```

**If you get an error:**
- Backend might not be running
- Check Railway Dashboard → Is service running?
- Check Railway logs for errors

### Step 3: Check Browser Console

1. Open your Vercel app
2. Open **DevTools** (F12) → **Console**
3. Look for debug logs:
   - `🔍 API Configuration:` - Shows VITE_API_URL and API_BASE_URL
   - `🔍 [DEBUG] Login URL details:` - Shows actual URLs being used
   - `🔍 [DEBUG] Testing backend health at:` - Shows health check URL
   - `🔍 [DEBUG] Health check response:` - Shows if backend responded

### Step 4: Check Network Tab

1. Open **DevTools** (F12) → **Network** tab
2. Try to login
3. Look for failed requests:
   - **Request URL:** Should be `https://xxx.railway.app/api/auth/login` (no double slashes)
   - **Status:** Should be 200 (OK) or 401 (Unauthorized), not CORS error
   - **Error:** If you see CORS error → Backend CORS not configured correctly

---

## Common Issues & Fixes

### Issue 1: Trailing Slash in VITE_API_URL

**Symptom:** Error shows URL with trailing slash: `https://xxx.railway.app/`

**Fix:**
1. Remove trailing slash from Vercel env var
2. Redeploy Vercel

### Issue 2: Backend Not Running

**Symptom:** Health check fails, curl returns error

**Fix:**
1. Go to Railway Dashboard
2. Check if service is running
3. Check logs for errors
4. Restart service if needed

### Issue 3: CORS Error

**Symptom:** Network tab shows CORS error

**Fix:**
1. Verify Railway has latest code (with CORS fix)
2. Check Railway logs to see if CORS is blocking
3. Verify `ALLOWED_ORIGINS` env var in Railway (if set)

### Issue 4: Wrong Railway URL

**Symptom:** Error shows different URL than expected

**Fix:**
1. Get correct Railway URL from Railway Dashboard
2. Update `VITE_API_URL` in Vercel
3. Redeploy

### Issue 5: Code Not Deployed

**Symptom:** Still seeing old error messages or trailing slash

**Fix:**
1. Push code to GitHub: `git push origin main`
2. Vercel should auto-deploy
3. Or manually redeploy (uncheck cache)
4. Clear browser cache

---

## Expected Console Output

After fixes, you should see in console:

```
🔍 API Configuration: {
  VITE_API_URL: "https://business-record-production.up.railway.app",
  API_BASE_URL: "https://business-record-production.up.railway.app",
  isDev: false,
  mode: "production"
}

🔍 [DEBUG] Login URL details: {
  loginUrl: "https://business-record-production.up.railway.app/api/auth/login",
  apiBaseUrl: "https://business-record-production.up.railway.app",
  viteApiUrl: "https://business-record-production.up.railway.app",
  hasTrailingSlash: false
}

🔍 [DEBUG] Testing backend health at: https://business-record-production.up.railway.app/api/health

🔍 [DEBUG] Health check response: {
  status: 200,
  ok: true,
  url: "https://business-record-production.up.railway.app/api/health"
}
```

---

## Quick Checklist

- [ ] `VITE_API_URL` in Vercel has NO trailing slash
- [ ] Backend is running in Railway
- [ ] Health endpoint works: `curl https://xxx.railway.app/api/health`
- [ ] Code pushed to GitHub
- [ ] Vercel redeployed (cache unchecked)
- [ ] Railway redeployed (with CORS fix)
- [ ] Browser cache cleared
- [ ] Console shows correct URLs (no trailing slash)

---

## Still Not Working?

If all above are correct but still getting errors:

1. **Check Railway Logs:**
   - Railway Dashboard → Your Service → Logs
   - Look for CORS errors or connection issues

2. **Check Vercel Build Logs:**
   - Vercel Dashboard → Deployments → Latest → Build Logs
   - Verify `VITE_API_URL` is being injected correctly

3. **Test Backend Manually:**
   ```bash
   # Test health endpoint
   curl https://business-record-production.up.railway.app/api/health
   
   # Test login endpoint (will fail but shows if backend responds)
   curl -X POST https://business-record-production.up.railway.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test"}'
   ```

4. **Check Network Tab:**
   - What's the actual request URL?
   - What's the response status?
   - What's the error message?

