const mongoose = require('mongoose');

const clearHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  clearedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index to ensure a user can only have one clear history record per conversation
clearHistorySchema.index({ userId: 1, conversationId: 1 }, { unique: true });

const ClearHistory = mongoose.model('ClearHistory', clearHistorySchema);

module.exports = ClearHistory;
