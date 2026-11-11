/* Gallery: body-type chips + material select filter the featured card and the grid together (PDF 29-30). State kept in the URL (?body=suv&material=nappa). */
(function () {
  'use strict';
  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-gl-chips] .chip'));
  var sel = document.querySelector('[data-gl-material]');
  var items = Array.prototype.slice.call(document.querySelectorAll('.feature-project[data-body], .project-card[data-body]'));
  var gridItems = function () { return items.filter(function (i) { return i.classList.contains('project-card'); }); };
  var countEl = document.querySelector('[data-gl-count]');
  var empty = document.querySelector('[data-gl-empty]');
  if (!chips.length || !sel) return;
  var body = 'all', mat = 'all';
  // the hand-written Fortuner card sits in its own .project-grid; merge it into the macro grid as the first card
  var grids = Array.prototype.slice.call(document.querySelectorAll('[data-project-grid]'));
  var grid = grids[grids.length - 1];
  grids.slice(0, -1).forEach(function (g) { Array.prototype.slice.call(g.children).reverse().forEach(function (c) { grid.insertBefore(c, grid.firstChild); }); g.remove(); });
  var cards = grid ? Array.prototype.slice.call(grid.querySelectorAll('.project-card')) : [];

  // uniform grid (no masonry): equal cards in full rows, so there are no empty gaps; CSS sets 4 / 2 / 1 columns
  function layout() { if (grid) grid.classList.add('gl-uniform'); }

  // counts per body type on the chips (respecting the material filter)
  function labelChips() {
    chips.forEach(function (c) {
      var b = c.getAttribute('data-body');
      var n = gridItems().filter(function (i) { return (b === 'all' || i.getAttribute('data-body') === b) && (mat === 'all' || i.getAttribute('data-material') === mat); }).length;
      var s = c.querySelector('span');
      if (!s) { s = document.createElement('span'); c.appendChild(document.createTextNode(' ')); c.appendChild(s); }
      s.textContent = n;
    });
  }
  function apply(push) {
    var shown = 0;
    items.forEach(function (i) {
      var ok = (body === 'all' || i.getAttribute('data-body') === body) && (mat === 'all' || i.getAttribute('data-material') === mat);
      i.classList.toggle('is-hidden', !ok);
      if (ok && i.classList.contains('project-card')) shown++;
    });
    chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-body') === body ? 'true' : 'false'); });
    sel.value = mat;
    countEl.textContent = 'Showing ' + shown + ' of ' + gridItems().length + ' projects';
    empty.hidden = shown > 0;
    labelChips();
    layout();
    if (push && history.replaceState) {
      var q = [];
      if (body !== 'all') q.push('body=' + body);
      if (mat !== 'all') q.push('material=' + mat);
      history.replaceState(null, '', location.pathname + (q.length ? '?' + q.join('&') : ''));
    }
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { body = c.getAttribute('data-body'); apply(true); }); });
  sel.addEventListener('change', function () { mat = sel.value; apply(true); });
  document.querySelector('[data-gl-reset]').addEventListener('click', function () { body = 'all'; mat = 'all'; apply(true); });

  var p = new URLSearchParams(location.search);
  if (chips.some(function (c) { return c.getAttribute('data-body') === p.get('body'); })) body = p.get('body');
  if (p.get('material') && sel.querySelector('option[value="' + p.get('material') + '"]')) mat = p.get('material');
  apply(false);
})();
