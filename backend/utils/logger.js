const ActivityLog = require('../models/ActivityLog');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'chatrixx-api' },
  transports: [
    // Write to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Write to all logs with level 'info' and above
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log') 
    }),
    // Write all logs with level 'error' and above
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error' 
    })
  ]
});

/**
 * Log user activity to database
 * @param {Object} data - Activity data
 * @returns {Promise<Object>} - Created activity log
 */
const logActivity = async (data) => {
  try {
    const { userId, action, ip, userAgent, details } = data;
    
    // Log to database
    const activityLog = new ActivityLog({
      userId,
      action,
      ip,
      userAgent,
      details,
      timestamp: new Date()
    });
    
    await activityLog.save();
    
    // Also log to Winston
    logger.info(`User ${userId} performed ${action}`, {
      userId,
      action,
      ip,
      details
    });
    
    return activityLog;
  } catch (error) {
    logger.error('Error logging activity:', error);
    // Don't throw error to prevent disrupting the main application flow
    return null;
  }
};

/**
 * Get activity logs for a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Activity logs
 */
const getUserActivityLogs = async (userId, options = {}) => {
  try {
    const { 
      limit = 50, 
      page = 1,
      startDate,
      endDate,
      actions
    } = options;
    
    const query = { userId };
    
    // Filter by date range
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Filter by actions
    if (actions && actions.length > 0) {
      query.action = { $in: actions };
    }
    
    // Get logs with pagination
    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    return logs;
  } catch (error) {
    logger.error('Error getting user activity logs:', error);
    throw error;
  }
};

/**
 * Clean up old activity logs
 * @param {number} daysToKeep - Number of days to keep logs
 * @returns {Promise<number>} - Number of deleted logs
 */
const cleanupActivityLogs = async (daysToKeep = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const result = await ActivityLog.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    logger.info(`Cleaned up ${result.deletedCount} old activity logs`);
    return result.deletedCount;
  } catch (error) {
    logger.error('Error cleaning up activity logs:', error);
    throw error;
  }
};

module.exports = {
  logger,
  logActivity,
  getUserActivityLogs,
  cleanupActivityLogs
};
