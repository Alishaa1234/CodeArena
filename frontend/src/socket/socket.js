import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

let socket = null;

// token is passed in from DuelPage which reads it via a fresh API call
export function getSocket(token) {
    if (socket && socket.connected) return socket;

    socket = io(BACKEND_URL, {
        withCredentials: true,
        auth: { token },
        autoConnect: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
        console.log('[Socket.io] Connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
        console.error('[Socket.io] Connection error:', err.message);
    });

    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}