# 🏠 Local Development vs 🚀 Production (Railway)

## How It Works

Your app automatically detects the environment and uses the correct backend URL:

---

## 🏠 Local Development (localhost)

### Setup:
1. **Frontend runs on:** `http://localhost:5173` (Vite dev server)
2. **Backend runs on:** `http://localhost:3002` (your local server)

### How it connects:
- **No `VITE_API_URL` needed** (not set in local dev)
- Code uses: `API_BASE_URL = '/api'` (relative path)
- **Vite proxy** automatically forwards `/api/*` → `http://localhost:3002/api/*`

### Vite Config (frontend/vite.config.ts):
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3002',  // ← Your local backend
      changeOrigin: true,
    },
  },
}
```

### To run locally:
```bash
# Terminal 1: Start backend
npm run server
# Backend runs on http://localhost:3002

# Terminal 2: Start frontend
npm run dev
# Frontend runs on http://localhost:5173
# API calls to /api/* → automatically proxied to localhost:3002
```

---

## 🚀 Production (Railway + Vercel)

### Setup:
1. **Frontend runs on:** `https://business-record.vercel.app` (Vercel)
2. **Backend runs on:** `https://your-app.up.railway.app` (Railway)

### How it connects:
- **`VITE_API_URL` is set** in Vercel environment variables
- Code uses: `API_BASE_URL = VITE_API_URL` (Railway URL)
- API calls go directly to Railway backend

### Environment Variable:
```
VITE_API_URL = https://your-app.up.railway.app
```

### To deploy:
1. **Railway:** Backend auto-deploys from GitHub
2. **Vercel:** Frontend auto-deploys from GitHub
3. **Vercel Settings:** Set `VITE_API_URL` = Railway URL

---

## 🔄 How the Code Detects Environment

### In `frontend/src/utils/api.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 
                     (import.meta.env.DEV ? '/api' : '/api');
```

**Logic:**
- ✅ **If `VITE_API_URL` is set** → Use it (Production: Railway URL)
- ✅ **If not set AND in dev mode** → Use `/api` (Local: Vite proxy)
- ✅ **If not set AND in production** → Use `/api` (fallback, but should set env var)

---

## 📊 Comparison Table

| Environment | Frontend URL | Backend URL | API_BASE_URL | How It Works |
|------------|--------------|-------------|--------------|-------------|
| **Local Dev** | `localhost:5173` | `localhost:3002` | `/api` | Vite proxy forwards to localhost:3002 |
| **Production** | `vercel.app` | `railway.app` | `VITE_API_URL` | Direct HTTP request to Railway |

---

## 🧪 Testing Locally

### Start Backend:
```bash
npm run server
# ✅ Backend running on http://localhost:3002
```

### Start Frontend:
```bash
npm run dev
# ✅ Frontend running on http://localhost:5173
# ✅ API calls to /api/* → automatically go to localhost:3002
```

### Test:
1. Open `http://localhost:5173`
2. Login with your credentials
3. Check Network tab → API calls go to `localhost:5173/api/*` (proxied to `localhost:3002`)

---

## 🚀 Testing Production

### After Deployment:
1. Open `https://business-record.vercel.app`
2. Login with your credentials
3. Check Network tab → API calls go directly to `https://your-app.up.railway.app/api/*`

---

## ⚙️ Environment Variables

### Local Development:
- **No env vars needed!** Vite proxy handles it automatically
- Backend runs on `localhost:3002` (hardcoded in `vite.config.ts`)

### Production (Vercel):
- **Required:** `VITE_API_URL` = Your Railway backend URL
- Set in: Vercel Dashboard → Settings → Environment Variables

### Production (Railway):
- **Required:** `ALLOWED_ORIGINS` = Your Vercel frontend URL
- Set in: Railway Dashboard → Variables

---

## 🔍 Debugging

### Local Dev Issues:
```bash
# Check if backend is running
curl http://localhost:3002/api/health

# Check Vite proxy
# Open browser DevTools → Network tab
# Look for requests to /api/* → should show as localhost:5173/api/*
```

### Production Issues:
```bash
# Check Railway backend
curl https://your-app.up.railway.app/api/health

# Check Vercel env var
# Vercel Dashboard → Settings → Environment Variables
# Verify VITE_API_URL is set correctly

# Check browser
# Open DevTools → Network tab
# Look for requests → should go to Railway URL
```

---

## ✅ Summary

**Local Development:**
- ✅ Backend: `localhost:3002`
- ✅ Frontend: `localhost:5173`
- ✅ Connection: Vite proxy (`/api` → `localhost:3002`)
- ✅ No env vars needed

**Production:**
- ✅ Backend: Railway URL
- ✅ Frontend: Vercel URL
- ✅ Connection: Direct HTTP (`VITE_API_URL` → Railway)
- ✅ Requires `VITE_API_URL` env var in Vercel

**The code automatically handles both!** 🎉

