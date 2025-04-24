const User = require('../models/User');
const CacheManager = require('../utils/cacheManager');
const { clearCache } = require('../middleware/cacheMiddleware');

const userController = {
    // Get user profile
    getProfile: async (req, res) => {
        try {
            const cacheKey = `user:profile:${req.user.id}`;

            // Try to get from cache first
            const cachedUser = await CacheManager.get(cacheKey);
            if (cachedUser) {
                return res.json(cachedUser);
            }

            const user = await User.findById(req.user.id).select('-firebaseUID');
            if (!user) return res.status(404).json({ message: 'User not found' });

            // Cache the result for 1 hour
            await CacheManager.set(cacheKey, user, 3600);

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

            // Invalidate user profile cache
            await clearCache(`user:profile:${req.user.id}`);

            res.json(updatedUser);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Search users
    searchUsers: async (req, res) => {
        try {
            const searchTerm = req.query.search || '';
            const cacheKey = `users:search:${searchTerm}:${req.user.id}`;

            // For empty searches or common searches, try cache first
            if (searchTerm === '' || searchTerm.length > 2) {
                const cachedUsers = await CacheManager.get(cacheKey);
                if (cachedUsers) {
                    return res.json(cachedUsers);
                }
            }

            const keyword = searchTerm ? {
                $or: [
                    { name: { $regex: searchTerm, $options: 'i' } },
                    { email: { $regex: searchTerm, $options: 'i' } }
                ]
            } : {};

            const users = await User.find(keyword)
                .find({ _id: { $ne: req.user.id } })
                .select('-firebaseUID');

            // Cache the result for 10 minutes (shorter time for search results)
            if (searchTerm === '' || searchTerm.length > 2) {
                await CacheManager.set(cacheKey, users, 600);
            }

            res.json(users);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = userController;