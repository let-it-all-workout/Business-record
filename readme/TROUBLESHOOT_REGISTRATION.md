# 🔍 Troubleshoot "Failed to Register User" Error

## Quick Diagnosis

### Step 1: Check Browser Console

1. Open **DevTools** (F12) → **Console** tab
2. Try to register again
3. Look for debug logs:
   - `🔍 [DEBUG] RegisterForm submit:` - Shows form data
   - `🔍 [DEBUG] Register response:` - Shows HTTP status
   - `🔍 [DEBUG] Register error response:` - Shows error details

### Step 2: Check Network Tab

1. Open **DevTools** (F12) → **Network** tab
2. Try to register again
3. Find the `/auth/register` request
4. Check:
   - **Status Code:** 
     - `400` = Validation error (check error message)
     - `409` = Username/email already exists
     - `500` = Server error (check Railway logs)
   - **Response:** Click on request → **Response** tab → See error message

### Step 3: Check Railway Logs

1. Railway Dashboard → Your Service → **Logs**
2. Look for:
   - `Error registering user:` - Shows the actual error
   - Database errors
   - Table creation errors

---

## Common Issues & Fixes

### Issue 1: Missing Required Fields

**Error:** `Missing required fields: username, email, password, fullName, businessName`

**Fix:**
- Make sure all fields are filled in the registration form
- Check browser console for form data

### Issue 2: Validation Errors

**Error:** `Username must be between 3 and 50 characters`

**Fix:**
- Username: 3-50 characters
- Password: At least 6 characters
- Full Name: 2-100 characters
- Business Name: 2-100 characters
- Email: Valid email format

### Issue 3: Username/Email Already Exists

**Error:** `Username or email already exists`

**Fix:**
- Use a different username or email
- Or login with existing account

### Issue 4: Database Tables Don't Exist

**Error:** `Database tables not initialized`

**Fix:**
1. Check Railway logs for database initialization errors
2. Verify `schema.sql` exists in `backend/database/`
3. Restart Railway service to trigger database initialization

### Issue 5: Database Transaction Fails

**Error:** `Failed to register user: [database error]`

**Possible causes:**
- Database file permissions issue
- Database locked
- Foreign key constraint violation

**Fix:**
1. Check Railway logs for specific database error
2. Verify database file is writable
3. Check if `businesses` table exists

---

## Expected Registration Flow

1. **Frontend sends:** POST to `/api/auth/register` with form data
2. **Backend validates:** All fields present and valid
3. **Backend checks:** Username/email not already exists
4. **Backend creates:** Business and user in transaction
5. **Backend returns:** User and business data
6. **Frontend auto-login:** Uses returned credentials

---

## Debug Checklist

- [ ] All form fields filled correctly
- [ ] Username is 3-50 characters
- [ ] Password is at least 6 characters
- [ ] Email is valid format
- [ ] Business name is 2-100 characters
- [ ] Check browser console for debug logs
- [ ] Check Network tab for HTTP status
- [ ] Check Railway logs for backend errors
- [ ] Verify database tables exist
- [ ] Try different username/email

---

## Test Registration Manually

You can test the registration endpoint directly:

```bash
curl -X POST https://your-railway-backend.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "test123",
    "fullName": "Test User",
    "businessName": "Test Business"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "user": { ... },
  "business": { ... }
}
```

**If error:**
- Check the error message in response
- Check Railway logs for details

---

## Still Not Working?

If registration still fails after checking all above:

1. **Check Railway Logs:**
   - Look for specific database errors
   - Check if tables exist
   - Verify database initialization

2. **Check Database:**
   - Railway might have database issues
   - Try restarting the service

3. **Use Default Login:**
   - Try default credentials: `admin` / `CHANGE_ME_IMMEDIATELY`
   - If that works, registration might have a specific issue

