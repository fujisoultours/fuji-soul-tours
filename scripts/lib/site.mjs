// Shared helpers for build-kb / check-facts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

export function loadFacts() {
  return YAML.parse(read('content/facts.yaml'));
}

// Pull a `const NAME = <literal>;` out of lp/lp.js and evaluate the literal.
// The literals are plain data (no functions), so Function() is safe here.
export function readLpConst(name) {
  const src = read('lp/lp.js');
  const re = new RegExp(`const ${name}\\s*=\\s*([\\[{][\\s\\S]*?\\n[\\]}]);`);
  const m = src.match(re);
  if (!m) throw new Error(`lp/lp.js: const ${name} not found`);
  return new Function(`return (${m[1]});`)();
}

// Pages that make up the public knowledge base, in the order the chat sees them.
export const PAGES = [
  { file: 'index.html',                   url: '/' },
  { file: 'group-tour.html',              url: '/group-tour' },
  { file: 'experiences.html',             url: '/experiences' },
  { file: 'payments.html',                url: '/payments' },
  { file: 'about.html',                   url: '/about' },
  { file: 'mt-fuji-stopover.html',        url: '/mt-fuji-stopover' },
  { file: 'mt-fuji-without-crowds.html',  url: '/mt-fuji-without-crowds' },
  { file: 'fujinomiya-yakisoba.html',     url: '/fujinomiya-yakisoba' },
  { file: 'mt-fuji-green-tea.html',       url: '/mt-fuji-green-tea' },
  { file: 'soul-of-japan.html',           url: '/soul-of-japan' },
  { file: 'gallery.html',                 url: '/gallery' },
  { file: 'tokushoho.html',               url: '/tokushoho', lang: 'ja' },
];

export const fmtJPY = (n) => '¥' + Number(n).toLocaleString('en-US');
export const fmtNum = (n) => Number(n).toLocaleString('en-US');
