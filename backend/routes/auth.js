import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import db from '../database/db-postgres.js';
import { validateUUIDParam, validateUUID, sanitizeString, validateEmail } from '../middleware/validation.js';
import { handleError } from '../middleware/errorHandler.js';

const router = express.Router();

// Default user initialization removed - use admin management script instead

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
    const result = await bcrypt.compare(password, hash);
    return result;
  }
  
  // Legacy SHA256 support for migration
  const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
  const result = sha256Hash === hash;
  return result;
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
    let { username, email, password, fullName, businessName } = req.body;

    if (!username || !email || !password || !fullName || !businessName) {
      return res.status(400).json({ error: 'Missing required fields: username, email, password, fullName, businessName' });
    }

    // Sanitize and validate inputs
    username = sanitizeString(username, 50);
    email = email.trim().toLowerCase();
    fullName = sanitizeString(fullName, 100);
    businessName = sanitizeString(businessName, 100);
    
    // Input validation
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Strong password requirements
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    // Check for password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
      });
    }
    if (fullName.length < 2 || fullName.length > 100) {
      return res.status(400).json({ error: 'Full name must be between 2 and 100 characters' });
    }
    if (businessName.length < 2 || businessName.length > 100) {
      return res.status(400).json({ error: 'Business name must be between 2 and 100 characters' });
    }

    // Check if username or email already exists
    const existingUser = await db.prepare(`
      SELECT id FROM users WHERE username = $1 OR email = $2
    `).get(username, email);

    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password with bcrypt
    const passwordHash = await hashPassword(password);

    // Use transaction to create user and business atomically (PostgreSQL)
    // PostgreSQL handles foreign keys better - we can create user first, then business, then update user
    const transactionFn = db.transaction(async (txDb) => {
      // Step 1: Create user first (without business_id - PostgreSQL allows NULL)
      const userResult = await txDb.prepare(`
        INSERT INTO users (username, email, password_hash, full_name, role, is_active, business_id)
        VALUES ($1, $2, $3, $4, 'admin', true, NULL)
        RETURNING id
      `).get(username, email, passwordHash, fullName);
      
      const userId = userResult.id;
      
      // Step 2: Create business with owner_id pointing to user
      const businessResult = await txDb.prepare(`
        INSERT INTO businesses (name, owner_id, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        RETURNING id
      `).get(businessName, userId);
      
      const businessId = businessResult.id;
      
      // Step 3: Update user with business_id
      await txDb.prepare(`
        UPDATE users SET business_id = $1 WHERE id = $2
      `).run(businessId, userId);
      
      return { userId, businessId, username, email, fullName };
    });
    
    const result = await transactionFn();

    // If transaction failed, result will be undefined and error will be caught by outer catch
    if (!result) {
      throw new Error('Transaction failed - result is undefined');
    }

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
    // Use centralized error handler
    const errorResponse = handleError(error, req, res, 'Failed to register user. Please try again.');
    
    // Handle specific error cases
    const errorMessage = error.message || String(error);
    if (errorMessage.includes('UNIQUE constraint') || errorMessage.includes('duplicate key')) {
      return res.status(409).json({ error: 'Username or email already exists', errorId: errorResponse.errorId });
    }
    
    res.status(500).json(errorResponse);
  }
});

// Super admin creation endpoint removed - use admin management script instead

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
    const user = await db.prepare(`
      SELECT id, username, email, full_name, role, is_active, business_id, password_hash
      FROM users
      WHERE username = $1
    `).get(username);

    if (!user || !user.is_active) {
      // Don't reveal whether user exists or is inactive (security best practice)
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
      await db.prepare('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2')
        .run(newPasswordHash, user.id);
      // Password migration completed (no sensitive info logged)
    }

    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Insert session (PostgreSQL will generate UUID)
    const sessionResult = await db.prepare(`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id
    `).get(user.id, token, expiresAt);

    // Update last login
    await db.prepare(`
      UPDATE users SET last_login = NOW() WHERE id = $1
    `).run(user.id);

    // Get business info if user belongs to a business
    let business = null;
    if (user.business_id) {
      try {
        business = await db.prepare('SELECT id, name FROM businesses WHERE id = $1').get(user.business_id);
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
    const errorResponse = handleError(error, req, res, 'Failed to login. Please try again.');
    res.status(500).json(errorResponse);
  }
});

// Verify token (middleware) - ASYNC for PostgreSQL
export async function verifyToken(req, res, next) {
  try {
    // Extract token from Authorization header only (security: no query string)
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, '') || authHeader?.replace(/^bearer\s+/i, '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Try to find session with exact token match (async)
    let session = await db.prepare(`
      SELECT s.*, u.username, u.email, u.full_name, u.role, u.is_active, u.business_id
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = $1
    `).get(token);
    
    // If no exact match, try trimmed token (in case of whitespace issues)
    if (!session && token) {
      const trimmedToken = token.trim();
      if (trimmedToken !== token) {
        session = await db.prepare(`
          SELECT s.*, u.username, u.email, u.full_name, u.role, u.is_active, u.business_id
          FROM sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.token = $1
        `).get(trimmedToken);
      }
    }

    // Check each condition separately for better debugging
    const expired = session ? isTokenExpired(session.expires_at) : false;
    const inactive = session ? !session.is_active : false;
    
    if (!session || expired || inactive) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        details: !session ? 'Session not found' : expired ? 'Session expired' : 'User inactive'
      });
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
    
    // All users are restricted to their business_id

    next();
  } catch (error) {
    const errorResponse = handleError(error, req, res, 'Token verification failed');
    res.status(500).json(errorResponse);
  }
}

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    let business = null;
    if (req.user.businessId) {
      business = await db.prepare('SELECT id, name FROM businesses WHERE id = $1').get(req.user.businessId);
    }
  
    res.json({
      success: true,
      user: req.user,
      business: business ? { id: business.id, name: business.name } : null,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Logout
router.post('/logout', verifyToken, async (req, res) => {
  try {
    await db.prepare('DELETE FROM sessions WHERE id = $1').run(req.sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// Diagnostic endpoint - check session status (for debugging, no auth required)
router.get('/session/debug', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    if (!token) {
      return res.json({
        error: 'No token provided',
        tokenExists: false
      });
    }
    
    const session = await db.prepare(`
      SELECT s.*, u.username, u.email, u.full_name, u.role, u.is_active, u.business_id
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = $1
    `).get(token);
    
    const totalSessionsResult = await db.prepare('SELECT COUNT(*) as count FROM sessions').get();
    const totalSessions = totalSessionsResult?.count || 0;
    
    res.json({
      tokenExists: !!token,
      tokenLength: token?.length,
      tokenPreview: token ? `${token.substring(0, 10)}...` : null,
      sessionFound: !!session,
      session: session ? {
        id: session.id,
        userId: session.user_id,
        username: session.username,
        role: session.role,
        isActive: session.is_active,
        expiresAt: session.expires_at,
        isExpired: isTokenExpired(session.expires_at)
      } : null,
      totalSessions: totalSessions
    });
  } catch (error) {
    const errorResponse = handleError(error, req, res, 'Failed to get session info');
    res.status(500).json(errorResponse);
  }
});

// Diagnostic endpoint removed - use admin management script instead

// Get all users (admin of business only)
router.get('/users', verifyToken, async (req, res) => {
  try {
    // Business admin can only see users in their business
    if (req.user.role === 'admin' && req.user.businessId) {
      const users = await db.prepare(`
        SELECT id, username, email, full_name, role, is_active, business_id, created_at, last_login
        FROM users
        WHERE business_id = $1
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

// Create user within existing business (admin only)
router.post('/users', verifyToken, async (req, res) => {
  try {
    // Only business admins can create users
    if (req.user.role !== 'admin' || !req.user.businessId) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    let { username, email, password, fullName, role } = req.body;

    // Validate required fields (no businessName needed - user is added to existing business)
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required fields: username, email, password, fullName' });
    }

    // Default role to 'staff' if not provided
    if (!role) {
      role = 'staff';
    }

    // Validate role
    const allowedRoles = ['admin', 'manager', 'staff', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be one of: admin, manager, staff, viewer' });
    }

    // Sanitize and validate inputs
    username = sanitizeString(username, 50);
    email = email.trim().toLowerCase();
    fullName = sanitizeString(fullName, 100);
    
    // Input validation
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'Username must be between 3 and 50 characters' });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Strong password requirements
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    // Check for password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
      });
    }
    
    if (fullName.length < 2 || fullName.length > 100) {
      return res.status(400).json({ error: 'Full name must be between 2 and 100 characters' });
    }

    // Check if username or email already exists
    const existingUser = await db.prepare(`
      SELECT id FROM users WHERE username = $1 OR email = $2
    `).get(username, email);

    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password with bcrypt
    const passwordHash = await hashPassword(password);

    // Create user within the current business
    const userResult = await db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, role, is_active, business_id)
      VALUES ($1, $2, $3, $4, $5, true, $6)
      RETURNING id, username, email, full_name, role, is_active, business_id, created_at
    `).get(username, email, passwordHash, fullName, role, req.user.businessId);

    res.json({
      success: true,
      user: {
        id: userResult.id,
        username: userResult.username,
        email: userResult.email,
        fullName: userResult.full_name,
        role: userResult.role,
        businessId: userResult.business_id,
        isActive: userResult.is_active,
        createdAt: userResult.created_at,
      },
    });
  } catch (error) {
    const errorResponse = handleError(error, req, res, 'Failed to create user. Please try again.');
    
    // Handle specific error cases
    const errorMessage = error.message || String(error);
    if (errorMessage.includes('UNIQUE constraint') || errorMessage.includes('duplicate key')) {
      return res.status(409).json({ error: 'Username or email already exists', errorId: errorResponse.errorId });
    }
    
    res.status(500).json(errorResponse);
  }
});

// Update user
router.put('/users/:id', verifyToken, validateUUIDParam('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, role, isActive } = req.body;

    // Business admin can only update users in their business
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if user belongs to same business
    {
      const targetUser = await db.prepare('SELECT business_id FROM users WHERE id = $1').get(id);
      if (!targetUser || targetUser.business_id !== req.user.businessId) {
        return res.status(403).json({ error: 'Can only update users in your business' });
      }
    }

    // Build update query safely with parameterized values (PostgreSQL style)
    const updates = [];
    const values = [];
    let paramIndex = 1;

    // Validate and add allowed fields only
    if (fullName !== undefined && typeof fullName === 'string' && fullName.trim().length > 0) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(fullName.trim());
    }
    if (email !== undefined && typeof email === 'string' && email.trim().length > 0) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(email.trim());
    }
    if (role !== undefined) {
      // Validate role against allowed values
      const allowedRoles = ['admin', 'manager', 'staff', 'viewer'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive === true || isActive === 1);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    // Add updated_at
    updates.push(`updated_at = NOW()`);
    // Add id to values
    values.push(id);

    const setClause = updates.join(', ');

    await db.prepare(`
      UPDATE users SET ${setClause} WHERE id = $${paramIndex}
    `).run(...values);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', verifyToken, validateUUIDParam('id'), async (req, res) => {
  try {
    const { id } = req.params;

    // Business admin can only delete users in their business
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user belongs to same business (unless super admin)
    // Business admin only
    {
      const targetUser = await db.prepare('SELECT business_id FROM users WHERE id = $1').get(id);
      if (!targetUser || targetUser.business_id !== req.user.businessId) {
        return res.status(403).json({ error: 'Can only delete users in your business' });
      }
    }

    await db.prepare('DELETE FROM users WHERE id = $1').run(id);
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

    // Strong password requirements
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    // Check for password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return res.status(400).json({ 
        error: 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
      });
    }

    const user = await db.prepare(`
      SELECT password_hash FROM users WHERE id = $1
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password (supports both bcrypt and legacy SHA256)
    const passwordValid = await verifyPassword(currentPassword, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }

    // Hash new password with bcrypt
    const newPasswordHash = await hashPassword(newPassword);
    await db.prepare(`
      UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2
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
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can set PIN' });
    }

    // PIN hash column should exist in PostgreSQL schema
    const pinHash = await hashPassword(pin);
    const result = await db.prepare(`
      UPDATE users SET pin_hash = $1, updated_at = NOW() WHERE id = $2
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
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'PIN verification not required for your role' });
    }

    const user = await db.prepare(`
      SELECT pin_hash FROM users WHERE id = $1
    `).get(req.user.id);

    if (!user || !user.pin_hash) {
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
router.get('/pin-status', verifyToken, async (req, res) => {
  try {
    const user = await db.prepare(`
      SELECT pin_hash FROM users WHERE id = $1
    `).get(req.user.id);

    res.json({ hasPin: !!user?.pin_hash });
  } catch (error) {
    console.error('Error checking PIN status:', error);
    res.status(500).json({ error: 'Failed to check PIN status' });
  }
});

// Diagnostic endpoint: Check current user's role (no auth required for debugging)
router.get('/my-role', verifyToken, (req, res) => {
  try {
    res.json({
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      businessId: req.user.businessId,
      isActive: req.user.isActive
    });
  } catch (error) {
    console.error('Error in /my-role endpoint:', error);
    res.status(500).json({ error: 'Failed to get user role' });
  }
});

// Get all businesses endpoint removed - use admin management script instead

// Get single business (business owner only)
router.get('/businesses/:id', verifyToken, validateUUIDParam('id'), async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own business
    if (req.user.businessId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const business = await db.prepare(`
      SELECT b.*, u.username as owner_username, u.email as owner_email, u.full_name as owner_name
      FROM businesses b
      LEFT JOIN users u ON b.owner_id = u.id
      WHERE b.id = $1
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

