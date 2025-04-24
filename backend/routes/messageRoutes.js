const router = require('express').Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');
const { validate, messageSchemas } = require('../middleware/validator');
const { cache } = require('../middleware/cacheMiddleware');

router.post('/', auth, validate(messageSchemas.sendMessage), messageController.sendMessage);
router.get('/search/global', auth, cache({ ttl: 300 }), messageController.globalSearch);
router.get('/search/:conversationId', auth, cache({ ttl: 300 }), messageController.searchMessages);
router.get('/thread/:messageId', auth, cache({ ttl: 600 }), messageController.getThreadMessages);
router.get('/:conversationId', auth, cache({ ttl: 60 }), messageController.getMessages);
router.post('/:conversationId/thread/:parentMessageId', auth, validate(messageSchemas.sendMessage), messageController.replyToThread);
router.post('/:messageId/reaction', auth, validate(messageSchemas.addReaction), messageController.addReaction);
router.delete('/:messageId/reaction', auth, messageController.removeReaction);
router.delete('/:messageId', auth, messageController.deleteMessage);
router.put('/:messageId', auth, validate(messageSchemas.editMessage), messageController.editMessage);
router.post('/:conversationId/clear', auth, messageController.clearChatHistory);

module.exports = router;
