const User = require('../models/User');
const Conversation = require('../models/Conversation');
const { sendNotificationToDevices } = require('../utils/fcm');
const { sendNotificationEmail } = require('../utils/emailService');

/**
 * Get user's FCM tokens
 * @param {string} userId - User ID
 * @returns {Promise<Array<string>>} - Array of FCM tokens
 */
const getUserTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmTokens.length) return [];

    return user.fcmTokens.map(t => t.token);
  } catch (error) {
    console.error('Error getting user tokens:', error);
    return [];
  }
};

/**
 * Check if user has notifications enabled for a specific type
 * @param {string} userId - User ID
 * @param {string} type - Notification type
 * @param {string} channel - Notification channel (push, email)
 * @returns {Promise<boolean>} - Whether notifications are enabled
 */
const isNotificationEnabled = async (userId, type, channel = 'push') => {
  try {
    const user = await User.findById(userId);
    if (!user) return false;

    // If all notifications are muted, return false
    if (user.notificationSettings.muteAll) return false;

    // For email notifications, check if email notifications are enabled
    if (channel === 'email') {
      if (!user.notificationSettings.emailNotifications) return false;
    }

    // Check specific notification type
    return user.notificationSettings[type] !== false;
  } catch (error) {
    console.error('Error checking notification settings:', error);
    return false;
  }
};

/**
 * Check if conversation is muted for user
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Whether conversation is muted
 */
const isConversationMuted = async (conversationId, userId) => {
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return false;

    const mutedEntry = conversation.mutedBy.find(
      entry => entry.user.toString() === userId
    );

    if (!mutedEntry) return false;

    // Check if mute has expired
    if (mutedEntry.until && new Date() > mutedEntry.until) {
      // Mute has expired, remove it
      await Conversation.findByIdAndUpdate(conversationId, {
        $pull: { mutedBy: { user: userId } }
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking conversation mute status:', error);
    return false;
  }
};

/**
 * Send new message notification
 * @param {Object} message - Message object
 * @param {Object} sender - Sender user object
 * @param {Object} conversation - Conversation object
 */
const sendNewMessageNotification = async (message, sender, conversation) => {
  try {
    // Get recipients (all participants except sender)
    const recipients = conversation.participants.filter(
      p => p.toString() !== sender._id.toString()
    );

    for (const recipientId of recipients) {
      // Check if user has message notifications enabled
      const notificationType = conversation.isGroup ? 'groupMessages' : 'messages';

      // Check if conversation is muted
      const isMuted = await isConversationMuted(conversation._id, recipientId);
      if (isMuted) continue;

      // Get recipient user
      const recipient = await User.findById(recipientId);
      if (!recipient) continue;

      // Create notification data
      const title = conversation.isGroup
        ? `${conversation.groupName}`
        : `${sender.name}`;

      let body = '';
      switch (message.messageType) {
        case 'text':
          body = message.content;
          break;
        case 'image':
          body = 'Sent an image';
          break;
        case 'file':
          body = 'Sent a file';
          break;
        case 'voice':
          body = 'Sent a voice message';
          break;
        default:
          body = 'Sent a message';
      }

      const notificationBody = conversation.isGroup ? `${sender.name}: ${body}` : body;

      const notificationData = {
        type: 'new_message',
        messageId: message._id.toString(),
        conversationId: conversation._id.toString(),
        senderId: sender._id.toString(),
        isGroup: conversation.isGroup ? 'true' : 'false',
        timestamp: Date.now().toString(),
        senderName: sender.name,
        conversationName: conversation.isGroup ? conversation.groupName : sender.name
      };

      // Send push notification if enabled
      const pushEnabled = await isNotificationEnabled(recipientId, notificationType, 'push');
      if (pushEnabled) {
        // Get recipient's tokens
        const tokens = await getUserTokens(recipientId);
        if (tokens.length > 0) {
          // Send push notification
          await sendNotificationToDevices(tokens, {
            title,
            body: notificationBody
          }, notificationData);
        }
      }

      // Send email notification if enabled
      const emailEnabled = await isNotificationEnabled(recipientId, notificationType, 'email');
      if (emailEnabled && recipient.email) {
        try {
          await sendNotificationEmail(recipient, {
            title,
            body: notificationBody,
            type: 'new_message',
            data: {
              senderName: sender.name,
              conversationName: conversation.isGroup ? conversation.groupName : sender.name,
              messageContent: body
            }
          });
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
        }
      }


    }
  } catch (error) {
    console.error('Error sending new message notification:', error);
  }
};

/**
 * Send connection request notification
 * @param {Object} connection - Connection object
 * @param {Object} requester - Requester user object
 */
const sendConnectionRequestNotification = async (connection, requester) => {
  try {
    // Check if recipient has connection request notifications enabled
    const notificationsEnabled = await isNotificationEnabled(
      connection.recipient,
      'connectionRequests'
    );

    if (!notificationsEnabled) return;

    // Get recipient's tokens
    const tokens = await getUserTokens(connection.recipient);
    if (!tokens.length) return;

    // Create notification
    const notification = {
      title: 'New Connection Request',
      body: `${requester.name} sent you a connection request`
    };

    const data = {
      type: 'connection_request',
      connectionId: connection._id.toString(),
      requesterId: requester._id.toString(),
      timestamp: Date.now().toString()
    };

    // Send notification
    await sendNotificationToDevices(tokens, notification, data);
  } catch (error) {
    console.error('Error sending connection request notification:', error);
  }
};

/**
 * Send message reaction notification
 * @param {Object} message - Message object
 * @param {Object} reactor - User who reacted
 * @param {string} emoji - Reaction emoji
 */
const sendMessageReactionNotification = async (message, reactor, emoji) => {
  try {
    // Don't notify if user reacted to their own message
    if (message.sender.toString() === reactor._id.toString()) return;

    // Check if sender has reaction notifications enabled
    const notificationsEnabled = await isNotificationEnabled(
      message.sender,
      'messageReactions'
    );

    if (!notificationsEnabled) return;

    // Get conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) return;

    // Check if conversation is muted
    const isMuted = await isConversationMuted(conversation._id, message.sender);
    if (isMuted) return;

    // Get sender's tokens
    const tokens = await getUserTokens(message.sender);
    if (!tokens.length) return;

    // Create notification
    const notification = {
      title: 'New Reaction',
      body: `${reactor.name} reacted with ${emoji} to your message`
    };

    const data = {
      type: 'message_reaction',
      messageId: message._id.toString(),
      conversationId: message.conversationId.toString(),
      reactorId: reactor._id.toString(),
      emoji,
      timestamp: Date.now().toString()
    };

    // Send notification
    await sendNotificationToDevices(tokens, notification, data);
  } catch (error) {
    console.error('Error sending message reaction notification:', error);
  }
};

module.exports = {
  sendNewMessageNotification,
  sendConnectionRequestNotification,
  sendMessageReactionNotification
};
