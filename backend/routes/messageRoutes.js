const router = require('express').Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

router.post('/', auth, messageController.sendMessage);
router.get('/:conversationId', auth, messageController.getMessages);
router.post('/:messageId/reaction', auth, messageController.addReaction);

module.exports = router;