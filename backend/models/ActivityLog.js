const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'message_send',
      'message_delete',
      'message_edit',
      'conversation_create',
      'conversation_archive',
      'conversation_unarchive',
      'group_create',
      'group_update',
      'group_join',
      'group_leave',
      'connection_request',
      'connection_accept',
      'connection_reject',
      'connection_block',
      'connection_unblock',
      'profile_update',
      'settings_update',
      'file_upload',
      'file_delete',
      'export_data',
      'clear_history'
    ]
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for efficient querying
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
