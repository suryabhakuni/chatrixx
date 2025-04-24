const Connection = require('../models/Connection');
const User = require('../models/User');
const { sendConnectionRequestNotification } = require('../services/notificationService');

const connectionController = {
    // Send connection request
    sendRequest: async (req, res) => {
        try {
            const { recipientId } = req.body;

            // Check if connection already exists
            const existingConnection = await Connection.findOne({
                $or: [
                    { requester: req.user.id, recipient: recipientId },
                    { requester: recipientId, recipient: req.user.id }
                ]
            });

            if (existingConnection) {
                return res.status(400).json({ message: 'Connection already exists' });
            }

            // Create new connection
            const newConnection = new Connection({
                requester: req.user.id,
                recipient: recipientId
            });

            await newConnection.save();
            await newConnection.populate([
                { path: 'requester', select: 'name profilePicture' },
                { path: 'recipient', select: 'name profilePicture' }
            ]);

            // Send notification to recipient
            const requester = await User.findById(req.user.id);
            await sendConnectionRequestNotification(newConnection, requester);

            res.status(201).json(newConnection);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Accept connection request
    acceptRequest: async (req, res) => {
        try {
            const { connectionId } = req.params;

            const connection = await Connection.findById(connectionId);
            if (!connection) {
                return res.status(404).json({ message: 'Connection request not found' });
            }

            // Check if user is the recipient
            if (connection.recipient.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to accept this request' });
            }

            // Update connection status
            connection.status = 'accepted';
            await connection.save();
            await connection.populate([
                { path: 'requester', select: 'name profilePicture' },
                { path: 'recipient', select: 'name profilePicture' }
            ]);

            res.json(connection);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Reject/Cancel connection request
    removeConnection: async (req, res) => {
        try {
            const { connectionId } = req.params;

            const connection = await Connection.findById(connectionId);
            if (!connection) {
                return res.status(404).json({ message: 'Connection not found' });
            }

            // Check if user is part of the connection
            if (connection.requester.toString() !== req.user.id &&
                connection.recipient.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to remove this connection' });
            }

            await Connection.findByIdAndDelete(connectionId);

            res.json({ message: 'Connection removed successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Block user
    blockUser: async (req, res) => {
        try {
            const { userId } = req.body;

            // Check if connection exists
            let connection = await Connection.findOne({
                $or: [
                    { requester: req.user.id, recipient: userId },
                    { requester: userId, recipient: req.user.id }
                ]
            });

            if (connection) {
                // Update existing connection
                connection.status = 'blocked';
                connection.blockedBy = req.user.id;
                await connection.save();
            } else {
                // Create new blocked connection
                connection = new Connection({
                    requester: req.user.id,
                    recipient: userId,
                    status: 'blocked',
                    blockedBy: req.user.id
                });
                await connection.save();
            }

            await connection.populate([
                { path: 'requester', select: 'name profilePicture' },
                { path: 'recipient', select: 'name profilePicture' }
            ]);

            res.json(connection);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Unblock user
    unblockUser: async (req, res) => {
        try {
            const { connectionId } = req.params;

            const connection = await Connection.findById(connectionId);
            if (!connection) {
                return res.status(404).json({ message: 'Connection not found' });
            }

            // Check if user is the one who blocked
            if (connection.blockedBy.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not authorized to unblock this user' });
            }

            // Remove the connection entirely
            await Connection.findByIdAndDelete(connectionId);

            res.json({ message: 'User unblocked successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Get all connections
    getConnections: async (req, res) => {
        try {
            const connections = await Connection.find({
                $or: [
                    { requester: req.user.id },
                    { recipient: req.user.id }
                ]
            })
            .populate('requester', 'name profilePicture')
            .populate('recipient', 'name profilePicture');

            res.json(connections);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Get pending requests
    getPendingRequests: async (req, res) => {
        try {
            const pendingRequests = await Connection.find({
                recipient: req.user.id,
                status: 'pending'
            })
            .populate('requester', 'name profilePicture');

            res.json(pendingRequests);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Get blocked users
    getBlockedUsers: async (req, res) => {
        try {
            const blockedUsers = await Connection.find({
                blockedBy: req.user.id,
                status: 'blocked'
            })
            .populate('requester', 'name profilePicture')
            .populate('recipient', 'name profilePicture');

            res.json(blockedUsers);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = connectionController;
