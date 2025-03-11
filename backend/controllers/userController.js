const User = require('../models/User');

const userController = {
    // Get user profile
    getProfile: async (req, res) => {
        try {
            const user = await User.findById(req.user.id).select('-firebaseUID');
            if (!user) return res.status(404).json({ message: 'User not found' });
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Update user profile
    updateProfile: async (req, res) => {
        try {
            const { name, status, profilePicture } = req.body;
            const updatedUser = await User.findByIdAndUpdate(
                req.user.id,
                { name, status, profilePicture },
                { new: true }
            ).select('-firebaseUID');
            res.json(updatedUser);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Search users
    searchUsers: async (req, res) => {
        try {
            const keyword = req.query.search ? {
                $or: [
                    { name: { $regex: req.query.search, $options: 'i' } },
                    { email: { $regex: req.query.search, $options: 'i' } }
                ]
            } : {};

            const users = await User.find(keyword)
                .find({ _id: { $ne: req.user.id } })
                .select('-firebaseUID');
            res.json(users);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = userController;