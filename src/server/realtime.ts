import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';

export function attachRealtime(server: HttpServer): Server {
  const io = new Server(server, {
    // Let non-socket.io upgrade requests (Next.js HMR) through untouched.
    destroyUpgrade: false,
  });
  io.on('connection', (socket) => {
    console.log('[io] connected', socket.id);
  });
  return io;
}
