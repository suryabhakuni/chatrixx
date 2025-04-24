const router = require('express').Router();
const exportController = require('../controllers/exportController');
const auth = require('../middleware/auth');

// Export conversation to file (CSV or JSON)
router.get('/conversation/:conversationId', auth, exportController.exportConversation);

module.exports = router;
