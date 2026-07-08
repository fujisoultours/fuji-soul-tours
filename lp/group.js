// group.js — Wednesday Group Tour page interactions.
// Nav, sticky bar and lazy Bokun loading come from lp/lp.js (#book section);
// this file only hides the calendar loading hint once Bokun injects its iframe.
// (lp.js's own hint logic watches #bokunCalendar, which is reserved for the
// private-tour calendar and gets its data-src rewritten by lpUpdateBokunSrc —
// hence the separate #bokunGroupCalendar id here.)

document.addEventListener('DOMContentLoaded', function () {
  var cal = document.getElementById('bokunGroupCalendar');
  if (cal && window.MutationObserver) {
    new MutationObserver(function (muts, obs) {
      if (cal.querySelector('iframe')) {
        var hint = document.querySelector('.bokun-loading');
        if (hint) hint.style.display = 'none';
        obs.disconnect();
      }
    }).observe(cal, { childList: true, subtree: true });
  }
});
