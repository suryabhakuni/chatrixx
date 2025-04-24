const Message = require('../models/Message');
const cron = require('node-cron');

/**
 * Job to delete expired messages
 * Runs every hour to check for and delete messages that have passed their expiration time
 */
const startMessageExpirationJob = () => {
  // Schedule job to run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Running message expiration job...');
      
      // Find and delete messages that have expired
      const result = await Message.deleteMany({
        expiresAt: { $lte: new Date() }
      });
      
      console.log(`Deleted ${result.deletedCount} expired messages`);
    } catch (error) {
      console.error('Error in message expiration job:', error);
    }
  });
  
  console.log('Message expiration job scheduled');
};

module.exports = { startMessageExpirationJob };
