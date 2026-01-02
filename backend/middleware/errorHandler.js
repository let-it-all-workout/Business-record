/**
 * Centralized Error Handling Middleware
 * 
 * This middleware ensures that:
 * - Detailed errors are logged server-side for debugging
 * - Generic, safe error messages are returned to clients
 * - Error IDs are generated for tracking in production
 * - No sensitive information (paths, stack traces, DB structure) is exposed
 */

import { randomBytes } from 'crypto';

// Error categories for better logging
const ERROR_CATEGORIES = {
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  NOT_FOUND: 'NOT_FOUND',
  DATABASE: 'DATABASE',
  NETWORK: 'NETWORK',
  INTERNAL: 'INTERNAL',
};

// Generate a unique error ID for tracking
function generateErrorId() {
  return randomBytes(8).toString('hex');
}

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Sanitize error message - remove sensitive information
function sanitizeErrorMessage(error) {
  let message = error.message || String(error);
  
  // Remove file paths
  message = message.replace(/\/[^\s]+/g, '[path]');
  
  // Remove stack traces
  message = message.split('\n')[0];
  
  // Remove database connection strings
  message = message.replace(/postgresql:\/\/[^\s]+/gi, '[database]');
  message = message.replace(/postgres:\/\/[^\s]+/gi, '[database]');
  
  // Remove UUIDs (might be sensitive)
  message = message.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]');
  
  // Remove long hex strings
  message = message.replace(/[0-9a-f]{32,}/gi, '[hash]');
  
  // Limit message length
  if (message.length > 200) {
    message = message.substring(0, 197) + '...';
  }
  
  return message;
}

// Map database errors to user-friendly messages
function mapDatabaseError(error) {
  const message = error.message || String(error);
  
  // PostgreSQL errors
  if (message.includes('UNIQUE constraint') || message.includes('duplicate key')) {
    return { 
      userMessage: 'This record already exists. Please check for duplicates.',
      category: ERROR_CATEGORIES.VALIDATION 
    };
  }
  
  if (message.includes('NOT NULL constraint') || message.includes('null value')) {
    return { 
      userMessage: 'Required information is missing. Please check all fields are filled.',
      category: ERROR_CATEGORIES.VALIDATION 
    };
  }
  
  if (message.includes('FOREIGN KEY constraint') || message.includes('violates foreign key')) {
    return { 
      userMessage: 'Invalid reference. The related record does not exist.',
      category: ERROR_CATEGORIES.VALIDATION 
    };
  }
  
  if (message.includes('invalid input syntax') || message.includes('invalid uuid')) {
    return { 
      userMessage: 'Invalid data format. Please check your input.',
      category: ERROR_CATEGORIES.VALIDATION 
    };
  }
  
  if (message.includes('relation') && message.includes('does not exist')) {
    return { 
      userMessage: 'Database configuration error. Please contact support.',
      category: ERROR_CATEGORIES.DATABASE 
    };
  }
  
  if (message.includes('connection') || message.includes('timeout')) {
    return { 
      userMessage: 'Database connection error. Please try again later.',
      category: ERROR_CATEGORIES.DATABASE 
    };
  }
  
  return null;
}

// Main error handler
export function handleError(error, req, res, defaultMessage = 'An error occurred') {
  const errorId = generateErrorId();
  const sanitizedMessage = sanitizeErrorMessage(error);
  const dbErrorMapping = mapDatabaseError(error);
  
  // Determine user-facing message
  let userMessage = defaultMessage;
  let category = ERROR_CATEGORIES.INTERNAL;
  
  if (dbErrorMapping) {
    userMessage = dbErrorMapping.userMessage;
    category = dbErrorMapping.category;
  } else if (isDevelopment) {
    // In development, show more details (but still sanitized)
    userMessage = sanitizedMessage || defaultMessage;
  }
  
  // Log detailed error server-side
  console.error(`[${category}] Error ID: ${errorId}`, {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
  });
  
  // Return safe error to client
  const response = {
    error: userMessage,
    errorId: errorId, // Include error ID for support tracking
  };
  
  // Only include sanitized details in development
  if (isDevelopment) {
    response.details = sanitizedMessage;
  }
  
  return response;
}

// Express error handler middleware
export function errorHandlerMiddleware(err, req, res, next) {
  // If response already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }
  
  const errorResponse = handleError(err, req, res);
  
  // Determine status code
  let statusCode = 500;
  if (err.statusCode) {
    statusCode = err.statusCode;
  } else if (err.status) {
    statusCode = err.status;
  } else if (err.message?.includes('not found')) {
    statusCode = 404;
  } else if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
    statusCode = 401;
  } else if (err.message?.includes('forbidden') || err.message?.includes('permission')) {
    statusCode = 403;
  } else if (err.message?.includes('validation') || err.message?.includes('invalid')) {
    statusCode = 400;
  }
  
  res.status(statusCode).json(errorResponse);
}

// Helper function for async route handlers
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Helper to create custom error responses
export function createErrorResponse(message, statusCode = 400, category = ERROR_CATEGORIES.VALIDATION) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.category = category;
  return error;
}

export { ERROR_CATEGORIES };

