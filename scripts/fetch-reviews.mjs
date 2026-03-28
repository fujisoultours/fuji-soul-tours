#!/usr/bin/env node
// =============================================
// Fuji Soul Tours — Review Sync Utility
// =============================================
// reviews.js を更新するユーティリティ。
//
// 使い方 (2通り):
//
// A) JSON ファイルから更新:
//    node scripts/fetch-reviews.mjs --from-json reviews-data.json
//
// B) 標準入力から JSON を渡す:
//    echo '[{...}]' | node scripts/fetch-reviews.mjs --from-stdin
//
// JSON フォーマット:
// [{ "stars": 5, "text": "...", "author": "Name", "date": "March 2026", "source": "Viator" }]
//
// 注意: TripAdvisor/Viator はサーバーサイドスクレイピングをブロックするため、
// レビュー取得は Claude Code のスケジュールタスク (WebFetch) 経由で行います。
// =============================================

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REVIEWS_FILE = join(ROOT, 'reviews.js');

// ── Helpers ──────────────────────────────────────────────────
function reviewKey(r) {
  const norm = r.text.replace(/\s+/g, ' ').trim().slice(0, 80).toLowerCase();
  return createHash('md5').update(norm).digest('hex');
}

function loadExistingReviews() {
  if (!existsSync(REVIEWS_FILE)) return [];
  const content = readFileSync(REVIEWS_FILE, 'utf8');
  const match = content.match(/const REVIEWS\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];
  try {
    return new Function(`return ${match[1]}`)();
  } catch {
    return [];
  }
}

function generateReviewsJS(reviews) {
  const header = `// =============================================
// Fuji Soul Tours — Reviews Data
// =============================================
// このファイルは scripts/fetch-reviews.mjs により自動生成されます。
// 手動編集は次回同期時に上書きされます。
//
// 最終更新: ${new Date().toISOString()}
// ソース: Viator + TripAdvisor
// =============================================

`;

  const lines = reviews.map(r => {
    const escaped = r.text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `  {
    stars: ${r.stars},
    text: "${escaped}",
    author: "${r.author}",
    date: "${r.date}",
    source: "${r.source}"
  }`;
  });

  const renderCode = `

// Render reviews into the grid — scrolling is handled by CSS overflow-x: auto
// and the shared scrollCarousel() function (same as dest carousel)
(function() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid || !REVIEWS.length) return;

  // Calculate average rating for hero badge
  const avg = (REVIEWS.reduce((s, r) => s + r.stars, 0) / REVIEWS.length).toFixed(1);
  const countEl = document.querySelector('.hero-badge');
  if (countEl) {
    countEl.textContent = '\u2605 ' + avg + ' Rated \u00b7 Private Tour';
  }

  const maxLen = 300;
  grid.innerHTML = REVIEWS.map(r => {
    const stars = '\u2605'.repeat(r.stars) + '\u2606'.repeat(5 - r.stars);
    const truncated = r.text.length > maxLen ? r.text.slice(0, maxLen) + '\u2026' : r.text;
    return \`<div class="review-card">
        <div class="review-stars">\${stars}</div>
        <p class="review-text">"\${truncated}"</p>
        <div class="review-author">\${r.author}</div>
        <div class="review-date">\${r.date} \u00b7 \${r.source}</div>
      </div>\`;
  }).join('');
})();
`;

  return header + 'const REVIEWS = [\n' + lines.join(',\n') + '\n];\n' + renderCode;
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  let newReviews = [];

  if (args.includes('--from-json') && args[args.indexOf('--from-json') + 1]) {
    const filePath = args[args.indexOf('--from-json') + 1];
    const data = readFileSync(filePath, 'utf8');
    newReviews = JSON.parse(data);
    console.log(`📖 Read ${newReviews.length} reviews from ${filePath}`);
  } else if (args.includes('--from-stdin')) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const data = Buffer.concat(chunks).toString('utf8');
    newReviews = JSON.parse(data);
    console.log(`📖 Read ${newReviews.length} reviews from stdin`);
  } else {
    console.log('Usage:');
    console.log('  node scripts/fetch-reviews.mjs --from-json <file.json>');
    console.log('  echo \'[...]\' | node scripts/fetch-reviews.mjs --from-stdin');
    console.log('');
    console.log('Note: Automated review fetching is handled by Claude Code scheduled task.');
    process.exit(0);
  }

  const existingReviews = loadExistingReviews();
  console.log(`📋 Existing reviews: ${existingReviews.length}`);

  // Merge: new reviews take priority, keep existing ones not in new set
  const seen = new Map();
  for (const r of newReviews) {
    seen.set(reviewKey(r), r);
  }
  for (const r of existingReviews) {
    const key = reviewKey(r);
    if (!seen.has(key)) {
      seen.set(key, r);
    }
  }

  let merged = [...seen.values()];

  // Sort by date (newest first)
  const monthOrder = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  merged.sort((a, b) => {
    const [aMonth, aYear] = (a.date || '').split(' ');
    const [bMonth, bYear] = (b.date || '').split(' ');
    const yearDiff = (parseInt(bYear) || 0) - (parseInt(aYear) || 0);
    if (yearDiff !== 0) return yearDiff;
    return monthOrder.indexOf(bMonth) - monthOrder.indexOf(aMonth);
  });

  if (merged.length === 0) {
    console.log('⚠ No reviews to write — keeping existing file');
    process.exit(0);
  }

  writeFileSync(REVIEWS_FILE, generateReviewsJS(merged), 'utf8');

  const added = merged.length - existingReviews.length;
  console.log(`✅ reviews.js updated: ${merged.length} reviews total`);
  if (added > 0) console.log(`   +${added} new review(s)`);
  if (added < 0) console.log(`   ${added} review(s) removed`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
