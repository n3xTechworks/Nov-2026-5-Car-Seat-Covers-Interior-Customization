/* Products (PDF 16-19, 51-52): car heading from ?car= / saved car, real filters (category, material, pattern, price),
   sort, active chips, mobile filter sheet, "show more" on phones, quick view, no-pattern state with template-visit form. */
(function () {
  'use strict';
  var HX = window.HX;
  var D = HX.data || {};
  var PRODUCTS = D.products || [];
  var BY = {}; PRODUCTS.forEach(function (p) { BY[p.slug] = p; });
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var grid = $('[data-product-grid]');
  if (!grid) return;
  var custom = $('[data-custom-card]');
  if (custom) grid.appendChild(custom);
  var cards = $$('.product-card', grid);
  var form = $('[data-pr-filters]');
  var MIN = 1000, MAX = 13000, MOBILE_PAGE = 8;
  var GROUPS = { category: D.categories || {}, material: D.materials || {}, pattern: D.patterns || {} };
  var SHORT = { nappa: 'Nappa PU', perforated: 'Perforated', microsuede: 'Microsuede', fabric: 'Fabric', accessories: 'Lighting', 'floor-mats': 'Floor mats', steering: 'Steering', 'seat-covers': 'Seat covers' };
  var mq = window.matchMedia('(max-width: 767px)');
  var expanded = false;

  /* ---------- build the checkbox lists with counts (computed from products) ---------- */
  function countFor(group, key) {
    return PRODUCTS.filter(function (p) {
      if (group === 'category') return p.category === key;
      if (group === 'material') return p.materials.indexOf(key) > -1;
      return p.pattern === key;
    }).length;
  }
  Object.keys(GROUPS).forEach(function (g) {
    var list = $('[data-pf-list="' + g + '"]');
    list.innerHTML = Object.keys(GROUPS[g]).map(function (k) {
      var id = 'f-' + g + '-' + k;
      return '<label class="pf-check" for="' + id + '"><input type="checkbox" id="' + id + '" name="' + g + '" value="' + k + '"' + '' + '>' +
        '<span class="pf-label"><span class="pf-long">' + HX.esc(GROUPS[g][k]) + '</span><span class="pf-short">' + HX.esc(SHORT[k] || GROUPS[g][k]) + '</span></span><span class="pf-n">' + countFor(g, k) + '</span></label>';
    }).join('');
  });

  /* ---------- state ---------- */
  var rMin = $('[data-range-min]'), rMax = $('[data-range-max]');
  function checked(g) { return $$('input[name="' + g + '"]:checked', form).map(function (i) { return i.value; }); }
  /* no category ticked = all categories (same as material and pattern), so "Clear all" really clears the boxes */
  function allCats() { var n = checked('category').length; return n === 0 || n === Object.keys(GROUPS.category).length; }
  function state() {
    var lo = Math.min(+rMin.value, +rMax.value), hi = Math.max(+rMin.value, +rMax.value);
    return { cats: checked('category'), mats: checked('material'), pats: checked('pattern'), lo: lo, hi: hi };
  }
  function matches(card, s) {
    var cat = card.getAttribute('data-category'), mats = (card.getAttribute('data-materials') || '').split(' '), pat = card.getAttribute('data-pattern'), price = +card.getAttribute('data-price');
    if (s.cats.length && s.cats.indexOf(cat) < 0) return false;
    if (s.mats.length && !s.mats.some(function (m) { return mats.indexOf(m) > -1; })) return false;
    if (s.pats.length && s.pats.indexOf(pat) < 0) return false;
    if (price < s.lo || price > s.hi) return false;
    return true;
  }
  function activeCount(s) {
    return (allCats() ? 0 : s.cats.length) + s.mats.length + s.pats.length + (s.lo > MIN || s.hi < MAX ? 1 : 0);
  }

  /* ---------- sort ---------- */
  var sortSel = $('[data-pr-sort]'), sortM = $('[data-pr-sort-m]');
  function sortCards(v) {
    var fn = {
      booked: function (a, b) { return +b.getAttribute('data-reviews') - +a.getAttribute('data-reviews'); },
      rating: function (a, b) { return +b.getAttribute('data-rating') - +a.getAttribute('data-rating') || +b.getAttribute('data-reviews') - +a.getAttribute('data-reviews'); },
      low: function (a, b) { return +a.getAttribute('data-price') - +b.getAttribute('data-price'); },
      high: function (a, b) { return +b.getAttribute('data-price') - +a.getAttribute('data-price'); }
    }[v] || null;
    var order = v === 'booked' ? cards.slice() : cards.slice().sort(fn);
    if (v === 'booked') order = cards.slice(); /* data order = most booked (studio ranking) */
    order.forEach(function (c) { grid.insertBefore(c, custom || null); });
    var lbl = $('[data-pr-sort-label]'); if (lbl) lbl.textContent = 'Sort: ' + sortSel.options[sortSel.selectedIndex].text;
  }
  function onSort(e) { sortSel.value = sortM.value = e.target.value; sortCards(e.target.value); apply(); }
  sortSel.addEventListener('change', onSort);
  sortM.addEventListener('change', onSort);

  /* ---------- render ---------- */
  function fmt(n) { return HX.fmtPrice(n); }
  function apply() {
    var s = state();
    var visible = [];
    cards.forEach(function (c) { var ok = matches(c, s); c.hidden = !ok; if (ok) visible.push(c); });
    /* phones: first 8, then "Show N more" */
    var more = $('[data-pr-more]');
    var limit = mq.matches && !expanded ? MOBILE_PAGE : Infinity;
    visible.forEach(function (c, i) { if (i >= limit) c.hidden = true; });
    var shown = Math.min(visible.length, limit);
    more.hidden = !(visible.length > shown);
    more.textContent = 'Show ' + (visible.length - shown) + ' more';
    $('[data-pr-showing]').textContent = 'Showing ' + visible.length + ' of ' + cards.length;
    $('[data-pr-showing]').hidden = mq.matches && !more.hidden;
    $('[data-pr-empty]').hidden = visible.length > 0;
    if (custom) custom.hidden = visible.length === 0;
    $('[data-pr-count]').textContent = visible.length;
    $('[data-pr-count-m]').textContent = visible.length;
    var n = activeCount(s);
    $('[data-pr-fcount]').textContent = n ? ' · ' + n : '';
    $('[data-pr-sheet-apply]').textContent = 'Show ' + visible.length + ' product' + (visible.length === 1 ? '' : 's');
    /* range fill + labels */
    var a = (s.lo - MIN) / (MAX - MIN) * 100, b = (s.hi - MIN) / (MAX - MIN) * 100;
    var fill = $('[data-range-fill]'); fill.style.insetInlineStart = a + '%'; fill.style.width = (b - a) + '%';
    $('[data-range-min-label]').textContent = fmt(s.lo); $('[data-range-max-label]').textContent = fmt(s.hi);
    $('[data-pf-price-sum]').textContent = ' · ' + fmt(s.lo) + ' – ' + fmt(s.hi);
    /* mobile category chips mirror the category checkboxes */
    var cats = s.cats;
    $$('[data-cat]').forEach(function (b) {
      var k = b.getAttribute('data-cat');
      b.setAttribute('aria-pressed', String(k === 'all' ? allCats() : (cats.length === 1 && cats[0] === k)));
    });
    renderActive(s);
  }
  function chip(label, key, val, dark) {
    return '<button class="chip pr-chip' + (dark ? ' is-active' : '') + '" type="button" data-rm="' + key + '"' + (val ? ' data-rm-val="' + val + '"' : '') + ' aria-label="Remove filter: ' + HX.esc(label) + '">' +
      HX.esc(label) + '<span class="x" aria-hidden="true">×</span></button>';
  }
  function renderActive(s) {
    var out = [];
    var car = HX.getCar();
    if (car) out.push(chip(car.short, 'car', '', true));
    if (allCats()) out.push(chip('All categories', 'cats', '', true));
    else s.cats.forEach(function (k) { out.push(chip(GROUPS.category[k], 'category', k, true)); });
    s.mats.forEach(function (k) { out.push(chip(GROUPS.material[k], 'material', k, true)); });
    s.pats.forEach(function (k) { out.push(chip(GROUPS.pattern[k], 'pattern', k, true)); });
    if (s.lo > MIN || s.hi < MAX) out.push(chip(fmt(s.lo) + ' – ' + fmt(s.hi), 'price', '', true));
    $('[data-pr-active]').innerHTML = out.join('');
  }
  $('[data-pr-active]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rm]'); if (!b) return;
    var k = b.getAttribute('data-rm'), v = b.getAttribute('data-rm-val');
    if (k === 'car') { HX.store('hexstitch-car', ''); history.replaceState(null, '', 'products.html'); renderCar(); }
    else if (k === 'cats') { /* "All categories" chip: nothing narrower to remove */ HX.toast('Untick a category in the filters to narrow the list', 'info'); return; }
    else if (k === 'price') { rMin.value = MIN; rMax.value = MAX; }
    else if (k === 'category') { var cb = form.querySelector('input[name="category"][value="' + v + '"]'); cb.checked = false; }
    else { var x = form.querySelector('input[name="' + k + '"][value="' + v + '"]'); if (x) x.checked = false; }
    apply();
  });

  function setAllCats(on) { $$('input[name="category"]', form).forEach(function (i) { i.checked = on; }); }
  function clearAll() {
    setAllCats(false);
    $$('input[name="material"], input[name="pattern"]', form).forEach(function (i) { i.checked = false; });
    rMin.value = MIN; rMax.value = MAX;
    expanded = false;
    apply();
  }
  $$('[data-pr-clear]').forEach(function (b) { b.addEventListener('click', clearAll); });
  form.addEventListener('change', function () { expanded = false; apply(); });
  [rMin, rMax].forEach(function (r) { r.addEventListener('input', function () { if (+rMin.value > +rMax.value - 500) { if (r === rMin) rMin.value = +rMax.value - 500; else rMax.value = +rMin.value + 500; } apply(); }); });
  $('[data-pr-catchips]').addEventListener('click', function (e) {
    var b = e.target.closest('[data-cat]'); if (!b) return;
    var k = b.getAttribute('data-cat');
    if (k === 'all') setAllCats(false);
    else $$('input[name="category"]', form).forEach(function (i) { i.checked = i.value === k; });
    expanded = false; apply();
  });
  $('[data-pr-more]').addEventListener('click', function () { expanded = true; apply(); });
  mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply);

  /* ---------- mobile filter sheet: move the one filter form into the sheet while it is open ---------- */
  var home = $('[data-pr-filter-home]'), sheetBody = $('[data-pr-sheet-body]'), sheet = document.getElementById('filterSheet');
  $('[data-pr-open-filters]').addEventListener('click', function (e) { sheetBody.appendChild(form); HX.openModal(sheet, e.currentTarget); });
  sheet.addEventListener('modal:close', function () { home.appendChild(form); });
  $('[data-pr-sheet-apply]').addEventListener('click', function () { HX.closeModal(sheet); grid.scrollIntoView({ block: 'start' }); });

  /* ---------- car: heading, car card, no-pattern state ---------- */
  var params = new URLSearchParams(location.search);
  /* ?category=seat-covers (links from the Home category cards) pre-ticks that category */
  var qCat = params.get('category');
  if (qCat && GROUPS.category[qCat]) { var qBox = form.querySelector('input[name="category"][value="' + qCat + '"]'); if (qBox) qBox.checked = true; }
  var qCar = params.get('car');
  if (qCar) {
    var found = HX.findCar(qCar);
    if (found) HX.setCar(found);
    else HX.toast('We could not find that car. Pick it from the list.', 'info');
  }
  var npRows = $('[data-np-rows]');
  function renderCar() {
    var car = HX.getCar();
    var h1 = $('[data-pr-h1]');
    var noPattern = !!(car && !car.pattern);
    $('[data-pr-catalog]').hidden = noPattern;
    $('[data-pr-nopattern]').hidden = !noPattern;
    $('[data-pr-carcard]').hidden = noPattern;
    $('[data-pr-carmobile]').hidden = noPattern;
    $('.pr-change-np').hidden = !noPattern;
    $$('[data-pr-change]').forEach(function (b) { if (b.classList.contains('pr-change')) b.textContent = car ? 'Change car' : 'Pick your car'; });
    if (!car) {
      h1.innerHTML = 'Made for your car';
      $('[data-pr-carname]').textContent = 'Not picked yet · pick for an exact fit';
      $('[data-pr-carbadge]').hidden = true;
      $('[data-pr-carmobile-text]').textContent = 'Pick your car for an exact fit';
      $('.pr-ok').hidden = true;
      $('.pr-change-m').textContent = 'Pick car';
    } else if (noPattern) {
      h1.textContent = car.label;
      $('[data-np-model]').textContent = car.model;
      document.title = car.label + ': template visit | Hexstitch';
      npRows.innerHTML = PRODUCTS.filter(function (p) { return p.fitsAny; }).slice(0, 4).map(function (p) {
        return '<li class="np-row"><img src="images/' + p.images[1] + '-800.webp" width="160" height="107" alt="' + HX.esc(p.alts[1]) + '" loading="lazy" decoding="async">' +
          '<div><h3><a href="' + p.page + '">' + HX.esc(p.short.charAt(0).toUpperCase() + p.short.slice(1)) + '</a></h3><p>' + HX.esc(p.coverage[0].sub) + '</p></div>' +
          '<strong>' + fmt(p.price) + '</strong></li>';
      }).join('');
    } else {
      h1.innerHTML = 'Made for your <span class="nowrap-sm">' + HX.esc(car.label) + '</span>';
      $('[data-pr-carname]').textContent = car.brand + ' ' + car.model + ' · ' + car.year + ' · ' + car.body + ', ' + car.seats + ' seats';
      $('[data-pr-carbadge]').hidden = false;
      $('[data-pr-carmobile-text]').textContent = 'Pattern on file · ' + car.body + ', ' + car.seats + ' seats';
      $('.pr-ok').hidden = false;
      $('.pr-change-m').textContent = 'Change';
      document.title = 'Seat covers for the ' + car.label + ' | Hexstitch';
    }
    apply();
  }
  $$('[data-pr-change]').forEach(function (b) {
    b.addEventListener('click', function () {
      HX.openCarSelector({ redirect: false, onSelect: function (c) { history.replaceState(null, '', 'products.html?car=' + encodeURIComponent(c.slug)); } }, b);
    });
  });
  document.addEventListener('car:change', function (e) {
    if (e.detail && e.detail.slug) history.replaceState(null, '', 'products.html?car=' + encodeURIComponent(e.detail.slug));
    renderCar();
  });

  /* template-visit form (no-pattern state) */
  var np = $('[data-np-form]');
  np.addEventListener('form:success', function () {
    var name = (np.querySelector('[name="name"]').value || '').trim().split(' ')[0];
    $('[data-np-who]').textContent = name || 'you';
    np.hidden = true; $('[data-np-done]').hidden = false;
    var car = HX.getCar();
    HX.toast('Template visit requested' + (car ? ' for your ' + car.short : '') + '. We will call within one working day.');
  });

  /* ---------- quick view ---------- */
  var qv = document.getElementById('quickView');
  var cur = null;
  function qvLink() {
    var col = qv.querySelector('[name="qv-colour"]:checked'), th = qv.querySelector('[name="qv-thread"]:checked');
    var qs = 'product=' + cur.slug + (col ? '&colour=' + encodeURIComponent(col.value) : '') + (th ? '&thread=' + encodeURIComponent(th.value) : '');
    var car = HX.getCar(); if (car) qs += '&car=' + car.slug;
    $('[data-qv-quote]').href = 'quote.html?' + qs;
    $('[data-qv-colour]').textContent = col ? col.value : '';
  }
  function showImg(i) {
    $('[data-qv-main]').innerHTML = '<img src="images/' + cur.images[i] + '-800.webp" alt="' + HX.esc(cur.alts[i]) + '" width="800" height="533">';
    $$('[data-qv-thumbs] button').forEach(function (b, k) { b.setAttribute('aria-current', String(k === i)); });
  }
  function openQuick(slug, opener) {
    cur = BY[slug]; if (!cur) return;
    $('[data-qv-meta]').textContent = cur.categoryLabel + ' · ' + cur.materialLabel;
    $('[data-qv-title]').textContent = cur.name;
    $('[data-qv-price]').textContent = fmt(cur.price);
    $('[data-qv-rating]').textContent = '★ ' + cur.rating + ' · ' + cur.reviews + ' reviews';
    var car = HX.getCar(), fit = $('[data-qv-fit]');
    var ok = !car || car.pattern || cur.fitsAny;
    fit.classList.toggle('is-warn', !ok);
    fit.textContent = !car ? (cur.fitsAny ? '✓ Fits any car' : 'Cut on your car’s own template. Pick your car to check the fit.')
      : ok ? '✓ ' + (cur.fitsAny ? 'Fits your ' + car.label : 'Cut on the ' + car.label + ' template · ' + cur.coverage[0].label.toLowerCase())
      : 'No template for the ' + car.label + ' yet: we trace one at the studio (adds a day)';
    $('[data-qv-thumbs]').innerHTML = cur.images.map(function (s, i) {
      return '<button type="button" aria-label="Show photo ' + (i + 1) + ' of ' + cur.images.length + '"><img src="images/' + s + '-800.webp" width="160" height="107" alt="" loading="lazy"></button>';
    }).join('');
    $('[data-qv-swatches]').innerHTML = cur.colours.map(function (c, i) {
      return '<label class="swatch" style="--c:' + c.hex + '" title="' + HX.esc(c.name) + '"><input type="radio" name="qv-colour" value="' + HX.esc(c.name) + '"' + (i === 0 ? ' checked' : '') + '><span class="sr-only">' + HX.esc(c.name) + '</span></label>';
    }).join('');
    $('[data-qv-thread-wrap]').hidden = !cur.threads.length;
    $('[data-qv-threads]').innerHTML = cur.threads.map(function (t, i) {
      return '<label class="chip chip--radio"><input type="radio" name="qv-thread" value="' + HX.esc(t) + '"' + (i === 0 ? ' checked' : '') + '><span>' + HX.esc(t) + '</span></label>';
    }).join('');
    $('[data-qv-page]').href = cur.page;
    showImg(0); qvLink();
    HX.openModal(qv, opener);
  }
  qv.addEventListener('change', qvLink);
  $('[data-qv-thumbs]').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    showImg($$('[data-qv-thumbs] button').indexOf(b));
  });
  grid.addEventListener('click', function (e) {
    var b = e.target.closest('[data-quickview]'); if (!b) return;
    e.preventDefault();
    openQuick(b.getAttribute('data-quickview'), b);
  });

  renderCar();
})();
