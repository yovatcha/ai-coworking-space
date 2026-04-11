// Custom Node.js server — boots Next.js + Socket.IO on the same port
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Attach Socket.IO — require after prepare so ts-node/register is ready
  // We compile server/socket.ts via ts-node on-the-fly
  require('ts-node').register({ transpileOnly: true });
  const { initSocket } = require('./server/socket');
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
