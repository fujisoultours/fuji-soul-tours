// =============================================
// Fuji Soul Tours — Reviews Data
// =============================================
// このファイルは手動で編集するか、
// fetch-reviews.js を使ってViatorから自動取得できます。
//
// 更新手順:
// 1. Node.js をインストール (https://nodejs.org)
// 2. ターミナルで: node fetch-reviews.js
// 3. 出力された reviews.js をGitHubにアップロード
// =============================================

const REVIEWS = [
  {
    stars: 5,
    text: "Takumu was a brilliant guide from the start! Easy to communicate with when booking & gave a variety of options for the day. Takumu is local to the area so he took us to his favourite spots to enjoy the mountain views. We went to the Mt.Fuji heritage centre, Fugisanhongu sengentaisha which offered amazing views of Mt.Fuji. We then had Takumu's favourite Yakisoba for lunch which was delicious and then finished our afternoon with a traditional tea experience. We got lucky with clear views of Mt.Fuji all day. We had so much fun and highly recommend Mt.Fuji soul tours!",
    author: "Ruby_S",
    date: "February 2026",
    source: "Viator"
  },
  {
    stars: 5,
    text: "We had an amazing experience with Tamuku! Unfortunately, the day we were at Mount Fuji it was raining. Tamuku immediately found an alternative activity which we thoroughly enjoyed – a private tea ceremony. Tamuku took us to a local bakery, to eat yakisoba and pork buns. The food was amazing!",
    author: "Annette_M",
    date: "February 2026",
    source: "Viator"
  },
  {
    stars: 5,
    text: "We do many private tours and this was the best. Takumu's English is outstanding. The stops he chose were spot on. He was a wonderful ambassador for Japan. You would be lucky to share a day with him.",
    author: "Dan_J",
    date: "October 2025",
    source: "Tripadvisor"
  }
];

// Render reviews
(function() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid || !REVIEWS.length) return;

  // Calculate average
  const avg = (REVIEWS.reduce((s, r) => s + r.stars, 0) / REVIEWS.length).toFixed(1);
  const countEl = document.querySelector('.hero-badge');
  if (countEl) {
    countEl.textContent = '★ ' + avg + ' Rated · Private Tour';
  }

  const maxLen = 280;
  grid.innerHTML = REVIEWS.map(r => {
    const stars = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
    const truncated = r.text.length > maxLen ? r.text.slice(0, maxLen) + '…' : r.text;
    return `<div class="review-card">
        <div class="review-stars">${stars}</div>
        <p class="review-text">${truncated}</p>
        <div class="review-author">${r.author}</div>
        <div class="review-date">${r.date} · ${r.source}</div>
      </div>`;
  }).join('');
})();
