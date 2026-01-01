# 🔐 Default Login Credentials

## Default User Account

When the backend starts for the first time, it automatically creates a default super admin user.

### Default Credentials

**Username:** `admin`  
**Password:** `CHANGE_ME_IMMEDIATELY`

**OR** (if environment variables are set in Railway):

- **Username:** Value of `DEFAULT_ADMIN_USERNAME` env var (defaults to `admin`)
- **Password:** Value of `DEFAULT_ADMIN_PASSWORD` env var (defaults to `CHANGE_ME_IMMEDIATELY`)

---

## How to Login

1. Go to your Vercel frontend URL
2. Enter credentials:
   - **Username:** `admin`
   - **Password:** `CHANGE_ME_IMMEDIATELY`
3. Click **Login**

---

## ⚠️ Important: Change Password Immediately!

After first login:
1. Go to **Settings** (gear icon)
2. Find **Change Password** option
3. Set a strong, secure password
4. **Never share your password!**

---

## If Login Fails

### Check 1: Verify Default User Was Created

Check Railway logs for:
```
✅ Default super_admin user created
```

If you see:
```
Note: Could not check/create default user
```

Then the default user wasn't created. Possible reasons:
- Database initialization failed
- Users table doesn't exist
- Database permissions issue

### Check 2: Verify Environment Variables (Railway)

If you set custom credentials in Railway:
1. Go to Railway Dashboard → Your Service → **Variables**
2. Check:
   - `DEFAULT_ADMIN_USERNAME` = your username
   - `DEFAULT_ADMIN_PASSWORD` = your password
   - `DEFAULT_ADMIN_EMAIL` = your email (optional)

### Check 3: Check Railway Logs

1. Railway Dashboard → Your Service → **Logs**
2. Look for:
   - `✅ Default super_admin user created` → User exists
   - `Note: Could not check/create default user` → User creation failed
   - Database errors

### Check 4: Database Might Be Empty

If the database was reset or is new:
- Default user should be created automatically
- If not, check Railway logs for errors

---

## Creating a New User (If Default Doesn't Work)

### Option 1: Register New User

1. On login page, click **"Register"** or **"Create Account"**
2. Fill in the registration form
3. This will create a new business and admin user
4. Login with your new credentials

### Option 2: Set Environment Variables in Railway

1. Railway Dashboard → Your Service → **Variables**
2. Add:
   - `DEFAULT_ADMIN_USERNAME` = `your_username`
   - `DEFAULT_ADMIN_PASSWORD` = `your_secure_password`
   - `DEFAULT_ADMIN_EMAIL` = `your_email@example.com`
3. Redeploy service
4. Default user will be created with your credentials

---

## Troubleshooting

### "Invalid credentials" Error

**Possible causes:**
1. Wrong username/password
2. Default user wasn't created
3. Database was reset
4. Environment variables override defaults

**Solutions:**
1. Try: `admin` / `CHANGE_ME_IMMEDIATELY`
2. Check Railway logs for user creation
3. Register a new user instead
4. Check Railway environment variables

### "User not found" Error

**Possible causes:**
1. Database is empty
2. Users table doesn't exist
3. Database initialization failed

**Solutions:**
1. Check Railway logs for database errors
2. Verify database file exists
3. Restart Railway service
4. Register a new user

### Default User Not Created

**Check Railway logs for:**
- Database initialization errors
- Schema execution errors
- User creation errors

**Fix:**
1. Check Railway environment variables
2. Verify database is accessible
3. Restart service
4. Register a new user as fallback

---

## Quick Reference

| Item | Default Value | Env Var |
|------|--------------|---------|
| **Username** | `admin` | `DEFAULT_ADMIN_USERNAME` |
| **Password** | `CHANGE_ME_IMMEDIATELY` | `DEFAULT_ADMIN_PASSWORD` |
| **Email** | `admin@example.com` | `DEFAULT_ADMIN_EMAIL` |
| **Role** | `super_admin` | (fixed) |

---

## Security Note

⚠️ **The default password is intentionally weak for initial setup.**

**You MUST change it immediately after first login!**

Never use default credentials in production without changing them first.

