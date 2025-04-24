const admin = require('firebase-admin');

/**
 * Send a push notification to a specific device
 * @param {string} token - The FCM token of the device
 * @param {Object} notification - The notification object (title, body)
 * @param {Object} data - Additional data to send with the notification
 * @returns {Promise<Object>} - FCM response
 */
const sendNotificationToDevice = async (token, notification, data = {}) => {
  try {
    const message = {
      token,
      notification,
      data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'chat_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a push notification to multiple devices
 * @param {Array<string>} tokens - Array of FCM tokens
 * @param {Object} notification - The notification object (title, body)
 * @param {Object} data - Additional data to send with the notification
 * @returns {Promise<Object>} - FCM response
 */
const sendNotificationToDevices = async (tokens, notification, data = {}) => {
  try {
    if (!tokens.length) {
      return { success: false, error: 'No tokens provided' };
    }

    const message = {
      tokens: tokens.slice(0, 500), // FCM allows max 500 tokens per request
      notification,
      data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'chat_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true
          }
        }
      }
    };

    const response = await admin.messaging().sendMulticast(message);
    return {
      success: true,
      response,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    console.error('Error sending multicast notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send a notification to a topic
 * @param {string} topic - The topic to send to
 * @param {Object} notification - The notification object (title, body)
 * @param {Object} data - Additional data to send with the notification
 * @returns {Promise<Object>} - FCM response
 */
const sendNotificationToTopic = async (topic, notification, data = {}) => {
  try {
    const message = {
      topic,
      notification,
      data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'chat_notifications'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending topic notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Subscribe a device to a topic
 * @param {string|Array<string>} tokens - FCM token(s) to subscribe
 * @param {string} topic - Topic to subscribe to
 * @returns {Promise<Object>} - FCM response
 */
const subscribeToTopic = async (tokens, topic) => {
  try {
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
    const response = await admin.messaging().subscribeToTopic(tokenArray, topic);
    return { success: true, response };
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Unsubscribe a device from a topic
 * @param {string|Array<string>} tokens - FCM token(s) to unsubscribe
 * @param {string} topic - Topic to unsubscribe from
 * @returns {Promise<Object>} - FCM response
 */
const unsubscribeFromTopic = async (tokens, topic) => {
  try {
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
    const response = await admin.messaging().unsubscribeFromTopic(tokenArray, topic);
    return { success: true, response };
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotificationToDevice,
  sendNotificationToDevices,
  sendNotificationToTopic,
  subscribeToTopic,
  unsubscribeFromTopic
};
