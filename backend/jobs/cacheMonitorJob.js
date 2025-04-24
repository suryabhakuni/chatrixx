const cron = require('node-cron');
const { redisClient } = require('../config/redis');
const { logger } = require('../utils/logger');

/**
 * Job to monitor Redis cache usage
 * Runs every hour to collect cache statistics
 */
const startCacheMonitorJob = () => {
  // Schedule job to run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Running cache monitor job...');
      
      // Get Redis info
      const info = await redisClient.info();
      
      // Parse Redis info
      const stats = parseRedisInfo(info);
      
      // Log cache statistics
      logger.info('Redis cache statistics:', {
        usedMemory: stats.used_memory_human,
        peakMemory: stats.used_memory_peak_human,
        clients: stats.connected_clients,
        commands: stats.total_commands_processed,
        keyspaceHits: stats.keyspace_hits,
        keyspaceMisses: stats.keyspace_misses,
        hitRate: calculateHitRate(stats)
      });
      
      // Check if cache hit rate is below threshold
      const hitRate = calculateHitRate(stats);
      if (hitRate < 0.7) { // 70% hit rate threshold
        logger.warn(`Low cache hit rate: ${(hitRate * 100).toFixed(2)}%. Consider reviewing cache strategy.`);
      }
      
      // Check if memory usage is high
      const memoryUsage = parseMemoryUsage(stats.used_memory_human);
      if (memoryUsage > 500) { // 500MB threshold
        logger.warn(`High Redis memory usage: ${stats.used_memory_human}. Consider increasing maxmemory or reviewing cache TTLs.`);
      }
    } catch (error) {
      logger.error('Error in cache monitor job:', error);
    }
  });
  
  logger.info('Cache monitor job scheduled');
};

/**
 * Parse Redis INFO command output
 * @param {string} info - Redis INFO output
 * @returns {Object} - Parsed Redis stats
 */
const parseRedisInfo = (info) => {
  const lines = info.split('\\r\\n');
  const stats = {};
  
  lines.forEach(line => {
    if (line.includes(':')) {
      const [key, value] = line.split(':');
      stats[key.trim()] = value.trim();
    }
  });
  
  return stats;
};

/**
 * Calculate cache hit rate
 * @param {Object} stats - Redis stats
 * @returns {number} - Hit rate (0-1)
 */
const calculateHitRate = (stats) => {
  const hits = parseInt(stats.keyspace_hits || 0);
  const misses = parseInt(stats.keyspace_misses || 0);
  
  if (hits + misses === 0) return 1; // No requests yet
  
  return hits / (hits + misses);
};

/**
 * Parse memory usage string to MB
 * @param {string} memoryString - Memory string (e.g., "1.5G", "500M")
 * @returns {number} - Memory in MB
 */
const parseMemoryUsage = (memoryString) => {
  try {
    const value = parseFloat(memoryString);
    const unit = memoryString.slice(-1).toUpperCase();
    
    switch (unit) {
      case 'G': return value * 1024;
      case 'M': return value;
      case 'K': return value / 1024;
      default: return value / (1024 * 1024); // Assume bytes
    }
  } catch (error) {
    return 0;
  }
};

module.exports = { startCacheMonitorJob };
