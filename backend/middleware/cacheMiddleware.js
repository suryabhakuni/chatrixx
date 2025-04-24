const CacheManager = require('../utils/cacheManager');
const { logger } = require('../utils/logger');

/**
 * Middleware to cache API responses
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyFn - Function to generate cache key (optional)
 * @returns {Function} - Express middleware
 */
const cacheMiddleware = (ttl = 3600, keyFn = null) => {
  return async (req, res, next) => {
    try {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }
      
      // Generate cache key
      const cacheKey = keyFn 
        ? keyFn(req) 
        : `cache:${req.originalUrl}:${req.user ? req.user.id : 'anonymous'}`;
      
      // Try to get from cache
      const cachedData = await CacheManager.get(cacheKey);
      
      if (cachedData !== null) {
        // Return cached response
        return res.json(cachedData);
      }
      
      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data) {
        // Cache the response data
        CacheManager.set(cacheKey, data, ttl)
          .catch(err => logger.error('Error caching response:', err));
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Middleware to cache API responses with custom key generator
 * @param {Object} options - Cache options
 * @returns {Function} - Express middleware
 */
const cache = (options = {}) => {
  const { ttl = 3600, key = null } = options;
  return cacheMiddleware(ttl, key);
};

/**
 * Clear cache for a specific pattern
 * @param {string} pattern - Cache key pattern
 * @returns {Promise<number>} - Number of keys cleared
 */
const clearCache = async (pattern) => {
  return await CacheManager.deletePattern(pattern);
};

module.exports = {
  cache,
  clearCache
};
