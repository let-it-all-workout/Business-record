# 🎯 Vercel Framework Configuration - Step by Step

## Quick Answer: Framework = **Vite**

Your project uses **Vite** as the build tool, so set Framework to **Vite** in Vercel.

---

## Step-by-Step Configuration

### Step 1: Go to Vercel Dashboard
- Visit: https://vercel.com/dashboard
- Log in

### Step 2: Open Your Project
- Click on "Business-record" (or your project name)

### Step 3: Go to Settings
- Click **"Settings"** tab at the top

### Step 4: Open General Settings
- Click **"General"** in the left sidebar

### Step 5: Configure Framework
- **Framework Preset:** Select **"Vite"**
- (Vercel will auto-detect this, but you can set it manually)

### Step 6: Configure Root Directory
- **Root Directory:** Set to **`.`** (dot = root of repository)
- OR set to **`frontend`** if you want to build from frontend folder

### Step 7: Configure Build Settings
- **Build Command:** `npm run build`
- **Output Directory:** 
  - If Root = `.` → Use `frontend/dist`
  - If Root = `frontend` → Use `dist`
- **Install Command:** `npm install` (default)

### Step 8: Set Environment Variables
- Click **"Environment Variables"** in left sidebar
- Add: `VITE_API_URL` = `https://your-railway-backend.up.railway.app`
- Select: **Production**, **Preview**, **Development**

### Step 9: Save and Deploy
- Click **"Save"**
- Go to **"Deployments"** tab
- Click **"Redeploy"** → Select latest commit
- **Uncheck** "Use existing build cache"

---

## 📋 Configuration Summary

| Setting | Value |
|---------|-------|
| **Framework** | Vite |
| **Root Directory** | `.` (root) |
| **Build Command** | `npm run build` |
| **Output Directory** | `frontend/dist` |
| **Install Command** | `npm install` |

---

## ✅ Current Project Setup

Your `vercel.json` already has:
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "frontend/dist"
}
```

So Vercel should auto-detect these settings. Just verify they match in the dashboard.

---

## 🔍 How to Verify

1. **Check Framework:**
   - Settings → General → Framework Preset = **Vite** ✅

2. **Check Build:**
   - Deployments → Latest → Build Logs
   - Should see: `Running "npm run build"` ✅
   - Should see: `Vite` in build output ✅

3. **Check Output:**
   - Build should create files in `frontend/dist/` ✅
   - Deployment should serve from that directory ✅

---

## ⚠️ Common Mistakes

❌ **Wrong Framework:** Selecting "Next.js" or "React" instead of "Vite"
✅ **Correct:** Framework = "Vite"

❌ **Wrong Root:** Setting root to `frontend/` but output to `frontend/dist/`
✅ **Correct:** If root = `.`, output = `frontend/dist`

❌ **Missing Env Var:** Forgetting to set `VITE_API_URL`
✅ **Correct:** Set `VITE_API_URL` in Environment Variables

---

## 🎯 That's It!

Framework = **Vite**
Root = **`.`** (or `frontend`)
Output = **`frontend/dist`** (or `dist` if root is `frontend`)

