const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const Conversation = require('../models/Conversation');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await query(
        'SELECT id, username, full_name, profile_picture FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (result.rows.length === 0) return next(new Error('User not found'));

      socket.userId = result.rows[0].id;
      socket.user = result.rows[0];
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);
    socket.join(`user_${socket.userId}`);

    socket.on('join_conversation', async (conversationId) => {
      try {
        if (await Conversation.isParticipant(conversationId, socket.userId)) {
          socket.join(`conv_${conversationId}`);
        }
      } catch (err) {
        console.error('join_conversation error:', err.message);
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv_${conversationId}`);
    });

    socket.on('typing', async ({ conversationId, isTyping }) => {
      try {
        if (!(await Conversation.isParticipant(conversationId, socket.userId))) return;
        socket.to(`conv_${conversationId}`).emit('typing', {
          conversationId,
          userId: socket.userId,
          username: socket.user.username,
          isTyping: Boolean(isTyping)
        });
      } catch (err) {
        console.error('typing error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = { initSocket, getIO };
