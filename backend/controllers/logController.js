const { getUserActivityLogs, cleanupActivityLogs } = require('../utils/logger');

const logController = {
  // Get user's activity logs
  getUserLogs: async (req, res) => {
    try {
      const { 
        limit = 50, 
        page = 1,
        startDate,
        endDate,
        actions
      } = req.query;
      
      // Parse actions if provided
      const parsedActions = actions ? actions.split(',') : null;
      
      // Get logs
      const logs = await getUserActivityLogs(req.user.id, {
        limit: parseInt(limit),
        page: parseInt(page),
        startDate,
        endDate,
        actions: parsedActions
      });
      
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  // Get admin activity logs (for all users)
  getAdminLogs: async (req, res) => {
    try {
      // This endpoint would require admin authorization
      // For now, just return an error
      res.status(403).json({ message: 'Admin access required' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  
  // Clean up old logs (admin only)
  cleanupLogs: async (req, res) => {
    try {
      // This endpoint would require admin authorization
      // For now, just return an error
      res.status(403).json({ message: 'Admin access required' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = logController;
