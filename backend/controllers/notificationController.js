const User = require('../models/User');
const {
  sendNotificationToDevice,
  sendNotificationToDevices,
  subscribeToTopic,
  unsubscribeFromTopic
} = require('../utils/fcm');

const notificationController = {
  // Register FCM token
  registerToken: async (req, res) => {
    try {
      const { token, device } = req.body;

      if (!token) {
        return res.status(400).json({ message: 'FCM token is required' });
      }

      // Check if token already exists
      const user = await User.findById(req.user.id);
      const tokenExists = user.fcmTokens.some(t => t.token === token);

      if (!tokenExists) {
        // Add new token
        user.fcmTokens.push({
          token,
          device: device || 'unknown',
          createdAt: new Date()
        });

        await user.save();

        // Subscribe to user's personal topic
        await subscribeToTopic(token, `user_${user._id}`);
      }

      res.json({ message: 'FCM token registered successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Remove FCM token
  removeToken: async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: 'FCM token is required' });
      }

      // Remove token from user
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { fcmTokens: { token } }
      });

      // Unsubscribe from user's personal topic
      await unsubscribeFromTopic(token, `user_${req.user.id}`);

      res.json({ message: 'FCM token removed successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Update notification settings
  updateSettings: async (req, res) => {
    try {
      const {
        messages,
        groupMessages,
        connectionRequests,
        messageReactions,
        muteAll,
        emailNotifications
      } = req.body;

      const updateData = {};

      if (messages !== undefined) updateData['notificationSettings.messages'] = messages;
      if (groupMessages !== undefined) updateData['notificationSettings.groupMessages'] = groupMessages;
      if (connectionRequests !== undefined) updateData['notificationSettings.connectionRequests'] = connectionRequests;
      if (messageReactions !== undefined) updateData['notificationSettings.messageReactions'] = messageReactions;
      if (muteAll !== undefined) updateData['notificationSettings.muteAll'] = muteAll;
      if (emailNotifications !== undefined) updateData['notificationSettings.emailNotifications'] = emailNotifications;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No settings provided to update' });
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateData },
        { new: true }
      );

      res.json({
        message: 'Notification settings updated successfully',
        settings: user.notificationSettings
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Get notification settings
  getSettings: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      res.json(user.notificationSettings);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  // Send test notification
  sendTestNotification: async (req, res) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user.fcmTokens.length) {
        return res.status(400).json({ message: 'No FCM tokens registered for this user' });
      }

      const tokens = user.fcmTokens.map(t => t.token);

      const notification = {
        title: 'Test Notification',
        body: 'This is a test notification from Chatrixx'
      };

      const data = {
        type: 'test',
        timestamp: Date.now().toString()
      };

      const result = await sendNotificationToDevices(tokens, notification, data);

      if (result.success) {
        res.json({
          message: 'Test notification sent successfully',
          successCount: result.successCount,
          failureCount: result.failureCount
        });
      } else {
        res.status(500).json({ message: 'Failed to send test notification', error: result.error });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = notificationController;
