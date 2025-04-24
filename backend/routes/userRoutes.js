const router = require('express').Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const { cache } = require('../middleware/cacheMiddleware');

router.get('/profile', auth, cache({ ttl: 3600 }), userController.getProfile);
router.put('/profile', auth, userController.updateProfile);
router.get('/search', auth, cache({ ttl: 300 }), userController.searchUsers);

module.exports = router;