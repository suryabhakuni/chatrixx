const User = require('../../models/User');
const admin = require('firebase-admin');

const authController = {
    // Google Sign Up
    googleSignUp: async (req, res) => {
        try {
            const { token } = req.body;
            const decodedToken = await admin.auth().verifyIdToken(token);
            
            // Check if user already exists
            const existingUser = await User.findOne({ firebaseUID: decodedToken.uid });
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists. Please login.' });
            }

            // Create new user
            const newUser = new User({
                name: decodedToken.name,
                email: decodedToken.email,
                profilePicture: decodedToken.picture || '',
                firebaseUID: decodedToken.uid
            });
            await newUser.save();

            res.status(201).json({
                user: {
                    id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    profilePicture: newUser.profilePicture,
                    status: newUser.status
                }
            });
        } catch (error) {
            res.status(401).json({ message: 'Sign up failed' });
        }
    },

    // Google Login
    googleLogin: async (req, res) => {
        try {
            const { token } = req.body;
            const decodedToken = await admin.auth().verifyIdToken(token);
            
            const user = await User.findOne({ firebaseUID: decodedToken.uid });
            if (!user) {
                return res.status(404).json({ message: 'User not found. Please sign up.' });
            }

            res.json({
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    profilePicture: user.profilePicture,
                    status: user.status
                }
            });
        } catch (error) {
            res.status(401).json({ message: 'Login failed' });
        }
    },

    // Facebook Sign Up
    facebookSignUp: async (req, res) => {
        try {
            const { token } = req.body;
            const decodedToken = await admin.auth().verifyIdToken(token);
            
            const existingUser = await User.findOne({ firebaseUID: decodedToken.uid });
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists. Please login.' });
            }

            const newUser = new User({
                name: decodedToken.name,
                email: decodedToken.email,
                profilePicture: decodedToken.picture || '',
                firebaseUID: decodedToken.uid
            });
            await newUser.save();

            res.status(201).json({
                user: {
                    id: newUser._id,
                    name: newUser.name,
                    email: newUser.email,
                    profilePicture: newUser.profilePicture,
                    status: newUser.status
                }
            });
        } catch (error) {
            res.status(401).json({ message: 'Sign up failed' });
        }
    },

    // Facebook Login
    facebookLogin: async (req, res) => {
        try {
            const { token } = req.body;
            const decodedToken = await admin.auth().verifyIdToken(token);
            
            const user = await User.findOne({ firebaseUID: decodedToken.uid });
            if (!user) {
                return res.status(404).json({ message: 'User not found. Please sign up.' });
            }

            res.json({
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    profilePicture: user.profilePicture,
                    status: user.status
                }
            });
        } catch (error) {
            res.status(401).json({ message: 'Login failed' });
        }
    },

    verifyToken: async (req, res) => {
        try {
            const { token } = req.body;
            const decodedToken = await admin.auth().verifyIdToken(token);
            const user = await User.findOne({ firebaseUID: decodedToken.uid });
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.json({ valid: true, user });
        } catch (error) {
            res.status(401).json({ valid: false, message: 'Invalid token' });
        }
    },

    // Logout
    logout: async (req, res) => {
        try {
            const user = await User.findByIdAndUpdate(
                req.user.id,
                { isOnline: false, lastSeen: new Date() },
                { new: true }
            );
            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Logout failed' });
        }
    },

    // Delete account
    deleteAccount: async (req, res) => {
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Delete from Firebase
            await admin.auth().deleteUser(user.firebaseUID);
            // Delete from our database
            await User.findByIdAndDelete(req.user.id);

            res.json({ message: 'Account deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to delete account' });
        }
    }
};

module.exports = authController;