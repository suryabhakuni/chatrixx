const router = require('express').Router();
const connectionController = require('../controllers/connectionController');
const auth = require('../middleware/auth');

// Connection routes
router.post('/request', auth, connectionController.sendRequest);
router.put('/:connectionId/accept', auth, connectionController.acceptRequest);
router.delete('/:connectionId', auth, connectionController.removeConnection);
router.post('/block', auth, connectionController.blockUser);
router.put('/:connectionId/unblock', auth, connectionController.unblockUser);
router.get('/', auth, connectionController.getConnections);
router.get('/pending', auth, connectionController.getPendingRequests);
router.get('/blocked', auth, connectionController.getBlockedUsers);

module.exports = router;
