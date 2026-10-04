import { Server } from 'socket.io';

const relayToRoom = (socket, eventName, payload = {}) => {
  const roomId = socket.data.roomId;

  if (!roomId || (payload.roomId && payload.roomId !== roomId)) {
    return;
  }

  socket.to(roomId).emit(eventName, {
    ...payload,
    roomId,
    senderSocketId: socket.id,
    senderUser: socket.data.user || null,
  });
};

const initializeSocket = (server, { corsOrigin } = {}) => {
  const io = new Server(server, {
    cors: {
      origin: corsOrigin || '*',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('join-room', ({ roomId, user } = {}) => {
      if (!roomId) {
        return;
      }

      if (socket.data.roomId && socket.data.roomId !== roomId) {
        socket.leave(socket.data.roomId);
      }

      socket.data.roomId = roomId;
      socket.data.user = user || null;
      socket.join(roomId);

      socket.to(roomId).emit('user-joined', {
        roomId,
        socketId: socket.id,
        user: socket.data.user,
      });
    });

    socket.on('offer', (payload) => relayToRoom(socket, 'offer', payload));
    socket.on('answer', (payload) => relayToRoom(socket, 'answer', payload));
    socket.on('ice-candidate', (payload) => relayToRoom(socket, 'ice-candidate', payload));

    socket.on('leave-room', ({ roomId } = {}) => {
      const activeRoomId = socket.data.roomId;

      if (!activeRoomId || (roomId && roomId !== activeRoomId)) {
        return;
      }

      socket.to(activeRoomId).emit('user-left', {
        roomId: activeRoomId,
        socketId: socket.id,
        user: socket.data.user,
      });

      socket.leave(activeRoomId);
      if (socket.data.roomId === activeRoomId) {
        socket.data.roomId = null;
      }
    });

    socket.on('disconnecting', () => {
      const activeRoomId = socket.data.roomId;

      if (!activeRoomId) {
        return;
      }

      socket.to(activeRoomId).emit('user-left', {
        roomId: activeRoomId,
        socketId: socket.id,
        user: socket.data.user,
      });
    });
  });

  return io;
};

export default initializeSocket;