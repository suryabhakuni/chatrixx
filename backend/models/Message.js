const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  isEncrypted: {
    type: Boolean,
    default: false
  },
  encryptionData: {
    iv: String,
    tag: String
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'voice', 'deleted'],
    default: 'text'
  },
  attachments: [{
    type: String,
    url: String,
    fileType: String,
    fileName: String,
    fileSize: Number
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  threadCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);