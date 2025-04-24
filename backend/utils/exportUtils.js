const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

/**
 * Export conversation messages to CSV format
 * @param {string} conversationId - ID of the conversation to export
 * @param {string} userId - ID of the user requesting the export
 * @param {string} format - Export format (csv or json)
 * @returns {Promise<string>} - Path to the exported file
 */
const exportConversationToFile = async (conversationId, userId, format = 'csv') => {
  try {
    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'name email');
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    if (!conversation.participants.some(p => p._id.toString() === userId)) {
      throw new Error('User is not a participant in this conversation');
    }
    
    // Get all messages for the conversation
    const messages = await Message.find({ 
      conversationId,
      messageType: { $ne: 'deleted' } // Exclude deleted messages
    })
    .populate('sender', 'name email')
    .sort({ createdAt: 1 });
    
    // Create export directory if it doesn't exist
    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `conversation_${conversationId}_${timestamp}.${format}`;
    const filePath = path.join(exportDir, filename);
    
    if (format === 'json') {
      // Export as JSON
      const exportData = {
        conversation: {
          id: conversation._id,
          name: conversation.isGroup ? conversation.groupName : 'Direct Message',
          isGroup: conversation.isGroup,
          participants: conversation.participants.map(p => ({
            id: p._id,
            name: p.name,
            email: p.email
          })),
          createdAt: conversation.createdAt
        },
        messages: messages.map(msg => ({
          id: msg._id,
          sender: {
            id: msg.sender._id,
            name: msg.sender.name,
            email: msg.sender.email
          },
          content: msg.content,
          messageType: msg.messageType,
          attachments: msg.attachments,
          reactions: msg.reactions,
          createdAt: msg.createdAt,
          isEdited: msg.isEdited,
          editedAt: msg.editedAt
        }))
      };
      
      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
    } else {
      // Export as CSV
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'date', title: 'Date' },
          { id: 'time', title: 'Time' },
          { id: 'sender', title: 'Sender' },
          { id: 'content', title: 'Message' },
          { id: 'type', title: 'Type' },
          { id: 'attachments', title: 'Attachments' }
        ]
      });
      
      const records = messages.map(msg => {
        const date = new Date(msg.createdAt);
        return {
          date: date.toLocaleDateString(),
          time: date.toLocaleTimeString(),
          sender: msg.sender.name,
          content: msg.content,
          type: msg.messageType,
          attachments: msg.attachments && msg.attachments.length > 0 
            ? msg.attachments.map(a => a.url).join(', ') 
            : ''
        };
      });
      
      await csvWriter.writeRecords(records);
    }
    
    return filePath;
  } catch (error) {
    console.error('Error exporting conversation:', error);
    throw error;
  }
};

/**
 * Clean up exported files older than the specified age
 * @param {number} maxAgeHours - Maximum age in hours
 */
const cleanupExportedFiles = (maxAgeHours = 24) => {
  try {
    const exportDir = path.join(__dirname, '../exports');
    if (!fs.existsSync(exportDir)) return;
    
    const files = fs.readdirSync(exportDir);
    const now = new Date();
    
    files.forEach(file => {
      const filePath = path.join(exportDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = (now - stats.mtime) / (1000 * 60 * 60); // Age in hours
      
      if (fileAge > maxAgeHours) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old export file: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning up exported files:', error);
  }
};

module.exports = {
  exportConversationToFile,
  cleanupExportedFiles
};
