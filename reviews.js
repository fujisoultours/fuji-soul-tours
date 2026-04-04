// =============================================
// Fuji Soul Tours — Reviews Data
// =============================================
// このファイルは scripts/fetch-reviews.mjs により自動生成されます。
// 手動編集は次回同期時に上書きされます。
//
// 最終更新: 2026-03-28T13:48:56.333Z
// ソース: Viator + TripAdvisor
// =============================================

const REVIEWS = [
  {
    stars: 5,
    text: "Our day with Takumu was a very enjoyable and memorable one. He customized our tour to our interests and made it a delightful experience. His warm hospitality, friendliness and personality left us with a wonderful impression of him and we would highly recommend Takumu to anyone.",
    author: "Lena_M",
    date: "March 2026",
    source: "Viator"
  },
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
    text: "Takumu was an exceptional guide from start to finish! From the initial communications helping us craft a custom itinerary, to meeting us at the station, to offering thoughtful recommendations for our next stop — he was knowledgeable, engaged, and genuinely invested in making our experience special.",
    author: "Jennifer_B",
    date: "February 2026",
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


// GAS endpoint for fetching approved direct reviews (set after deploying GAS)
var REVIEW_GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbw_D4Ngnu8zlAEZ0MW_wq6hf5i-qF0UIWkIsjyVxz1srptLDWFsw-FzinYm13V-A7rCdQ/exec';

function escapeReviewHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Render reviews into the grid — scrolling is handled by CSS overflow-x: auto
// and the shared scrollCarousel() function (same as dest carousel)
(function() {
  var grid = document.getElementById('reviewsGrid');
  if (!grid) return;

  function renderReviews(reviews) {
    if (!reviews.length) return;

    // Calculate average rating for hero badge
    var avg = (reviews.reduce(function(s, r) { return s + r.stars; }, 0) / reviews.length).toFixed(1);
    var countEl = document.querySelector('.hero-badge');
    if (countEl) {
      countEl.textContent = '★ ' + avg + ' Rated · Private Tour';
    }

    var maxLen = 300;
    grid.innerHTML = reviews.map(function(r) {
      var stars = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
      var truncated = r.text.length > maxLen ? r.text.slice(0, maxLen) + '…' : r.text;
      return '<div class="review-card">'
        + '<div class="review-stars">' + stars + '</div>'
        + '<p class="review-text">"' + escapeReviewHtml(truncated) + '"</p>'
        + '<div class="review-author">' + escapeReviewHtml(r.author) + '</div>'
        + '<div class="review-date">' + escapeReviewHtml(r.date) + ' · ' + escapeReviewHtml(r.source) + '</div>'
        + '</div>';
    }).join('');
  }

  // 1. Render static reviews immediately
  if (REVIEWS.length) renderReviews(REVIEWS);

  // 2. Fetch approved direct reviews and merge
  if (REVIEW_GAS_ENDPOINT && REVIEW_GAS_ENDPOINT !== 'YOUR_GAS_ENDPOINT_HERE') {
    fetch(REVIEW_GAS_ENDPOINT + '?action=approved')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.success && data.reviews && data.reviews.length > 0) {
          // Deduplicate by text (first 100 chars)
          var existingTexts = {};
          REVIEWS.forEach(function(r) { existingTexts[r.text.substring(0, 100)] = true; });

          var newReviews = data.reviews.filter(function(r) {
            return !existingTexts[r.text.substring(0, 100)];
          });

          if (newReviews.length > 0) {
            var merged = REVIEWS.concat(newReviews);
            renderReviews(merged);
          }
        }
      })
      .catch(function() {
        // Silently fail — static reviews remain displayed
      });
  }
})();
