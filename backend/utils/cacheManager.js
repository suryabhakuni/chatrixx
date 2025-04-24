const { redisClient } = require('../config/redis');
const { logger } = require('./logger');

/**
 * Cache manager for Redis
 * Provides methods for caching and retrieving data
 */
class CacheManager {
  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  static async set(key, data, ttl = 3600) {
    try {
      // Serialize data if it's not a string
      const serializedData = typeof data === 'string' 
        ? data 
        : JSON.stringify(data);
      
      // Set data with expiration
      await redisClient.set(key, serializedData, { EX: ttl });
      
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached data or null
   */
  static async get(key) {
    try {
      const data = await redisClient.get(key);
      
      if (!data) return null;
      
      // Try to parse as JSON, return as string if parsing fails
      try {
        return JSON.parse(data);
      } catch (e) {
        return data;
      }
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Delete data from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Delete multiple keys matching a pattern
   * @param {string} pattern - Key pattern (e.g., "user:*")
   * @returns {Promise<number>} - Number of keys deleted
   */
  static async deletePattern(pattern) {
    try {
      // Get keys matching pattern
      const keys = await redisClient.keys(pattern);
      
      if (keys.length === 0) return 0;
      
      // Delete all matching keys
      await redisClient.del(keys);
      
      return keys.length;
    } catch (error) {
      logger.error(`Cache deletePattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }
  
  /**
   * Get or set cache
   * @param {string} key - Cache key
   * @param {Function} dataFn - Function to get data if not cached
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} - Data from cache or function
   */
  static async getOrSet(key, dataFn, ttl = 3600) {
    try {
      // Try to get from cache first
      const cachedData = await this.get(key);
      
      if (cachedData !== null) {
        return cachedData;
      }
      
      // If not in cache, get from function
      const data = await dataFn();
      
      // Cache the result
      await this.set(key, data, ttl);
      
      return data;
    } catch (error) {
      logger.error(`Cache getOrSet error for key ${key}:`, error);
      
      // If cache fails, still try to get data from function
      return await dataFn();
    }
  }
  
  /**
   * Increment a counter
   * @param {string} key - Counter key
   * @param {number} increment - Increment amount
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<number>} - New counter value
   */
  static async increment(key, increment = 1, ttl = 86400) {
    try {
      // Increment counter
      const newValue = await redisClient.incrBy(key, increment);
      
      // Set expiration if it's a new key
      if (newValue === increment) {
        await redisClient.expire(key, ttl);
      }
      
      return newValue;
    } catch (error) {
      logger.error(`Cache increment error for key ${key}:`, error);
      return -1;
    }
  }
  
  /**
   * Add to a sorted set
   * @param {string} key - Set key
   * @param {number} score - Score for sorting
   * @param {string} member - Set member
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  static async addToSortedSet(key, score, member, ttl = 86400) {
    try {
      // Add to sorted set
      await redisClient.zAdd(key, { score, value: member });
      
      // Set expiration
      await redisClient.expire(key, ttl);
      
      return true;
    } catch (error) {
      logger.error(`Cache addToSortedSet error for key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Get top members from a sorted set
   * @param {string} key - Set key
   * @param {number} count - Number of members to get
   * @returns {Promise<Array>} - Array of members
   */
  static async getTopFromSortedSet(key, count = 10) {
    try {
      // Get top members by score (highest first)
      return await redisClient.zRange(key, 0, count - 1, { REV: true });
    } catch (error) {
      logger.error(`Cache getTopFromSortedSet error for key ${key}:`, error);
      return [];
    }
  }
}

module.exports = CacheManager;
