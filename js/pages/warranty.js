/* Warranty page: "Check your warranty" mock lookup (PDF 37-38). Shared validation checks name/phone; the job reference format is checked here. */
(function () {
  'use strict';
  var HX = window.HX || {};
  var form = document.getElementById('warrantyForm');
  if (!form) return;
  var box = document.querySelector('[data-wr-result]');
  var ref = form.elements.ref;
  var RE = /^HX-[QJS]-?\d{4}$/;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var JOBS = [
    ['Hyundai Creta 2024', 'Diamond quilt seat covers · Nappa-grade PU'],
    ['Kia Seltos 2023', 'Honeycomb perforated covers · steering wrap'],
    ['Maruti Swift 2022', 'Sport perforated covers · red thread'],
    ['Toyota Innova Hycross 2024', 'Signature makeover · mocha PU'],
    ['Tata Nexon 2023', 'Channel pleat suede covers · 7D mats'],
    ['Mahindra XUV700 2024', 'Bespoke cabin · roof liner and lighting']
  ];
  var q = function (k) { return box.querySelector('[data-wr="' + k + '"]'); };
  var fmtDate = function (d) { return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };

  function refError(msg) {
    var id = ref.id + '-error', el = document.getElementById(id);
    if (!el) { el = document.createElement('p'); el.className = 'field-error'; el.id = id; ref.closest('.field').appendChild(el); }
    el.textContent = msg;
    ref.setAttribute('aria-invalid', msg ? 'true' : 'false');
    var ids = (ref.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (ids.indexOf(id) === -1) { ids.push(id); ref.setAttribute('aria-describedby', ids.join(' ')); }
  }
  ref.addEventListener('blur', function () {
    ref.value = ref.value.trim().toUpperCase();
    if (ref.value && !RE.test(ref.value)) refError('Use the reference on your job card, like HX-Q-4827.');
  });
  ref.addEventListener('input', function () { if (RE.test(ref.value.trim().toUpperCase())) refError(''); });

  // the shared validator clears this field's message on submit (it only knows "required"), so re-apply the format error afterwards
  form.addEventListener('submit', function () {
    var v = ref.value.trim().toUpperCase();
    if (v && !RE.test(v)) refError('Use the reference on your job card, like HX-Q-4827.');
  });
  form.addEventListener('form:success', function () {
    var v = ref.value.trim().toUpperCase();
    ref.value = v;
    if (!RE.test(v)) { refError('Use the reference on your job card, like HX-Q-4827.'); ref.focus(); return; }
    var n = parseInt(v.replace(/\D/g, ''), 10);
    var job = JOBS[n % JOBS.length];
    var fitted = new Date(); fitted.setHours(0, 0, 0, 0);
    fitted.setDate(fitted.getDate() - (40 + (n * 7) % 800));
    var until = new Date(fitted); until.setFullYear(until.getFullYear() + 2);
    var total = until - fitted, left = Math.max(0, Math.round((until - new Date()) / 86400000));
    var pct = Math.max(0, Math.min(100, 100 * (until - new Date()) / total));
    var active = left > 0;
    q('ref').textContent = v;
    q('car').textContent = job[0];
    q('item').textContent = job[1];
    q('fitted').textContent = fmtDate(fitted);
    q('until').textContent = fmtDate(until);
    q('days').textContent = left;
    q('bar-label').setAttribute('aria-label', left + ' days of warranty left');
    var badge = box.querySelector('.wr-status .badge');
    badge.textContent = active ? 'Active' : 'Expired';
    box.querySelector('.wr-status').classList.toggle('is-expired', !active);
    q('claim').href = 'https://wa.me/919876543210?text=' + encodeURIComponent('Hi Hexstitch, I would like to raise a warranty claim for job ' + v + ' (' + job[0] + ').');
    q('claim').textContent = active ? 'Raise a claim on WhatsApp' : 'Ask about a repair';
    form.hidden = true;
    box.hidden = false;
    q('bar').style.width = '0';
    requestAnimationFrame(function () { requestAnimationFrame(function () { q('bar').style.width = pct.toFixed(1) + '%'; }); });
    box.focus();
  });
  box.querySelector('[data-wr-again]').addEventListener('click', function () {
    box.hidden = true; form.hidden = false; form.reset(); refError(''); ref.focus();
  });
})();
