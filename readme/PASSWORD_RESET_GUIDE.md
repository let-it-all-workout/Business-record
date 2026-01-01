# Password Reset Guide

This guide explains how to reset user passwords from the backend.

## Methods

### Method 1: Using the Password Reset Script (Recommended)

#### Reset Any User's Password

```bash
# Interactive mode (will prompt for username and password)
node server/scripts/reset-password.js

# Command line mode
node server/scripts/reset-password.js <username> <new_password>

# Example: Reset admin password
node server/scripts/reset-password.js admin MyNewPassword123
```

#### Quick Super Admin Reset

```bash
# Reset to default password (admin123)
node server/scripts/reset-admin-password.js

# Reset to custom password
node server/scripts/reset-admin-password.js MyCustomPassword123
```

### Method 2: Using the API Endpoint (Requires Current Password)

If you know the current password, you can use the change password API:

```bash
# Login first to get a token
TOKEN=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"current_password"}' | jq -r '.token')

# Change password
curl -X POST http://localhost:3002/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "currentPassword": "current_password",
    "newPassword": "new_password"
  }'
```

### Method 3: Direct Database Access (Advanced)

If you have direct database access, you can reset the password using SQL:

```bash
# Open SQLite database
sqlite3 server/database/novagadget.db

# Generate bcrypt hash (requires Node.js)
node -e "const bcrypt=require('bcrypt');bcrypt.hash('YourNewPassword',12).then(h=>console.log(h))"

# Update password in database (replace HASH with the output above)
UPDATE users SET password_hash = 'HASH', updated_at = datetime('now') WHERE username = 'admin';
```

## Examples

### Example 1: Reset Super Admin Password

```bash
cd /home/kevin/Desktop/Business-record
node server/scripts/reset-admin-password.js SecurePassword123!
```

### Example 2: Reset Specific User Password

```bash
cd /home/kevin/Desktop/Business-record
node server/scripts/reset-password.js manager NewManagerPass456
```

### Example 3: Interactive Reset

```bash
cd /home/kevin/Desktop/Business-record
node server/scripts/reset-password.js
# Follow the prompts to enter username and password
```

## Security Notes

⚠️ **Important:**
- Always change default passwords immediately after reset
- Use strong passwords (at least 12 characters, mix of letters, numbers, symbols)
- Never share passwords or commit them to version control
- The scripts use bcrypt hashing (secure, industry-standard)

## Troubleshooting

### Script Fails: "User not found"
- Check the username is correct: `sqlite3 server/database/novagadget.db "SELECT username FROM users;"`
- Usernames are case-sensitive

### Script Fails: "Database not found"
- Ensure you're running from the project root directory
- Check database exists: `ls -la server/database/novagadget.db`

### Password Reset But Can't Login
- Verify the server is running: `npm run server`
- Check browser console for errors
- Clear browser cache and localStorage
- Try incognito/private browsing mode

## Default Credentials

After first installation, the default super admin credentials are:
- **Username:** `admin` (or value from `DEFAULT_ADMIN_USERNAME` env var)
- **Password:** `CHANGE_ME_IMMEDIATELY` (or value from `DEFAULT_ADMIN_PASSWORD` env var)

**⚠️ These should be changed immediately after first login!**

