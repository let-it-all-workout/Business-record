# 🔧 Fix Superadmin Login Issue

## Problem
- `novagadget` user can login ✅
- `superadmin` user cannot login ❌

## Diagnosis

The superadmin user exists in PostgreSQL with:
- ✅ Username: `superadmin`
- ✅ Email: `superadmin@example.com`
- ✅ Role: `super_admin`
- ✅ Active: `true`
- ✅ Password hash exists (bcrypt format)

## Possible Causes

1. **Incorrect Password** - Most likely cause
   - The password might have been changed or not migrated correctly
   - Solution: Reset the password (see below)

2. **Case Sensitivity**
   - Try: `superadmin` (all lowercase)
   - Try: `Superadmin` or `SuperAdmin`

3. **Email vs Username**
   - The login route uses username, not email
   - Make sure you're using `superadmin` not the email

## Solution 1: Reset Superadmin Password

### Option A: Using the Reset Script

```bash
cd backend
export DATABASE_URL="your-postgresql-url"
export NEW_PASSWORD="your-new-password-here"
node scripts/reset-superadmin-password.js
```

### Option B: Manual SQL Update

Connect to PostgreSQL and run:

```sql
-- Hash a new password (replace 'your-new-password' with actual password)
-- You'll need to generate the bcrypt hash first, or use the script above

UPDATE users
SET password_hash = '$2b$12$...your-bcrypt-hash-here...',
    updated_at = NOW()
WHERE username = 'superadmin';
```

## Solution 2: Check Login Route

The login route should:
1. Find user by username: `WHERE username = $1`
2. Check if user is active: `is_active = true`
3. Verify password with bcrypt

### Test Login Directly

```bash
# Test login endpoint
curl -X POST https://your-railway-url.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "your-password"
  }'
```

Check the response and Railway logs for errors.

## Solution 3: Verify Password Hash

Check if the password hash was migrated correctly:

```bash
cd backend
DATABASE_URL="your-postgresql-url" node scripts/test-superadmin-login.js
```

This will show:
- Password hash exists
- Hash format (should be bcrypt: `$2b$...`)
- User status

## Solution 4: Check Railway Logs

1. Go to Railway Dashboard → Backend Service → Logs
2. Try to login with superadmin
3. Look for error messages:
   - `"Login failed - user not found or inactive"`
   - `"Invalid credentials"`
   - Password verification errors

## Solution 5: Create New Superadmin (Last Resort)

If nothing works, create a new superadmin:

```bash
curl -X POST https://your-railway-url.up.railway.app/api/auth/create-super-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin2",
    "email": "superadmin2@example.com",
    "password": "secure-password",
    "fullName": "Super Admin"
  }'
```

Then delete the old one or update it.

## Quick Fix: Reset Password

**Easiest solution - Reset the password:**

```bash
cd /home/kevin/Desktop/Business-record/backend
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD_HERE@HOST:PORT/railway"
export NEW_PASSWORD="your-new-secure-password"
node scripts/reset-superadmin-password.js
```

Then try logging in with:
- Username: `superadmin`
- Password: `your-new-secure-password`

## Verification

After resetting password, verify login:

```bash
curl -X POST https://your-railway-url.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "your-new-password"
  }'
```

Should return:
```json
{
  "success": true,
  "token": "...",
  "user": {
    "id": "...",
    "username": "superadmin",
    "email": "superadmin@example.com",
    "role": "super_admin"
  }
}
```

## Common Issues

### "Invalid credentials"
- Password is wrong
- Username is wrong (case sensitive)
- User is inactive

### "User not found"
- Username doesn't match exactly
- User wasn't migrated
- Check: `SELECT username FROM users WHERE role = 'super_admin';`

### Password hash issues
- Hash might be in wrong format
- Hash might be missing
- Solution: Reset password

## Need More Help?

1. Check Railway logs for specific error messages
2. Verify user exists: `SELECT * FROM users WHERE username = 'superadmin';`
3. Test password hash: Use the test script
4. Reset password: Use the reset script

