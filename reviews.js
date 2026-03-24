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
    text: "I couldn't recommend Taku more as a tour guide! He took me and my boyfriend on such a lovely tour around Fuji. He gave us options on what we wanted to pick from and even added more. So delightful, fun, and made us feel so welcome. Great food, detailed history, and a genuine fun time!",
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
    text: "A brilliant guide from the start! Easy to communicate with when booking & gave a variety of options. He took us to his favourite local spots for mountain views, delicious Yakisoba for lunch, and a traditional tea experience. Clear views of Mt. Fuji all day!",
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

// Render reviews carousel
(function() {
  const grid = document.getElementById('reviewsGrid');
  if (!grid || !REVIEWS.length) return;

  // Calculate average
  const avg = (REVIEWS.reduce((s, r) => s + r.stars, 0) / REVIEWS.length).toFixed(1);
  const countEl = document.querySelector('.hero-badge');
  if (countEl) {
    countEl.textContent = '★ ' + avg + ' Rated · Private Tour';
  }

  const maxLen = 300;
  grid.innerHTML = REVIEWS.map(r => {
    const stars = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
    const truncated = r.text.length > maxLen ? r.text.slice(0, maxLen) + '…' : r.text;
    return `<div class="review-card">
        <div class="review-stars">${stars}</div>
        <p class="review-text">"${truncated}"</p>
        <div class="review-author">${r.author}</div>
        <div class="review-date">${r.date} · ${r.source}</div>
      </div>`;
  }).join('');

  // Carousel logic — uses CSS transform (no scrollIntoView / scrollTo)
  const dots = document.getElementById('revDots');
  const prevBtn = document.getElementById('revPrev');
  const nextBtn = document.getElementById('revNext');
  if (!dots || !prevBtn || !nextBtn) return;

  const cards = grid.querySelectorAll('.review-card');
  const total = cards.length;
  let current = 0;

  // Create dots
  dots.innerHTML = Array.from({length: total}, (_, i) =>
    `<span data-i="${i}" class="${i === 0 ? 'active' : ''}"></span>`
  ).join('');

  function goTo(idx) {
    current = Math.max(0, Math.min(idx, total - 1));
    var cardWidth = cards[0].offsetWidth + 20;
    grid.style.transform = 'translateX(-' + (current * cardWidth) + 'px)';
    dots.querySelectorAll('span').forEach((d, i) => d.classList.toggle('active', i === current));
  }

  prevBtn.addEventListener('click', function() { goTo(current - 1); });
  nextBtn.addEventListener('click', function() { goTo(current + 1); });
  dots.addEventListener('click', function(e) {
    if (e.target.dataset.i !== undefined) goTo(+e.target.dataset.i);
  });

  // Auto-rotate every 5s — only when section is visible on screen
  var autoplay = null;
  var reviewSection = document.getElementById('reviews');
  var sectionVisible = false;
  if (reviewSection && window.IntersectionObserver) {
    new IntersectionObserver(function(entries) {
      sectionVisible = entries[0].isIntersecting;
      if (sectionVisible && !autoplay) {
        autoplay = setInterval(function() { if (sectionVisible) goTo((current + 1) % total); }, 5000);
      }
      if (!sectionVisible && autoplay) {
        clearInterval(autoplay); autoplay = null;
      }
    }, { threshold: 0.1 }).observe(reviewSection);
  }
  grid.addEventListener('pointerdown', function() { clearInterval(autoplay); autoplay = null; });

  // Touch swipe support
  var touchStartX = 0;
  grid.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; }, { passive: true });
  grid.addEventListener('touchend', function(e) {
    var diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) { diff > 0 ? goTo(current + 1) : goTo(current - 1); }
  }, { passive: true });
})();
