// group.js — Wednesday Group Tour page interactions.
// Nav, sticky bar and lazy Bokun loading come from lp/lp.js (#book section).
// This file hides the calendar loading hint once Bokun injects its iframe, and
// fills the live seat panel that sits under the calendar.
// (lp.js's own hint logic watches #bokunCalendar, which is reserved for the
// private-tour calendar and gets its data-src rewritten by lpUpdateBokunSrc —
// hence the separate #bokunGroupCalendar id here.)

// Remaining seats at which a confirmed Wednesday switches to "only N left".
const GT_LAST_SEATS = 3;

function gtSeatCount(n) {
  return n + (n === 1 ? ' seat' : ' seats');
}

function gtSeatStatus(d, minToRun) {
  if (d.remaining <= 0) {
    // Bokun normally drops a sold-out day from the calendar; if it ever
    // reports one as bookable, say so rather than "only 0 seats left".
    return { cls: 'is-confirmed', text: 'Fully booked' };
  }
  if (d.booked >= minToRun) {
    return d.remaining <= GT_LAST_SEATS
      ? { cls: 'is-confirmed is-last', text: 'Confirmed · only ' + gtSeatCount(d.remaining) + ' left' }
      : { cls: 'is-confirmed', text: 'Confirmed to run · ' + gtSeatCount(d.remaining) + ' left' };
  }
  // Every row below the line reads the same way, zero included.
  return {
    cls: d.booked === 0 ? 'is-open' : '',
    text: d.booked + ' booked · ' + (minToRun - d.booked) + ' more to run'
  };
}

function gtRenderSeats(data) {
  const panel = document.getElementById('gtSeats');
  const list = document.getElementById('gtSeatsList');
  if (!panel || !list) return;

  const dates = data.dates || [];
  // An all-zero panel sells nothing, and an empty one has nothing to say.
  if (!dates.length || !dates.some(function (d) { return d.booked > 0; })) return;

  list.replaceChildren();
  dates.forEach(function (d) {
    const status = gtSeatStatus(d, data.minToRun);
    const row = document.createElement('div');
    row.className = ('gt-seats-row ' + status.cls).trim();

    const date = document.createElement('span');
    date.className = 'gs-date';
    // Bokun's dates are calendar days, so keep formatting in UTC.
    date.textContent = new Date(d.date + 'T00:00:00Z')
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

    const count = document.createElement('span');
    count.className = 'gs-count';
    count.textContent = status.text;

    row.appendChild(date);
    row.appendChild(count);
    list.appendChild(row);
  });

  panel.hidden = false;
}

document.addEventListener('DOMContentLoaded', function () {
  const cal = document.getElementById('bokunGroupCalendar');
  if (cal && window.MutationObserver) {
    new MutationObserver(function (muts, obs) {
      if (cal.querySelector('iframe')) {
        const hint = document.querySelector('.bokun-loading');
        if (hint) hint.style.display = 'none';
        obs.disconnect();
      }
    }).observe(cal, { childList: true, subtree: true });
  }

  // Seat counts are a bonus, never a dependency: if anything goes wrong the
  // panel simply stays hidden and the page looks exactly as it did before.
  fetch('/api/group-availability')
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) { if (data) gtRenderSeats(data); })
    .catch(function () {});
});
