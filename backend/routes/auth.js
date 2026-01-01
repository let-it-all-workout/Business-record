import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../database/novagadget.db');
const db = new Database(dbPath);

// Initialize auth schema
function initializeAuthSchema() {
  try {
    // First, ensure users table has business_id column if it exists
    try {
      const tableInfo = db.prepare("PRAGMA table_info(users)").all();
      if (tableInfo.length > 0) {
        // Table exists, check if business_id column exists
        const hasBusinessId = tableInfo.some(col => col.name === 'business_id');
        if (!hasBusinessId) {
          // Add business_id column to existing users table
          db.exec("ALTER TABLE users ADD COLUMN business_id TEXT;");
          console.log('✅ Added business_id column to existing users table');
        }
      }
    } catch (e) {
      // Table doesn't exist yet, will be created by schema.sql with business_id
    }
    
    // Try auth-schema.sql first, fallback to schema.sql if it doesn't exist
    let schemaPath = join(__dirname, '../database/auth-schema.sql');
    if (!existsSync(schemaPath)) {
      // Auth schema is now in main schema.sql
      schemaPath = join(__dirname, '../database/schema.sql');
    }
    
    if (existsSync(schemaPath)) {
      const schema = readFileSync(schemaPath, 'utf8');
      // Only execute auth-related parts
      const authSchema = schema.split('-- Authentication and User Management Schema')[1] || schema;
      try {
        db.exec(authSchema);
      } catch (schemaError) {
        // Schema might already be applied, that's okay
        const errorMsg = schemaError.message || String(schemaError);
        if (!errorMsg.includes('already exists') && !errorMsg.includes('duplicate')) {
          console.log('   Note: Schema execution:', errorMsg.substring(0, 100));
        }
      }
      
      // Ensure business_id exists after schema execution
      try {
        const tableInfo = db.prepare("PRAGMA table_info(users)").all();
        if (tableInfo.length > 0) {
          const hasBusinessId = tableInfo.some(col => col.name === 'business_id');
          if (!hasBusinessId) {
            db.exec("ALTER TABLE users ADD COLUMN business_id TEXT;");
            console.log('✅ Added business_id column to users table after schema execution');
          }
        }
      } catch (e) {
        // Ignore errors
      }
      
      // Create default super_admin user if no users exist
      // Note: This is async but we can't use await in module-level code
      // The hash will be computed synchronously on first server start
      try {
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
        if (userCount.count === 0) {
          // Use bcrypt synchronously for initial setup (only happens once)
          // Default password should be changed immediately after first login
          const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'CHANGE_ME_IMMEDIATELY';
          const adminId = `user-${Date.now()}`;
          const adminPasswordHash = bcrypt.hashSync(defaultPassword, 12);
          const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
          const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
          
          // Check if business_id column exists before inserting
          const tableInfo = db.prepare("PRAGMA table_info(users)").all();
          const hasBusinessId = tableInfo.some(col => col.name === 'business_id');
          
          if (hasBusinessId) {
            db.prepare(`
              INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, business_id)
              VALUES (?, ?, ?, ?, 'Super Administrator', 'super_admin', 1, NULL)
            `).run(adminId, defaultUsername, defaultEmail, adminPasswordHash);
            console.log('✅ Default super_admin user created');
            console.log('   ⚠️  IMPORTANT: Change the default password immediately after first login!');
          } else {
            // Fallback: insert without business_id (for old schema compatibility)
            db.prepare(`
              INSERT INTO users (id, username, email, password_hash, full_name, role, is_active)
              VALUES (?, ?, ?, ?, 'Super Administrator', 'super_admin', 1)
            `).run(adminId, defaultUsername, defaultEmail, adminPasswordHash);
            console.log('✅ Default super_admin user created (without business_id)');
            console.log('   ⚠️  IMPORTANT: Change the default password immediately after first login!');
          }
        }
      } catch (userError) {
        // Users table might not exist yet, that's okay
        console.log('Note: Could not check/create default user:', userError.message);
      }
    } else {
      console.warn('⚠️  Auth schema file not found. Authentication may not work properly.');
    }
  } catch (error) {
    console.error('Error initializing auth schema:', error);
  }
}

// Initialize on load
initializeAuthSchema();

// Rate limiting for authentication endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registration attempts per hour
  message: 'Too many registration attempts, please try again after 1 hour',
  standardHeaders: true,
  legacyHeaders: false,
});

// PIN limiter - uses user ID for authenticated requests, IP for unauthenticated
// Note: PIN verification requires authentication, so this will primarily use user ID
const pinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each user to 5 PIN verification attempts per 15 minutes
  message: 'Too many PIN attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip keyGenerator - rate limiter will use IP by default
  // Since PIN verification requires verifyToken middleware, req.user will be set
  // We'll handle user-specific limiting in the route handler if needed
});

// Helper function to hash passwords using bcrypt (secure)
// Bcrypt automatically handles salting and is resistant to rainbow table attacks
async function hashPassword(password) {
  const saltRounds = 12; // Higher rounds = more secure but slower (12 is a good balance)
  return await bcrypt.hash(password, saltRounds);
}

// Helper function to verify passwords (supports both bcrypt and legacy SHA256)
async function verifyPassword(password, hash) {
  // Check if hash is bcrypt format (starts with $2a$, $2b$, or $2y$)
  if (hash.startsWith('$2')) {
    return await bcrypt.compare(password, hash);
  }
  
  // Legacy SHA256 support for migration
  const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
  return sha256Hash === hash;
}

// Helper function to check if password hash needs migration (SHA256 -> bcrypt)
function needsPasswordMigration(hash) {
  return !hash.startsWith('$2'); // Not bcrypt format
}

// Helper function to generate token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to check if token is expired
function isTokenExpired(expiresAt) {
  return new Date(expiresAt) < new Date();
}

// Register new user (PUBLIC - anyone can sign up and create their own business)
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { username, email, password, fullName, businessName } = req.body;

    if (!username || !email || !password || !fullName || !businessName) {
      return res.status(400).json({ error: 'Missing required fields: username, email, password, fullName, businessName' });
    }

    // Input validation
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (fullName.length < 2 || fullName.length > 100) {
      return res.status(400).json({ error: 'Full name must be between 2 and 100 characters' });
    }
    if (businessName.length < 2 || businessName.length > 100) {
      return res.status(400).json({ error: 'Business name must be between 2 and 100 characters' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if username or email already exists
    const existingUser = db.prepare(`
      SELECT id FROM users WHERE username = ? OR email = ?
    `).get(username, email);

    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password with bcrypt
    const passwordHash = await hashPassword(password);

    // Use transaction to create business and user atomically
    const transaction = db.transaction(() => {
      // Create business
      const businessId = `business-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      db.prepare(`
        INSERT INTO businesses (id, name, owner_id, created_at, updated_at)
        VALUES (?, ?, ?, datetime('now'), datetime('now'))
      `).run(businessId, businessName, null); // owner_id will be set after user is created

      // Create user as business owner (admin role within that business)
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, full_name, role, is_active, business_id)
        VALUES (?, ?, ?, ?, ?, 'admin', 1, ?)
      `).run(userId, username, email, passwordHash, fullName, businessId);

      // Update business owner_id
      db.prepare('UPDATE businesses SET owner_id = ? WHERE id = ?').run(userId, businessId);

      return { userId, businessId, username, email, fullName };
    });

    const result = transaction();

    res.json({
      success: true,
      user: {
        id: result.userId,
        username: result.username,
        email: result.email,
        fullName: result.fullName,
        role: 'admin',
        businessId: result.businessId,
        isActive: true,
      },
      business: {
        id: result.businessId,
        name: businessName,
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Input validation
    if (typeof username !== 'string' || username.length < 1 || username.length > 50) {
      return res.status(400).json({ error: 'Invalid username' });
    }
    if (typeof password !== 'string' || password.length < 1) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Get user by username
    const user = db.prepare(`
      SELECT id, username, email, full_name, role, is_active, business_id, password_hash
      FROM users
      WHERE username = ?
    `).get(username);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password (supports both bcrypt and legacy SHA256)
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Migrate password to bcrypt if it's still using SHA256
    if (needsPasswordMigration(user.password_hash)) {
      const newPasswordHash = await hashPassword(password);
      db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?')
        .run(newPasswordHash, user.id);
      // Password migration completed (no sensitive info logged)
    }

    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, user.id, token, expiresAt);

    // Update last login
    db.prepare(`
      UPDATE users SET last_login = datetime('now') WHERE id = ?
    `).run(user.id);

    // Get business info if user belongs to a business
    let business = null;
    if (user.business_id && user.business_id.trim() !== '') {
      try {
        business = db.prepare('SELECT id, name FROM businesses WHERE id = ?').get(user.business_id);
      } catch (error) {
        console.error('Error fetching business:', error);
      }
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        businessId: user.business_id,
      },
      business: business ? { id: business.id, name: business.name } : null,
      expiresAt,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Verify token (middleware)
export function verifyToken(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const session = db.prepare(`
      SELECT s.*, u.username, u.email, u.full_name, u.role, u.is_active, u.business_id
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ?
    `).get(token);

    if (!session || isTokenExpired(session.expires_at) || !session.is_active) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      id: session.user_id,
      username: session.username,
      email: session.email,
      fullName: session.full_name,
      role: session.role,
      businessId: session.business_id,
    };
    req.sessionId = session.id;
    
    // For super_admin, allow access to all businesses
    // For regular users, restrict to their business_id
    req.isSuperAdmin = session.role === 'super_admin';

    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
}

// Get current user
router.get('/me', verifyToken, (req, res) => {
  let business = null;
  if (req.user.businessId) {
    business = db.prepare('SELECT id, name FROM businesses WHERE id = ?').get(req.user.businessId);
  }
  
  res.json({
    success: true,
    user: req.user,
    business: business ? { id: business.id, name: business.name } : null,
  });
});

// Logout
router.post('/logout', verifyToken, (req, res) => {
  try {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(req.sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// Get all users (admin of business or super_admin)
router.get('/users', verifyToken, (req, res) => {
  try {
    // Super admin can see all users, business admin can only see users in their business
    if (req.isSuperAdmin) {
      const users = db.prepare(`
        SELECT id, username, email, full_name, role, is_active, business_id, created_at, last_login
        FROM users
        ORDER BY created_at DESC
      `).all();
      res.json(users);
    } else if (req.user.role === 'admin' && req.user.businessId) {
      const users = db.prepare(`
        SELECT id, username, email, full_name, role, is_active, business_id, created_at, last_login
        FROM users
        WHERE business_id = ?
        ORDER BY created_at DESC
      `).all(req.user.businessId);
      res.json(users);
    } else {
      return res.status(403).json({ error: 'Admin access required' });
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user
router.put('/users/:id', verifyToken, (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, role, isActive } = req.body;

    // Super admin can update anyone, business admin can only update users in their business
    if (!req.isSuperAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if user belongs to same business (unless super admin)
    if (!req.isSuperAdmin) {
      const targetUser = db.prepare('SELECT business_id FROM users WHERE id = ?').get(id);
      if (!targetUser || targetUser.business_id !== req.user.businessId) {
        return res.status(403).json({ error: 'Can only update users in your business' });
      }
    }

    // Build update query safely with parameterized values
    const updates = [];
    const values = [];

    // Validate and add allowed fields only
    if (fullName !== undefined && typeof fullName === 'string' && fullName.trim().length > 0) {
      updates.push('full_name = ?');
      values.push(fullName.trim());
    }
    if (email !== undefined && typeof email === 'string' && email.trim().length > 0) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      updates.push('email = ?');
      values.push(email.trim());
    }
    if (role !== undefined) {
      // Validate role against allowed values
      const allowedRoles = ['super_admin', 'admin', 'manager', 'staff', 'viewer'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push('role = ?');
      values.push(role);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    // Add updated_at and id to values
    updates.push('updated_at = datetime("now")');
    values.push(id);

    // Build safe parameterized query - field names are hardcoded, only values are parameterized
    const setClause = updates.map((update, idx) => {
      // Extract field name from "field = ?" pattern
      const fieldMatch = update.match(/^(\w+) = \?$/);
      if (!fieldMatch) {
        // Handle datetime("now") case
        if (update.includes('updated_at')) {
          return 'updated_at = datetime("now")';
        }
        throw new Error('Invalid update format');
      }
      const field = fieldMatch[1];
      // Validate field name against whitelist
      const allowedFields = ['full_name', 'email', 'role', 'is_active', 'updated_at'];
      if (!allowedFields.includes(field)) {
        throw new Error('Invalid field name');
      }
      return `${field} = ?`;
    }).join(', ');

    // Filter out datetime("now") from values since it's not a parameter
    const paramValues = values.filter((val, idx) => {
      const update = updates[idx];
      return update.includes('?') && !update.includes('datetime');
    });

    db.prepare(`
      UPDATE users SET ${setClause} WHERE id = ?
    `).run(...paramValues, id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', verifyToken, (req, res) => {
  try {
    const { id } = req.params;

    // Super admin can delete anyone, business admin can only delete users in their business
    if (!req.isSuperAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user belongs to same business (unless super admin)
    if (!req.isSuperAdmin) {
      const targetUser = db.prepare('SELECT business_id FROM users WHERE id = ?').get(id);
      if (!targetUser || targetUser.business_id !== req.user.businessId) {
        return res.status(403).json({ error: 'Can only delete users in your business' });
      }
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Change password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    // Input validation
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = db.prepare(`
      SELECT password_hash FROM users WHERE id = ?
    `).get(req.user.id);

    // Verify current password (supports both bcrypt and legacy SHA256)
    const passwordValid = await verifyPassword(currentPassword, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }

    // Hash new password with bcrypt
    const newPasswordHash = await hashPassword(newPassword);
    db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?
    `).run(newPasswordHash, req.user.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Set/Update PIN (for business admins)
router.post('/set-pin', verifyToken, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin || pin.length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 digits' });
    }

    if (pin.length > 6) {
      return res.status(400).json({ error: 'PIN must be at most 6 digits' });
    }

    // Validate PIN is numeric
    if (!/^\d+$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must contain only numbers' });
    }

    // Only business admins and super admins can set PIN
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only admins can set PIN' });
    }

    // Check if pin_hash column exists
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(users)`).all();
      const hasPinHash = tableInfo.some(col => col.name === 'pin_hash');
      
      if (!hasPinHash) {
        // Try to add the column
        console.log('⚠️  pin_hash column not found, attempting to add it...');
        try {
          db.exec('ALTER TABLE users ADD COLUMN pin_hash TEXT;');
          console.log('✅ pin_hash column added successfully');
        } catch (alterError) {
          console.error('❌ Failed to add pin_hash column:', alterError);
          return res.status(500).json({ error: 'Database schema error. Please contact support.' });
        }
      }
    } catch (schemaError) {
      console.error('Error checking schema:', schemaError);
      return res.status(500).json({ error: 'Database error. Please try again.' });
    }

    const pinHash = await hashPassword(pin);
    const result = db.prepare(`
      UPDATE users SET pin_hash = ?, updated_at = datetime('now') WHERE id = ?
    `).run(pinHash, req.user.id);

    if (result.changes === 0) {
      console.error('No rows updated for user:', req.user.id);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ PIN set successfully for user: ${req.user.id}`);
    res.json({ success: true, message: 'PIN set successfully' });
  } catch (error) {
    console.error('Error setting PIN:', error);
    const errorMessage = error.message || 'Failed to set PIN';
    res.status(500).json({ error: errorMessage });
  }
});

// Verify PIN (for business admin operations)
router.post('/verify-pin', verifyToken, pinLimiter, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'PIN required' });
    }

    // Only business admins and super admins need PIN verification
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'PIN verification not required for your role' });
    }

    const user = db.prepare(`
      SELECT pin_hash FROM users WHERE id = ?
    `).get(req.user.id);

    if (!user.pin_hash) {
      return res.status(400).json({ error: 'PIN not set. Please set a PIN first in settings.' });
    }

    const pinValid = await verifyPassword(pin, user.pin_hash);
    if (!pinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    res.json({ success: true, message: 'PIN verified' });
  } catch (error) {
    console.error('Error verifying PIN:', error);
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

// Check if PIN is set
router.get('/pin-status', verifyToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT pin_hash FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({ hasPin: !!user.pin_hash });
  } catch (error) {
    console.error('Error checking PIN status:', error);
    res.status(500).json({ error: 'Failed to check PIN status' });
  }
});

// Get all businesses (super_admin only)
router.get('/businesses', verifyToken, (req, res) => {
  try {
    if (!req.isSuperAdmin) {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    const businesses = db.prepare(`
      SELECT b.*, u.username as owner_username, u.email as owner_email, u.full_name as owner_name,
             (SELECT COUNT(*) FROM users WHERE business_id = b.id) as user_count
      FROM businesses b
      LEFT JOIN users u ON b.owner_id = u.id
      ORDER BY b.created_at DESC
    `).all();

    res.json(businesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// Get single business (super_admin or business owner)
router.get('/businesses/:id', verifyToken, (req, res) => {
  try {
    const { id } = req.params;

    // Super admin can view any business, regular users can only view their own
    if (!req.isSuperAdmin && req.user.businessId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const business = db.prepare(`
      SELECT b.*, u.username as owner_username, u.email as owner_email, u.full_name as owner_name
      FROM businesses b
      LEFT JOIN users u ON b.owner_id = u.id
      WHERE b.id = ?
    `).get(id);

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(business);
  } catch (error) {
    console.error('Error fetching business:', error);
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

export default router;

