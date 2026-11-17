/**
 * Pure Node.js E2E HTTP verification suite for Flexarion static build.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const REQUIRE_EXTERNAL = process.env.E2E_REQUIRE_EXTERNAL === '1';

async function get(urlPath) {
  const res = await fetch(`${BASE_URL}${urlPath}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { status: res.status, headers: res.headers, text: buf.toString('utf8'), buf };
}

async function isServerReachable() {
  try {
    const res = await fetch(`${BASE_URL}/`);
    return res.status > 0;
  } catch {
    return false;
  }
}

function startFallbackServer() {
  const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.zip': 'application/zip',
  };
  const port = Number(new URL(BASE_URL).port || 4173);
  const server = http.createServer((req, res) => {
    const reqPath = (req.url || '/').split('?')[0].replace(/^\/+/, '');
    let target = path.resolve(ROOT, reqPath);
    if (!target.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      target = path.join(target, 'index.html');
    }
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      const notFound = fs.readFileSync(path.join(ROOT, '404.html'));
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }).end(notFound);
      return;
    }
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(target).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

async function runTests() {
  let fallbackServer = null;
  if (!(await isServerReachable())) {
    if (REQUIRE_EXTERNAL) {
      throw new Error(`External server at ${BASE_URL} is not reachable`);
    }
    fallbackServer = await startFallbackServer();
  }

  try {
    const okRoutes = [
      '/',
      '/en/',
      '/games/les-veilleurs-de-brume.html',
      '/games/neon-calanques.html',
      '/games/lisiere.html',
      '/en/games/les-veilleurs-de-brume.html',
      '/en/games/neon-calanques.html',
      '/en/games/lisiere.html',
      '/devlog.html',
      '/en/devlog.html',
      '/contact.html',
      '/en/contact.html',
      '/feed.xml',
      '/en/feed.xml',
      '/sitemap.xml',
    ];

    let bundleHref = '';
    for (const route of okRoutes) {
      const res = await get(route);
      assert.equal(res.status, 200, `Expected HTTP 200 on ${route}, got ${res.status}`);
      if (route === '/') {
        const match = res.text.match(/href="(css\/bundle\.min\.css\?v=[a-f0-9]{8})"/);
        assert.ok(match, 'Home page must reference css/bundle.min.css?v=<8-char-hash>');
        bundleHref = '/' + match[1];
      }
      if (route === '/en/') {
        assert.ok(
          res.text.includes('../css/bundle.min.css?v='),
          '/en/ must reference ../css/bundle.min.css?v='
        );
        assert.ok(
          res.text.includes('/en/feed.xml'),
          '/en/ must link to /en/feed.xml RSS alternate'
        );
      }
      if (route.includes('/games/')) {
        assert.ok(res.text.includes('data-lightbox-gallery'), `${route} must include lightbox gallery`);
        assert.ok(res.text.includes('related-devlog-heading'), `${route} must include linked devlog card`);
      }
    }

    // Verify bundled CSS serves cleanly with cache-busting query string
    const cssRes = await get(bundleHref);
    assert.equal(cssRes.status, 200, `Expected 200 on ${bundleHref}`);
    assert.ok(cssRes.text.includes('.page-curtain'), 'Bundle CSS must include .page-curtain transition rule');

    // Verify bilingual RSS feeds
    const frFeed = await get('/feed.xml');
    assert.ok(frFeed.text.includes('<language>fr-FR</language>'), 'feed.xml must declare fr-FR');
    const enFeed = await get('/en/feed.xml');
    assert.ok(enFeed.text.includes('<language>en-US</language>'), 'en/feed.xml must declare en-US');

    // Verify HTTP 404 & adaptive FR/EN content on unknown URL
    const errRes = await get('/route-inexistante-pour-test');
    assert.equal(errRes.status, 404, `Expected HTTP 404 on missing route, got ${errRes.status}`);
    assert.ok(errRes.text.includes('id="err-fr"'), '404.html must contain French block #err-fr');
    assert.ok(errRes.text.includes('id="err-en"'), '404.html must contain English block #err-en');
    assert.ok(errRes.text.includes("indexOf('/en/')"), '404.html must detect /en/ path inline');

    console.log(`E2E passed: verified ${okRoutes.length} routes, ${bundleHref}, and adaptive 404.`);
  } finally {
    if (fallbackServer) fallbackServer.close();
  }
}

runTests().catch((err) => {
  console.error('E2E failed:', err);
  process.exit(1);
});
