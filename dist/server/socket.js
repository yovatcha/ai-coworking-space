"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
const socket_io_1 = require("socket.io");
function initSocket(httpServer) {
    const allowedOrigin = process.env.FRONTEND_URL || '*';
    const io = new socket_io_1.Server(httpServer, {
        path: '/socket.io',
        cors: {
            origin: allowedOrigin,
            methods: ['GET', 'POST'],
        },
        transports: ['websocket', 'polling'],
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
