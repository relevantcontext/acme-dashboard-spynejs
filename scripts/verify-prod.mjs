// Serve the production bundle the way the CDN does: dist/ with the SPA
// fallback (any non-file path -> index.html) and /api proxied to the local
// Express tier. This is the sanctioned way to verify deep loads and
// production behavior locally — the dev server can't do it (dev-only CMS
// boot race), and both B2 and B3 agents had to improvise this server
// mid-round before it existed.
//
//   npm run verify:prod        (expects the api tier on :8090 — `npm run start:api`)
//
// Port 8095; prints the poison check result before serving (see DEPLOY.md:
// a prod build made while the dev server runs can ship dev-compiled HMR
// modules and boot to a blank page).

import http from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;
const API = 'http://127.0.0.1:8090';
const PORT = 8095;

const jsDir = join(DIST, 'assets/js');
const poisoned = readdirSync(jsDir)
  .filter((f) => f.startsWith('index.') && f.endsWith('.js'))
  .some((f) => readFileSync(join(jsDir, f), 'utf8').includes('e.hot.data'));
if (poisoned) {
  console.error(
    'POISONED BUNDLE: e.hot.data present in dist — rebuild with the dev ' +
      'server stopped and node_modules/.cache/webpack cleared. Refusing to serve.',
  );
  process.exit(1);
}
console.log('bundle clean (no dev-mode HMR modules)');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.map': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain',
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname.startsWith('/api')) {
      const proxied = http.request(
        API + req.url,
        { method: req.method, headers: { ...req.headers, host: '127.0.0.1:8090' } },
        (up) => {
          res.writeHead(up.statusCode, up.headers);
          up.pipe(res);
        },
      );
      proxied.on('error', () => {
        res.writeHead(502).end('api tier not running — npm run start:api');
      });
      req.pipe(proxied);
      return;
    }
    let file = join(DIST, decodeURIComponent(url.pathname));
    if (!extname(file) || !existsSync(file)) file = join(DIST, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  })
  .listen(PORT, () => console.log(`prod bundle at http://localhost:${PORT} (SPA fallback + /api -> :8090)`));
