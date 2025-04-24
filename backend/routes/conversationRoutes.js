const router = require('express').Router();
const conversationController = require('../controllers/conversationController');
const auth = require('../middleware/auth');
const { cache } = require('../middleware/cacheMiddleware');

router.post('/direct', auth, conversationController.createOrGetConversation);
router.post('/group', auth, conversationController.createGroup);
router.get('/', auth, cache({ ttl: 300 }), conversationController.getConversations);
router.put('/group/:groupId', auth, conversationController.updateGroup);
router.post('/group/:groupId/participants', auth, conversationController.addParticipants);
router.delete('/group/:groupId/participants/:participantId', auth, conversationController.removeParticipant);
router.post('/group/:groupId/leave', auth, conversationController.leaveGroup);

// Encryption routes
router.put('/:conversationId/encryption', auth, conversationController.toggleEncryption);
router.get('/:conversationId/encryption', auth, cache({ ttl: 3600 }), conversationController.getEncryptionStatus);

// Archive routes
router.put('/:conversationId/archive', auth, conversationController.archiveConversation);
router.put('/:conversationId/unarchive', auth, conversationController.unarchiveConversation);
router.get('/archived', auth, cache({ ttl: 300 }), conversationController.getArchivedConversations);

// Message expiration routes
router.put('/:conversationId/expiration', auth, conversationController.setMessageExpiration);
router.get('/:conversationId/expiration', auth, cache({ ttl: 3600 }), conversationController.getMessageExpiration);

module.exports = router;
