/* blog listing: topic chips + search box filter the featured card and the grid; ?topic=key preselects */
(function () {
  'use strict';
  var chips = document.querySelectorAll('[data-blog-filter]');
  var cards = document.querySelectorAll('#blogFeature .blog-card, #postGrid .blog-card');
  var feature = document.getElementById('blogFeature');
  var count = document.getElementById('blogCount');
  var search = document.getElementById('blogSearch');
  var empty = document.getElementById('blogEmpty');
  var topic = 'all', query = '';
  if (!chips.length) return;
  /* every typed word must appear in the title, excerpt, author or tags */
  function found(card) {
    if (!query) return true;
    var text = card.textContent.replace(/\s+/g, ' ').toLowerCase();
    return query.split(/\s+/).every(function (w) { return text.indexOf(w) > -1; });
  }
  function apply(key) {
    if (key) topic = key;
    key = topic;
    var shown = 0;
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-blog-filter') === key)); });
    cards.forEach(function (card) {
      var on = (key === 'all' || (card.getAttribute('data-group') || '').split(/\s+/).indexOf(key) > -1) && found(card);
      card.hidden = !on;
      if (on) shown++;
    });
    feature.hidden = !feature.querySelector('.blog-card:not([hidden])');
    var label = key === 'all' ? '' : ' on ' + document.querySelector('[data-blog-filter="' + key + '"]').textContent.toLowerCase();
    count.textContent = key === 'all' && !query ? 'Showing all ' + cards.length + ' articles' : 'Showing ' + shown + ' of ' + cards.length + ' articles' + label;
    if (empty) empty.hidden = shown > 0;
  }
  if (search) search.addEventListener('input', function () { query = search.value.trim().toLowerCase(); apply(); });
  chips.forEach(function (c) { c.addEventListener('click', function () { apply(c.getAttribute('data-blog-filter')); }); });
  var q = new URLSearchParams(location.search).get('topic');
  if (q && document.querySelector('[data-blog-filter="' + q + '"]')) apply(q);
})();
