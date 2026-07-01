import { io, type Socket } from 'socket.io-client';
import { getToken } from './api';

// Vazio/ausente = mesma origem do site (Socket.IO usa window.location) — o Next
// repassa /socket.io ao hub. Assim funciona no celular via LAN/túnel HTTPS.
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || undefined;

let socket: Socket | null = null;

/** Conexão Socket.IO autenticada com o mesmo JWT da API. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      // Polling primeiro: atravessa o proxy same-origin do Next; faz upgrade p/ WS
      // quando possível. Só WS falharia através do rewrite em dev.
      transports: ['polling', 'websocket'],
      auth: { token: getToken() },
      reconnection: true,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
