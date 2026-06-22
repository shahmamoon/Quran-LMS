import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

let socket: Socket | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

const HEARTBEAT_MS = 2 * 60 * 1000; // 2 minutes

function startHeartbeat() {
  if (heartbeatInterval) return; // already running
  heartbeatInterval = setInterval(() => {
    if (socket?.connected) socket.emit('heartbeat');
  }, HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

export function getSocket(): Socket {
  const token = useAuthStore.getState().accessToken;

  if (!socket) {
    socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: !!token, // don't auto-connect without a token
    });
    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });
    socket.on('connect', startHeartbeat);
    socket.on('disconnect', stopHeartbeat);
  } else if (token && !socket.connected) {
    // Token is now available (post-refresh) — update auth and reconnect
    socket.auth = { token };
    socket.connect();
  }

  return socket;
}

/** Call after a fresh access token is set so the socket connects with valid auth. */
export function reconnectSocket() {
  const token = useAuthStore.getState().accessToken;
  if (!token) return;
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
  } else {
    getSocket(); // creates and connects
  }
}

export function disconnectSocket() {
  stopHeartbeat();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
