const { uploadFile, deleteFile } = require('../utils/cloudinary');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { compressImage, compressVideo, compressAudio, cleanupTempFiles } = require('../utils/mediaCompression');
const fs = require('fs');

const fileController = {
    // Upload file
    uploadFile: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const { buffer, originalname, mimetype, size } = req.file;

            // Check file size (limit to 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (size > maxSize) {
                return res.status(400).json({ message: 'File size exceeds 10MB limit' });
            }

            // Determine resource type based on mimetype
            let folder = 'general';
            let compressedBuffer = buffer;
            let compressedFilePath = null;
            let uploadOptions = {
                resource_type: 'auto',
                public_id: originalname.split('.')[0], // Use filename without extension as public_id
                overwrite: true
            };

            // Compress media based on type
            try {
                if (mimetype.startsWith('image/')) {
                    folder = 'images';
                    // Compress image
                    compressedBuffer = await compressImage(buffer, {
                        quality: 80,
                        maxWidth: 1920,
                        maxHeight: 1080,
                        format: 'jpeg'
                    });
                } else if (mimetype.startsWith('audio/')) {
                    folder = 'audio';
                    // Compress audio if size is over 1MB
                    if (size > 1 * 1024 * 1024) {
                        compressedFilePath = await compressAudio(buffer, {
                            audioBitrate: '128k',
                            format: 'mp3'
                        });
                    }
                } else if (mimetype.startsWith('video/')) {
                    folder = 'videos';
                    // Compress video if size is over 2MB
                    if (size > 2 * 1024 * 1024) {
                        compressedFilePath = await compressVideo(buffer, {
                            videoBitrate: '1000k',
                            audioBitrate: '128k',
                            width: 1280,
                            height: 720
                        });
                    }
                }
            } catch (compressionError) {
                console.error('Compression error:', compressionError);
                // Continue with original file if compression fails
            }

            // Upload file to Cloudinary
            let result;
            if (compressedFilePath) {
                // Upload from file path for video/audio
                result = await uploadFile(compressedFilePath, folder, uploadOptions);
                // Clean up temporary file
                fs.unlinkSync(compressedFilePath);
            } else {
                // Upload from buffer for images and other files
                result = await uploadFile(compressedBuffer, folder, uploadOptions);
            }

            // Clean up temporary files
            cleanupTempFiles();

            // Format response
            const uploadResult = {
                fileName: originalname,
                fileUrl: result.secure_url,
                fileType: mimetype,
                fileSize: size,
                publicId: result.public_id,
                assetId: result.asset_id
            };

            res.status(201).json(uploadResult);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Delete file
    deleteFile: async (req, res) => {
        try {
            const { publicId } = req.body;

            if (!publicId) {
                return res.status(400).json({ message: 'Public ID is required' });
            }

            // Delete file from Cloudinary
            const result = await deleteFile(publicId);

            if (result.result !== 'ok') {
                return res.status(400).json({ message: 'Failed to delete file', result });
            }

            res.json({ message: 'File deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Send file message
    sendFileMessage: async (req, res) => {
        try {
            const { conversationId, fileUrl, fileName, fileType, fileSize } = req.body;

            // Create file attachment
            const attachment = {
                url: fileUrl,
                fileName,
                fileType,
                fileSize
            };

            // Determine message type based on file type
            let messageType = 'file';
            if (fileType.startsWith('image/')) {
                messageType = 'image';
            } else if (fileType.startsWith('audio/')) {
                messageType = 'voice';
            }

            // Create new message
            const newMessage = new Message({
                conversationId,
                sender: req.user.id,
                content: `Sent a ${messageType}`,
                messageType,
                attachments: [attachment]
            });

            await newMessage.save();

            // Update last message in conversation
            await Conversation.findByIdAndUpdate(conversationId, {
                lastMessage: newMessage._id
            });

            await newMessage.populate('sender', 'name profilePicture');

            res.status(201).json(newMessage);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = fileController;
