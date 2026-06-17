// lp.js — Booking-First LP interactions. Plain JS, no framework (SEO-safe).

// ===== PROMO: 15% OFF, ends June 16 (promo15). =====
// Teardown on 6/16: set active:false here — strikethroughs, promo chips and
// sale prices all revert in one flag. (Also disable Bokun price modulator
// 20867, update TikTok/Instagram bios, and remove kb/knowledge-base.json
// pricing.promo — see the Notion checklist.)
const PROMO = { active: false, rate: 0.85, campaign: 'promo15' };

// ---- Prices (mirrors production PRICES; full = pre-promo list prices) ----
const LP_PRICES = {
  USD: { phoneCC: 'US', p1: 432,   p2: 216,   p35: 159 },
  EUR: { phoneCC: 'DE', p1: 371,   p2: 185,   p35: 136 },
  AUD: { phoneCC: 'AU', p1: 602,   p2: 301,   p35: 221 },
  CAD: { phoneCC: 'CA', p1: 597,   p2: 298,   p35: 219 },
  JPY: { phoneCC: 'JP', p1: 69000, p2: 34500, p35: 25320 },
};

// ---- Bokun (channel + experience must match production) ----
const BOKUN_CHANNEL = '9c7daabb-e81c-4ae1-b504-5451a5ca69ff';
const BOKUN_CALENDAR_BASE = 'https://widgets.bokun.io/online-sales/' + BOKUN_CHANNEL + '/experience-calendar/1171469?partialView=1';
const BOKUN_POPUP_BASE = 'https://widgets.bokun.io/online-sales/' + BOKUN_CHANNEL + '/experience/1171469?partialView=1';

const lpFmt = (cur, n) => `${cur} ${n.toLocaleString('en-US')}`;

let lpCurrency = 'USD';
let lpHcTier = 'p35';

function lpPromoOn() {
  return PROMO.active;
}

function lpRenderPrices() {
  const p = LP_PRICES[lpCurrency];
  const sale = (n) => Math.round(n * PROMO.rate);
  const promo = lpPromoOn();
  document.querySelectorAll('[data-price]').forEach((el) => {
    const key = el.dataset.price;
    if (key === 'hc-total') { el.textContent = lpFmt(lpCurrency, promo ? sale(p[lpHcTier]) : p[lpHcTier]); return; }
    const isFull = key.endsWith('-full');
    const tier = isFull ? key.replace('-full', '') : key;
    if (!(tier in p)) return;
    el.textContent = lpFmt(lpCurrency, isFull || !promo ? p[tier] : sale(p[tier]));
  });
  // FX disclaimer only applies to non-JPY currencies
  const fxNote = document.getElementById('fxNote');
  if (fxNote) fxNote.style.display = lpCurrency === 'JPY' ? 'none' : '';
}

// Keep both Bokun embeds' currency + phone country in sync with the selector.
// (Effective before the widget loads; after load, Bokun's own checkout
// currency selector takes over.)
function lpUpdateBokunSrc() {
  const p = LP_PRICES[lpCurrency];
  const q = '&currency=' + lpCurrency + '&phoneCountryCode=' + p.phoneCC;
  const cal = document.getElementById('bokunCalendar');
  if (cal) cal.setAttribute('data-src', BOKUN_CALENDAR_BASE + q);
  const pop = document.getElementById('bokun_418f34f4_28e2_4185_85e4_7aa761106072');
  if (pop) pop.setAttribute('data-src', BOKUN_POPUP_BASE + q);
}

// ---- Currency segment control ----
function lpInitCurrency() {
  const row = document.querySelector('.currency-row');
  if (!row) return;
  Object.keys(LP_PRICES).forEach((cur) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'currency-btn';
    b.textContent = cur;
    b.setAttribute('aria-pressed', String(cur === lpCurrency));
    b.addEventListener('click', () => {
      lpCurrency = cur;
      row.querySelectorAll('.currency-btn').forEach((x) => x.setAttribute('aria-pressed', String(x.textContent === cur)));
      lpRenderPrices();
      lpUpdateBokunSrc();
    });
    row.appendChild(b);
  });
}

// ---- Hero quick-pick card (bookcard hero variant) ----
function lpInitHeroCard() {
  document.querySelectorAll('.hc-group').forEach((btn) => {
    btn.addEventListener('click', () => {
      lpHcTier = btn.dataset.tier;
      document.querySelectorAll('.hc-group').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
      lpRenderPrices();
    });
  });
}

// ---- Route tabs ----
const LP_ROUTES = [
  { label: 'Tokyo → Kyoto', stops: [
    { time: '6:57',  name: 'Depart Tokyo',    det: 'Kodama, ~1 h' },
    { time: '8:03',  name: 'Meet your guide', det: 'Shin-Fuji gate', tour: true },
    { time: '8:10',  name: '4-hour tour',     det: 'Hidden spots & culture', tour: true },
    { time: '13:08', name: 'Depart Shin-Fuji', det: 'Buffer for lunch first' },
    { time: '15:15', name: 'Arrive Kyoto ✓',  det: 'Full evening ahead' },
  ]},
  { label: 'Tokyo → Osaka', stops: [
    { time: '6:57',  name: 'Depart Tokyo',    det: 'Kodama, ~1 h' },
    { time: '8:03',  name: 'Meet your guide', det: 'Shin-Fuji gate', tour: true },
    { time: '8:10',  name: '4-hour tour',     det: 'Hidden spots & culture', tour: true },
    { time: '13:08', name: 'Depart Shin-Fuji', det: 'Buffer for lunch first' },
    { time: '15:30', name: 'Arrive Shin-Osaka ✓', det: 'Full evening ahead' },
  ]},
  { label: 'Kyoto → Tokyo', stops: [
    { time: '8:30',  name: 'Depart Kyoto',    det: 'Nozomi, ~2 h' },
    { time: '10:36', name: 'Meet your guide', det: 'Shin-Fuji gate', tour: true },
    { time: '10:45', name: '4-hour tour',     det: 'Hidden spots & culture', tour: true },
    { time: '15:10', name: 'Depart Shin-Fuji', det: 'After a short buffer' },
    { time: '16:18', name: 'Arrive Tokyo ✓',  det: 'In time for dinner' },
  ]},
  { label: 'Osaka → Tokyo', stops: [
    { time: '8:15',  name: 'Depart Shin-Osaka', det: 'Nozomi, ~2.5 h' },
    { time: '10:36', name: 'Meet your guide', det: 'Shin-Fuji gate', tour: true },
    { time: '10:45', name: '4-hour tour',     det: 'Hidden spots & culture', tour: true },
    { time: '15:10', name: 'Depart Shin-Fuji', det: 'After a short buffer' },
    { time: '16:18', name: 'Arrive Tokyo ✓',  det: 'In time for dinner' },
  ]},
  { label: 'Tokyo half-day trip', stops: [
    { time: '6:57',  name: 'Depart Tokyo',    det: 'Kodama, ~1 h' },
    { time: '8:03',  name: 'Meet your guide', det: 'Shin-Fuji gate', tour: true },
    { time: '8:10',  name: '4-hour tour',     det: 'Hidden spots & culture', tour: true },
    { time: '13:10', name: 'Depart Shin-Fuji', det: 'Buffer for lunch first' },
    { time: '14:18', name: 'Back in Tokyo ✓', det: 'Whole afternoon free' },
  ]},
];

function lpRenderRoute(i) {
  const wrap = document.getElementById('routeStops');
  wrap.innerHTML = '';
  LP_ROUTES[i].stops.forEach((s) => {
    const d = document.createElement('div');
    d.className = 'route-stop' + (s.tour ? ' tour' : '');
    d.innerHTML = `<span class="r-time">${s.time}</span><p class="r-name">${s.name}</p><p class="r-det">${s.det}</p>`;
    wrap.appendChild(d);
  });
}

function lpInitRoutes() {
  const tabs = document.querySelector('.route-tabs');
  if (!tabs) return;
  LP_ROUTES.forEach((r, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'route-tab';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(i === 0));
    b.textContent = r.label;
    b.addEventListener('click', () => {
      tabs.querySelectorAll('.route-tab').forEach((x, j) => x.setAttribute('aria-selected', String(i === j)));
      lpRenderRoute(i);
    });
    tabs.appendChild(b);
  });
  lpRenderRoute(0);
}

// ---- Gallery lightbox (self-hosted, no third-party JS) ----
function lpInitGallery() {
  // randomize the gallery page (grid + story row) on each visit
  const shuffle = (parent) => {
    if (!parent) return;
    const kids = [...parent.children];
    for (let i = kids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kids[i], kids[j]] = [kids[j], kids[i]];
    }
    kids.forEach((k) => parent.appendChild(k));
  };
  if (document.querySelector('.gallery-grid')) {
    shuffle(document.querySelector('.gallery-grid'));
    shuffle(document.querySelector('.story-row'));
  }

  const items = [...document.querySelectorAll('[data-glb]')];
  if (!items.length) return;
  const sources = items.map((el) => ({
    src: el.dataset.glb,
    cap: el.dataset.glbCap || '',
  }));

  const overlay = document.createElement('div');
  overlay.className = 'glb';
  overlay.innerHTML =
    '<button class="glb-btn glb-close" aria-label="Close">&times;</button>' +
    '<button class="glb-btn glb-nav glb-prev" aria-label="Previous">&#8249;</button>' +
    '<img alt="">' +
    '<button class="glb-btn glb-nav glb-next" aria-label="Next">&#8250;</button>' +
    '<p class="glb-cap"></p>';
  document.body.appendChild(overlay);
  const imgEl = overlay.querySelector('img');
  const capEl = overlay.querySelector('.glb-cap');
  let idx = 0;

  const show = (i) => {
    idx = (i + sources.length) % sources.length;
    imgEl.src = sources[idx].src;
    imgEl.alt = sources[idx].cap;
    capEl.textContent = sources[idx].cap;
  };
  const open = (i) => { show(i); overlay.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const close = () => { overlay.classList.remove('open'); document.body.style.overflow = ''; };

  items.forEach((el, i) => {
    el.addEventListener('click', () => open(i));
  });
  overlay.querySelector('.glb-close').addEventListener('click', close);
  overlay.querySelector('.glb-prev').addEventListener('click', (e) => { e.stopPropagation(); show(idx - 1); });
  overlay.querySelector('.glb-next').addEventListener('click', (e) => { e.stopPropagation(); show(idx + 1); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
  });
}

// ---- Reviews carousel nav (used by reviews.js-rendered cards) ----
function scrollCarousel(btn, dir) {
  const wrap = btn.closest('.reviews-carousel-wrap');
  if (!wrap) return;
  const carousel = wrap.querySelector('.reviews-grid');
  if (!carousel) return;
  const card = carousel.querySelector('.review-card');
  if (!card) return;
  carousel.scrollLeft += dir * (card.offsetWidth + 18);
}
window.scrollCarousel = scrollCarousel;

// ---- Guest photo carousel (LP teaser) ----
function scrollGuest(btn, dir) {
  const wrap = btn.closest('.gallery-teaser');
  const car = wrap && wrap.querySelector('.guest-carousel');
  if (!car) return;
  const card = car.querySelector('.guest-card');
  if (!card) return;
  car.scrollLeft += dir * (card.offsetWidth + 16) * 2;
}
window.scrollGuest = scrollGuest;

// ---- Mobile nav: hamburger dropdown ----
function lpInitNavMenu() {
  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('navMenu');
  if (!burger || !menu) return;
  const close = () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  // tap outside the nav closes the menu
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') && !e.target.closest('.nav')) close();
  });
}

// ---- Desktop "Explore" dropdown in the header ----
function lpInitExplore() {
  const wrap = document.querySelector('.nav-explore');
  const toggle = document.getElementById('navExploreToggle');
  if (!wrap || !toggle) return;
  const close = () => { wrap.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = wrap.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => {
    if (wrap.classList.contains('open') && !e.target.closest('.nav-explore')) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

// ---- Mobile sticky booking bar: show after the hero, hide over #book ----
function lpInitStickyBar() {
  const bar = document.getElementById('stickyBar');
  if (!bar || !('IntersectionObserver' in window)) return;
  const hero = document.querySelector('.hero');
  const book = document.getElementById('book');
  if (!hero || !book) {
    // article pages: no hero/booking section — show after a bit of scroll
    window.addEventListener('scroll', () => bar.classList.toggle('show', window.scrollY > 600), { passive: true });
    return;
  }
  let pastHero = false, overBook = false;
  const update = () => bar.classList.toggle('show', pastHero && !overBook);
  new IntersectionObserver((es) => { pastHero = !es[0].isIntersecting; update(); }, { rootMargin: '-60px 0px 0px 0px' }).observe(hero);
  new IntersectionObserver((es) => { overBook = es[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(book);
}

// ---- Promo flag → DOM attribute + GA session tag ----
function lpInitPromo() {
  document.documentElement.dataset.promo = PROMO.active ? 'on' : 'off';
  // only tag sessions on pages that actually show promo UI
  if (PROMO.active && typeof gtag === 'function' && document.querySelector('.promo-only')) {
    gtag('event', 'promo_view', { 'event_category': 'promo', 'campaign': PROMO.campaign, 'discount_rate': PROMO.rate });
  }
}

// ===== Bokun widget loader — lazy-loaded to prevent iOS scroll hijack =====
(function () {
  let loaded = false;
  window._loadBokun = function () {
    if (loaded) return;
    loaded = true;
    const s = document.createElement('script');
    s.src = 'https://widgets.bokun.io/assets/javascripts/apps/build/BokunWidgetsLoader.js?bookingChannelUUID=' + BOKUN_CHANNEL;
    s.async = true;
    // Prevent Bokun from scrolling the page when it initializes
    const savedY = window.scrollY;
    s.onload = function () {
      setTimeout(function () {
        if (window._navScrolling) return;
        if (Math.abs(window.scrollY - savedY) > 150) return;
        window.scrollTo(0, savedY);
      }, 600);
    };
    document.body.appendChild(s);
  };
  document.addEventListener('DOMContentLoaded', function () {
    // Hide the loading hint once Bokun injects its iframe into the calendar slot
    const cal = document.getElementById('bokunCalendar');
    if (cal && window.MutationObserver) {
      new MutationObserver(function (muts, obs) {
        if (cal.querySelector('iframe')) {
          const hint = document.querySelector('.bokun-loading');
          if (hint) hint.style.display = 'none';
          obs.disconnect();
        }
      }).observe(cal, { childList: true, subtree: true });
    }
    // Load after 3 seconds or when the booking section approaches (whichever first)
    const timer = setTimeout(window._loadBokun, 3000);
    const bookSection = document.getElementById('book');
    if (bookSection && window.IntersectionObserver) {
      new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting) { clearTimeout(timer); window._loadBokun(); obs.disconnect(); }
      }, { rootMargin: '400px' }).observe(bookSection);
    }
    // Also load on any booking CTA click
    document.addEventListener('click', function (e) {
      if (e.target.closest('.btn-book, .bokunButton')) window._loadBokun();
    }, { once: true });
  });
})();

// ===== GA4 custom event tracking =====
function lpInitTracking() {
  if (typeof gtag !== 'function') return;

  // Section engagement: 'section_view' on first appearance, 'section_engaged' after 5s dwell
  const sections = ['route', 'day', 'weather', 'addons', 'reviews', 'book', 'faq', 'contact'];
  const timers = {}, viewed = {};
  if (window.IntersectionObserver) {
    sections.forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (!viewed[id]) {
              viewed[id] = true;
              gtag('event', 'section_view', { 'event_category': 'engagement', 'section': id });
            }
            timers[id] = setTimeout(function () {
              gtag('event', 'section_engaged', { 'event_category': 'engagement', 'section': id });
            }, 5000);
          } else {
            clearTimeout(timers[id]);
          }
        });
      }, { threshold: 0.3 }).observe(el);
    });
  }

  // Booking CTA clicks (anchors to #book + the Bokun popup button)
  document.addEventListener('click', function (e) {
    const el = e.target.closest('a.btn-book, button.bokunButton');
    if (!el) return;
    const label = el.closest('[data-screen-label]')?.dataset.screenLabel || 'page';
    gtag('event', 'book_now_click', { 'event_category': 'booking', 'event_label': label, 'campaign': PROMO.active ? PROMO.campaign : '' });
  });

  // Bokun widget progress via postMessage
  window.addEventListener('message', function (e) {
    try {
      if (!e.origin || e.origin.indexOf('bokun') === -1) return;
      const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (!data) return;
      const evtName = data.type || data.event || data.action;
      if (evtName) {
        gtag('event', 'bokun_widget', { 'event_category': 'booking_widget', 'event_label': evtName });
      }
    } catch (err) { /* ignore non-JSON messages */ }
  });
}

// ---- Suppress Bokun scroll-restore while user navigates via anchor links ----
function lpInitNavScrollGuard() {
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    window._navScrolling = true;
    clearTimeout(window._navScrollTimer);
    window._navScrollTimer = setTimeout(function () { window._navScrolling = false; }, 1200);
  });
}

// ===== Chatbot (Ask AI → /api/chat) =====
function lpInitChatbot() {
  const toggle = document.getElementById('chatToggle');
  const win = document.getElementById('chatWindow');
  if (!toggle || !win) return;
  const msgs = document.getElementById('chatMessages');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSend');
  const history = [];
  let sending = false;

  function closeChat() {
    toggle.classList.remove('active');
    win.classList.remove('open');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', function () {
    toggle.classList.toggle('active');
    win.classList.toggle('open');
    if (win.classList.contains('open')) {
      if (window.innerWidth <= 480) document.body.style.overflow = 'hidden';
      input.focus();
    } else {
      document.body.style.overflow = '';
    }
  });

  // Fix mobile keyboard pushing input out of view
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      if (!win.classList.contains('open') || window.innerWidth > 480) return;
      win.style.height = window.visualViewport.height + 'px';
      msgs.scrollTop = msgs.scrollHeight;
    });
    window.visualViewport.addEventListener('scroll', function () {
      if (!win.classList.contains('open') || window.innerWidth > 480) return;
      win.style.top = window.visualViewport.offsetTop + 'px';
    });
  }

  document.getElementById('chatHeaderClose').addEventListener('click', closeChat);

  function addMsg(text, role) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + role;
    if (role === 'bot') {
      div.innerHTML = formatMarkdown(text);
    } else {
      div.textContent = text;
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function formatMarkdown(text) {
    return text
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n- /g, '\n<li>')
      .replace(/^- /g, '<li>')
      .replace(/(<li>.*(?:\n|$))+/g, function (m) { return '<ul>' + m + '</ul>'; })
      .replace(/\n/g, '<br>');
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'chat-typing';
    div.id = 'chatTyping';
    div.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('chatTyping');
    if (el) el.remove();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showContactFallback(data) {
    const container = document.createElement('div');
    container.className = 'chat-msg bot';

    const card = document.createElement('div');
    card.className = 'chat-contact-card';

    const p = document.createElement('p');
    p.textContent = "I don't have enough info on that yet. Feel free to reach out and we'll get back to you quickly:";
    card.appendChild(p);

    const btns = document.createElement('div');
    btns.className = 'chat-contact-btns';

    const channels = [
      { name: 'Instagram', url: data.contacts.instagram, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>' },
      { name: 'WhatsApp', url: data.contacts.whatsapp, icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.29-1.244l-.306-.182-2.87.852.852-2.87-.182-.306A8 8 0 1112 20z"/></svg>' },
      { name: 'Email', url: 'mailto:' + data.contacts.email, icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4l-10 8L2 4"/></svg>' }
    ];

    channels.forEach(function (ch) {
      const a = document.createElement('a');
      a.className = 'chat-contact-btn';
      a.href = ch.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML = ch.icon + '<span>' + ch.name + '</span>';
      btns.appendChild(a);
    });
    card.appendChild(btns);

    if (data.suggestedMessage) {
      const copyArea = document.createElement('div');
      copyArea.className = 'chat-copy-area';
      copyArea.innerHTML = '<p>Copy this message:</p><p class="chat-copy-text">' + escapeHtml(data.suggestedMessage) + '</p><button class="chat-copy-btn" onclick="copyChatMsg(this)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</button>';
      card.appendChild(copyArea);
    }

    container.appendChild(card);
    msgs.appendChild(container);
    msgs.scrollTop = msgs.scrollHeight;
  }

  window.copyChatMsg = function (btn) {
    const text = btn.parentElement.querySelector('.chat-copy-text').textContent;
    navigator.clipboard.writeText(text).then(function () {
      btn.classList.add('copied');
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
      setTimeout(function () {
        btn.classList.remove('copied');
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy';
      }, 2000);
    });
  };

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || sending) return;

    sending = true;
    sendBtn.disabled = true;
    input.value = '';
    input.blur();
    addMsg(text, 'user');
    history.push({ role: 'user', content: text });
    showTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(-10) })
      });
      hideTyping();

      if (!res.ok) throw new Error('Request failed');

      const data = await res.json();

      if (data.cannotAnswer && data.contactData) {
        addMsg("That's a great question! I don't have the details on that, but our team can help:", 'bot');
        showContactFallback(data.contactData);
        history.push({ role: 'assistant', content: "I don't have enough information about that topic. Please contact us directly." });
      } else if (data.reply) {
        addMsg(data.reply, 'bot');
        history.push({ role: 'assistant', content: data.reply });
      } else {
        addMsg("Sorry, I couldn't process that. Please try again.", 'bot');
      }
    } catch (e) {
      hideTyping();
      addMsg('Sorry, something went wrong. Please try again or contact us directly.', 'bot');
    }

    sending = false;
    sendBtn.disabled = false;
    input.focus();
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  lpInitPromo();
  lpInitNavMenu();
  lpInitExplore();
  lpInitGallery();
  lpInitCurrency();
  lpInitHeroCard();
  lpInitRoutes();
  lpInitStickyBar();
  lpInitNavScrollGuard();
  lpInitTracking();
  lpInitChatbot();
  lpUpdateBokunSrc();
  lpRenderPrices();
});
