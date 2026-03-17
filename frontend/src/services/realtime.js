import { io } from 'socket.io-client';

let socket = null;
let connectedBase = null;

export function connectRealtime(baseUrl) {
  const url = baseUrl || 'https://api.beatwap.com.br';
  if (socket && connectedBase === url) return socket;
  if (socket && typeof socket.disconnect === 'function') socket.disconnect();
  socket = null;
  socket = io(url, {
    withCredentials: true,
    transports: ['websocket', 'polling']
  });
  connectedBase = url;
  return socket;
}

export function subscribe(channel, handler) {
  if (!socket) return;
  const room = String(channel);
  socket.emit('subscribe', room);
  if (handler) socket.on(room, handler);
}

export function unsubscribe(channel, handler) {
  if (!socket) return;
  const room = String(channel);
  if (handler) socket.off(room, handler);
  socket.emit('unsubscribe', room);
}
