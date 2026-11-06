/* blog listing: topic chips filter the featured card and the grid; ?topic=key preselects */
(function () {
  'use strict';
  var chips = document.querySelectorAll('[data-blog-filter]');
  var cards = document.querySelectorAll('#blogFeature .blog-card, #postGrid .blog-card');
  var feature = document.getElementById('blogFeature');
  var count = document.getElementById('blogCount');
  if (!chips.length) return;
  function apply(key) {
    var shown = 0;
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-blog-filter') === key)); });
    cards.forEach(function (card) {
      var on = key === 'all' || (card.getAttribute('data-group') || '').split(/\s+/).indexOf(key) > -1;
      card.hidden = !on;
      if (on) shown++;
    });
    feature.hidden = !feature.querySelector('.blog-card:not([hidden])');
    var label = key === 'all' ? '' : ' on ' + document.querySelector('[data-blog-filter="' + key + '"]').textContent.toLowerCase();
    count.textContent = key === 'all' ? 'Showing all ' + cards.length + ' articles' : 'Showing ' + shown + ' of ' + cards.length + ' articles' + label;
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { apply(c.getAttribute('data-blog-filter')); }); });
  var q = new URLSearchParams(location.search).get('topic');
  if (q && document.querySelector('[data-blog-filter="' + q + '"]')) apply(q);
})();
