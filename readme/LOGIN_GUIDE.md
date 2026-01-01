# 🔐 Login & Testing Guide

## Default Login Credentials

### If you set environment variables in Railway:
- **Username:** Your `DEFAULT_ADMIN_USERNAME` value
- **Password:** Your `DEFAULT_ADMIN_PASSWORD` value
- **Email:** Your `DEFAULT_ADMIN_EMAIL` value

### If you didn't set environment variables (defaults):
- **Username:** `admin`
- **Password:** `CHANGE_ME_IMMEDIATELY`
- **Email:** `admin@example.com`

---

## 🚀 How to Login & Test

### Step 1: Open Your Vercel URL
1. Go to your Vercel Dashboard
2. Click on your project
3. Copy the deployment URL (e.g., `https://your-app.vercel.app`)
4. Open it in your browser

### Step 2: Open Browser DevTools
- Press `F12` or `Right-click → Inspect`
- Go to the **Console** tab
- This shows any errors or API calls

### Step 3: Login
1. Enter your username (default: `admin`)
2. Enter your password (default: `CHANGE_ME_IMMEDIATELY`)
3. Click **Login**

### Step 4: Check for Errors

**In Console tab, look for:**
- ✅ **Success:** No errors, API calls return `200 OK`
- ❌ **CORS Error:** `Access to fetch at '...' from origin '...' has been blocked by CORS policy`
- ❌ **Connection Error:** `Failed to fetch` or `Network error`
- ❌ **404 Error:** `Not Found` - API URL might be wrong

**In Network tab:**
- Click **Network** tab in DevTools
- Try logging in again
- Look for API requests to your Railway backend
- Check if they return `200 OK` or errors

---

## 🔍 Troubleshooting

### Problem: CORS Error
**Error:** `Access to fetch at '...' has been blocked by CORS policy`

**Solution:**
1. Go to Railway Dashboard → Your Service → Variables
2. Add/Update `ALLOWED_ORIGINS`:
   - Name: `ALLOWED_ORIGINS`
   - Value: Your Vercel URL (e.g., `https://your-app.vercel.app`)
3. Railway will restart automatically
4. Try logging in again

---

### Problem: Connection Error / Failed to Fetch
**Error:** `Failed to fetch` or `Network error`

**Possible causes:**
1. **API URL not set in Vercel:**
   - Go to Vercel → Settings → Environment Variables
   - Check if `VITE_API_URL` is set
   - Value should be your Railway backend URL

2. **Railway service not running:**
   - Go to Railway Dashboard
   - Check if your service is running (green status)
   - Check deployment logs for errors

3. **Wrong API URL:**
   - Test your Railway URL directly:
     ```bash
     curl https://your-railway-url.railway.app/api/health
     ```
   - Should return: `{"status":"ok","message":"NovaGadget API is running"}`

---

### Problem: 404 Not Found
**Error:** `404 Not Found` on API requests

**Solution:**
- Check `VITE_API_URL` in Vercel matches your Railway URL exactly
- Make sure it includes `https://` and doesn't have trailing slash
- Example: `https://your-app.up.railway.app` ✅
- Example: `https://your-app.up.railway.app/` ❌ (trailing slash)

---

### Problem: Wrong Password
**Error:** `Invalid username or password`

**Solution:**
1. Check Railway environment variables:
   - `DEFAULT_ADMIN_USERNAME`
   - `DEFAULT_ADMIN_PASSWORD`
2. If not set, use defaults:
   - Username: `admin`
   - Password: `CHANGE_ME_IMMEDIATELY`

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Login page loads without errors
- ✅ Can enter username and password
- ✅ Login button works
- ✅ Redirects to dashboard after login
- ✅ Can see products/sales/inventory data
- ✅ No errors in browser console
- ✅ API requests show `200 OK` in Network tab

---

## 🧪 Testing Checklist

After logging in, test these features:

- [ ] **Dashboard loads** - Can see overview/stats
- [ ] **Products page** - Can view products list
- [ ] **Add product** - Can create a new product
- [ ] **Sales page** - Can view sales
- [ ] **Create sale** - Can make a sale
- [ ] **Inventory page** - Can view inventory
- [ ] **Settings** - Can access settings
- [ ] **Logout** - Can log out successfully

---

## 🔒 Security Reminder

**⚠️ IMPORTANT:** After first login, change the default password!

1. Go to Settings or User Profile
2. Change password to something secure
3. Never share your admin credentials

---

## 📝 Quick Test Commands

### Test Railway Backend:
```bash
# Health check
curl https://your-railway-url.railway.app/api/health

# Should return:
# {"status":"ok","message":"NovaGadget API is running"}
```

### Test Login Endpoint:
```bash
curl -X POST https://your-railway-url.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"CHANGE_ME_IMMEDIATELY"}'

# Should return a token if credentials are correct
```

---

## 🎉 Next Steps After Successful Login

1. ✅ **Change default password** (Security)
2. ✅ **Test all features** (Products, Sales, Inventory)
3. ✅ **Add your first product** (Test data entry)
4. ✅ **Create a sale** (Test transaction flow)
5. ✅ **Check reports** (Test data visualization)

---

## 🆘 Still Having Issues?

1. **Check Railway logs:**
   - Railway Dashboard → Your Service → Deployments → Latest → Logs

2. **Check Vercel logs:**
   - Vercel Dashboard → Your Project → Deployments → Latest → Logs

3. **Check browser console:**
   - F12 → Console tab → Look for errors

4. **Verify environment variables:**
   - Vercel: `VITE_API_URL`
   - Railway: `ALLOWED_ORIGINS`, `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_PASSWORD`

