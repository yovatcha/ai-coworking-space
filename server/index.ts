import { createServer } from 'http';
import { initSocket } from './socket';

const PORT = parseInt(process.env.PORT || '3001', 10);

const httpServer = createServer((req, res) => {
  // Health check for Railway
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('ok');
    return;
  }
  res.writeHead(404);
  res.end();
});

initSocket(httpServer);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Socket.IO listening on port ${PORT}`);
});
