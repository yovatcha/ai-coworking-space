import { createServer } from 'http';
import { initSocket } from './socket';

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

initSocket(httpServer);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Socket.IO listening on port ${PORT}`);
});
