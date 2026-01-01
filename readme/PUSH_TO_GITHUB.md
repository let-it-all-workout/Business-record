# Push to GitHub - Quick Guide

## ✅ Git Repository Ready

Your code is committed and ready to push to GitHub!

## 📤 Steps to Push

### Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon (top right) → **"New repository"**
3. Fill in:
   - **Repository name:** `Business-record` (or your preferred name)
   - **Description:** "Modern inventory management system"
   - **Visibility:** Choose Public or Private
   - ⚠️ **DO NOT** check any boxes (no README, no .gitignore, no license)
4. Click **"Create repository"**

### Step 2: Copy Your Repository URL

After creating, GitHub will show you a URL like:
- `https://github.com/YOUR_USERNAME/Business-record.git`

**Copy this URL** - you'll need it in the next step.

### Step 3: Connect and Push

Run these commands (replace `YOUR_USERNAME` and `REPO_NAME` with your actual values):

```bash
cd /home/kevin/Desktop/Business-record

# Add GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git push -u origin main
```

**Example:**
```bash
git remote add origin https://github.com/kevin/Business-record.git
git push -u origin main
```

### Step 4: Authenticate

When you run `git push`, GitHub will ask for authentication:
- **Option 1:** Use GitHub Personal Access Token (recommended)
- **Option 2:** Use GitHub CLI (`gh auth login`)

## 🔑 GitHub Authentication

### Using Personal Access Token (Recommended)

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name: "NovaGadget Deployment"
4. Select scopes: ✅ `repo` (full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)
7. When `git push` asks for password, paste the token instead

### Using GitHub CLI (Alternative)

```bash
# Install GitHub CLI
sudo apt install gh  # or: brew install gh

# Login
gh auth login

# Then push
git push -u origin main
```

## ✅ Verify Push

After pushing:
1. Go to your GitHub repository page
2. You should see all your files
3. Ready for deployment!

## 🚀 Next Steps

Once code is on GitHub:
1. Deploy backend to Railway (connect to GitHub repo)
2. Deploy frontend to Vercel (connect to GitHub repo)
3. Both will auto-deploy on future pushes!

## 📝 Update Git Config (Optional)

To set your name and email globally:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

This is already set for this repository, but you can update it if needed.

