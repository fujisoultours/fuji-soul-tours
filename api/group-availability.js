// Live seat counts for the Wednesday group tour (#book on /group-tour).
//
// Proxies the endpoint Bokun's own calendar widget calls. It needs no key, but
// it sends no CORS headers, so the page cannot fetch it directly — hence this
// function. Results are cached so a page view costs Bokun nothing most of the
// time. Design notes: ~/Downloads/group_tour_booking_progress_設計書_20260826.md

const CHANNEL_UUID = "9c7daabb-e81c-4ae1-b504-5451a5ca69ff";
const EXPERIENCE_ID = 1247586;
const CAPACITY = 15; // seats per departure — every Wednesday is sold at 15
const MIN_TO_RUN = 10; // the tour runs once this many are booked
const SEASON_MONTHS = [[2026, 10], [2026, 11], [2026, 12]];
const CACHE_TTL = 10 * 60 * 1000;

let cache = null;
let cachedAt = 0;

// ===== In-memory rate limiter (same shape as api/chat.js) =====
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const rateLimits = new Map();

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimits.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  record.count++;
  rateLimits.set(ip, record);
  if (rateLimits.size > 1000) {
    for (const [k, v] of rateLimits) {
      if (now > v.resetAt) rateLimits.delete(k);
    }
  }
  return record.count <= RATE_LIMIT_MAX;
}

// Bokun stamps each day as UTC midnight, so read the parts back in UTC.
function toIsoDate(epochMs) {
  return new Date(epochMs).toISOString().slice(0, 10);
}

async function fetchMonth(year, month) {
  const url =
    `https://widgets.bokun.io/widgets/${CHANNEL_UUID}/activity/${EXPERIENCE_ID}` +
    `/${year}/${month}?currency=USD&lang=en_GB`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`Bokun ${year}-${month} responded ${res.status}`);

  const data = await res.json();
  const weeks = (data.calendar && data.calendar.weeks) || [];
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const days = [];

  for (const week of weeks) {
    for (const day of week.days || []) {
      // A month's response is padded with days from the neighbouring months —
      // those repeat (as NOT_AVAILABLE) in the response that really owns them.
      const date = toIsoDate(day.dateObj);
      if (!date.startsWith(prefix)) continue;

      const slot = (day.availabilities || [])[0];
      if (!slot) continue;

      // availabilityCount is seats left. bookedCount is always 0 here, even on
      // days with bookings, so the booked figure has to be derived.
      const remaining = slot.availabilityCount;
      if (typeof remaining !== "number" || !Number.isFinite(remaining)) continue;
      days.push({
        date,
        remaining,
        booked: Math.max(0, CAPACITY - remaining),
      });
    }
  }
  return days;
}

async function loadDates() {
  const today = new Date().toISOString().slice(0, 10);
  const [thisYear, thisMonth] = [new Date().getUTCFullYear(), new Date().getUTCMonth() + 1];
  const months = SEASON_MONTHS.filter(
    ([y, m]) => y > thisYear || (y === thisYear && m >= thisMonth)
  );
  if (months.length === 0) return [];

  const byMonth = await Promise.all(months.map(([y, m]) => fetchMonth(y, m)));
  return byMonth
    .flat()
    .filter((d) => d.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkRateLimit(getClientIp(req))) {
    return res.status(429).json({ error: "Too many requests. Please try again in a minute." });
  }

  const now = Date.now();
  if (cache && now - cachedAt < CACHE_TTL) {
    return sendFresh(res, cache);
  }

  try {
    cache = { capacity: CAPACITY, minToRun: MIN_TO_RUN, dates: await loadDates() };
    cachedAt = now;
    return sendFresh(res, cache);
  } catch (err) {
    console.error("Group availability error:", err.message);
    // Stale beats blank: the page hides the whole block when this call fails.
    // Back off for a minute so an outage doesn't retry Bokun on every request.
    if (cache) {
      cachedAt = now - CACHE_TTL + 60 * 1000;
      return sendFresh(res, cache);
    }
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "Availability is temporarily unavailable" });
  }
};

function sendFresh(res, payload) {
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
  return res.status(200).json(payload);
}
