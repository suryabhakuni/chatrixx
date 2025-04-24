const router = require('express').Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const Joi = require('joi');

// Validation schemas
const notificationSchemas = {
  registerToken: Joi.object({
    token: Joi.string().required(),
    device: Joi.string()
  }),
  
  removeToken: Joi.object({
    token: Joi.string().required()
  }),
  
  updateSettings: Joi.object({
    messages: Joi.boolean(),
    groupMessages: Joi.boolean(),
    connectionRequests: Joi.boolean(),
    messageReactions: Joi.boolean(),
    muteAll: Joi.boolean()
  }).min(1)
};

// Notification routes
router.post('/token', auth, validate(notificationSchemas.registerToken), notificationController.registerToken);
router.delete('/token', auth, validate(notificationSchemas.removeToken), notificationController.removeToken);
router.put('/settings', auth, validate(notificationSchemas.updateSettings), notificationController.updateSettings);
router.get('/settings', auth, notificationController.getSettings);
router.post('/test', auth, notificationController.sendTestNotification);

module.exports = router;
