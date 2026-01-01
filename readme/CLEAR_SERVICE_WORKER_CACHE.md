# 🔄 How to Clear Service Worker Cache

## The Problem

The service worker was caching old JavaScript with the "port 3002" error message. Even after deploying new code, the browser might still show the old cached version.

---

## ✅ Solution 1: Automatic (After Redeploy)

After pushing the latest code and redeploying:
1. The service worker cache version has been updated (v1 → v2)
2. Old caches will be automatically deleted
3. New code will be cached

**Just wait for redeploy and hard refresh your browser!**

---

## ✅ Solution 2: Manual Clear (If Still Seeing Old Error)

### Chrome/Edge:

1. **Open DevTools:**
   - Press `F12`
   - Go to **Application** tab

2. **Clear Service Worker:**
   - In left sidebar, click **Service Workers**
   - Find your site's service worker
   - Click **Unregister**

3. **Clear Cache Storage:**
   - In left sidebar, click **Cache Storage**
   - Right-click each cache → **Delete**
   - Or click **Clear site data** button

4. **Hard Refresh:**
   - Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Firefox:

1. **Open DevTools:**
   - Press `F12`
   - Go to **Storage** tab

2. **Clear Service Worker:**
   - Expand **Service Workers**
   - Click **Unregister**

3. **Clear Cache:**
   - Expand **Cache Storage**
   - Right-click → **Delete All**

4. **Hard Refresh:**
   - Press `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### Safari:

1. **Enable Developer Menu:**
   - Safari → Preferences → Advanced
   - Check "Show Develop menu"

2. **Clear Service Worker:**
   - Develop → Empty Caches
   - Develop → Service Workers → Unregister

3. **Hard Refresh:**
   - Press `Cmd+Option+R`

---

## ✅ Solution 3: Quick Console Command

Open browser console (`F12` → Console) and run:

```javascript
// Unregister all service workers
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
    console.log('Service worker unregistered');
  }
});

// Clear all caches
caches.keys().then(function(names) {
  for (let name of names) {
    caches.delete(name);
    console.log('Cache deleted:', name);
  }
});

// Reload page
location.reload(true);
```

---

## ✅ Solution 4: Incognito/Private Window

The easiest way to test without cache:

1. Open incognito/private window:
   - Chrome/Edge: `Ctrl+Shift+N` (Windows) or `Cmd+Shift+N` (Mac)
   - Firefox: `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
   - Safari: `Cmd+Shift+N` (Mac)

2. Visit your Vercel URL
3. Service workers don't run in incognito mode (fresh code!)

---

## 🔍 Verify It's Fixed

After clearing cache:

1. **Open Console (`F12`):**
   - Look for: `🔍 API Configuration: { VITE_API_URL: "...", ... }`
   - Should show your Railway URL (not undefined)

2. **Check Network Tab:**
   - Try to log in
   - API calls should go to: `https://your-railway-url.up.railway.app/api/auth/login`
   - NOT: `/api/auth/login`

3. **Error Message:**
   - Should NOT say "port 3002"
   - Should say something like: "Cannot connect to API server at https://..."

---

## 📝 Summary

**The issue was:**
- Service worker cached old JavaScript (v1)
- Browser kept showing old code even after deploy

**The fix:**
- Updated service worker cache version (v2)
- Old caches will be automatically deleted
- New code will be cached

**After redeploy:**
1. Hard refresh browser (`Ctrl+Shift+R`)
2. Or use incognito window
3. Or manually unregister service worker

---

## 🚀 Next Steps

1. **Push the fix:**
   ```bash
   git push origin main
   ```

2. **Wait for Vercel redeploy** (2-3 minutes)

3. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R`
   - Or use incognito window

4. **Test:**
   - Should see new error messages (no "port 3002")
   - Console should show Railway URL

