import { Server as SocketIOServer } from 'socket.io';
export function initSocket(httpServer) {
    const allowedOrigin = process.env.FRONTEND_URL || '*';
    console.log(`[socket] Initializing Socket.IO (CORS origin: ${allowedOrigin})`);
    let io;
    try {
        io = new SocketIOServer(httpServer, {
            cors: {
                origin: allowedOrigin,
                methods: ['GET', 'POST'],
            },
            transports: ['polling', 'websocket'],
        });
    }
    catch (err) {
        console.error('[socket] Failed to initialize Socket.IO server:', err);
        throw err;
    }
    io.engine.on('connection_error', (err) => {
        console.error('[socket] Engine connection error:', err.req?.url, err.code, err.message, err.context);
    });
    // socketId -> last known state
    const players = new Map();
    io.on('connection', (socket) => {
        console.log(`[socket] connected: ${socket.id}`);
        // Give the new client their own socket ID + snapshot of everyone else
        const others = {};
        players.forEach((state, id) => { others[id] = state; });
        socket.emit('init', { selfId: socket.id, others });
        // Tell everyone else a new player joined
        socket.broadcast.emit('playerJoined', { id: socket.id });
        // Player sends position each frame
        socket.on('move', (data) => {
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
