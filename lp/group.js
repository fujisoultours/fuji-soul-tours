// group.js — Wednesday Group Tour page interactions.
// Nav, sticky bar and lazy Bokun loading come from lp/lp.js (#book section).
// This file hides the calendar loading hint once Bokun injects its iframe, and
// fills the live seat panel that sits under the calendar.
// (lp.js's own hint logic watches #bokunCalendar, which is reserved for the
// private-tour calendar and gets its data-src rewritten by lpUpdateBokunSrc —
// hence the separate #bokunGroupCalendar id here.)

// How many Wednesdays the panel lists before deferring to the calendar above.
const GT_SEATS_ROWS = 5;
// Remaining seats at which a confirmed Wednesday switches to "only N left".
const GT_LAST_SEATS = 3;

function gtSeatCount(n) {
  return n + (n === 1 ? ' seat' : ' seats');
}

function gtRenderSeats(data) {
  const panel = document.getElementById('gtSeats');
  const list = document.getElementById('gtSeatsList');
  const key = document.getElementById('gtSeatsKey');
  const more = document.getElementById('gtSeatsMore');
  if (!panel || !list || !key || !more) return;

  const capacity = data.capacity;
  const minToRun = data.minToRun;
  const dates = data.dates || [];
  // An all-zero panel sells nothing, and an empty one has nothing to say.
  if (!dates.length || !dates.some(function (d) { return d.booked > 0; })) return;

  const shown = dates.slice(0, GT_SEATS_ROWS);
  list.replaceChildren();
  shown.forEach(function (d) {
    const row = document.createElement('div');
    row.className = 'gt-seats-row';

    const date = document.createElement('span');
    date.className = 'gs-date';
    // Bokun's dates are calendar days, so keep formatting in UTC.
    date.textContent = new Date(d.date + 'T00:00:00Z')
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

    const bar = document.createElement('span');
    bar.className = 'gs-bar';
    const fill = document.createElement('span');
    fill.className = 'gs-fill';
    fill.style.width = Math.min(100, d.booked / capacity * 100) + '%';
    const goal = document.createElement('span');
    goal.className = 'gs-goal';
    goal.style.left = (minToRun / capacity * 100) + '%';
    bar.appendChild(fill);
    bar.appendChild(goal);

    const count = document.createElement('span');
    count.className = 'gs-count';
    if (d.remaining <= 0) {
      // Bokun normally drops a sold-out day from the calendar; if it ever
      // reports one as bookable, say so rather than "only 0 seats left".
      row.classList.add('is-confirmed');
      count.textContent = 'Fully booked';
    } else if (d.booked >= minToRun && d.remaining <= GT_LAST_SEATS) {
      row.classList.add('is-confirmed', 'is-last');
      count.textContent = 'Confirmed · only ' + gtSeatCount(d.remaining) + ' left';
    } else if (d.booked >= minToRun) {
      row.classList.add('is-confirmed');
      count.textContent = 'Confirmed to run · ' + gtSeatCount(d.remaining) + ' left';
    } else if (d.booked > 0) {
      count.textContent = d.booked + ' booked · ' + (minToRun - d.booked) + ' more to run';
    } else {
      row.classList.add('is-open');
      count.textContent = 'Open — be the first to book';
    }

    row.appendChild(date);
    row.appendChild(bar);
    row.appendChild(count);
    list.appendChild(row);
  });

  key.textContent = 'Departure line: ' + minToRun + ' guests';
  const rest = dates.length - shown.length;
  if (rest > 0) {
    more.textContent = '+' + rest + ' more Wednesdays in the calendar above ↑';
  } else {
    more.hidden = true;
  }

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
