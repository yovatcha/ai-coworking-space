"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const socket_1 = require("./socket");
const PORT = parseInt(process.env.PORT || '3001', 10);
const httpServer = (0, http_1.createServer)((req, res) => {
    // Health check for Railway
    if (req.url === '/health') {
        res.writeHead(200);
        res.end('ok');
        return;
    }
    res.writeHead(404);
    res.end();
});
(0, socket_1.initSocket)(httpServer);
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] Socket.IO listening on port ${PORT}`);
});
