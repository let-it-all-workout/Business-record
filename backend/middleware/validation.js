// Input validation middleware

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 */
export function validateUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  return UUID_REGEX.test(uuid);
}

/**
 * Middleware to validate UUID in route parameters
 */
export function validateUUIDParam(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (id && !validateUUID(id)) {
      return res.status(400).json({ error: `Invalid ${paramName} format. Must be a valid UUID.` });
    }
    next();
  };
}

/**
 * Validate email format
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate numeric input
 */
export function validateNumeric(value, min = null, max = null) {
  if (value === null || value === undefined) {
    return false;
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) {
    return false;
  }
  if (min !== null && num < min) {
    return false;
  }
  if (max !== null && num > max) {
    return false;
  }
  return true;
}

/**
 * Sanitize string input (remove dangerous characters)
 */
export function sanitizeString(str, maxLength = 1000) {
  if (typeof str !== 'string') {
    return '';
  }
  // Remove null bytes and trim
  let sanitized = str.replace(/\0/g, '').trim();
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters' };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    return { 
      valid: false, 
      error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
    };
  }
  
  return { valid: true };
}

