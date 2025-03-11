const router = require('express').Router();
const conversationController = require('../controllers/conversationController');
const auth = require('../middleware/auth');

router.post('/direct', auth, conversationController.createOrGetConversation);
router.post('/group', auth, conversationController.createGroup);
router.get('/', auth, conversationController.getConversations);

module.exports = router;