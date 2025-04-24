const path = require('path');
const fs = require('fs');
const { exportConversationToFile, cleanupExportedFiles } = require('../utils/exportUtils');

const exportController = {
  // Export conversation to file (CSV or JSON)
  exportConversation: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { format = 'csv' } = req.query;
      
      // Validate format
      if (!['csv', 'json'].includes(format)) {
        return res.status(400).json({ message: 'Invalid format. Supported formats: csv, json' });
      }
      
      // Export conversation
      const filePath = await exportConversationToFile(conversationId, req.user.id, format);
      
      // Get filename from path
      const filename = path.basename(filePath);
      
      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Schedule cleanup of the file after it's sent
      fileStream.on('end', () => {
        // Delete the file after sending
        fs.unlink(filePath, (err) => {
          if (err) console.error('Error deleting exported file:', err);
        });
      });
      
      // Clean up old export files
      cleanupExportedFiles();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = exportController;
