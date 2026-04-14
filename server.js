// Custom Node.js server — boots Next.js + Socket.IO on the same port
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { createRequire } from 'module';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = parseInt(process.env.PORT || '3000', 10);

await app.prepare();

const httpServer = createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  handle(req, res, parsedUrl);
});

// In production use the compiled JS; in dev use ts-node on-the-fly
let initSocket;
if (dev) {
  const require = createRequire(import.meta.url);
  require('ts-node').register({ transpileOnly: true });
  ({ initSocket } = require('./server/socket.ts'));
} else {
  ({ initSocket } = await import('./dist/server/socket.js'));
}

initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`> Ready on http://localhost:${PORT}`);
});
