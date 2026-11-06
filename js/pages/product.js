/* Product detail (generated product-<slug>.html): gallery thumbs, live price, colour/thread labels, fit note, swatch modal. */
(function () {
  'use strict';
  var HX = window.HX;
  var wrap = document.querySelector('[data-pd]');
  if (!wrap) return;
  var slug = wrap.getAttribute('data-pd');
  var p = (HX.data.products || []).filter(function (x) { return x.slug === slug; })[0];

  /* gallery: thumbs swap the visible lightbox link; lightbox still walks all 3 photos */
  var main = document.querySelector('[data-pd-main]');
  var links = main ? Array.prototype.slice.call(main.querySelectorAll('a')) : [];
  var count = document.querySelector('[data-pd-count]');
  document.querySelectorAll('[data-pd-thumb]').forEach(function (t) {
    t.addEventListener('click', function () {
      var i = +t.getAttribute('data-pd-thumb');
      links.forEach(function (a, k) { a.hidden = k !== i; });
      document.querySelectorAll('[data-pd-thumb]').forEach(function (x) { x.setAttribute('aria-current', String(x === t)); });
      if (count) count.textContent = (i + 1) + ' / ' + links.length;
    });
  });

  /* options -> price + quote link */
  var form = document.querySelector('[data-pd-form]');
  var priceEl = document.querySelector('[data-pd-price]');
  var quote = document.querySelector('[data-pd-quote]');
  function val(n) { var r = form.querySelector('[name="' + n + '"]:checked'); return r ? r.value : ''; }
  function update() {
    var cov = form.querySelector('[name="coverage"]:checked');
    if (cov && priceEl) priceEl.textContent = HX.fmtPrice(cov.getAttribute('data-price'));
    var c = document.querySelector('[data-pd-colour]'); if (c) c.textContent = val('colour');
    var th = document.querySelector('[data-pd-thread]'); if (th) th.textContent = val('thread');
    var qs = 'product=' + slug + '&coverage=' + (cov ? cov.value : 0) + '&colour=' + encodeURIComponent(val('colour')) + (val('thread') ? '&thread=' + encodeURIComponent(val('thread')) : '');
    var car = HX.getCar(); if (car) qs += '&car=' + car.slug;
    if (quote) quote.href = 'quote.html?' + qs;
    /* mobile sticky bar mirrors the chosen coverage */
    var bq = document.querySelector('[data-pd-bar-quote]'); if (bq) bq.href = 'quote.html?' + qs;
    var bp = document.querySelector('[data-pd-bar-price]'); if (bp && cov) bp.textContent = HX.fmtPrice(cov.getAttribute('data-price'));
    var bl = document.querySelector('[data-pd-bar-label]');
    if (bl && cov) { var lab = cov.closest('.opt-card').querySelector('.opt-body strong'); bl.textContent = lab ? lab.textContent.split(' · ')[0] : ''; }
  }
  if (form) { form.addEventListener('change', update); update(); }

  /* fit note follows the saved car */
  var note = document.querySelector('[data-fit-note]');
  function fit() {
    if (!note) return;
    var car = HX.getCar(), txt = note.querySelector('[data-fit-text]');
    var any = note.getAttribute('data-fits-any') === 'true';
    if (!car) { txt.textContent = any ? 'Fits any car. Pick yours to pre-fill the quote.' : 'Made to your car’s pattern. Pick your car to check.'; note.classList.remove('is-warn'); return; }
    var ok = any || car.pattern;
    note.classList.toggle('is-warn', !ok);
    txt.textContent = ok ? 'Fits your ' + car.label : 'No pattern for your ' + car.label + ' yet: we trace one at the studio (adds a day)';
    update();
  }
  document.addEventListener('car:change', fit);
  fit();

  /* "212 reviews" link opens the Reviews tab */
  document.querySelectorAll('a[href="#reviews"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var t = document.getElementById('t-reviews'); if (!t) return;
      e.preventDefault(); t.click();
      t.closest('[data-tabs]').scrollIntoView({ behavior: document.documentElement.classList.contains('motion') ? 'smooth' : 'auto', block: 'start' });
    });
  });

  /* keyboard: left/right arrows on the main photo walk the gallery */
  if (main) main.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var thumbs = Array.prototype.slice.call(document.querySelectorAll('[data-pd-thumb]'));
    var i = links.findIndex(function (a) { return !a.hidden; });
    var n = (i + (e.key === 'ArrowRight' ? 1 : -1) + links.length) % links.length;
    if (thumbs[n]) { thumbs[n].click(); links[n].focus(); e.preventDefault(); }
  });

  /* sticky quote bar (phones): hide while the main buy button is on screen */
  var bar = document.querySelector('[data-pd-bar]');
  if (bar && quote && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { bar.classList.toggle('is-hidden', en[0].isIntersecting); }).observe(quote);
  }
})();
