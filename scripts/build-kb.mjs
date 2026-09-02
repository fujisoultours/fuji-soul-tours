#!/usr/bin/env node
// build-kb.mjs — generate kb/public.json for the customer-facing AI chat.
//
// Sources (in priority order for the model):
//   1. content/facts.yaml        authoritative numbers
//   2. the live HTML pages       verbatim website copy (main content only)
//   3. lp/lp.js LP_ROUTES        sample Shinkansen timetables (rendered by JS,
//                                so absent from the static HTML)
//   4. content/public-extra.md   chat-only guidance not on the website
//
// Nothing in kb/ is hand-edited. Change the site or the content/ files,
// then run `npm run build`.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node-html-parser';
import { ROOT, read, loadFacts, readLpConst, PAGES } from './lib/site.mjs';

// Elements that are chrome, duplicates, or live data — never knowledge.
const EXCLUDE = [
  'nav.nav', 'footer', '.sticky-bar', '.skip-link',
  '.chatbot-toggle', '.chatbot-window',
  'script', 'style', 'noscript', 'svg', 'img', 'picture', 'iframe', 'video',
  '.bokun-frame', '.bokunWidget', '.bokun-loading', '#bokunCalendar', '#bokunGroupCalendar',
  '#gtSeats',                       // live seat counts from /api/group-availability
  '#reviewsGrid',                   // replaced at runtime by reviews.js
  '.cta-banner', '.next-links', '.guides-grid', '.crumbs',
  '.addons-nav', '.reviews-nav', '.guest-nav', '.car-pos',
  '.currency-row',                  // rendered by lp.js; prices come from facts
  '.old-price',                     // struck-through pre-promo price (same value when no promo)
  '.sr-only', '[aria-hidden="true"]',
  'button', 'a[class*="btn"]',      // calls to action, not knowledge
];
// Inline elements get a space on each side so "<strong>$98</strong>USD" and
// adjacent badges don't fuse into one word; the collapse step dedupes spaces.
const INLINE_PAD = new Set(['span', 'strong', 'b', 'em', 'i', 'a', 'small', 'time', 'abbr']);

const BLOCK = new Set(['p', 'div', 'section', 'article', 'header', 'main', 'ul', 'ol',
  'table', 'thead', 'tbody', 'tr', 'figure', 'figcaption', 'blockquote', 'dl', 'dt', 'dd',
  'aside', 'address', 'small', 'details', 'summary', 'hr']);
const HEADING = { h1: '#', h2: '##', h3: '###', h4: '####', h5: '####', h6: '####' };

function serialize(node) {
  if (node.nodeType === 3) return node.text.replace(/\s+/g, ' ');
  if (node.nodeType !== 1) return '';
  const tag = node.rawTagName ? node.rawTagName.toLowerCase() : '';
  const inner = () => node.childNodes.map(serialize).join('');
  if (tag === 'br') return '\n';
  if (HEADING[tag]) return `\n\n${HEADING[tag]} ${inner().trim()}\n`;
  if (tag === 'li') return `\n- ${inner().trim()}`;
  if (tag === 'tr') {
    const cells = node.childNodes.filter((c) => c.nodeType === 1).map((c) => serialize(c).trim());
    return `\n${cells.join(' | ')}`;
  }
  if (tag === 'th' || tag === 'td') return inner();
  if (BLOCK.has(tag)) return `\n${inner()}\n`;
  if (INLINE_PAD.has(tag)) return ` ${inner()} `;
  return inner();
}

function tidy(text) {
  return text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l, i, arr) => l !== '' || (i > 0 && arr[i - 1] !== ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractPage({ file, url, lang = 'en' }) {
  const root = parse(read(file), { blockTextElements: { script: true, style: true, noscript: true } });
  const title = root.querySelector('title')?.text.trim() ?? '';
  const description = root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? '';

  const main = root.querySelector('main');
  if (!main) throw new Error(`${file}: no <main> element`);
  const hero = root.querySelector('header.page-hero');
  const parts = hero && !main.querySelector('header.page-hero') ? [hero, main] : [main];

  // Strip chrome first (so FAQ answers lose their sr-only/aria-hidden bits too),
  // then lift the FAQ out as structured data and drop it from the running text.
  const faq = [];
  for (const part of parts) {
    for (const sel of EXCLUDE) part.querySelectorAll(sel).forEach((el) => el.remove());
    for (const d of part.querySelectorAll('.faq-list details')) {
      const q = d.querySelector('summary')?.text.replace(/\s+/g, ' ').trim();
      const a = d.querySelector('.faq-a')?.text.replace(/\s+/g, ' ').trim();
      if (q && a) faq.push({ q, a });
    }
    part.querySelectorAll('.faq-list').forEach((el) => el.remove());
  }

  const text = tidy(parts.map(serialize).join('\n'));
  return { url, title, description, lang, text, ...(faq.length ? { faq } : {}) };
}

function loadExtra() {
  return read('content/public-extra.md').replace(/<!--[\s\S]*?-->/g, '').trim();
}

function build() {
  const facts = loadFacts();
  const pages = PAGES.map(extractPage);
  const routes = readLpConst('LP_ROUTES').map((r) => ({
    label: r.label,
    stops: r.stops.map((s) => `${s.time} ${s.name} — ${s.det}`),
  }));

  // No timestamp on purpose: the file only changes when the content does,
  // so its git diff shows exactly what the chat learned.
  const kb = {
    siteUrl: facts.business.website,
    contact: {
      email: facts.business.email,
      instagram: facts.business.instagram_url,
      whatsapp: facts.business.whatsapp_url,
      whatsappNumber: facts.business.phone,
    },
    facts,
    routes,
    extra: loadExtra(),
    pages,
  };

  const out = path.join(ROOT, 'kb', 'public.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(kb, null, 2) + '\n');

  const bytes = Buffer.byteLength(JSON.stringify(kb));
  console.log(`kb/public.json  ${pages.length} pages, ${pages.reduce((n, p) => n + (p.faq?.length ?? 0), 0)} FAQ entries, ${routes.length} routes, ${(bytes / 1024).toFixed(1)} KB`);
  for (const p of pages) console.log(`  ${p.url.padEnd(26)} ${String(p.text.length).padStart(6)} chars${p.faq ? `  faq×${p.faq.length}` : ''}`);
}

build();
