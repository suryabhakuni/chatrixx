const Conversation = require('../models/Conversation');

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
            
            res.status(201).json(newGroup);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Get user's conversations
    getConversations: async (req, res) => {
        try {
            const conversations = await Conversation.find({
                participants: req.user.id
            })
            .populate('participants', 'name profilePicture')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

            res.json(conversations);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = conversationController;