# 🚀 Post-Deployment Checklist

## ✅ After Vercel Deployment

### 1. Get Your URLs

**Vercel Frontend URL:**
- Go to Vercel Dashboard → Your Project
- Copy the deployment URL
- Example: `https://your-app.vercel.app`

**Railway Backend URL:**
- Go to Railway Dashboard → Your Service → Settings
- Find "Networking" or "Domains" section
- Copy the URL
- Example: `https://your-app.up.railway.app`

---

### 2. Configure Vercel Environment Variable

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Click **Add New**
3. Add:
   - **Name:** `VITE_API_URL`
   - **Value:** Your Railway backend URL (e.g., `https://your-app.up.railway.app`)
   - **Environment:** Select all (Production, Preview, Development)
4. Click **Save**
5. **Redeploy** your project (or push a new commit)

---

### 3. Update Railway CORS

1. Go to **Railway Dashboard** → Your Service → **Variables**
2. Add or update:
   - **Name:** `ALLOWED_ORIGINS`
   - **Value:** Your Vercel URL (e.g., `https://your-app.vercel.app`)
   - For multiple origins, separate with commas:
     ```
     https://your-app.vercel.app,http://localhost:5173
     ```
3. Railway will automatically restart your service

---

### 4. Test Your Deployment

#### Test Backend (Railway)
```bash
# Test health endpoint
curl https://your-railway-url.railway.app/api/health

# Should return:
# {"status":"ok","message":"NovaGadget API is running"}
```

#### Test Frontend (Vercel)
1. Open your Vercel URL in a browser
2. Open browser DevTools (F12) → Console tab
3. Check for any errors
4. Try logging in with default credentials:
   - Username: `admin` (or your `DEFAULT_ADMIN_USERNAME`)
   - Password: `admin123` (or your `DEFAULT_ADMIN_PASSWORD`)

---

### 5. Verify Connection

**Check Browser Console:**
- Open DevTools (F12) → Network tab
- Try to log in or load data
- Check if API requests are going to your Railway URL
- Verify requests return `200 OK` status

**Common Issues:**
- ❌ CORS errors → Check `ALLOWED_ORIGINS` in Railway
- ❌ 404 errors → Check `VITE_API_URL` in Vercel
- ❌ Connection refused → Check Railway service is running

---

## 🔧 Quick Reference

### Vercel Settings
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Framework:** Vite

### Railway Settings
- **Root Directory:** `backend`
- **Start Command:** `node index.js`
- **Port:** Auto-detected from `PORT` env var

### Environment Variables

**Vercel:**
- `VITE_API_URL` = Railway backend URL

**Railway:**
- `ALLOWED_ORIGINS` = Vercel frontend URL
- `PORT` = Auto-set by Railway
- `NODE_ENV` = `production`
- `DEFAULT_ADMIN_USERNAME` = Your admin username
- `DEFAULT_ADMIN_EMAIL` = Your admin email
- `DEFAULT_ADMIN_PASSWORD` = Your admin password

---

## 🎉 Success Indicators

✅ Frontend loads without errors  
✅ Can log in successfully  
✅ API requests work (check Network tab)  
✅ Data loads correctly  
✅ No CORS errors in console  

---

## 🆘 Troubleshooting

### Frontend can't connect to backend
1. Check `VITE_API_URL` is set in Vercel
2. Verify Railway URL is correct
3. Redeploy Vercel after adding env var

### CORS errors
1. Check `ALLOWED_ORIGINS` in Railway includes your Vercel URL
2. Make sure URL matches exactly (including `https://`)
3. Railway service should restart automatically

### Build fails
1. Check Vercel build logs
2. Verify `frontend/package.json` exists
3. Ensure Root Directory is set to `frontend`

---

## 📝 Next Steps

1. ✅ Get both URLs (Vercel + Railway)
2. ✅ Set `VITE_API_URL` in Vercel
3. ✅ Set `ALLOWED_ORIGINS` in Railway
4. ✅ Test the connection
5. ✅ Change default admin password after first login!

