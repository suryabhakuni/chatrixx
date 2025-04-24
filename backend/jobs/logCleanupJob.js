const cron = require('node-cron');
const { cleanupActivityLogs, logger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Job to clean up old logs
 * Runs daily to delete logs older than the specified retention period
 */
const startLogCleanupJob = () => {
  // Schedule job to run at 3:00 AM every day
  cron.schedule('0 3 * * *', async () => {
    try {
      logger.info('Running log cleanup job...');
      
      // Clean up database logs (keep 90 days)
      const deletedCount = await cleanupActivityLogs(90);
      logger.info(`Deleted ${deletedCount} old activity logs from database`);
      
      // Clean up file logs (keep 30 days)
      cleanupFileLogsByAge(30);
    } catch (error) {
      logger.error('Error in log cleanup job:', error);
    }
  });
  
  logger.info('Log cleanup job scheduled');
};

/**
 * Clean up log files older than the specified age
 * @param {number} daysToKeep - Number of days to keep logs
 */
const cleanupFileLogsByAge = (daysToKeep) => {
  try {
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) return;
    
    const files = fs.readdirSync(logsDir);
    const now = new Date();
    const cutoffDate = new Date(now.setDate(now.getDate() - daysToKeep));
    
    let deletedCount = 0;
    
    files.forEach(file => {
      if (file === '.gitkeep') return;
      
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        // For log files, we want to keep the current ones
        // So we'll only delete files that have rotated (have date in filename)
        if (file.match(/\d{4}-\d{2}-\d{2}/)) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
    });
    
    logger.info(`Deleted ${deletedCount} old log files`);
  } catch (error) {
    logger.error('Error cleaning up log files:', error);
  }
};

module.exports = { startLogCleanupJob };
