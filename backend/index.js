// const express = require('express');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const mongoose = require('mongoose');

// // Import routes
// const userRoutes = require('./routes/userRoutes');
// const messageRoutes = require('./routes/messageRoutes');
// const conversationRoutes = require('./routes/conversationRoutes');

// dotenv.config();

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Routes
// app.use('/api/users', userRoutes);
// app.use('/api/messages', messageRoutes);
// app.use('/api/conversations', conversationRoutes);

// // Database connection
// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => console.log('Connected to MongoDB Successfully!'))
//   .catch((err) => console.error('MongoDB connection error:', err));

// const PORT = process.env.PORT || 4000;

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { initializeFirebase } = require('./config/firebaseConfig');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { initSocket } = require('./utils/socket');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const conversationRoutes = require('./routes/conversationRoutes');

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining
  socket.on('join', (userId) => {
    socket.join(userId);
    socket.userId = userId;
    io.emit('user_status', { userId, isOnline: true });
    
    // Store user's socket ID
    connectedUsers.set(userId, socket.id);
    
    // Notify others about user's online status
    socket.broadcast.emit('user_connected', {
      userId,
      timestamp: new Date()
    });
  });

  // Handle private messages
  socket.on('private_message', async (data) => {
    const { recipientId, message } = data;
    io.to(recipientId).emit('receive_message', {
      senderId: socket.userId,
      message
    });
  });

  // Handle typing status
  socket.on('typing', (data) => {
    const { recipientId } = data;
    io.to(recipientId).emit('user_typing', {
      senderId: socket.userId
    });
  });

  // Handle group messages
  socket.on('group_message', (data) => {
    const { groupId, message } = data;
    socket.to(groupId).emit('receive_group_message', {
      senderId: socket.userId,
      groupId,
      message
    });
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      io.emit('user_status', { userId: socket.userId, isOnline: false });
    }
    console.log('User disconnected:', socket.id);
  });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Successfully!'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 4000;

// Use httpServer instead of app.listen
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});