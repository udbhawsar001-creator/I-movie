const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

exports.init = (httpServer, origin) => {
  io = new Server(httpServer, { cors: { origin } });

  // optional auth: logged-in sockets also get personal notifications
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (token) {
      try { socket.userId = jwt.verify(token, process.env.JWT_SECRET).id; } catch { /* anonymous */ }
    }
    next();
  });

  io.on('connection', (socket) => {
    if (socket.userId) socket.join(`user:${socket.userId}`);
    socket.on('show:join', (id) => socket.join(`show:${id}`));
    socket.on('show:leave', (id) => socket.leave(`show:${id}`));
  });
  return io;
};

// tell everyone watching a show to refresh its seat map
exports.emitSeats = (showId) => io && io.to(`show:${showId}`).emit('seats:changed', { showId: String(showId) });
exports.emitUser = (userId, event, payload) => io && io.to(`user:${userId}`).emit(event, payload);
