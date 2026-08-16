const { getIO } = require('../websocket/socket');

const emitToUser = (userId, event, data) => {
  try {
    getIO().to(`user_${userId}`).emit(event, data);
  } catch (e) { console.error('Socket emit error:', e); }
};

const emitToConversation = (conversationId, event, data) => {
  try {
    getIO().to(`conv_${conversationId}`).emit(event, data);
  } catch (e) { console.error('Socket emit error:', e); }
};

module.exports = { emitToUser, emitToConversation };
