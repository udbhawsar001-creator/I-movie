import { io } from 'socket.io-client';

let socket = null;

// one shared socket; token lets the server send personal notifications
export const ensureSocket = () => {
  if (!socket) socket = io({ auth: { token: localStorage.getItem('imovies_token') || undefined } });
  return socket;
};
export const resetSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};
