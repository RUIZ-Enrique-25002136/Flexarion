#!/usr/bin/env node
/**
 * ============================================================================
 * FLEXARION — Build statique & vérifications (zéro dépendance externe)
 * ============================================================================
 * - Compile src/pages/*.html avec les partials partagés (header, menu, newsletter, footer)
 * - Injecte GSAP / animations.js uniquement sur les pages animées au scroll
 * - Génère sitemap.xml, feed.xml (RSS du Devlog) et assets/flexarion-presskit.zip
 * - Vérifie l'absence de liens cassés, de CDN Tailwind ou de vieux placeholders
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  renderHeadCommon,
  renderHeader,
  renderMobileMenu,
  renderNewsletter,
  renderFooter,
  renderSocialList,
} from './partials.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'src', 'pages');
const SITE_URL = 'https://flexarion.timeoms.fr';
const CHECK_ONLY = process.argv.includes('--check-only');

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

function renderPage(meta, body) {
  const head = renderHeadCommon(meta);
  const renderedBody = body
    .replaceAll('{{> header}}', renderHeader(meta))
    .replaceAll('{{> mobile-menu}}', renderMobileMenu(meta))
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

function generateFeed() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Flexarion — Devlog du studio</title>
    <link>${SITE_URL}/devlog.html</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Notes techniques de développement, direction artistique et architecture sonore du studio indépendant Flexarion (Aix-en-Provence).</description>
    <language>fr-FR</language>
    <item>
      <title>Architecture sonore procédurale et nappes synthétiques minimalistes</title>
      <link>${SITE_URL}/devlog.html#log-03</link>
      <guid>${SITE_URL}/devlog.html#log-03</guid>
      <pubDate>Tue, 10 Nov 2026 10:00:00 +0100</pubDate>
      <description>Lisière : comment chaque interaction puzzle pilote des synthétiseurs modulaires légers et des filtres passe-bas dans Godot 4 et PipeWire.</description>
    </item>
    <item>
      <title>Direction artistique : traduire la lumière des calanques méditerranéennes en rendu cell-shaded</title>
      <link>${SITE_URL}/devlog.html#log-02</link>
      <guid>${SITE_URL}/devlog.html#log-02</guid>
      <pubDate>Wed, 14 Oct 2026 10:00:00 +0200</pubDate>
      <description>Neon Calanques : construction d’un pipeline cel-shaded dans Unreal Engine 5 mariant calcaire blanc éblouissant et néons synthétiques nocturnes.</description>
    </item>
    <item>
      <title>Générer un brouillard volumétrique réactif au vent dans Godot 4</title>
      <link>${SITE_URL}/devlog.html#log-01</link>
      <guid>${SITE_URL}/devlog.html#log-01</guid>
      <pubDate>Fri, 18 Sep 2026 10:00:00 +0200</pubDate>
      <description>Les Veilleurs de Brume : retour technique sur les shaders 3D de densité, champs de vecteurs de vent et éclairage des balises nocturnes dans Godot 4.3.</description>
    </item>
  </channel>
</rss>
`;
}

function buildPressKitZip() {
  const zipScript = `
import zipfile, pathlib
root = pathlib.Path(${JSON.stringify(ROOT)})
out = root / 'assets' / 'flexarion-presskit.zip'
readme = """FLEXARION — PRESS KIT / DOSSIER DE PRESSE
=========================================
Studio independant de jeux video base a Aix-en-Provence (France).
Site officiel : ${SITE_URL}
Contact : contact@flexarion.timeoms.fr
Fondateurs : Timeo Morsilli (Developpeur), Hugo Banti (Modelisateur 3D), Enrique Ruiz (Developpeur)

Jeux :
- Les Veilleurs de Brume / The Mist Watchers (FLX-01) — Aventure narrative (PC, Godot 4.3, T4 2027)
- Neon Calanques (FLX-02) — Action roguelite (PC / Consoles, Unreal Engine 5, 2028)
- Lisiere (FLX-03) — Puzzle contemplatif (PC / Mobile, Godot 4, 2028)

Palette officielle :
- Noir profond (Ink) : #090909
- Anthracite (Coal)  : #151515
- Blanc casse (Bone) : #F4F2ED
- Orange electrique  : #FF5A1F
- Violet (Pulse)     : #7C4DFF
"""
with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    zf.writestr('README-PRESS.txt', readme)
    for rel in [
        'assets/images/logo.svg',
        'assets/images/logo.png',
        'assets/icons/favicon.svg',
        'assets/images/hero.webp',
        'assets/images/studio-aix.webp',
        'assets/images/og-image.jpg',
        'assets/images/games/projet-01.webp',
        'assets/images/games/projet-02.webp',
        'assets/images/games/projet-03.webp',
    ]:
        p = root / rel
        if p.exists():
            zf.write(p, arcname=p.name if rel.startswith('assets/images/') else rel)
`;
  try {
    execFileSync('python3', ['-c', zipScript], { stdio: 'pipe' });
  } catch (err) {
    console.warn('Warning: could not generate flexarion-presskit.zip:', err.message);
  }
}

function checkOutputs(htmlOutputs) {
  const errors = [];
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
  }
  return errors;
}

function main() {
  const srcFiles = walkHtml(SRC_DIR);
  const parsed = srcFiles.map((f) => ({ srcFile: f, ...parseSource(f) }));
  const htmlOutputs = parsed.map(({ meta, body }) => ({
    meta,
    outRel: meta.out,
    content: renderPage(meta, body),
  }));

  if (!CHECK_ONLY) {
    for (const item of htmlOutputs) {
      const dest = path.join(ROOT, item.outRel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, item.content, 'utf8');
    }
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), generateSitemap(parsed), 'utf8');
    fs.writeFileSync(path.join(ROOT, 'feed.xml'), generateFeed(), 'utf8');
    buildPressKitZip();
    console.log(`Built ${htmlOutputs.length} HTML pages, sitemap.xml, feed.xml, and presskit zip.`);
  }

  const errors = checkOutputs(htmlOutputs);
  if (errors.length) {
    console.error('Build verification failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(1);
  }
  console.log(`Verified ${htmlOutputs.length} HTML outputs with 0 errors.`);
}

main();
