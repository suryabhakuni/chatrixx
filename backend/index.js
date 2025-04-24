const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { initializeFirebase } = require('./config/firebaseConfig');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { initSocket } = require('./utils/socket');
const { redisClient, connectRedis } = require('./config/redis');
const { authLimiter, apiLimiter, messageLimiter } = require('./middleware/rateLimiter');
const { startMessageExpirationJob } = require('./jobs/messageExpirationJob');
const { startLogCleanupJob } = require('./jobs/logCleanupJob');
const { startCacheMonitorJob } = require('./jobs/cacheMonitorJob');
const { initializeEmailService } = require('./utils/emailService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const fileRoutes = require('./routes/fileRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const exportRoutes = require('./routes/exportRoutes');
const logRoutes = require('./routes/logRoutes');

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // React app URL
    methods: ["GET", "POST"]
  }
});

// Initialize socket utility
initSocket(io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initializeFirebase();

// Apply rate limiters
app.use('/api', apiLimiter); // Apply to all API routes

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageLimiter, messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/logs', logRoutes);

// Socket.io is initialized in utils/socket.js

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Successfully!'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Redis connection
connectRedis()
.then(() => console.log('Redis connection initialized'))
.catch(err => console.error('Redis connection error:', err));

const PORT = process.env.PORT || 4000;

// Start message expiration job
startMessageExpirationJob();

// Start log cleanup job
startLogCleanupJob();

// Start cache monitor job
startCacheMonitorJob();

// Initialize email service
initializeEmailService();

// Use httpServer instead of app.listen
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});