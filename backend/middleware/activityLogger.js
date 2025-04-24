const { logActivity } = require('../utils/logger');

/**
 * Middleware to log user activities
 * @param {string} action - Activity action
 * @returns {Function} - Express middleware
 */
const logActivityMiddleware = (action) => {
  return async (req, res, next) => {
    try {
      // Only log if user is authenticated
      if (req.user && req.user.id) {
        // Extract IP and user agent
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        // Log activity
        await logActivity({
          userId: req.user.id,
          action,
          ip,
          userAgent,
          details: {
            method: req.method,
            path: req.path,
            params: req.params,
            query: req.query,
            body: sanitizeRequestBody(req.body)
          }
        });
      }
      
      next();
    } catch (error) {
      // Don't block the request if logging fails
      console.error('Error in activity logger middleware:', error);
      next();
    }
  };
};

/**
 * Sanitize request body to remove sensitive information
 * @param {Object} body - Request body
 * @returns {Object} - Sanitized body
 */
const sanitizeRequestBody = (body) => {
  if (!body) return {};
  
  // Create a copy of the body
  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

module.exports = logActivityMiddleware;
