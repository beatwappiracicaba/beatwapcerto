import { io } from 'socket.io-client';

let socket = null;
let connectedBase = null;
let connectedToken = null;

const readToken = () => {
  try {
    return localStorage.getItem('token') || null;
  } catch {
    return null;
  }
};

export function connectRealtime(baseUrl, token) {
  const url = baseUrl || 'https://api.beatwap.com.br';
  const auth = token || readToken();
  // O servidor valida o token no handshake: sem ele a conexao e recusada e
  // nao ha como assinar salas de outro usuario.
  if (socket && connectedBase === url && connectedToken === auth) return socket;
  if (socket && typeof socket.disconnect === 'function') socket.disconnect();
  socket = null;
  socket = io(url, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    auth: auth ? { token: auth } : {}
  });
  connectedBase = url;
  connectedToken = auth;
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
