#!/usr/bin/env node
// check-facts.mjs — every number the site shows must match content/facts.yaml.
// Fails (exit 1) on the first divergence so a stale price never ships.
import { read, loadFacts, readLpConst, PAGES, fmtJPY, fmtNum } from './lib/site.mjs';

const F = loadFacts();
const van = F.private_van, bus = F.private_minibus, gt = F.group_tour_wednesday, ext = F.extensions, oc = F.onsite_costs;
const usd = van.price.USD, jpy = van.price.JPY;
const failures = [];
const checks = [];

function expect(file, needle, why) {
  checks.push({ file, needle, why });
}

// ---- lp/lp.js: LP_PRICES must equal facts.private_van.price ----
const lpPrices = readLpConst('LP_PRICES');
for (const [cur, tiers] of Object.entries(van.price)) {
  for (const [tier, val] of Object.entries(tiers)) {
    if (lpPrices[cur]?.[tier] !== val) failures.push(`lp/lp.js LP_PRICES.${cur}.${tier} = ${lpPrices[cur]?.[tier]} (facts: ${val})`);
  }
  if (lpPrices[cur]?.phoneCC !== van.phone_cc[cur]) failures.push(`lp/lp.js LP_PRICES.${cur}.phoneCC = ${lpPrices[cur]?.phoneCC} (facts: ${van.phone_cc[cur]})`);
}
for (const cur of Object.keys(lpPrices)) if (!van.price[cur]) failures.push(`lp/lp.js LP_PRICES has currency ${cur} missing from facts`);
expect('lp/lp.js', `experience-calendar/${van.bokun_experience_id}`, 'van Bokun id');
expect('lp/lp.js', `experience/${bus.bokun_experience_id}`, 'mini bus Bokun id');
expect('lp/lp.js', `'${F.ids.bokun_channel_uuid}'`, 'Bokun channel');

// ---- index.html ----
const ix = 'index.html';
expect(ix, `USD ${usd.p1}`, 'van 1 guest'); expect(ix, `USD ${usd.p2}`, 'van 2 guests'); expect(ix, `USD ${usd.p35}`, 'van 3–5 guests');
expect(ix, `"price": "${jpy.p1}"`, 'JSON-LD offer price');
expect(ix, `"priceRange": "${fmtJPY(jpy.p35)}-${fmtJPY(jpy.p1)}"`, 'JSON-LD priceRange');
expect(ix, `USD ${bus.price_6_10_group_usd} / group`, 'mini bus 6–10');
expect(ix, `USD ${bus.price_11_15_adult_usd} / adult`, 'mini bus 11–15');
expect(ix, `USD ${bus.child_4_9_usd_from_11_guests} each from 11 guests`, 'mini bus child');
expect(ix, `USD ${bus.minimum_booking_usd} is the minimum`, 'mini bus minimum');
expect(ix, `Book ${bus.booking_min_advance_days}+ days ahead`, 'mini bus lead time');
expect(ix, `Answer within ${bus.confirmation_within_hours} h`, 'mini bus confirmation');
expect(ix, `Free cancellation up to ${bus.cancellation.free_until_days_before} days before`, 'mini bus cancellation');
expect(ix, `Free cancellation up to ${van.cancellation.free_until_hours_before} h before`, 'van cancellation');
expect(ix, `USD ${gt.price_per_person_usd} / person`, 'group tour price');
expect(ix, `departs with ${gt.min_to_run}+ guests`, 'group tour min');
expect(ix, `$${ext.per_30min_usd} per group`, 'extension 30 min');
expect(ix, `$${ext.per_hour_usd}/hour per group`, 'extension 1 hour');
expect(ix, `up to ${van.large_suitcases_in_van_max_guests} guests' large cases`, 'luggage');
expect(ix, `"reviewCount": "${F.business.review_count}"`, 'review count');
expect(ix, `"ratingValue": "${F.business.rating.toFixed(1)}"`, 'rating');
expect(ix, `"telephone": "${F.business.phone}"`, 'phone');
expect(ix, `"postalCode": "${F.business.postal_code}"`, 'postal code');
expect(ix, `experience-calendar/${van.bokun_experience_id}`, 'van Bokun id');
expect(ix, `experience/${bus.bokun_experience_id}`, 'mini bus Bokun id');
expect(ix, `experience/${gt.bokun_experience_id}`, 'group Bokun id');

// ---- group-tour.html ----
const gtf = 'group-tour.html';
expect(gtf, `$${gt.price_per_person_usd} USD per person`, 'group price');
expect(gtf, `${gt.min_to_run} – ${gt.capacity} guests`, 'group size');
expect(gtf, `${gt.start.replace(/^0/, '')} – ${gt.end}`, 'group hours');
expect(gtf, `arrive at Shin-Fuji by ${gt.arrive_at_station_by}`, 'arrive by');
expect(gtf, `${gt.booking_cutoff_days_before} days before`, 'group cutoff');
expect(gtf, `experience-calendar/${gt.bokun_experience_id}`, 'group Bokun id');
expect(gtf, `$${gt.price_per_person_usd} USD / person · all ages`, 'sticky bar price');

// ---- api/group-availability.js ----
expect('api/group-availability.js', `CAPACITY = ${gt.capacity}`, 'capacity');
expect('api/group-availability.js', `MIN_TO_RUN = ${gt.min_to_run}`, 'min to run');
expect('api/group-availability.js', `${gt.bokun_experience_id}`, 'group Bokun id');

// ---- payments.html ----
expect('payments.html', `$${ext.per_30min_usd} / 30 minutes / group`, 'extension 30 min');
expect('payments.html', `$${ext.per_hour_usd} / hour / group`, 'extension 1 hour');
expect('payments.html', ext.stripe_link_30min, 'Stripe link 30 min');
expect('payments.html', ext.stripe_link_1hour, 'Stripe link 1 hour');

// ---- experiences.html (on-site costs) ----
const ex = 'experiences.html';
expect(ex, `${fmtJPY(oc.yakisoba_per_person_jpy)} / person`, 'yakisoba');
expect(ex, `${fmtJPY(oc.heritage_center_per_person_jpy)} / person`, 'heritage center');
expect(ex, `${fmtJPY(oc.matcha_cafe_per_person_jpy)} / person`, 'matcha café');
expect(ex, `${fmtJPY(oc.matcha_handson_per_person_jpy)} / person`, 'matcha hands-on');
expect(ex, `${fmtJPY(oc.tea_ceremony_per_group_jpy)} / group`, 'tea ceremony');
expect(ex, `${fmtJPY(oc.kimono_per_person_jpy)} / person`, 'kimono');
expect(ex, `${fmtJPY(oc.wagashi_workshop_per_person_jpy)} / person`, 'wagashi');
expect(ex, oc.maki_sushi, 'maki sushi');

// ---- tokushoho.html (legal page, Japanese) ----
const tk = 'tokushoho.html';
expect(tk, `1名様：${fmtJPY(jpy.p1)}`, 'van 1 guest');
expect(tk, `お一人様あたり${fmtJPY(jpy.p2)}`, 'van 2 guests');
expect(tk, `3〜5名様：${fmtJPY(jpy.p35)}〜/人`, 'van 3–5');
expect(tk, `US$${bus.price_6_10_group_usd}／グループ`, 'mini bus 6–10');
expect(tk, `US$${bus.price_11_15_adult_usd}／人`, 'mini bus 11–15');
expect(tk, `US$${bus.child_4_9_usd_from_11_guests}`, 'mini bus child');
expect(tk, `出発日の${bus.booking_min_advance_days}日前まで`, 'mini bus lead time');
expect(tk, `${bus.confirmation_within_hours}時間以内に催行可否`, 'mini bus confirmation');
expect(tk, `${van.cancellation.free_until_hours_before}時間前まで`, 'van cancellation');
expect(tk, `${bus.cancellation.free_until_days_before}日前まで`, 'mini bus cancellation');
expect(tk, `キャンプサイトカフェ：${oc.campsite_cafe.replace(/ \/ /g, '/').replace(' + ', '＋').replace('group', 'グループ').replace('person', '人')}`, 'campsite café');
expect(tk, `文化遺産センター：${fmtJPY(oc.heritage_center_per_person_jpy)}/人`, 'heritage center');
expect(tk, `抹茶カフェ：${fmtJPY(oc.matcha_cafe_per_person_jpy)}/人`, 'matcha café');
expect(tk, `抹茶体験：${fmtJPY(oc.matcha_handson_per_person_jpy)}/人`, 'matcha hands-on');
expect(tk, `茶道体験：${fmtJPY(oc.tea_ceremony_per_group_jpy)}/グループ`, 'tea ceremony');
expect(tk, `着物レンタル：${fmtJPY(oc.kimono_per_person_jpy)}/人`, 'kimono');
expect(tk, `地元グルメ：${fmtJPY(oc.yakisoba_per_person_jpy)}/人`, 'yakisoba');
expect(tk, F.business.address_ja, 'address');
expect(tk, F.business.postal_code, 'postal code');
expect(tk, F.business.email, 'email');

// ---- content/public-extra.md: numbers it restates must agree with facts ----
const px = 'content/public-extra.md';
expect(px, `at least ${van.booking_min_advance_days} days advance notice`, 'booking lead time');
expect(px, `rental fee $${oc.child_seat_rental_usd} USD`, 'child seat');
expect(px, `${van.guests_min}–${van.guests_max} guests`, 'van size');
expect(px, `${bus.guests_min}–${bus.guests_max} guests`, 'mini bus size');

// ---- every page: sticky bar + footer extension link ----
for (const { file } of PAGES) {
  if (file === 'tokushoho.html') continue;
  if (file !== 'group-tour.html') expect(file, `From USD ${fmtNum(usd.p35)}`, 'sticky bar price');
  expect(file, `+$${ext.per_hour_usd}/hr`, 'footer extension link');
}

// ---- run ----
// A needle may live in visible text (entities decoded, tags removed, spacing
// collapsed) or in raw markup (href / JSON-LD / JS). Accept either.
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', yen: '¥', ndash: '–', mdash: '—', hellip: '…' };
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, e) => ENT[e.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ');
}
const cache = new Map();
for (const { file, needle, why } of checks) {
  if (!cache.has(file)) {
    const raw = read(file);
    cache.set(file, { raw, text: visibleText(raw) });
  }
  const { raw, text } = cache.get(file);
  const want = needle.replace(/\s+/g, ' ');
  if (!raw.includes(needle) && !text.includes(want)) failures.push(`${file}: expected "${needle}" (${why})`);
}

if (failures.length) {
  console.error(`check-facts: ${failures.length} mismatch(es) against content/facts.yaml\n`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`check-facts: ${checks.length + Object.keys(van.price).length * 4} assertions OK against content/facts.yaml`);
