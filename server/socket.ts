import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

interface PlayerState {
  x: number;
  y: number;
  anim: string;
  skin: string;
}

// The skin registry lives in game/skins.ts, which this service cannot import
// (tsconfig.server.json is rooted at server/). So the server only sanitises the
// id — clients resolve an unknown skin to their default, the same way an
// unknown `anim` is already dropped by RemotePlayer's anims.exists() guard.
const SKIN_PATTERN = /^[a-z0-9-]{1,32}$/;
const sanitizeSkin = (raw: unknown) =>
  typeof raw === 'string' && SKIN_PATTERN.test(raw) ? raw : '';

export function initSocket(httpServer: HttpServer) {
  const allowedOrigin = process.env.FRONTEND_URL || '*';
  console.log(`[socket] Initializing Socket.IO (CORS origin: ${allowedOrigin})`);

  let io: SocketIOServer;
  try {
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: allowedOrigin,
        methods: ['GET', 'POST'],
      },
      transports: ['polling', 'websocket'],
    });
  } catch (err) {
    console.error('[socket] Failed to initialize Socket.IO server:', err);
    throw err;
  }

  io.engine.on('connection_error', (err) => {
    console.error('[socket] Engine connection error:', err.req?.url, err.code, err.message, err.context);
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
      const state: PlayerState = { ...data, skin: sanitizeSkin(data?.skin) };
      players.set(socket.id, state);
      socket.broadcast.emit('playerMoved', { id: socket.id, ...state });
    });

    // Broadcast chat — not stored, just relayed to everyone else
    socket.on('chat', (raw: unknown) => {
      const text = String(raw ?? '').trim().slice(0, 100);
      if (!text) return;
      socket.broadcast.emit('playerChat', { id: socket.id, text });
    });

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      players.delete(socket.id);
      io.emit('playerLeft', { id: socket.id });
    });
  });

  return io;
}
