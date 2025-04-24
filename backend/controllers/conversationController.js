const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { generateEncryptionKey, generateConversationKey } = require('../utils/encryption');
const CacheManager = require('../utils/cacheManager');
const { clearCache } = require('../middleware/cacheMiddleware');

const conversationController = {
    // Create or get one-on-one conversation
    createOrGetConversation: async (req, res) => {
        try {
            const { userId } = req.body;

            let conversation = await Conversation.findOne({
                isGroup: false,
                participants: {
                    $all: [req.user.id, userId],
                    $size: 2
                }
            }).populate('participants', 'name profilePicture');

            if (!conversation) {
                conversation = new Conversation({
                    participants: [req.user.id, userId],
                    isGroup: false
                });
                await conversation.save();
                await conversation.populate('participants', 'name profilePicture');

                // Invalidate cache for both users
                await clearCache(`conversations:${req.user.id}`);
                await clearCache(`conversations:${userId}`);
            }

            res.json(conversation);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Create group conversation
    createGroup: async (req, res) => {
        try {
            const { name, participants, groupImage } = req.body;

            const newGroup = new Conversation({
                groupName: name,
                participants: [...participants, req.user.id],
                groupAdmin: req.user.id,
                isGroup: true,
                groupImage
            });

            await newGroup.save();
            await newGroup.populate('participants', 'name profilePicture');

            // Invalidate cache for all participants
            for (const participantId of [...participants, req.user.id]) {
                await clearCache(`conversations:${participantId}`);
            }

            res.status(201).json(newGroup);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Get user's conversations (excluding archived)
    getConversations: async (req, res) => {
        try {
            const cacheKey = `conversations:${req.user.id}`;

            // Try to get from cache first
            const cachedConversations = await CacheManager.get(cacheKey);
            if (cachedConversations) {
                return res.json(cachedConversations);
            }

            // Find conversations where the user is a participant but has not archived
            const conversations = await Conversation.find({
                participants: req.user.id,
                'archivedBy.user': { $ne: req.user.id } // Not archived by this user
            })
            .populate('participants', 'name profilePicture')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

            // Cache the result for 5 minutes
            await CacheManager.set(cacheKey, conversations, 300);

            res.json(conversations);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Update group
    updateGroup: async (req, res) => {
        try {
            const { groupName, groupImage } = req.body;
            const conversation = await Conversation.findById(req.params.groupId);

            if (!conversation.groupAdmin.equals(req.user.id)) {
                return res.status(403).json({ message: 'Only admin can update group' });
            }

            const updatedGroup = await Conversation.findByIdAndUpdate(
                req.params.groupId,
                { groupName, groupImage },
                { new: true }
            ).populate('participants', 'name profilePicture');

            res.json(updatedGroup);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Add participants to group
    addParticipants: async (req, res) => {
        try {
            const { participants } = req.body;
            const conversation = await Conversation.findById(req.params.groupId);

            if (!conversation.groupAdmin.equals(req.user.id)) {
                return res.status(403).json({ message: 'Only admin can add participants' });
            }

            const updatedGroup = await Conversation.findByIdAndUpdate(
                req.params.groupId,
                { $addToSet: { participants: { $each: participants } } },
                { new: true }
            ).populate('participants', 'name profilePicture');

            res.json(updatedGroup);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Remove participant from group
    removeParticipant: async (req, res) => {
        try {
            const { participantId } = req.params;
            const conversation = await Conversation.findById(req.params.groupId);

            if (!conversation.groupAdmin.equals(req.user.id)) {
                return res.status(403).json({ message: 'Only admin can remove participants' });
            }

            const updatedGroup = await Conversation.findByIdAndUpdate(
                req.params.groupId,
                { $pull: { participants: participantId } },
                { new: true }
            ).populate('participants', 'name profilePicture');

            res.json(updatedGroup);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Leave group
    leaveGroup: async (req, res) => {
        try {
            const conversation = await Conversation.findById(req.params.groupId);

            if (conversation.groupAdmin.equals(req.user.id)) {
                return res.status(400).json({ message: 'Admin cannot leave group. Transfer ownership first.' });
            }

            await Conversation.findByIdAndUpdate(
                req.params.groupId,
                { $pull: { participants: req.user.id } }
            );

            res.json({ message: 'Left group successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Toggle encryption for a conversation
    toggleEncryption: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { enabled } = req.body;

            // Check if conversation exists
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ message: 'Conversation not found' });
            }

            // Check if user is part of the conversation
            if (!conversation.participants.includes(req.user.id)) {
                return res.status(403).json({ message: 'You are not part of this conversation' });
            }

            // For groups, only admin can toggle encryption
            if (conversation.isGroup && !conversation.groupAdmin.equals(req.user.id)) {
                return res.status(403).json({ message: 'Only group admin can change encryption settings' });
            }

            // Update encryption setting
            const updatedConversation = await Conversation.findByIdAndUpdate(
                conversationId,
                { encryptionEnabled: enabled },
                { new: true }
            );

            // If enabling encryption, generate a new key hint
            if (enabled && !updatedConversation.encryptionKeyHint) {
                updatedConversation.encryptionKeyHint = 'server-generated';
                await updatedConversation.save();
            }

            res.json({
                message: `Encryption ${enabled ? 'enabled' : 'disabled'} successfully`,
                encryptionEnabled: updatedConversation.encryptionEnabled
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Get encryption status for a conversation
    getEncryptionStatus: async (req, res) => {
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

            res.json({
                encryptionEnabled: conversation.encryptionEnabled,
                encryptionKeyHint: conversation.encryptionKeyHint
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Archive a conversation
    archiveConversation: async (req, res) => {
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

            // Check if already archived by this user
            const alreadyArchived = conversation.archivedBy.some(
                archive => archive.user.toString() === req.user.id
            );

            if (alreadyArchived) {
                return res.status(400).json({ message: 'Conversation is already archived' });
            }

            // Add user to archivedBy array
            await Conversation.findByIdAndUpdate(
                conversationId,
                {
                    $push: {
                        archivedBy: {
                            user: req.user.id,
                            archivedAt: new Date()
                        }
                    }
                }
            );

            // Invalidate both regular and archived conversation caches
            await clearCache(`conversations:${req.user.id}`);
            await clearCache(`conversations:archived:${req.user.id}`);

            res.json({ message: 'Conversation archived successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Unarchive a conversation
    unarchiveConversation: async (req, res) => {
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

            // Remove user from archivedBy array
            await Conversation.findByIdAndUpdate(
                conversationId,
                {
                    $pull: {
                        archivedBy: { user: req.user.id }
                    }
                }
            );

            // Invalidate both regular and archived conversation caches
            await clearCache(`conversations:${req.user.id}`);
            await clearCache(`conversations:archived:${req.user.id}`);

            res.json({ message: 'Conversation unarchived successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Get archived conversations
    getArchivedConversations: async (req, res) => {
        try {
            const cacheKey = `conversations:archived:${req.user.id}`;

            // Try to get from cache first
            const cachedConversations = await CacheManager.get(cacheKey);
            if (cachedConversations) {
                return res.json(cachedConversations);
            }

            // Find conversations where the user is a participant and has archived
            const conversations = await Conversation.find({
                participants: req.user.id,
                'archivedBy.user': req.user.id
            })
            .populate('participants', 'name profilePicture')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

            // Cache the result for 5 minutes
            await CacheManager.set(cacheKey, conversations, 300);

            res.json(conversations);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Set message expiration settings for a conversation
    setMessageExpiration: async (req, res) => {
        try {
            const { conversationId } = req.params;
            const { enabled, timeInSeconds } = req.body;

            // Check if conversation exists
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ message: 'Conversation not found' });
            }

            // Check if user is part of the conversation
            if (!conversation.participants.includes(req.user.id)) {
                return res.status(403).json({ message: 'You are not part of this conversation' });
            }

            // For groups, only admin can change expiration settings
            if (conversation.isGroup && !conversation.groupAdmin.equals(req.user.id)) {
                return res.status(403).json({ message: 'Only group admin can change message expiration settings' });
            }

            // Update expiration settings
            const updatedConversation = await Conversation.findByIdAndUpdate(
                conversationId,
                {
                    'messageExpiration.enabled': enabled,
                    ...(timeInSeconds && { 'messageExpiration.timeInSeconds': timeInSeconds })
                },
                { new: true }
            );

            res.json({
                message: `Message expiration ${enabled ? 'enabled' : 'disabled'} successfully`,
                messageExpiration: updatedConversation.messageExpiration
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Get message expiration settings for a conversation
    getMessageExpiration: async (req, res) => {
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

            res.json({
                messageExpiration: conversation.messageExpiration
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = conversationController;
