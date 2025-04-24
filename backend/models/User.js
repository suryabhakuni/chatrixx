const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'Hey there! I am using Chatrixx'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  firebaseUID: {
    type: String,
    required: true,
    unique: true
  },
  fcmTokens: [{
    token: {
      type: String,
      required: true
    },
    device: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  notificationSettings: {
    messages: {
      type: Boolean,
      default: true
    },
    groupMessages: {
      type: Boolean,
      default: true
    },
    connectionRequests: {
      type: Boolean,
      default: true
    },
    messageReactions: {
      type: Boolean,
      default: true
    },
    muteAll: {
      type: Boolean,
      default: false
    },
    emailNotifications: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);