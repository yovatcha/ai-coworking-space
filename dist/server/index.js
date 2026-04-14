import { createServer } from 'http';
import { initSocket } from './socket';
// Ensure stdout/stderr are not buffered so logs appear immediately in Railway
if (process.stdout.isTTY === false) {
    process.stdout.write(''); // no-op flush nudge; Node streams are already line-buffered in non-TTY
}
const PORT = parseInt(process.env.PORT || '3000', 10);
const httpServer = createServer((req, res) => {
    // Health check for Railway
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
        return;
    }
    // Let Socket.IO handle /socket.io/* — fall through to 404 for everything else
    res.writeHead(404);
    res.end();
});
httpServer.on('error', (err) => {
    console.error('[server] HTTP server error:', err);
});
initSocket(httpServer);
httpServer.listen(PORT, '0.0.0.0', () => {
    const addr = httpServer.address();
    const boundPort = addr && typeof addr === 'object' ? addr.port : PORT;
    console.log(`[server] Socket.IO server started`);
    console.log(`[server] Listening on 0.0.0.0:${boundPort}`);
    console.log(`[server] Configured PORT env: ${process.env.PORT ?? '(not set, defaulting to 3000)'}`);
});
// Catch-all for unhandled promise rejections so the process doesn't exit silently
process.on('unhandledRejection', (reason, promise) => {
    console.error('[server] Unhandled promise rejection:', reason);
    console.error('[server] Promise:', promise);
});
// Catch-all for uncaught synchronous exceptions
process.on('uncaughtException', (err) => {
    console.error('[server] Uncaught exception:', err);
    // Re-exit so Railway can restart the container, but after logging
    process.exit(1);
});
