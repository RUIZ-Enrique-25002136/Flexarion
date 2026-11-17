/**
 * ============================================================================
 * FLEXARION — Build statique, bundle CSS, cache-busting & vérifications
 * ============================================================================
 * 100 % Node.js natif (aucune dépendance npm installée, aucun appel Python).
 * ============================================================================
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
  loadSiteData,
  renderHeadCommon,
  renderHeader,
  renderMobileMenu,
  renderGameGallery,
  renderGameDevlog,
  renderNewsletter,
  renderFooter,
  renderSocialList,
} from './partials.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'src', 'pages');
const CHECK_ONLY = process.argv.includes('--check-only');
const SITE_DATA = loadSiteData();
const SITE_URL = SITE_DATA.siteUrl;

/* --------------------------------------------------------------------------
 * 1. GÉNÉRATION DE js/config.js DEPUIS src/data/site.json
 * ----------------------------------------------------------------------- */
function buildClientConfig(data) {
  const clientObj = {
    version: data.version,
    siteUrl: data.siteUrl,
    demoMode: !!data.demoMode,
    studio: data.studio,
    contact: data.contact,
    form: data.form,
    social: data.social,
    team: Object.fromEntries(
      Object.entries(data.team).map(([k, m]) => [k, { name: m.name, role: m.role, bio: m.bio }])
    ),
    games: data.games.map((g) => ({
      code: g.code,
      id: g.id,
      name: g.name,
      status: g.status,
      genre: g.genre,
      platforms: g.platforms,
      releaseDate: g.releaseDate,
      detailUrl: g.detailUrl,
    })),
  };

  return `/**
 * ============================================================================
 * FLEXARION — Configuration centrale du site (générée depuis src/data/site.json)
 * ============================================================================
 */
window.FLEXARION_CONFIG = Object.freeze(${JSON.stringify(clientObj, null, 2)});
`;
}

/* --------------------------------------------------------------------------
 * 2. BUNDLE & MINIFICATION CSS EN NODE.JS PUR
 * ----------------------------------------------------------------------- */
function minifyCss(css) {
  // Préserve les chaînes entre guillemets et url(...) tout en retirant commentaires et espaces inutiles.
  const preserved = [];
  const token = (s) => {
    const id = `__CSS_TOK_${preserved.length}__`;
    preserved.push(s);
    return id;
  };

  let out = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, token)
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,])\s*/g, '$1')
    .replace(/:\s+/g, ':')
    .replace(/;}/g, '}')
    .trim();

  out = out.replace(/__CSS_TOK_(\d+)__/g, (_, i) => preserved[Number(i)]);
  return out;
}

function buildCssBundle() {
  const inputs = ['css/tailwind.min.css', 'css/style.css', 'css/responsive.css'];
  const combined = inputs
    .map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'))
    .join('\n');
  return minifyCss(combined) + '\n';
}

function sha256Short(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
}

function computeAssetVersions() {
  const versions = {};
  const bundlePath = path.join(ROOT, 'css', 'bundle.min.css');
  if (fs.existsSync(bundlePath)) {
    versions['css/bundle.min.css'] = sha256Short(fs.readFileSync(bundlePath));
  }
  const jsDir = path.join(ROOT, 'js');
  for (const name of fs.readdirSync(jsDir)) {
    if (!name.endsWith('.js')) continue;
    const rel = `js/${name}`;
    versions[rel] = sha256Short(fs.readFileSync(path.join(jsDir, name)));
  }
  return versions;
}

/* --------------------------------------------------------------------------
 * 3. GÉNÉRATEUR ZIP NATIF NODE.JS (ZLIB + CRC32) POUR LE PRESS KIT
 * ----------------------------------------------------------------------- */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const rawBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const compBuf = zlib.deflateRawSync(rawBuf, { level: 9 });
    const crc = crc32(rawBuf);

    // Local File Header (30 bytes + name)
    const lfh = Buffer.alloc(30);
    lfh.writeUInt32LE(0x04034b50, 0);
    lfh.writeUInt16LE(20, 4);          // version needed
    lfh.writeUInt16LE(0x0800, 6);      // UTF-8 flag
    lfh.writeUInt16LE(8, 8);           // deflate
    lfh.writeUInt16LE(0, 10);          // mod time
    lfh.writeUInt16LE(0x5421, 12);     // mod date
    lfh.writeUInt32LE(crc, 14);
    lfh.writeUInt32LE(compBuf.length, 18);
    lfh.writeUInt32LE(rawBuf.length, 22);
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(0, 28);

    localParts.push(lfh, nameBuf, compBuf);

    // Central Directory Header (46 bytes + name)
    const cdh = Buffer.alloc(46);
    cdh.writeUInt32LE(0x02014b50, 0);
    cdh.writeUInt16LE(20, 4);
    cdh.writeUInt16LE(20, 6);
    cdh.writeUInt16LE(0x0800, 8);
    cdh.writeUInt16LE(8, 10);
    cdh.writeUInt16LE(0, 12);
    cdh.writeUInt16LE(0x5421, 14);
    cdh.writeUInt32LE(crc, 16);
    cdh.writeUInt32LE(compBuf.length, 20);
    cdh.writeUInt32LE(rawBuf.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30);
    cdh.writeUInt16LE(0, 32);
    cdh.writeUInt16LE(0, 34);
    cdh.writeUInt16LE(0, 36);
    cdh.writeUInt32LE(0, 38);
    cdh.writeUInt32LE(offset, 42);

    centralParts.push(cdh, nameBuf);
    offset += lfh.length + nameBuf.length + compBuf.length;
  }

  const centralSize = centralParts.reduce((s, b) => s + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

function buildPressKitZip() {
  const readme = `FLEXARION — PRESS KIT / DOSSIER DE PRESSE (v${SITE_DATA.version})
===================================================
Studio independant de jeux video base a ${SITE_DATA.studio.city} (${SITE_DATA.studio.country}).
Site officiel : ${SITE_URL}
Contact : ${SITE_DATA.contact.email}
Fondateurs : ${SITE_DATA.team.timeo.name} (${SITE_DATA.team.timeo.role}), ${SITE_DATA.team.hugo.name} (${SITE_DATA.team.hugo.role}), ${SITE_DATA.team.enrique.name} (${SITE_DATA.team.enrique.role})

Jeux :
${SITE_DATA.games.map((g) => `- ${g.name} / ${g.nameEn} (${g.code}) — ${g.genre} (${g.platforms.join(' / ')}, ${g.engine}, ${g.releaseWindowFr})`).join('\n')}

Palette officielle :
- Noir profond (Ink) : #090909
- Anthracite (Coal)  : #151515
- Blanc casse (Bone) : #F4F2ED
- Orange electrique  : #FF5A1F
- Violet (Pulse)     : #7C4DFF
`;

  const files = [
    'assets/images/logo.svg',
    'assets/images/logo.png',
    'assets/icons/favicon.svg',
    'assets/images/hero.webp',
    'assets/images/studio-aix.webp',
    'assets/images/og-image.jpg',
    'assets/images/games/projet-01.webp',
    'assets/images/games/projet-02.webp',
    'assets/images/games/projet-03.webp',
  ];

  const entries = [{ name: 'README-PRESS.txt', data: readme }];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const arcname = rel.startsWith('assets/images/') ? path.basename(rel) : rel;
    entries.push({ name: arcname, data: fs.readFileSync(abs) });
  }

  fs.writeFileSync(path.join(ROOT, 'assets', 'flexarion-presskit.zip'), createZipBuffer(entries));
}

/* --------------------------------------------------------------------------
 * 4. TEMPLATING HTML, SITEMAP & FLUX RSS BILINGUES
 * ----------------------------------------------------------------------- */
function walkHtml(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkHtml(full));
    else if (entry.name.endsWith('.html')) results.push(full);
  }
  return results.sort();
}

function parseSource(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const match = raw.match(/^<!--\s*@meta\s*\n([\s\S]*?)\n-->\s*\n?/);
  if (!match) {
    throw new Error(`Missing @meta block in ${path.relative(ROOT, filePath)}`);
  }
  const meta = JSON.parse(match[1]);
  const body = raw.slice(match[0].length);
  return { meta, body };
}

function renderPage(meta, body, assetVersions) {
  const head = renderHeadCommon(meta, assetVersions);
  const renderedBody = body
    .replaceAll('{{> header}}', renderHeader(meta))
    .replaceAll('{{> mobile-menu}}', renderMobileMenu(meta))
    .replaceAll('{{> game-gallery}}', renderGameGallery(meta))
    .replaceAll('{{> game-devlog}}', renderGameDevlog(meta))
    .replaceAll('{{> newsletter}}', renderNewsletter(meta))
    .replaceAll('{{> footer}}', renderFooter(meta))
    .replaceAll('{{> social-list}}', renderSocialList(meta.lang, true))
    .replaceAll('{{SITE_URL}}', SITE_URL);
  return `${head}\n${renderedBody.trimEnd()}\n`;
}

function generateSitemap(pages) {
  const entries = pages
    .filter((p) => !p.meta.noindex && p.meta.sitemap)
    .sort((a, b) => {
      if (a.meta.lang !== b.meta.lang) return a.meta.lang === 'fr' ? -1 : 1;
      return parseFloat(b.meta.sitemap.priority) - parseFloat(a.meta.sitemap.priority);
    })
    .map(({ meta }) => {
      const urlPath = meta.out === 'index.html' ? '' : meta.out;
      const loc = `${SITE_URL}/${urlPath}`;
      return `  <url>
    <loc>${loc}</loc>
    <changefreq>${meta.sitemap.changefreq}</changefreq>
    <priority>${meta.sitemap.priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  FLEXARION — Plan du site XML (généré par scripts/build.mjs)
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

function generateFeed(lang = 'fr') {
  const isEn = lang === 'en';
  const title = isEn ? 'Flexarion — Studio Engineering Devlog' : 'Flexarion — Devlog du studio';
  const devlogUrl = isEn ? `${SITE_URL}/en/devlog.html` : `${SITE_URL}/devlog.html`;
  const selfUrl = isEn ? `${SITE_URL}/en/feed.xml` : `${SITE_URL}/feed.xml`;
  const desc = isEn
    ? 'Engineering notes, cel-shading art direction, and procedural audio architecture from independent studio Flexarion (Aix-en-Provence).'
    : 'Notes techniques de développement, direction artistique et architecture sonore du studio indépendant Flexarion (Aix-en-Provence).';

  const items = SITE_DATA.devlogs
    .map((entry) => {
      const link = `${devlogUrl}#${entry.id}`;
      const itemTitle = isEn ? entry.titleEn : entry.titleFr;
      const itemDesc = isEn ? entry.summaryEn : entry.summaryFr;
      return `    <item>
      <title>${itemTitle}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      <pubDate>${entry.pubDateRss}</pubDate>
      <description>${itemDesc}</description>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${title}</title>
    <link>${devlogUrl}</link>
    <atom:link href="${selfUrl}" rel="self" type="application/rss+xml" />
    <description>${desc}</description>
    <language>${isEn ? 'en-US' : 'fr-FR'}</language>
${items}
  </channel>
</rss>
`;
}

/* --------------------------------------------------------------------------
 * 5. VÉRIFICATIONS D'INTÉGRITÉ (--check-only)
 * ----------------------------------------------------------------------- */
function checkJsonLdDates(node, outRel, errors) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) checkJsonLdDates(item, outRel, errors);
    return;
  }
  for (const key of ['datePublished', 'releaseDate']) {
    if (key in node && !/^\d{4}-\d{2}-\d{2}$/.test(String(node[key]))) {
      errors.push(`${outRel}: JSON-LD "${key}" must be strict ISO 8601 YYYY-MM-DD (got "${node[key]}")`);
    }
  }
  for (const val of Object.values(node)) {
    if (typeof val === 'object' && val !== null) checkJsonLdDates(val, outRel, errors);
  }
}

function checkOutputs(htmlOutputs, assetVersions) {
  const errors = [];
  const bundleHash = assetVersions['css/bundle.min.css'];

  if (!fs.existsSync(path.join(ROOT, 'css', 'bundle.min.css'))) {
    errors.push('css/bundle.min.css is missing');
  }
  if (!fs.existsSync(path.join(ROOT, 'feed.xml'))) {
    errors.push('feed.xml is missing');
  }
  if (!fs.existsSync(path.join(ROOT, 'en', 'feed.xml'))) {
    errors.push('en/feed.xml is missing');
  }

  const zipPath = path.join(ROOT, 'assets', 'flexarion-presskit.zip');
  if (!fs.existsSync(zipPath) || fs.readFileSync(zipPath).readUInt32LE(0) !== 0x04034b50) {
    errors.push('assets/flexarion-presskit.zip is missing or invalid PKZIP header');
  }

  const expectedConfig = buildClientConfig(SITE_DATA);
  const actualConfig = fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8');
  if (expectedConfig !== actualConfig) {
    errors.push('js/config.js is out of sync with src/data/site.json (run npm run build)');
  }

  for (const { meta, outRel, content } of htmlOutputs) {
    const stripped = content.replace(/<!--[\s\S]*?-->/g, '');
    if (stripped.includes('cdn.tailwindcss.com')) {
      errors.push(`${outRel}: contains runtime cdn.tailwindcss.com script`);
    }
    if (stripped.includes('flexarion.example/')) {
      errors.push(`${outRel}: contains placeholder domain flexarion.example/`);
    }
    if (stripped.includes('www.flexarion.timeoms.fr')) {
      errors.push(`${outRel}: contains mismatched www.flexarion.timeoms.fr`);
    }
    if (!meta.animations && (stripped.includes('gsap.min.js') || stripped.includes('animations.js'))) {
      errors.push(`${outRel}: utility page must not load GSAP or animations.js`);
    }
    if (!bundleHash || !stripped.includes(`css/bundle.min.css?v=${bundleHash}`)) {
      errors.push(`${outRel}: missing cache-busted css/bundle.min.css?v=${bundleHash}`);
    }

    const outDir = path.dirname(path.join(ROOT, outRel));

    const attrRe = /(?:href|src)="([^"]+)"/g;
    let m;
    while ((m = attrRe.exec(stripped)) !== null) {
      const val = m[1];
      if (
        !val ||
        val.startsWith('#') ||
        val.startsWith('http://') ||
        val.startsWith('https://') ||
        val.startsWith('mailto:') ||
        val.startsWith('tel:') ||
        val.startsWith('data:')
      ) {
        continue;
      }
      // Ignore query string ?v=<hash> and anchor #... when checking file existence on disk.
      const clean = val.split('#')[0].split('?')[0];
      if (!clean) continue;
      const targetPath = clean.startsWith('/')
        ? path.join(ROOT, clean.slice(1))
        : path.resolve(outDir, clean);
      if (!fs.existsSync(targetPath)) {
        errors.push(`${outRel}: broken link/asset "${val}" -> ${path.relative(ROOT, targetPath)}`);
      }
    }

    const imgRe = /<img\b([^>]*)>/g;
    while ((m = imgRe.exec(stripped)) !== null) {
      const attrs = m[1];
      if (!/\balt="[^"]+"/.test(attrs)) errors.push(`${outRel}: <img> missing non-empty alt`);
      if (!/\bwidth="\d+"/.test(attrs)) errors.push(`${outRel}: <img> missing width`);
      if (!/\bheight="\d+"/.test(attrs)) errors.push(`${outRel}: <img> missing height`);
    }

    const ldRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
    while ((m = ldRe.exec(content)) !== null) {
      try {
        const parsedLd = JSON.parse(m[1]);
        checkJsonLdDates(parsedLd, outRel, errors);
      } catch (err) {
        errors.push(`${outRel}: invalid JSON-LD (${err.message})`);
      }
    }
  }
  return errors;
}

function main() {
  if (!CHECK_ONLY) {
    fs.writeFileSync(path.join(ROOT, 'js', 'config.js'), buildClientConfig(SITE_DATA), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'css', 'bundle.min.css'), buildCssBundle(), 'utf8');
    buildPressKitZip();
  }

  const assetVersions = computeAssetVersions();
  const srcFiles = walkHtml(SRC_DIR);
  const parsed = srcFiles.map((f) => ({ srcFile: f, ...parseSource(f) }));
  const htmlOutputs = parsed.map(({ meta, body }) => ({
    meta,
    outRel: meta.out,
    content: renderPage(meta, body, assetVersions),
  }));

  if (!CHECK_ONLY) {
    for (const item of htmlOutputs) {
      const dest = path.join(ROOT, item.outRel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, item.content, 'utf8');
    }
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), generateSitemap(parsed), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'feed.xml'), generateFeed('fr'), 'utf8');
    fs.mkdirSync(path.join(ROOT, 'en'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'en', 'feed.xml'), generateFeed('en'), 'utf8');
    console.log(
      `Built ${htmlOutputs.length} HTML pages, css/bundle.min.css (v=${assetVersions['css/bundle.min.css']}), sitemap.xml, feed.xml, en/feed.xml, and presskit zip.`
    );
  }

  const errors = checkOutputs(htmlOutputs, assetVersions);
  if (errors.length) {
    console.error('Build verification failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(1);
  }
  console.log(`Verified ${htmlOutputs.length} HTML outputs with 0 errors.`);
}

main();
