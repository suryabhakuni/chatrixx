const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const messageController = {
    // Send message
    sendMessage: async (req, res) => {
        try {
            const { conversationId, content, messageType = 'text', attachments } = req.body;
            
            const newMessage = new Message({
                conversationId,
                sender: req.user.id,
                content,
                messageType,
                attachments
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
    },

    // Get messages for a conversation
    getMessages: async (req, res) => {
        try {
            const messages = await Message.find({ 
                conversationId: req.params.conversationId 
            })
            .populate('sender', 'name profilePicture')
            .sort({ createdAt: -1 })
            .limit(50);

            res.json(messages);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Add reaction to message
    addReaction: async (req, res) => {
        try {
            const { messageId } = req.params;
            const { emoji } = req.body;

            const message = await Message.findByIdAndUpdate(
                messageId,
                {
                    $push: { reactions: { user: req.user.id, emoji } }
                },
                { new: true }
            ).populate('sender', 'name profilePicture');

            res.json(message);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = messageController;