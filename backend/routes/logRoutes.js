const router = require('express').Router();
const logController = require('../controllers/logController');
const auth = require('../middleware/auth');

// Get user's activity logs
router.get('/user', auth, logController.getUserLogs);

// Admin routes (would need admin middleware in a real implementation)
router.get('/admin', auth, logController.getAdminLogs);
router.post('/cleanup', auth, logController.cleanupLogs);

module.exports = router;
