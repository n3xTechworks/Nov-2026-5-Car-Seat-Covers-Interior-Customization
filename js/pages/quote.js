/* Quote wizard (PDF 23-28, 54-55): 4 steps + review + confirmation, live estimate (sidebar + mobile bar),
   validation via js/validation.js with an error summary on step 4, localStorage draft, Save & exit, .ics download.
   Reads ?product=slug&coverage=0&colour=..&thread=..&car=brand-model-year. */
(function () {
  'use strict';
  var HX = window.HX;
  var D = HX.data || {};
  var BRANDS = D.cars || [];
  var PRODUCTS = D.products || [];
  var BY = {}; PRODUCTS.forEach(function (p) { BY[p.slug] = p; });
  var KEY = 'hexstitch-quote';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = HX.fmtPrice;
  if (!$('[data-step="1"]')) return;

  /* ---------- prices ---------- */
  var MAT = { nappa: { label: 'Nappa-grade PU', short: 'PU', d: 0 }, perforated: { label: 'Perforated', short: 'perforated', d: 700 }, microsuede: { label: 'Microsuede', short: 'microsuede', d: 3900 }, fabric: { label: 'Jacquard fabric', short: 'jacquard', d: -2000 } };
  var WRAP = { 'Perforated': 2400, 'Smooth nappa': 2400, 'Suede + marker': 2900 };
  var MATS = { '7D diamond': 5800, '3D tray': 3900 };
  var ROOF = { 'Suede liner': 14500, 'Starlight': 22000 };
  var FIXED = { ambient: 8500, doors: 6200 };
  var ITEM_LABEL = { seat: 'Seat covers', steering: 'Steering wrap', mats: 'Floor mats', ambient: 'Ambient lighting', roof: 'Roof liner', doors: 'Door pad inserts' };
  var METHOD = { studio: 'Drive to the studio', pickup: 'Free pick-up and drop', template: 'Template visit at the studio' };
  var STEP_TITLES = ['', 'Car', 'Customise', 'Fitting slot', 'Contact'];
  var TIMES = ['9:30 am', '10:00 am', '11:00 am', '12:30 pm', '2:00 pm'];

  /* ---------- state ---------- */
  function defaults(slug) {
    var p = BY[slug] || BY['diamond-quilt'];
    var s = { step: 1, product: p.slug, coverage: 0, brand: '', model: '', year: '', reg: '', airbags: 'Yes', items: [], material: 'nappa', pattern: 'Diamond',
      colour: 'Jet black', thread: 'Amber', wrap: 'Perforated', mats: '7D diamond', roof: 'Suede liner', embroidery: false, initials: '', notes: '', extra: '',
      method: 'pickup', day: '', time: '10:00 am', address: '', pin: '', name: '', phone: '', email: '', alt: '', whatsapp: true, consent: false };
    if (p.category === 'seat-covers') {
      s.items = ['seat', 'steering'];
      s.material = p.materials[0] || 'nappa';
      s.pattern = (D.patterns || {})[p.pattern] || 'Diamond';
    } else if (p.category === 'steering') { s.items = ['steering']; s.wrap = p.slug === 'steering-sport' ? 'Suede + marker' : 'Perforated'; }
    else if (p.category === 'floor-mats') { s.items = ['mats']; s.mats = p.slug === 'mats-3d' ? '3D tray' : '7D diamond'; }
    else if (p.slug === 'ambient') s.items = ['ambient'];
    else { s.items = ['seat']; s.extra = p.slug; }
    if (p.colours[0]) s.colour = p.colours[0].name;
    if (p.threads[0]) s.thread = p.threads[0];
    return s;
  }
  var S;
  var params = new URLSearchParams(location.search);
  var saved = null;
  try { saved = JSON.parse(HX.read(KEY) || 'null'); } catch (e) { saved = null; }
  var qp = params.get('product');
  if (qp && BY[qp] && (!saved || saved.product !== qp || params.get('coverage') || params.get('colour'))) {
    S = defaults(qp);
    if (saved) ['brand', 'model', 'year', 'reg', 'name', 'phone', 'email', 'alt', 'address', 'pin'].forEach(function (k) { if (saved[k]) S[k] = saved[k]; });
    var cov = +params.get('coverage'); if (cov && BY[qp].coverage[cov]) S.coverage = cov;
    var col = params.get('colour'); if (col) S.colour = col;
    var th = params.get('thread'); if (th) S.thread = th;
  } else S = saved && saved.product ? Object.assign(defaults(saved.product), saved) : defaults('diamond-quilt');
  if (S.step > 5) S.step = 1;
  var qc = params.get('car') ? HX.findCar(params.get('car')) : null;
  var car0 = qc || (!S.brand ? HX.getCar() : null);
  if (car0) { S.brand = car0.brandSlug; S.model = car0.modelSlug; S.year = String(car0.year); }
  if (qc) HX.setCar(qc);
  function save() { HX.store(KEY, JSON.stringify(S)); }

  /* ---------- car helpers ---------- */
  function brandObj() { return BRANDS.filter(function (b) { return b.slug === S.brand; })[0] || null; }
  function modelObj() { var b = brandObj(); return b ? b.models.filter(function (m) { return m.slug === S.model; })[0] || null : null; }
  function carName(short) { var b = brandObj(), m = modelObj(); if (!b || !m) return ''; return (short ? '' : b.name + ' ') + m.name + (S.year ? ' ' + S.year : ''); }
  function noPattern() { var m = modelObj(); return !!(m && !m.pattern); }

  /* ---------- totals ---------- */
  function has(i) { return S.items.indexOf(i) > -1; }
  function seatPrice() {
    var p = BY[S.product];
    var base = 8900;
    if (p && p.category === 'seat-covers') { var c = p.coverage[S.coverage] || p.coverage[0]; base = c.price - (MAT[p.materials[0]] || MAT.nappa).d; }
    else if (S.coverage === 1) base = 5400;
    return base + (MAT[S.material] || MAT.nappa).d;
  }
  function seatCoverageLabel() { var p = BY[S.product]; var c = p && p.category === 'seat-covers' ? (p.coverage[S.coverage] || p.coverage[0]) : null; return c && S.coverage === 1 ? 'front pair' : 'full set'; }
  function lines() {
    var out = [];
    if (has('seat')) out.push(['Seat covers · ' + (MAT[S.material] || MAT.nappa).short + ' ' + S.pattern.toLowerCase(), seatPrice(), 'Seat covers, ' + seatCoverageLabel()]);
    if (has('seat') && S.embroidery) out.push(['Headrest embroidery', 600, 'Embroidered initials']);
    if (has('steering')) out.push(['Steering wrap · ' + S.wrap.toLowerCase(), WRAP[S.wrap] || 2400, 'Steering wrap']);
    if (has('mats')) out.push(['Floor mats · ' + S.mats, MATS[S.mats] || 5800, 'Floor mats, ' + S.mats]);
    if (has('ambient')) out.push(['Ambient lighting', FIXED.ambient, 'Ambient lighting']);
    if (has('roof')) out.push(['Roof liner · ' + S.roof.toLowerCase(), ROOF[S.roof] || 14500, 'Roof liner, ' + S.roof.toLowerCase()]);
    if (has('doors')) out.push(['Door pad inserts', FIXED.doors, 'Door pad inserts']);
    if (S.extra && BY[S.extra]) out.push([BY[S.extra].name, BY[S.extra].price, BY[S.extra].name]);
    return out;
  }
  function total() { return lines().reduce(function (a, l) { return a + l[1]; }, 0); }

  /* ---------- days + times ---------- */
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], DOWL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function iso(d) { return HXValidation.toISODate(d); }
  function parseISO(v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function days() {
    var out = [], start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() + 2);
    var soon = S.method === 'template' ? 2 : 1;
    for (var i = 0; i < 7; i++) {
      var d = new Date(start); d.setDate(start.getDate() + i);
      var st = 'ok', note = '';
      if (d.getDay() === 0) { st = 'off'; note = 'Closed'; }
      else if (i < soon) { st = 'off'; note = 'Too soon'; }
      else if (d.getDate() % 6 === 0) { st = 'off'; note = 'Full'; }
      else note = (2 + d.getDate() % 5) + ' slots';
      out.push({ d: d, iso: iso(d), st: st, note: note });
    }
    return out;
  }
  function timesFor(isoDay) {
    var d = parseISO(isoDay); var n = d ? d.getDate() : 1;
    return TIMES.map(function (t, i) { return { t: t, off: i !== 1 && (n + i) % 3 === 0 }; });
  }
  function readyBy(t) {
    var m = /^(\d+):(\d+) (am|pm)$/.exec(t || ''); if (!m) return '';
    var h = +m[1] % 12 + (m[3] === 'pm' ? 12 : 0) + 4, min = m[2];
    return (h % 12 || 12) + ':' + min + (h >= 12 ? ' pm' : ' am');
  }
  function dayLabel(long) {
    var d = parseISO(S.day); if (!d) return '';
    return long ? DOWL[d.getDay()] + ' ' + d.getDate() + ' ' + MONL[d.getMonth()] : DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
  }

  /* ---------- fill the forms from state ---------- */
  var f1 = $('[data-step="1"]'), f2 = $('[data-step="2"]'), f3 = $('[data-step="3"]'), f4 = $('[data-step="4"]');
  var selB = $('[data-q-brand]'), selM = $('[data-q-model]'), selY = $('[data-q-year]');
  function opt(v, t) { return '<option value="' + HX.esc(v) + '">' + HX.esc(t) + '</option>'; }
  selB.innerHTML = opt('', 'Choose brand') + BRANDS.map(function (b) { return opt(b.slug, b.name); }).join('');
  function fillModels() {
    var b = brandObj();
    selM.innerHTML = opt('', 'Choose model') + (b ? b.models.map(function (m) { return opt(m.slug, m.name); }).join('') : '');
    selM.value = S.model; if (selM.value !== S.model) S.model = '';
    fillYears();
  }
  function fillYears() {
    var m = modelObj();
    selY.innerHTML = opt('', 'Year') + (m ? m.years.map(function (y) { return opt(String(y), String(y)); }).join('') : '');
    selY.value = S.year; if (selY.value !== String(S.year)) S.year = '';
  }
  function setRadio(form, name, val) { $$('[name="' + name + '"]', form).forEach(function (r) { r.checked = r.value === String(val); }); }
  function load() {
    selB.value = S.brand; fillModels();
    f1.reg.value = S.reg; setRadio(f1, 'airbags', S.airbags);
    $$('[name="items"]', f1).forEach(function (c) { c.checked = has(c.value); });
    setRadio(f2, 'material', S.material); setRadio(f2, 'pattern', S.pattern); setRadio(f2, 'colour', S.colour); setRadio(f2, 'thread', S.thread);
    setRadio(f2, 'wrap', S.wrap); setRadio(f2, 'mats', S.mats); setRadio(f2, 'roof', S.roof);
    if (!$('[name="colour"]:checked', f2)) { S.colour = 'Jet black'; setRadio(f2, 'colour', S.colour); }
    if (!$('[name="thread"]:checked', f2)) { S.thread = 'Amber'; setRadio(f2, 'thread', S.thread); }
    f2.embroidery.checked = !!S.embroidery; f2.initials.value = S.initials; f2.notes.value = S.notes;
    setRadio(f3, 'method', S.method); f3.address.value = S.address; f3.pin.value = S.pin;
    f4.name.value = S.name; f4.phone.value = S.phone; f4.email.value = S.email; f4.alt.value = S.alt; f4.whatsapp.checked = S.whatsapp !== false; f4.consent.checked = !!S.consent;
  }
  load();

  /* ---------- read form -> state on every change ---------- */
  function val(form, name) { var r = $('[name="' + name + '"]:checked', form); return r ? r.value : ''; }
  selB.addEventListener('change', function () { S.brand = selB.value; S.model = ''; S.year = ''; fillModels(); });
  selM.addEventListener('change', function () { S.model = selM.value; S.year = ''; fillYears(); var m = modelObj(); if (m && m.years.length) { S.year = String(m.years[0]); selY.value = S.year; selY.setAttribute('aria-invalid', 'false'); } });
  selY.addEventListener('change', function () { S.year = selY.value; });
  f1.reg.addEventListener('blur', function () { f1.reg.value = f1.reg.value.toUpperCase().replace(/\s+/g, ' ').trim(); S.reg = f1.reg.value; render(); });
  f1.addEventListener('change', function () {
    S.reg = f1.reg.value.trim(); S.airbags = val(f1, 'airbags') || 'Yes';
    S.items = $$('[name="items"]:checked', f1).map(function (c) { return c.value; });
    if (S.items.length) $('[data-items-error]').textContent = '';
    render();
  });
  f2.addEventListener('change', function () {
    ['material', 'pattern', 'colour', 'thread', 'wrap', 'mats', 'roof'].forEach(function (k) { var v = val(f2, k); if (v) S[k] = v; });
    S.embroidery = f2.embroidery.checked; S.notes = f2.notes.value;
    render();
  });
  f2.addEventListener('input', function (e) {
    if (e.target.name === 'initials') { e.target.value = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3); S.initials = e.target.value; }
    if (e.target.name === 'notes') S.notes = e.target.value;
    save();
  });
  f3.addEventListener('change', function (e) {
    if (e.target.name === 'method') { S.method = e.target.value; renderDays(); }
    if (e.target.name === 'day') { S.day = e.target.value; $('[data-day-error]').textContent = ''; renderTimes(); }
    if (e.target.name === 'time') { S.time = e.target.value; $('[data-time-error]').textContent = ''; }
    render();
  });
  f3.addEventListener('input', function (e) {
    if (e.target.name === 'pin') { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); S.pin = e.target.value; pinHint(); }
    if (e.target.name === 'address') S.address = e.target.value;
    save();
  });
  f4.addEventListener('input', function (e) { if (e.target.name in S) S[e.target.name] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; save(); });
  f4.addEventListener('change', function (e) {
    if (e.target.name in S) S[e.target.name] = e.target.type === 'checkbox' ? e.target.checked : e.target.value.trim();
    if (!$('[data-errors]').hidden) errorSummary(false);
    render();
  });
  f4.email.addEventListener('blur', function () { S.email = f4.email.value; save(); });

  function pinHint() {
    var h = $('[data-pin-hint]'), v = S.pin;
    h.classList.toggle('is-ok', /^641\d{3}$/.test(v));
    h.textContent = /^641\d{3}$/.test(v) ? 'Free pick-up and drop within city limits' : v.length === 6 ? 'Outside Coimbatore city: we will confirm any pick-up charge' : 'Free pick-up and drop within Coimbatore city limits';
  }

  /* ---------- step 3: day + time pickers ---------- */
  function renderDays() {
    var list = days();
    var okDay = list.filter(function (x) { return x.st === 'ok' && x.iso === S.day; })[0];
    if (!okDay) { var first = list.filter(function (x) { return x.st === 'ok'; })[0]; S.day = first ? first.iso : ''; }
    $('[data-days]').innerHTML = list.map(function (x) {
      return '<label class="q-day' + (x.st === 'off' ? ' is-off' : '') + '"><input type="radio" name="day" value="' + x.iso + '"' + (x.iso === S.day ? ' checked' : '') + (x.st === 'off' ? ' disabled' : '') + '>' +
        '<span class="q-dow">' + DOW[x.d.getDay()] + '</span><strong>' + x.d.getDate() + '</strong><small>' + x.note + '</small><span class="sr-only"> ' + MONL[x.d.getMonth()] + '</span></label>';
    }).join('');
    var first2 = list.filter(function (x) { return x.st === 'ok'; })[0];
    var need = S.method === 'template' ? 4 : 3;
    $('[data-slot-sub]').textContent = (S.method === 'template' ? 'We trace your seats first, then cut and stitch: about ' : 'Your set needs ') + need + ' working days' + (S.method === 'template' ? '' : ' to cut and stitch') + ', so the earliest fitting is ' + (first2 ? DOWL[first2.d.getDay()] : 'next week') + '.';
    renderTimes();
  }
  function renderTimes() {
    var ts = timesFor(S.day);
    var cur = ts.filter(function (x) { return x.t === S.time && !x.off; })[0];
    if (!cur) { var f = ts.filter(function (x) { return !x.off; })[0]; S.time = f ? f.t : ''; }
    $('[data-times]').innerHTML = ts.map(function (x) {
      return '<label class="chip chip--radio q-time' + (x.off ? ' is-off' : '') + '"><input type="radio" name="time" value="' + x.t + '"' + (x.t === S.time ? ' checked' : '') + (x.off ? ' disabled' : '') + '><span>' + x.t + (x.off ? '<span class="sr-only"> (booked)</span>' : '') + '</span></label>';
    }).join('');
  }

  /* ---------- render: conditional blocks, labels, summary, bars ---------- */
  function render() {
    $$('[data-if]', f2).forEach(function (el) {
      var on = el.getAttribute('data-if').split(' ').some(has);
      el.hidden = !on;
      $$('input, select, textarea', el).forEach(function (i) { i.disabled = !on; });
    });
    var ini = $('[data-initials]'); ini.hidden = !(has('seat') && S.embroidery); f2.initials.disabled = ini.hidden;
    $('[data-lbl="colour"]').textContent = S.colour; $('[data-lbl="thread"]').textContent = S.thread;
    var pick = $('[data-pickup]'); pick.hidden = S.method !== 'pickup'; pick.disabled = pick.hidden;
    $('[data-ready-hint]').textContent = S.time ? 'Fitting takes 3–4 hours. Ready by about ' + readyBy(S.time) + ' for a ' + S.time + ' drop-off.' : '';
    pinHint();
    /* car note */
    var note = $('[data-pattern-note]');
    note.hidden = !noPattern();
    if (noPattern()) note.textContent = 'No seat pattern on file for the ' + carName() + ' yet. Pick "Template visit" in step 3: we trace your seats at the studio (adds one working day).';
    /* extra product line (accessories that are not a quote item) */
    var ex = $('[data-extra]');
    ex.hidden = !S.extra;
    if (S.extra && BY[S.extra]) ex.innerHTML = 'Also in this quote: <strong>' + HX.esc(BY[S.extra].name) + '</strong> · ' + fmt(BY[S.extra].price) + ' <button class="linklike" type="button" data-rm-extra>Remove</button>';
    /* back link */
    var back = $('[data-back-product]');
    if (BY[S.product] && params.get('product')) { back.href = BY[S.product].page; back.querySelector('span').textContent = 'Back to product'; }
    renderSummary();
    save();
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-rm-extra]')) { S.extra = ''; render(); }
  });

  function carLine() { var c = carName(); return c ? c + (S.airbags === 'Yes' ? ' · side airbags' : '') : 'Car not chosen yet'; }
  function designLine() {
    var bits = [];
    if (has('seat')) bits.push((MAT[S.material] || MAT.nappa).short + ' ' + S.pattern.toLowerCase() + ', ' + S.colour.toLowerCase() + ', ' + S.thread.toLowerCase() + ' thread');
    if (has('steering')) bits.push(S.wrap.toLowerCase() + ' steering wrap');
    if (has('mats')) bits.push(S.mats + ' mats');
    if (has('ambient')) bits.push('ambient lighting');
    if (has('roof')) bits.push(S.roof.toLowerCase() + ' roof');
    if (has('doors')) bits.push('door pads');
    return bits.join(' · ');
  }
  function slotLine() {
    var where = S.method === 'pickup' ? 'pick-up from ' + (S.address ? S.address.split(',').slice(-1)[0].trim() : 'your address') : S.method === 'template' ? 'template visit' : 'at the studio';
    return S.day ? dayLabel() + ', ' + S.time + ' · ' + where : '';
  }
  function renderSummary() {
    var step = S.step, L = lines(), t = total();
    var p = BY[S.product] || BY['diamond-quilt'];
    var head = $('[data-sum-head]');
    if (step === 1) {
      head.innerHTML = '<div class="q-sum-prod"><img src="images/' + p.images[0] + '-800.webp" width="160" height="107" alt="' + HX.esc(p.alts[0]) + '">' +
        '<p><strong>' + HX.esc(p.name) + '</strong><span>' + (p.category === 'seat-covers' ? (seatCoverageLabel() === 'front pair' ? 'Front pair' : 'Full set') + ' · ' : '') + HX.esc(S.colour) + (p.threads.length ? ' · ' + HX.esc(S.thread) : '') + '</span></p></div>';
    } else if (step === 2) head.innerHTML = '<p>' + HX.esc(carLine()) + '</p>';
    else if (step === 3) head.innerHTML = '<p>' + HX.esc(carName() + ' · ' + designLine()) + '</p>';
    else head.innerHTML = '<p>' + HX.esc(carName(true) + ' · ' + designLine() + (slotLine() ? ' · ' + slotLine() : '')) + '</p>';
    var rows;
    if (step === 3) rows = [['Products', fmt(t)], [S.method === 'pickup' ? 'Pick-up & drop' : S.method === 'template' ? 'Template visit' : 'Fitting at studio', S.method === 'template' ? '+1 day' : S.method === 'pickup' ? 'Free' : 'Included'], ['Slot', S.day ? dayLabel() + ' · ' + S.time : 'Pick a day']];
    else if (step === 4) rows = [];
    else rows = L.map(function (l) { return [l[0], fmt(l[1])]; }).concat([['Fitting at studio', 'Included']]);
    if (!L.length && step < 3) rows = [['Nothing picked yet', '₹0']];
    $('[data-sum-lines]').innerHTML = rows.map(function (r) { return '<div><dt>' + HX.esc(r[0]) + '</dt><dd>' + HX.esc(r[1]) + '</dd></div>'; }).join('');
    $('[data-sum-lines]').hidden = !rows.length;
    $('[data-sum-total]').textContent = fmt(t);
    $('[data-mbar-total]').textContent = fmt(t);
    $('[data-sum-note]').hidden = step !== 1;
    $('[data-sum-swatch]').hidden = step !== 2 || !has('seat');
    $('[data-rules]').hidden = step !== 4;
  }

  /* ---------- navigation ---------- */
  var h1 = $('#q-title');
  var H1 = { 1: function () { return 'Confirm your car'; }, 2: function () { return has('seat') ? 'Customise your seat covers' : 'Customise your order'; }, 3: function () { return 'When should we fit it?'; },
    4: function () { return 'Where should we send your quote?'; }, 5: function () { return 'Check everything once'; },
    6: function () { var n = (S.name || '').trim().split(/\s+/)[0]; var m = modelObj(); return 'Thanks' + (n ? ', ' + n : '') + '. Your ' + (m ? m.name : 'car') + ' is pencilled in.'; } };
  var NEXT = { 1: 'Next: customise', 2: 'Next: fitting slot', 3: 'Next: contact', 4: 'Review my quote' };
  var help = $('.qh-help'), helpHTML = help ? help.innerHTML : '', saveExit = $('[data-save-exit]');
  function go(step, focus) {
    S.step = step;
    $$('.q-step').forEach(function (f) { f.hidden = +f.getAttribute('data-step') !== step; });
    $('[data-q-layout]').hidden = step > 4;
    $('[data-q-progress]').hidden = step > 4;
    $('.q-step-row').hidden = step > 4;
    $$('[data-panel]').forEach(function (p) { p.hidden = +p.getAttribute('data-panel') !== step; });
    var host = step <= 4 ? $('[data-step="' + step + '"] [data-h1-slot]') : $('[data-panel="' + step + '"] [data-h1-slot]');
    host.appendChild(h1);
    h1.textContent = H1[step]();
    $$('[data-prog]').forEach(function (li) {
      var n = +li.getAttribute('data-prog');
      li.classList.toggle('is-done', n < step); li.classList.toggle('is-current', n === step);
      var b = li.querySelector('button'); b.disabled = n >= step; if (n === step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    if (step <= 4) $('[data-step-m]').textContent = 'Step ' + step + ' of 4 · ' + STEP_TITLES[step];
    $('[data-mbar-next]').textContent = NEXT[step] || '';
    $('[data-mbar]').hidden = step > 4;
    document.body.classList.toggle('q-full', step > 4);
    if (help) help.innerHTML = step === 5 ? '<span class="hide-sm">All 4 steps complete · </span><button class="linklike" type="button" data-modal-open="callbackModal">Call me back</button>' : helpHTML;
    if (saveExit) saveExit.hidden = step > 4;
    if (step === 3) renderDays();
    if (step === 5) renderReview();
    document.title = (step <= 4 ? 'Step ' + step + ' of 4 · ' + STEP_TITLES[step] : step === 5 ? 'Review your quote' : 'Quote request received') + ' | Hexstitch';
    render();
    if (focus !== false) { window.scrollTo(0, 0); h1.focus({ preventScroll: true }); }
  }
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-goto]');
    if (g && !g.disabled) { e.preventDefault(); go(+g.getAttribute('data-goto')); }
  });
  $('[data-mbar-next]').addEventListener('click', function () { var f = $('[data-step="' + S.step + '"]'); if (f) f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })); });

  /* step 1: validation.js checks the selects; we add "at least one item" */
  f1.addEventListener('form:success', function () {
    if (!S.items.length && !S.extra) { $('[data-items-error]').textContent = 'Pick at least one thing to quote.'; $('[name="items"]', f1).focus(); return; }
    if (noPattern() && has('seat') && S.method !== 'template') S.method = 'template';
    go(2);
  });
  f2.addEventListener('form:success', function () {
    if (S.embroidery && has('seat') && !/^[A-Z]{1,3}$/.test(S.initials)) { var i = f2.initials; i.setAttribute('aria-invalid', 'true'); HX.toast('Add 1 to 3 letters for the embroidery, or switch it off', 'error'); i.focus(); return; }
    go(3);
  });
  f3.addEventListener('form:success', function () {
    var ok = true;
    if (!S.day) { $('[data-day-error]').textContent = 'Please choose a day.'; ok = false; }
    if (!S.time) { $('[data-time-error]').textContent = 'Please choose a drop-off time.'; ok = false; }
    if (S.method === 'pickup' && S.address.trim().length < 6) { var a = f3.address; a.setAttribute('aria-invalid', 'true'); var er = document.getElementById(a.id + '-error'); if (er) er.textContent = 'Please enter the full pick-up address.'; a.focus(); ok = false; }
    if (ok) go(4);
  });

  /* step 4: error summary banner (PDF 26) */
  var LABEL = { name: 'Full name', phone: 'Mobile number', email: 'Email', alt: 'Alternate number', consent: 'Consent' };
  function errorSummary(scroll) {
    var bad = $$('[aria-invalid="true"]', f4).filter(function (f) { return !f.disabled; });
    var box = $('[data-errors]');
    if (!bad.length) { box.hidden = true; return; }
    box.innerHTML = '<p class="q-err-title">Please fix ' + bad.length + ' field' + (bad.length > 1 ? 's' : '') + ' to continue</p><p class="q-err-list">' +
      bad.map(function (f) { return '<a href="#' + f.id + '">' + (LABEL[f.name] || f.name) + '</a>'; }).join(' · ') + '</p>';
    box.hidden = false;
    if (scroll) box.scrollIntoView({ block: 'center' });
  }
  $('[data-errors]').addEventListener('click', function (e) { var a = e.target.closest('a[href^="#"]'); if (!a) return; e.preventDefault(); var t = document.getElementById(a.getAttribute('href').slice(1)); if (t) t.focus(); });
  f4.addEventListener('submit', function () { errorSummary(true); });
  f4.addEventListener('form:success', function () {
    ['name', 'phone', 'email', 'alt'].forEach(function (k) { S[k] = f4[k].value.trim(); });
    S.whatsapp = f4.whatsapp.checked; S.consent = f4.consent.checked;
    $('[data-errors]').hidden = true;
    go(5);
  });

  /* ---------- review (PDF 27) ---------- */
  function rcard(step, title, rows) {
    return '<section class="q-rcard card"><div class="q-rtitle"><span class="q-tick" aria-hidden="true">✓</span><h2>' + title + '</h2></div><dl>' +
      rows.filter(function (r) { return r[1]; }).map(function (r) { return '<div><dt>' + HX.esc(r[0]) + '</dt><dd>' + HX.esc(r[1]) + '</dd></div>'; }).join('') +
      '</dl><button class="linklike q-edit" type="button" data-goto="' + step + '" aria-label="Edit ' + title + '">Edit</button></section>';
  }
  function phonePretty(p) { return p ? '+91 ' + p.slice(0, 5) + ' ' + p.slice(5) : ''; }
  function renderReview() {
    var cust = [];
    if (has('seat')) cust.push(['Seat covers', (MAT[S.material] || MAT.nappa).label + ' · ' + S.pattern.toLowerCase() + ' · ' + S.colour.toLowerCase() + ' · ' + S.thread.toLowerCase() + ' thread' + (S.embroidery && S.initials ? ' · "' + S.initials + '" embroidered' : '')]);
    if (has('steering')) cust.push(['Steering wrap', S.wrap + ', ' + S.thread.toLowerCase() + ' stitch']);
    if (has('mats')) cust.push(['Floor mats', S.mats]);
    if (has('ambient')) cust.push(['Ambient lighting', '64 colours, dash + doors']);
    if (has('roof')) cust.push(['Roof liner', S.roof]);
    if (has('doors')) cust.push(['Door pads', 'Matched to seats']);
    if (S.extra && BY[S.extra]) cust.push(['Also', BY[S.extra].name]);
    cust.push(['Notes', S.notes.trim() || 'None']);
    var addr = S.method === 'pickup' ? S.address + (S.pin ? ', ' + S.pin : '') : '142 Avinashi Road, Peelamedu';
    $('[data-review-cards]').innerHTML =
      rcard(1, 'Car', [['Car', carName()], ['Side airbags', S.airbags === 'Yes' ? 'Yes · tear-away seams' : S.airbags === 'No' ? 'No' : 'Not sure · tear-away seams added'], ['Registration', S.reg || 'Not given']]) +
      rcard(2, 'Customise', cust) +
      rcard(3, 'Fitting slot', [['When', dayLabel(true) + ' · ' + S.time + ' drop-off'], ['How', METHOD[S.method]], [S.method === 'pickup' ? 'Address' : 'Studio', addr]]) +
      rcard(4, 'Contact', [['Name', S.name], ['Mobile', phonePretty(S.phone) + (S.whatsapp ? ' · WhatsApp on' : '')], ['Email', S.email], ['Alternate', S.alt ? phonePretty(S.alt) : '']]);
    var L = lines();
    var rows = L.map(function (l) { return [l[2], fmt(l[1])]; }).concat([['Fitting', 'Included'], [S.method === 'pickup' ? 'Pick-up and drop' : S.method === 'template' ? 'Template visit' : 'Studio lounge', S.method === 'template' ? '+1 day' : 'Free'], ['Advance due now', '₹0']]);
    $('[data-send-lines]').innerHTML = rows.map(function (r) { return '<div><dt>' + HX.esc(r[0]) + '</dt><dd>' + HX.esc(r[1]) + '</dd></div>'; }).join('');
    $('[data-send-total]').textContent = fmt(total());
  }
  var send = $('[data-send]');
  send.addEventListener('form:success', function () {
    var btn = $('[data-send-btn]');
    btn.disabled = true; btn.classList.add('is-busy'); $('[data-send-label]').textContent = 'Sending…';
    setTimeout(function () {
      btn.disabled = false; btn.classList.remove('is-busy'); $('[data-send-label]').textContent = 'Send quote request';
      S.ref = 'HX-Q-' + (1000 + Math.floor(Math.random() * 9000));
      renderDone();
      go(6);
      HX.store(KEY, ''); /* the request is sent: clear the draft */
      HX.store(KEY + '-last', JSON.stringify(S));
      HX.toast('Quote request sent. Reference ' + S.ref + '.');
    }, navigator.webdriver ? 50 : 1100);
  });

  /* ---------- confirmation (PDF 28) ---------- */
  function renderDone() {
    var p = BY[S.product] || BY['diamond-quilt'];
    var m = modelObj();
    $('[data-ref]').textContent = '✓ Request received · ' + S.ref;
    $('[data-done-media]').innerHTML = '<img src="images/' + p.images[2] + '-1600.webp" width="1600" height="1067" alt="' + HX.esc(p.alts[2]) + '">';
    var d = parseISO(S.day);
    function back(from, n) { var x = new Date(from); while (n > 0) { x.setDate(x.getDate() - 1); if (x.getDay() !== 0) n--; } return x; }
    var cut = d ? DOW[back(d, 3).getDay()] + ' – ' + DOW[back(d, 1).getDay()] : 'Before your slot';
    var pickupT = S.time ? S.time : '';
    var steps = [
      ['done', 'Request received', 'Copy sent to ' + S.email + (S.whatsapp ? ' and WhatsApp' : ''), 'Now'],
      ['2', 'Studio confirms price and slot', (S.whatsapp ? 'Reply YES on WhatsApp to lock ' : 'We call you to lock ') + (d ? DOWL[d.getDay()] : 'your slot') + ' ' + S.time, 'Within 1 day'],
      ['3', S.method === 'template' ? 'Template visit, then we cut and stitch' : 'We cut and stitch your set', 'On the ' + (m ? m.name : 'car') + ' template' + (has('seat') ? ', in ' + S.thread.toLowerCase() + ' thread' : ''), cut],
      ['4', S.method === 'pickup' ? 'Pick-up, fitting and drop' : 'Fitting at the studio', S.method === 'pickup' ? 'Driver collects around ' + pickupT + '; car back by about ' + readyBy(S.time) : 'Drop off at ' + pickupT + '; ready by about ' + readyBy(S.time), dayLabel()]
    ];
    $('[data-next]').innerHTML = steps.map(function (s) {
      return '<li><span class="q-num' + (s[0] === 'done' ? ' is-done' : '') + '" aria-hidden="true">' + (s[0] === 'done' ? '✓' : s[0]) + '</span><div><strong>' + HX.esc(s[1]) + '</strong><p>' + HX.esc(s[2]) + '</p></div><span class="q-when">' + HX.esc(s[3]) + '</span></li>';
    }).join('');
    $('[data-done-summary]').innerHTML = '<p>' + HX.esc(carName() + ' · ' + designLine()) + '</p><p>' + HX.esc(slotLine()) + '</p>';
    $('[data-done-total]').textContent = fmt(total());
    var wa = 'Hi Hexstitch, this is ' + S.name + ' about quote ' + S.ref + ' (' + carName() + ', ' + dayLabel() + ' ' + S.time + ').';
    $('[data-wa-link]').href = 'https://wa.me/919876543210?text=' + encodeURIComponent(wa);
    var gl = $('[data-wait-gallery]'); if (m) gl.firstChild.textContent = 'See finished cabins in the gallery ';
  }

  /* .ics download */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function icsTime(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  $('[data-ics]').addEventListener('click', function () {
    var d = parseISO(S.day) || new Date();
    var m = /^(\d+):(\d+) (am|pm)$/.exec(S.time || '10:00 am');
    d.setHours(+m[1] % 12 + (m[3] === 'pm' ? 12 : 0), +m[2], 0, 0);
    var end = new Date(d.getTime() + 4 * 3600 * 1000);
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hexstitch//Quote//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + (S.ref || 'HX') + '@hexstitch.in', 'DTSTAMP:' + icsTime(new Date()), 'DTSTART:' + icsTime(d), 'DTEND:' + icsTime(end),
      'SUMMARY:Hexstitch fitting · ' + carName(), 'LOCATION:Hexstitch studio\\, 142 Avinashi Road\\, Peelamedu\\, Coimbatore 641004',
      'DESCRIPTION:' + (S.ref || '') + ' · ' + designLine().replace(/,/g, '\\,') + '. ' + METHOD[S.method] + '. Call +91 98765 43210 to change the slot.',
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Hexstitch fitting today', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'hexstitch-fitting.ics';
    document.body.appendChild(a); a.click(); a.remove();
    HX.toast('Calendar file downloaded: hexstitch-fitting.ics');
  });
  $('[data-new-quote]').addEventListener('click', function () { HX.store(KEY, ''); });

  /* ---------- Save & exit ---------- */
  if (saveExit) saveExit.innerHTML = 'Save<span class="q-hide-xs">&nbsp;&amp; exit</span>';
  if (saveExit) saveExit.addEventListener('click', function (e) {
    e.preventDefault();
    save();
    HX.toast('Saved. Your quote will be here when you come back.');
    var href = saveExit.getAttribute('href') || 'index.html';
    setTimeout(function () { location.href = href; }, navigator.webdriver ? 0 : 900);
  });

  go(Math.min(S.step || 1, 5), false);
})();
