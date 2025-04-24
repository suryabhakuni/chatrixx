# Chatrixx Backend

This is the backend server for the Chatrixx messaging application.

## Features

- Real-time messaging with Socket.io
- User authentication with Firebase
- MongoDB for data storage
- Redis for caching and session management
- RESTful API endpoints
- File storage with Cloudinary
- Message editing and deletion
- Message reactions and threading
- Message search functionality
- Pagination for messages and threads
- Rate limiting for API security
- Request validation with Joi
- Push notifications with Firebase Cloud Messaging
- Notification preferences management
- Message encryption for enhanced privacy
- Conversation encryption settings
- Archive/unarchive conversations
- Clear chat history
- Message expiration (disappearing messages)
- Export chat history to CSV or JSON
- Media compression for images, videos, and audio
- Email notifications
- Activity logging and audit trails
- Advanced Redis caching strategies

## API Endpoints

### Authentication

- `POST /api/auth/google/signup` - Sign up with Google
- `POST /api/auth/google/login` - Login with Google
- `POST /api/auth/facebook/signup` - Sign up with Facebook
- `POST /api/auth/facebook/login` - Login with Facebook
- `POST /api/auth/verify-token` - Verify authentication token
- `POST /api/auth/logout` - Logout user
- `DELETE /api/auth/delete-account` - Delete user account

### Users

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/search` - Search for users

### Connections

- `POST /api/connections/request` - Send connection request
- `PUT /api/connections/:connectionId/accept` - Accept connection request
- `DELETE /api/connections/:connectionId` - Remove connection
- `POST /api/connections/block` - Block user
- `PUT /api/connections/:connectionId/unblock` - Unblock user
- `GET /api/connections` - Get all connections
- `GET /api/connections/pending` - Get pending requests
- `GET /api/connections/blocked` - Get blocked users

### Conversations

- `POST /api/conversations/direct` - Create or get direct conversation
- `POST /api/conversations/group` - Create group conversation
- `GET /api/conversations` - Get user's conversations
- `PUT /api/conversations/group/:groupId` - Update group
- `POST /api/conversations/group/:groupId/participants` - Add participants to group
- `DELETE /api/conversations/group/:groupId/participants/:participantId` - Remove participant from group
- `POST /api/conversations/group/:groupId/leave` - Leave group
- `PUT /api/conversations/:conversationId/encryption` - Toggle encryption for a conversation
- `GET /api/conversations/:conversationId/encryption` - Get encryption status for a conversation
- `PUT /api/conversations/:conversationId/archive` - Archive a conversation
- `PUT /api/conversations/:conversationId/unarchive` - Unarchive a conversation
- `GET /api/conversations/archived` - Get all archived conversations
- `PUT /api/conversations/:conversationId/expiration` - Set message expiration settings
- `GET /api/conversations/:conversationId/expiration` - Get message expiration settings

### Messages

- `POST /api/messages` - Send message
- `GET /api/messages/:conversationId` - Get messages for a conversation
- `POST /api/messages/:messageId/reaction` - Add reaction to message
- `DELETE /api/messages/:messageId/reaction` - Remove reaction from message
- `POST /api/messages/:conversationId/thread/:parentMessageId` - Reply to thread
- `GET /api/messages/thread/:messageId` - Get thread messages
- `DELETE /api/messages/:messageId` - Delete message
- `PUT /api/messages/:messageId` - Edit message
- `POST /api/messages/:conversationId/clear` - Clear chat history
- `GET /api/messages/search/:conversationId` - Search messages in a conversation
- `GET /api/messages/search/global` - Search messages across all conversations

### Files

- `POST /api/files/upload` - Upload a file
- `DELETE /api/files` - Delete a file
- `POST /api/files/message` - Send a file message

### Exports

- `GET /api/exports/conversation/:conversationId` - Export conversation to CSV or JSON

### Logs

- `GET /api/logs/user` - Get user's activity logs

### Notifications

- `POST /api/notifications/token` - Register FCM token
- `DELETE /api/notifications/token` - Remove FCM token
- `PUT /api/notifications/settings` - Update notification settings
- `GET /api/notifications/settings` - Get notification settings
- `POST /api/notifications/test` - Send test notification

## Socket.io Events

### Connection Events

- `join` - User joins with their ID
- `disconnect` - User disconnects

### Message Events

- `private_message` - Send private message
- `group_message` - Send group message
- `file_message` - Send file message
- `message_read` - Mark message as read

### Status Events

- `typing_start` - User starts typing
- `typing_end` - User stops typing
- `user_status` - User online/offline status

### Group Events

- `join_group` - Join a group conversation
- `leave_group` - Leave a group conversation

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`
4. Add Firebase configuration in `config/firebase-config.json`
5. Start the server: `npm run dev`

## Requirements

- Node.js
- MongoDB
- Redis (optional)
- Firebase project
