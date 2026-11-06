/* Home 2 behaviour: touchpoint hotspots, seat configurator, package drawer, owners carousel, design-session booking (PDF 9-15). */
(function () {
  'use strict';
  var HX = window.HX || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = HX.fmtPrice || function (n) { return '₹' + Number(n).toLocaleString('en-IN'); };

  /* ---------- touchpoints: hotspot <-> list row ---------- */
  var tip = $('[data-tp-tip]');
  function lightTp(n, show) {
    $$('.tp-dot').forEach(function (d) { d.classList.toggle('is-on', d.getAttribute('data-tp') === n); });
    $$('[data-tp-row]').forEach(function (r) { r.classList.toggle('is-on', r.getAttribute('data-tp-row') === n); });
    if (!tip) return;
    var row = n && $('[data-tp-row="' + n + '"]');
    if (row && show) {
      tip.innerHTML = '<strong>' + HX.esc(row.querySelector('strong').textContent) + '</strong> ' + HX.esc(row.querySelector('p span').textContent) + ' · <span>' + HX.esc(row.querySelector('.tp-price').textContent) + '</span>';
      tip.hidden = false;
    } else tip.hidden = true;
  }
  $$('.tp-dot').forEach(function (d) {
    var n = d.getAttribute('data-tp');
    d.addEventListener('mouseenter', function () { lightTp(n, true); });
    d.addEventListener('focus', function () { lightTp(n, true); });
    d.addEventListener('click', function () { lightTp(n, true); });
    d.addEventListener('mouseleave', function () { lightTp(null); });
    d.addEventListener('blur', function () { lightTp(null); });
  });
  $$('[data-tp-row]').forEach(function (r) {
    var n = r.getAttribute('data-tp-row');
    r.addEventListener('mouseenter', function () { lightTp(n, false); });
    r.addEventListener('mouseleave', function () { lightTp(null); });
  });

  /* ---------- configurator ---------- */
  var cfg = $('[data-cfg]');
  var preview = $('[data-cfg-preview]');
  var PRICE = { Diamond: 8900, Honeycomb: 9600, Channel: 12800, Perforated: 9600 };
  var LIFT = { 'Jet black': 1, Mocha: 1.25, 'Ivory beige': 2.6, Graphite: 1.5, Oxblood: 1.3 };
  var slug = function (s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-'); };
  function updateCfg() {
    if (!cfg || !preview) return;
    var v = function (n) { return cfg.querySelector('input[name="' + n + '"]:checked').value; };
    var pat = v('pattern'), col = v('colour'), thr = v('thread');
    var colEl = cfg.querySelector('input[name="colour"]:checked').closest('.swatch');
    var thrEl = cfg.querySelector('input[name="thread"]:checked').closest('.swatch');
    preview.style.setProperty('--mat', colEl.style.getPropertyValue('--c'));
    preview.style.setProperty('--thr', thrEl.style.getPropertyValue('--c'));
    preview.style.setProperty('--lift', LIFT[col] || 1);
    $('[data-cfg-pattern]', preview).setAttribute('data-cfg-pattern', slug(pat));
    var out = function (k, v) { $$('[data-cfg-out="' + k + '"]').forEach(function (e) { e.textContent = v; }); };
    out('colour', col); out('thread', thr); out('thread2', thr);
    out('summary', (pat === 'Perforated' ? 'Perforated' : pat + ' quilt') + ' · ' + col);
    out('price', fmt(PRICE[pat] || 8900));
    $('[data-cfg-quote]').href = 'quote.html?pattern=' + slug(pat) + '&colour=' + slug(col) + '&thread=' + slug(thr);
  }
  if (cfg) { cfg.addEventListener('change', updateCfg); updateCfg(); }

  /* ---------- package drawer ---------- */
  var PK = {
    essential: { name: 'Essential', badge: 'Quick refresh', price: 18900, desc: 'New seats and floors in a morning: a made-to-measure cover set with matching 7D mats.',
      facts: [['4 hours', 'at the studio'], ['2 yrs', 'warranty'], ['₹0', 'advance']],
      list: [['Full seat cover set', 'Nappa-grade PU'], ['7D floor mats', 'Front + rear'], ['Hand-stitched steering wrap', 'Add ₹2,400', 1], ['64-colour ambient lighting', 'Add ₹8,500', 1], ['Care kit and 30-day re-tightening', 'Free']] },
    signature: { name: 'Signature', badge: 'Most booked', price: 32500, desc: 'The full touch-point refit: everything you hold, sit on and see at night, in one matched design.',
      facts: [['1 day', 'at the studio'], ['2 yrs', 'warranty'], ['30%', 'advance']],
      list: [['Full seat cover set', 'Nappa-grade PU'], ['7D floor mats', 'Front + rear'], ['Hand-stitched steering wrap', 'Matched thread'], ['64-colour ambient lighting', 'Dash + 4 doors'], ['Door armrest inserts', '4 doors'], ['Care kit and 30-day re-tightening', 'Free']] },
    bespoke: { name: 'Bespoke', badge: 'Complete cabin', price: 58000, desc: 'A one-off interior designed with you on a sample board, from roof liner to door pads.',
      facts: [['2 days', 'at the studio'], ['2 yrs', 'warranty'], ['30%', 'advance']],
      list: [['Full seat cover set', 'Any material'], ['7D floor mats', 'Front + rear + boot'], ['Hand-stitched steering wrap', 'Matched thread'], ['64-colour ambient lighting', 'Dash + 4 doors'], ['Door armrest and pad inserts', '4 doors'], ['Suede or starlight roof liner', 'Your choice'], ['Free pick-up and drop', 'City limits']] }
  };
  var drawer = $('#pkgModal');
  function openPkg(key, opener) {
    var p = PK[key]; if (!p || !drawer) return;
    var set = function (k, html) { $('[data-pk="' + k + '"]', drawer).innerHTML = html; };
    set('badge', HX.esc(p.badge)); set('name', HX.esc(p.name)); set('price', fmt(p.price)); set('desc', HX.esc(p.desc));
    set('facts', p.facts.map(function (f) { return '<li><strong>' + f[0] + '</strong><span>' + f[1] + '</span></li>'; }).join(''));
    set('list', p.list.map(function (l) { return '<li' + (l[2] ? ' class="is-no"' : '') + '><span>' + HX.esc(l[0]) + '</span><span>' + HX.esc(l[1]) + '</span></li>'; }).join(''));
    $('[data-pk="quote"]', drawer).href = 'quote.html?package=' + key;
    HX.openModal(drawer, opener);
  }
  $$('[data-pkg]').forEach(function (b) { b.addEventListener('click', function () { openPkg(b.getAttribute('data-pkg'), b); }); });
  var pkBook = $('[data-pk-book]');
  if (pkBook) pkBook.addEventListener('click', function () { HX.closeModal(drawer); HX.openModal('bookModal'); });

  /* ---------- owners: arrows move the highlighted (dark) card ---------- */
  var track = $('[data-ow-track]');
  if (track) {
    var cards = $$('.ow-card', track), cur = 0;
    var go = function (d) {
      cur = (cur + d + cards.length) % cards.length;
      cards.forEach(function (c, i) { c.classList.toggle('is-active', i === cur); });
      if (track.scrollWidth > track.clientWidth + 2) track.scrollTo({ left: cards[cur].offsetLeft - track.offsetLeft, behavior: 'smooth' });
    };
    $('[data-ow-prev]').addEventListener('click', function () { go(-1); });
    $('[data-ow-next]').addEventListener('click', function () { go(1); });
  }

  /* ---------- design-session booking ---------- */
  var modal = $('#bookModal');
  if (!modal) return;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var SLOTS = ['10:00 am', '10:30 am', '11:00 am', '11:30 am', '12:00 pm', '2:30 pm', '3:00 pm', '4:30 pm', '5:30 pm'];
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var maxView = new Date(today.getFullYear(), today.getMonth() + 2, 1);
  var picked = null, slot = null;
  var daysEl = $('[data-cal-days]', modal), slotsEl = $('[data-slots]', modal), form = $('#bookForm');
  var submitBtn = $('[data-book-submit]', modal), slotErr = $('[data-slot-error]', modal);
  var seed = function (d) { return (d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % 7; };
  var isFull = function (d) { return seed(d) === 3; };
  var bookable = function (d) { return d > today && d.getDay() !== 0 && !isFull(d); };
  var longDate = function (d) { return DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; };

  function renderCal() {
    $('[data-cal-month]', modal).textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
    $('[data-cal-prev]', modal).disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    $('[data-cal-next]', modal).disabled = view >= maxView;
    var html = '', first = view.getDay(), n = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (var i = 0; i < first; i++) html += '<span aria-hidden="true"></span>';
    for (var dd = 1; dd <= n; dd++) {
      var d = new Date(view.getFullYear(), view.getMonth(), dd), ok = bookable(d);
      var sel = picked && d.getTime() === picked.getTime();
      var why = d <= today ? 'not available' : d.getDay() === 0 ? 'Sunday, by appointment' : isFull(d) ? 'fully booked' : 'available';
      html += '<button type="button" class="cal-day' + (d <= today ? ' is-past' : '') + '" data-day="' + dd + '"' + (ok ? '' : ' disabled') + ' aria-pressed="' + (sel ? 'true' : 'false') + '" aria-label="' + longDate(d) + ', ' + why + '">' + dd + '</button>';
    }
    daysEl.innerHTML = html;
  }
  function renderSlots() {
    if (!picked) { slotsEl.innerHTML = ''; return; }
    var s = seed(picked);
    slotsEl.innerHTML = SLOTS.map(function (t, i) {
      var taken = (i + s) % 4 === 0;
      return '<button type="button" class="slot" role="radio" data-slot="' + t + '" aria-checked="' + (slot === t ? 'true' : 'false') + '"' + (taken ? ' disabled aria-label="' + t + ', taken"' : '') + '>' + t + '</button>';
    }).join('');
  }
  function syncSubmit() { submitBtn.textContent = slot ? 'Confirm ' + slot + ' slot' : 'Confirm slot'; }
  function pickDay(d) {
    picked = d;
    $('[data-book-day]', modal).textContent = longDate(d);
    var s = seed(d);
    slot = SLOTS.filter(function (t, i) { return (i + s) % 4 !== 0; })[2] || null;
    renderCal(); renderSlots(); syncSubmit();
  }
  function firstOpen() {
    var d = new Date(today); d.setDate(d.getDate() + 1);
    while (!bookable(d)) d.setDate(d.getDate() + 1);
    return d;
  }
  daysEl.addEventListener('click', function (e) {
    var b = e.target.closest('.cal-day'); if (!b || b.disabled) return;
    pickDay(new Date(view.getFullYear(), view.getMonth(), +b.getAttribute('data-day')));
    var again = daysEl.querySelector('[data-day="' + b.getAttribute('data-day') + '"]'); if (again) again.focus();
  });
  slotsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.slot'); if (!b || b.disabled) return;
    slot = b.getAttribute('data-slot'); slotErr.hidden = true;
    $$('.slot', slotsEl).forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
    syncSubmit();
  });
  $('[data-cal-prev]', modal).addEventListener('click', function () { view.setMonth(view.getMonth() - 1); renderCal(); });
  $('[data-cal-next]', modal).addEventListener('click', function () { view.setMonth(view.getMonth() + 1); renderCal(); });

  var lastBooking = null;
  form.addEventListener('submit', function () { if (!slot) slotErr.hidden = false; }, true);
  form.addEventListener('form:success', function () {
    if (!picked || !slot) { slotErr.hidden = false; return; }
    var name = form.elements['name'].value.trim().split(/\s+/)[0];
    var ref = 'HX-S-' + (1000 + Math.floor(Math.random() * 9000));
    lastBooking = { date: picked, slot: slot, ref: ref };
    $('[data-bk="title"]', modal).textContent = "You're booked, " + name;
    $('[data-bk="when"]', modal).textContent = 'Design session · ' + DAYS[picked.getDay()] + ' ' + picked.getDate() + ' ' + MONTHS[picked.getMonth()] + ' · ' + slot;
    $('[data-bk="bring"]', modal).textContent = form.elements['bringcar'].checked ? 'Your car and RC copy' : 'Photos of your seats';
    $('[data-bk="ref"]', modal).textContent = 'Reference ' + ref + ' · Reschedule from the SMS link';
    $('[data-book-form-wrap]', modal).hidden = true;
    $('[data-book-done]', modal).hidden = false;
    $('[data-bk="title"]', modal).focus();
    if (HX.toast) HX.toast('Design session booked for ' + slot, 'ok');
  });
  $('[data-bk-ics]', modal).addEventListener('click', function () {
    if (!lastBooking) return;
    var m = lastBooking.slot.match(/(\d+):(\d+)\s*(am|pm)/), h = +m[1] % 12 + (m[3] === 'pm' ? 12 : 0);
    var s = new Date(lastBooking.date); s.setHours(h, +m[2], 0, 0);
    var e = new Date(s.getTime() + 30 * 60000);
    var f = function (d) { return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + 'T' + ('0' + d.getHours()).slice(-2) + ('0' + d.getMinutes()).slice(-2) + '00'; };
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hexstitch//Design session//EN', 'BEGIN:VEVENT', 'UID:' + lastBooking.ref + '@hexstitch.in', 'DTSTAMP:' + f(new Date()),
      'DTSTART:' + f(s), 'DTEND:' + f(e), 'SUMMARY:Hexstitch design session', 'LOCATION:142 Avinashi Road\\, Peelamedu\\, Coimbatore 641004', 'DESCRIPTION:Reference ' + lastBooking.ref, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'hexstitch-design-session.ics';
    document.body.appendChild(a); a.click(); a.remove();
    if (HX.toast) HX.toast('Calendar file downloaded', 'ok');
  });
  modal.addEventListener('modal:open', function () {
    $('[data-book-form-wrap]', modal).hidden = false;
    $('[data-book-done]', modal).hidden = true;
    if (!picked) { var d = firstOpen(); view = new Date(d.getFullYear(), d.getMonth(), 1); pickDay(d); }
  });
  if (location.hash === '#book') HX.openModal(modal);
  window.addEventListener('hashchange', function () { if (location.hash === '#book' && modal.hidden) HX.openModal(modal); });
})();
