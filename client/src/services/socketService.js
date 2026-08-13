import { io } from 'socket.io-client';
import { getApiBaseUrl } from './authService';

const SOCKET_SERVER_URL = getApiBaseUrl();

export const createMeetingSocket = ({ meetingCode, user, token } = {}) => {
  const socket = io(SOCKET_SERVER_URL, {
    autoConnect: false,
    transports: ['websocket'],
    withCredentials: true,
    auth: {
      token,
      meetingCode,
      user,
    },
    query: {
      meetingCode,
      userId: user?.id || user?._id || '',
    },
  });

  return socket;
};

export const disconnectSocket = (socket) => {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
};