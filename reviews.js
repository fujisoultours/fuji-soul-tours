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
    text: "I couldn't recommend Taku more as a tour guide! He took me and my boyfriend on such a lovely tour around Fuji and the town. He gave us options on what we wanted to pick from and he even added more. Not only was he so delightful and fun to talk to, he also made us feel so welcome to his town. If you want an amazing experience full of great food, detailed history, and a genuine fun time. Book with Taku!",
    author: "Shannon_F",
    date: "March 2026",
    source: "Viator"
  },
  {
    stars: 5,
    text: "It was such a unique experience! The driver was really nice and knowledgeable. He really taught us about the culture in Japan. I will take this over shopping in Tokyo any day!",
    author: "Angelo_C",
    date: "March 2026",
    source: "Viator"
  },
  {
    stars: 5,
    text: "Taku is an amazing guide! He took us to all the local spots, picture view points, and made this experience one we will never forget. We are so happy to have found this tour with Taku!",
    author: "Madison_G",
    date: "March 2026",
    source: "Viator"
  },
  {
    stars: 5,
    text: "Takumu was a brilliant guide from the start! Easy to communicate with when booking & gave a variety of options for the day. He is local to the area so he took us to his favourite spots to enjoy the mountain views. We had his favourite Yakisoba for lunch which was delicious and then finished our afternoon with a traditional tea experience. Clear views of Mt.Fuji all day!",
    author: "Ruby_S",
    date: "February 2026",
    source: "Viator"
  },
  {
    stars: 5,
    text: "We had an amazing experience! Unfortunately, the day we were at Mount Fuji it was raining. Our guide immediately found an alternative activity which we thoroughly enjoyed — a private tea ceremony. He took us to a local bakery, to eat yakisoba and pork buns. The food was amazing!",
    author: "Annette_M",
    date: "February 2026",
    source: "Viator"
  },
  {
    stars: 5,
    text: "We do many private tours and this was the best. The English is outstanding. The stops chosen were spot on. A wonderful ambassador for Japan. You would be lucky to share a day with him.",
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
