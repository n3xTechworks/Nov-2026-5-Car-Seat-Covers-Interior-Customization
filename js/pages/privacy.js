/* legal pages: highlight the TOC item for the section in view (TOC itself is not sticky) */
(function () {
  'use strict';
  var links = Array.prototype.slice.call(document.querySelectorAll('.legal-toc a'));
  if (!links.length) return;
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  function setActive(i) { links.forEach(function (a, j) { if (j === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }); }
  links.forEach(function (a, i) { a.addEventListener('click', function () { setActive(i); }); });
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.innerHeight * 0.3, idx = 0;
      secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < y) idx = i; });
      setActive(idx);
    });
  }, { passive: true });
  var cs = document.querySelector('[data-cookie-settings]');
  if (cs) cs.addEventListener('click', function () { if (window.HX && HX.showCookieBanner) HX.showCookieBanner(); });
})();
