import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

interface PlayerState {
  x: number;
  y: number;
  anim: string;
  member: string;
  color: string;
}

// The roster lives in lib/members.ts, which this service cannot import
// (tsconfig.server.json is rooted at server/, and it deploys separately to
// Render). So the server only sanitises the shape — clients map anything
// unrecognised onto guest / the member default via resolveMember/resolveColor,
// the same way an unknown `anim` is dropped by RemotePlayer's anims.exists().
const MEMBER_PATTERN = /^[a-z0-9-]{1,32}$/;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const sanitize = (raw: unknown, pattern: RegExp) =>
  typeof raw === 'string' && pattern.test(raw) ? raw : '';

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

  // socketIds with their mic on. Voice is opt-in, so this is a subset of players.
  const voiceMembers = new Set<string>();

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
      const state: PlayerState = {
        ...data,
        member: sanitize(data?.member, MEMBER_PATTERN),
        color: sanitize(data?.color, COLOR_PATTERN),
      };
      players.set(socket.id, state);
      socket.broadcast.emit('playerMoved', { id: socket.id, ...state });
    });

    // Broadcast chat — not stored, just relayed to everyone else
    socket.on('chat', (raw: unknown) => {
      const text = String(raw ?? '').trim().slice(0, 100);
      if (!text) return;
      socket.broadcast.emit('playerChat', { id: socket.id, text });
    });

    // --- Proximity voice (see docs/adr/0008) --------------------------------
    // The server is a blind relay: it never parses SDP or ICE, it only tracks
    // who is in the mesh so a signal can be routed to a real participant.

    socket.on('voice-join', () => {
      voiceMembers.add(socket.id);
      // The newcomer learns who is already in; the room learns about them.
      socket.emit('voice-peers', {
        ids: [...voiceMembers].filter((id) => id !== socket.id),
      });
      socket.broadcast.emit('voice-peer-join', { id: socket.id });
    });

    socket.on('voice-leave', () => {
      if (voiceMembers.delete(socket.id)) {
        socket.broadcast.emit('voice-peer-leave', { id: socket.id });
      }
    });

    socket.on('voice-signal', (raw: { to?: unknown; data?: unknown }) => {
      const to = typeof raw?.to === 'string' ? raw.to : '';
      if (!to || !raw?.data) return;
      if (!voiceMembers.has(to) || !voiceMembers.has(socket.id)) return;
      io.to(to).emit('voice-signal', { from: socket.id, data: raw.data });
    });

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      players.delete(socket.id);
      if (voiceMembers.delete(socket.id)) {
        socket.broadcast.emit('voice-peer-leave', { id: socket.id });
      }
      io.emit('playerLeft', { id: socket.id });
    });
  });

  return io;
}
