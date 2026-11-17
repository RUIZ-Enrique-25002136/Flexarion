/**
 * Minimal static HTTP server in pure Node.js (with /index.html and 404.html support).
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const urlPath = (req.url || '/').split('?')[0].split('#')[0];
  let rel = decodeURIComponent(urlPath).replace(/^\/+/, '');
  let target = path.resolve(ROOT, rel);

  if (!target.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    target = path.join(target, 'index.html');
  }

  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    const notFoundPath = path.join(ROOT, '404.html');
    const body = fs.existsSync(notFoundPath) ? fs.readFileSync(notFoundPath) : Buffer.from('Not Found');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(body);
    return;
  }

  const ext = path.extname(target).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(target).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Static server listening on http://127.0.0.1:${PORT}`);
});
