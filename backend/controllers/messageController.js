const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const ClearHistory = require('../models/ClearHistory');
const { sendNewMessageNotification, sendMessageReactionNotification } = require('../services/notificationService');
const { encryptMessage, decryptMessage, generateConversationKey } = require('../utils/encryption');
const CacheManager = require('../utils/cacheManager');
const { clearCache } = require('../middleware/cacheMiddleware');

const messageController = {
    // Send message
    sendMessage: async (req, res) => {
        try {
            const { conversationId, content, messageType = 'text', attachments } = req.body;

            // Check if conversation exists
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ message: 'Conversation not found' });
            }

            // Check if user is part of the conversation
            if (!conversation.participants.includes(req.user.id)) {
                return res.status(403).json({ message: 'You are not part of this conversation' });
            }

            let messageContent = content;
            let isEncrypted = false;
            let encryptionData = null;

            // Encrypt message if encryption is enabled for the conversation
            if (conversation.encryptionEnabled && messageType === 'text') {
                // Generate or retrieve conversation key
                // In a real E2E system, this key would be exchanged between clients
                const conversationKey = generateConversationKey(conversationId.toString());

                // Encrypt the message content
                const encrypted = encryptMessage(content, conversationKey);

                // Store encrypted content
                messageContent = encrypted.encryptedData;
                isEncrypted = true;
                encryptionData = {
                    iv: encrypted.iv,
                    tag: encrypted.tag
                };

                // If this is the first encrypted message, store key hint
                if (!conversation.encryptionKeyHint) {
                    await Conversation.findByIdAndUpdate(conversationId, {
                        encryptionKeyHint: 'server-generated'
                    });
                }
            }

            // Set message expiration if enabled for the conversation
            let expiresAt = null;
            if (conversation.messageExpiration && conversation.messageExpiration.enabled) {
                const expirationTime = conversation.messageExpiration.timeInSeconds || 86400; // Default to 24 hours
                expiresAt = new Date(Date.now() + expirationTime * 1000);
            }

            const newMessage = new Message({
                conversationId,
                sender: req.user.id,
                content: messageContent,
                messageType,
                attachments,
                isEncrypted,
                encryptionData,
                expiresAt
            });

            await newMessage.save();

            // Update last message in conversation
            await Conversation.findByIdAndUpdate(conversationId, {
                lastMessage: newMessage._id
            });

            await newMessage.populate('sender', 'name profilePicture');

            // Send notification to other participants
            const sender = await User.findById(req.user.id);
            await sendNewMessageNotification(newMessage, sender, conversation);

            // Invalidate message cache for all participants
            for (const participantId of conversation.participants) {
                await clearCache(`messages:${conversationId}:${participantId}:*`);
                await clearCache(`conversations:${participantId}`);
            }

            // If the message was encrypted, send a decrypted version in the response
            // In a real E2E system, the client would handle decryption
            if (isEncrypted) {
                const responseMessage = newMessage.toObject();
                responseMessage.originalContent = content; // Include original content for the sender
                res.status(201).json(responseMessage);
            } else {
                res.status(201).json(newMessage);
            }
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Get messages for a conversation with pagination
    getMessages: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { page = 1, limit = 20, before } = req.query;

            // Check if conversation exists and user is a participant
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ message: 'Conversation not found' });
            }

            if (!conversation.participants.includes(req.user.id)) {
                return res.status(403).json({ message: 'You are not part of this conversation' });
            }

            // Convert page and limit to numbers
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);

            // Validate page and limit
            if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
                return res.status(400).json({
                    message: 'Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.'
                });
            }

            // Build query
            const query = { conversationId };

            // If 'before' timestamp is provided, get messages before that time
            if (before) {
                query.createdAt = { $lt: new Date(before) };
            }

            // Check if user has cleared chat history
            const clearHistory = await ClearHistory.findOne({
                userId: req.user.id,
                conversationId
            });

            // If user has cleared history, only show messages after that time
            if (clearHistory) {
                query.createdAt = {
                    ...(query.createdAt || {}),
                    $gt: clearHistory.clearedAt
                };
            }

            // Create cache key based on query parameters
            const cacheKey = `messages:${conversationId}:${req.user.id}:${pageNum}:${limitNum}:${before || ''}`;

            // Try to get from cache first
            const cachedData = await CacheManager.get(cacheKey);
            if (cachedData) {
                return res.json(cachedData);
            }

            // Get total count for pagination info
            const totalCount = await Message.countDocuments(query);

            // Get messages with pagination
            const messages = await Message.find(query)
                .populate('sender', 'name profilePicture')
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum);

            // Calculate pagination info
            const totalPages = Math.ceil(totalCount / limitNum);
            const hasMore = pageNum < totalPages;

            // Decrypt messages if they are encrypted
            // In a real E2E system, decryption would happen on the client
            if (conversation.encryptionEnabled) {
                const conversationKey = generateConversationKey(conversationId.toString());

                const decryptedMessages = messages.map(message => {
                    const messageObj = message.toObject();

                    if (message.isEncrypted && message.encryptionData) {
                        try {
                            const decrypted = decryptMessage({
                                iv: message.encryptionData.iv,
                                tag: message.encryptionData.tag,
                                encryptedData: message.content
                            }, conversationKey);

                            messageObj.decryptedContent = decrypted;
                        } catch (err) {
                            console.error(`Failed to decrypt message ${message._id}:`, err);
                            messageObj.decryptedContent = '[Encrypted message]';
                        }
                    }

                    return messageObj;
                });

                const responseData = {
                    messages: decryptedMessages,
                    pagination: {
                        total: totalCount,
                        page: pageNum,
                        limit: limitNum,
                        totalPages,
                        hasMore
                    }
                };

                // Cache the result for 1 minute (short time since messages change frequently)
                await CacheManager.set(cacheKey, responseData, 60);

                res.json(responseData);
            } else {
                const responseData = {
                    messages,
                    pagination: {
                        total: totalCount,
                        page: pageNum,
                        limit: limitNum,
                        totalPages,
                        hasMore
                    }
                };

                // Cache the result for 1 minute
                await CacheManager.set(cacheKey, responseData, 60);

                res.json(responseData);
            }
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Add reaction to message
    addReaction: async (req, res) => {
        try {
            const { messageId } = req.params;
            const { emoji } = req.body;

            // Check if message exists
            const message = await Message.findById(messageId);
            if (!message) {
                return res.status(404).json({ message: 'Message not found' });
            }

            // Check if user already reacted with this emoji
            const existingReaction = message.reactions.find(
                r => r.user.toString() === req.user.id && r.emoji === emoji
            );

            if (existingReaction) {
                return res.status(400).json({ message: 'You already reacted with this emoji' });
            }

            // Add reaction
            const updatedMessage = await Message.findByIdAndUpdate(
                messageId,
                {
                    $push: { reactions: { user: req.user.id, emoji } }
                },
                { new: true }
            ).populate('sender', 'name profilePicture');

            // Send notification to message sender
            const reactor = await User.findById(req.user.id);
            await sendMessageReactionNotification(message, reactor, emoji);

            res.json(updatedMessage);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Create/Reply to thread
    replyToThread: async (req, res) => {
        try {
            const { parentMessageId, content, messageType = 'text', attachments } = req.body;

            const newMessage = new Message({
                conversationId: req.params.conversationId,
                sender: req.user.id,
                content,
                messageType,
                attachments,
                threadId: parentMessageId
            });

            await newMessage.save();

            // Increment thread count on parent message
            await Message.findByIdAndUpdate(parentMessageId, {
                $inc: { threadCount: 1 }
            });

            await newMessage.populate('sender', 'name profilePicture');

            res.status(201).json(newMessage);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Get thread messages with pagination
    getThreadMessages: async (req, res) => {
        try {
            const { messageId } = req.params;
            const { page = 1, limit = 20 } = req.query;

            // Convert page and limit to numbers
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);

            // Validate page and limit
            if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
                return res.status(400).json({
                    message: 'Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100.'
                });
            }

            // Get total count for pagination info
            const totalCount = await Message.countDocuments({ threadId: messageId });

            // Get thread messages with pagination
            const messages = await Message.find({ threadId: messageId })
                .populate('sender', 'name profilePicture')
                .sort({ createdAt: 1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum);

            // Get the parent message
            const parentMessage = await Message.findById(messageId)
                .populate('sender', 'name profilePicture');

            // Calculate pagination info
            const totalPages = Math.ceil(totalCount / limitNum);
            const hasMore = pageNum < totalPages;

            res.json({
                parentMessage,
                messages,
                pagination: {
                    total: totalCount,
                    page: pageNum,
                    limit: limitNum,
                    totalPages,
                    hasMore
                }
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Delete message
    deleteMessage: async (req, res) => {
        try {
            const { messageId } = req.params;

            // Find the message
            const message = await Message.findById(messageId);

            if (!message) {
                return res.status(404).json({ message: 'Message not found' });
            }

            // Check if user is the sender
            if (message.sender.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to delete this message' });
            }

            // Check if message has threads
            if (message.threadCount > 0) {
                // If it has threads, just mark as deleted but keep the record
                await Message.findByIdAndUpdate(messageId, {
                    content: 'This message was deleted',
                    messageType: 'deleted',
                    attachments: []
                });
            } else {
                // If no threads, can fully delete
                await Message.findByIdAndDelete(messageId);
            }

            // If this was the last message in the conversation, update the last message
            const conversation = await Conversation.findById(message.conversationId);
            if (conversation.lastMessage && conversation.lastMessage.toString() === messageId) {
                // Find the new last message
                const newLastMessage = await Message.findOne({
                    conversationId: message.conversationId,
                    _id: { $ne: messageId }
                }).sort({ createdAt: -1 });

                if (newLastMessage) {
                    await Conversation.findByIdAndUpdate(message.conversationId, {
                        lastMessage: newLastMessage._id
                    });
                } else {
                    // No messages left
                    await Conversation.findByIdAndUpdate(message.conversationId, {
                        lastMessage: null
                    });
                }
            }

            // Invalidate message cache for all participants
            if (conversation) {
                for (const participantId of conversation.participants) {
                    await clearCache(`messages:${message.conversationId}:${participantId}:*`);
                    await clearCache(`conversations:${participantId}`);
                }
            }

            res.json({ message: 'Message deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Remove reaction from message
    removeReaction: async (req, res) => {
        try {
            const { messageId } = req.params;

            const message = await Message.findByIdAndUpdate(
                messageId,
                {
                    $pull: { reactions: { user: req.user.id } }
                },
                { new: true }
            ).populate('sender', 'name profilePicture');

            res.json(message);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Edit message
    editMessage: async (req, res) => {
        try {
            const { messageId } = req.params;
            const { content } = req.body;

            // Find the message
            const message = await Message.findById(messageId);

            if (!message) {
                return res.status(404).json({ message: 'Message not found' });
            }

            // Check if user is the sender
            if (message.sender.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to edit this message' });
            }

            // Check if message type is 'deleted'
            if (message.messageType === 'deleted') {
                return res.status(400).json({ message: 'Cannot edit a deleted message' });
            }

            // Update the message
            const updatedMessage = await Message.findByIdAndUpdate(
                messageId,
                {
                    content,
                    isEdited: true,
                    editedAt: new Date()
                },
                { new: true }
            ).populate('sender', 'name profilePicture');

            res.json(updatedMessage);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Search messages
    searchMessages: async (req, res) => {
        try {
            const { query } = req.query;
            const { conversationId } = req.params;

            if (!query) {
                return res.status(400).json({ message: 'Search query is required' });
            }

            // Check if user is part of the conversation
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ message: 'Conversation not found' });
            }

            if (!conversation.participants.includes(req.user.id)) {
                return res.status(403).json({ message: 'Not authorized to search in this conversation' });
            }

            // Search messages
            const messages = await Message.find({
                conversationId,
                content: { $regex: query, $options: 'i' },
                messageType: { $ne: 'deleted' }
            })
            .populate('sender', 'name profilePicture')
            .sort({ createdAt: -1 })
            .limit(20);

            res.json(messages);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Global search across all user's conversations
    globalSearch: async (req, res) => {
        try {
            const { query } = req.query;

            if (!query) {
                return res.status(400).json({ message: 'Search query is required' });
            }

            // Get all conversations the user is part of
            const conversations = await Conversation.find({
                participants: req.user.id
            });

            const conversationIds = conversations.map(conv => conv._id);

            // Search messages across all conversations
            const messages = await Message.find({
                conversationId: { $in: conversationIds },
                content: { $regex: query, $options: 'i' },
                messageType: { $ne: 'deleted' }
            })
            .populate('sender', 'name profilePicture')
            .populate('conversationId', 'groupName participants isGroup')
            .sort({ createdAt: -1 })
            .limit(30);

            res.json(messages);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Clear chat history for a user in a conversation
    clearChatHistory: async (req, res) => {
        try {
            const { conversationId } = req.params;

            // Check if conversation exists
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ message: 'Conversation not found' });
            }

            // Check if user is part of the conversation
            if (!conversation.participants.includes(req.user.id)) {
                return res.status(403).json({ message: 'You are not part of this conversation' });
            }

            // Create or update clear history record
            await ClearHistory.findOneAndUpdate(
                { userId: req.user.id, conversationId },
                { clearedAt: new Date() },
                { upsert: true, new: true }
            );

            // Invalidate message cache for this user
            await clearCache(`messages:${conversationId}:${req.user.id}:*`);

            res.json({ message: 'Chat history cleared successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = messageController;
