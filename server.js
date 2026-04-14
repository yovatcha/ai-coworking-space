import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  let initSocket;
  if (dev) {
    // Use ts-node ESM loader (registered via --loader in NODE_OPTIONS or package.json)
    const mod = await import('./server/socket.ts');
    initSocket = mod.initSocket;
  } else {
    const mod = await import('./dist/server/socket.js');
    initSocket = mod.initSocket;
  }

  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
