const router = require('express').Router();
const authController = require('../controllers/auth/authController');
const auth = require('../middleware/auth');

// Auth routes
router.post('/google/signup', authController.googleSignUp);
router.post('/google/login', authController.googleLogin);
router.post('/facebook/signup', authController.facebookSignUp);
router.post('/facebook/login', authController.facebookLogin);

router.get('/test', auth, (req, res) => {
    res.json({ 
      message: 'Authentication successful', 
      user: req.user 
    });
  });

// Token verification
router.post('/verify-token', authController.verifyToken);

// Protected routes
router.post('/logout', auth, authController.logout);
router.delete('/delete-account', auth, authController.deleteAccount);

module.exports = router;

