// Custom Node.js server — boots Next.js + Socket.IO on the same port
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = parseInt(process.env.PORT || '3000', 10);

await app.prepare();

const httpServer = createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  handle(req, res, parsedUrl);
});

// In production use the compiled JS; in dev register ts-node BEFORE importing .ts files
if (dev) {
  const { register } = await import('ts-node');
  register({ transpileOnly: true });
  const { initSocket } = await import('./server/socket.ts');
  initSocket(httpServer);
} else {
  const { initSocket } = await import('./dist/server/socket.js');
  initSocket(httpServer);
}

httpServer.listen(PORT, () => {
  console.log(`> Ready on http://localhost:${PORT}`);
});
