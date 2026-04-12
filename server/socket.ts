import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

interface PlayerState {
  x: number;
  y: number;
  anim: string;
}

export function initSocket(httpServer: HttpServer) {
  const allowedOrigin = process.env.FRONTEND_URL || '*';
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigin,
      methods: ['GET', 'POST'],
    },
    transports: ['polling', 'websocket'],
  });

  // socketId -> last known state
  const players = new Map<string, PlayerState>();

  io.on('connection', (socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    // Give the new client their own socket ID + snapshot of everyone else
    const others: Record<string, PlayerState> = {};
    players.forEach((state, id) => { others[id] = state; });
    socket.emit('init', { selfId: socket.id, others });

    // Tell everyone else a new player joined
    socket.broadcast.emit('playerJoined', { id: socket.id });

    // Player sends position each frame
    socket.on('move', (data: PlayerState) => {
      players.set(socket.id, data);
      socket.broadcast.emit('playerMoved', { id: socket.id, ...data });
    });

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      players.delete(socket.id);
      io.emit('playerLeft', { id: socket.id });
    });
  });

  return io;
}
