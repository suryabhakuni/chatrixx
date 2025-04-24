const Message = require('../models/Message');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

// Store connected users and typing status
const connectedUsers = new Map();
const typingUsers = new Map();

const initSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // User joins with their ID
        socket.on('join', async (userId) => {
            socket.join(userId);
            socket.userId = userId;
            connectedUsers.set(userId, socket.id);

            await User.findByIdAndUpdate(userId, { isOnline: true });
            io.emit('user_status', { userId, isOnline: true });
        });

        // Handle private messages
        socket.on('private_message', async (data) => {
            try {
                const { conversationId, recipientId, content } = data;

                const newMessage = await Message.create({
                    sender: socket.userId,
                    content,
                    conversationId,
                    readBy: [socket.userId]
                });

                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessage: newMessage._id
                });

                io.to(recipientId).emit('receive_message', {
                    message: newMessage,
                    conversationId
                });

                socket.emit('message_sent', { messageId: newMessage._id });
            } catch (error) {
                socket.emit('message_error', { error: error.message });
            }
        });

        // Handle group messages
        socket.on('group_message', async (data) => {
            try {
                const { conversationId, content } = data;

                const newMessage = await Message.create({
                    sender: socket.userId,
                    content,
                    conversationId,
                    readBy: [socket.userId]
                });

                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessage: newMessage._id
                });

                io.to(conversationId).emit('receive_group_message', {
                    message: newMessage,
                    conversationId
                });

                socket.emit('message_sent', { messageId: newMessage._id });
            } catch (error) {
                socket.emit('message_error', { error: error.message });
            }
        });

        // Handle typing status
        socket.on('typing_start', ({ conversationId, recipientId }) => {
            typingUsers.set(`${conversationId}-${socket.userId}`, true);
            io.to(recipientId).emit('user_typing', {
                userId: socket.userId,
                conversationId
            });
        });

        socket.on('typing_end', ({ conversationId, recipientId }) => {
            typingUsers.delete(`${conversationId}-${socket.userId}`);
            io.to(recipientId).emit('user_stop_typing', {
                userId: socket.userId,
                conversationId
            });
        });

        // Handle file sharing
        socket.on('file_message', async (data) => {
            try {
                const { conversationId, recipientId, fileUrl, fileType } = data;

                const newMessage = await Message.create({
                    sender: socket.userId,
                    conversationId,
                    messageType: fileType,
                    fileUrl,
                    readBy: [socket.userId]
                });

                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessage: newMessage._id
                });

                io.to(recipientId).emit('receive_file', {
                    message: newMessage,
                    conversationId
                });

                socket.emit('file_sent', { messageId: newMessage._id });
            } catch (error) {
                socket.emit('file_error', { error: error.message });
            }
        });

        // Handle message reactions
        socket.on('add_reaction', async (data) => {
            try {
                const { messageId, reaction, conversationId } = data;

                await Message.findByIdAndUpdate(messageId, {
                    $push: {
                        reactions: {
                            userId: socket.userId,
                            type: reaction
                        }
                    }
                });

                io.to(conversationId).emit('message_reaction', {
                    messageId,
                    userId: socket.userId,
                    reaction
                });
            } catch (error) {
                socket.emit('reaction_error', { error: error.message });
            }
        });

        // Handle read receipts
        socket.on('message_read', async ({ messageId, conversationId }) => {
            try {
                await Message.findByIdAndUpdate(messageId, {
                    $addToSet: { readBy: socket.userId }
                });

                io.to(conversationId).emit('message_status_update', {
                    messageId,
                    userId: socket.userId,
                    status: 'read'
                });
            } catch (error) {
                socket.emit('read_receipt_error', { error: error.message });
            }
        });

        // Handle group actions
        socket.on('join_group', async ({ conversationId }) => {
            socket.join(conversationId);
            io.to(conversationId).emit('user_joined_group', {
                userId: socket.userId,
                conversationId
            });
        });

        socket.on('leave_group', async ({ conversationId }) => {
            socket.leave(conversationId);
            io.to(conversationId).emit('user_left_group', {
                userId: socket.userId,
                conversationId
            });
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            if (socket.userId) {
                connectedUsers.delete(socket.userId);
                typingUsers.delete(socket.userId);

                await User.findByIdAndUpdate(socket.userId, {
                    isOnline: false,
                    lastSeen: new Date()
                });

                io.emit('user_status', {
                    userId: socket.userId,
                    isOnline: false,
                    lastSeen: new Date()
                });
            }
            console.log('User disconnected:', socket.id);
        });
    });
};

module.exports = { initSocket, connectedUsers, typingUsers };
// 1. Real-time message handling
// 2. Typing indicators
// 3. Read receipts
// 4. Online/offline status
// 5. Last seen functionality