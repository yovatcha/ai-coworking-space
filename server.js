import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  if (dev) {
    require('ts-node').register({ transpileOnly: true });
    const { initSocket } = require('./server/socket.ts');
    initSocket(httpServer);
  } else {
    const { initSocket } = require('./dist/server/socket.js');
    initSocket(httpServer);
  }

  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
