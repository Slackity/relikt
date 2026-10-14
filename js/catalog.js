/*
 * RELIKT — catalog page: category / availability / condition filters, search, sort, favourites view, "show more".
 * State lives in the URL (?cat=&av=&cond=&q=&sort=&fav=1) so every view can be shared.
 */
(function () {
  'use strict';
  var RK = window.RK, h = RK.h, doc = document;
  var PAGE = 24;
  var CONDS = ['new', 'vintage', 'used'];
  var st = { cat: 'all', av: 'all', cond: 'all', q: '', sort: 'new', fav: false, shown: PAGE };

  function readUrl() {
    var p = new URLSearchParams(location.search);
    st.cat = p.get('cat') || 'all';
    st.av = ['instock', 'order', 'reserved', 'sold'].indexOf(p.get('av')) >= 0 ? p.get('av') : 'all';
    st.cond = CONDS.indexOf(p.get('cond')) >= 0 ? p.get('cond') : 'all';
    st.q = (p.get('q') || '').slice(0, 80);
    st.sort = ['asc', 'desc'].indexOf(p.get('sort')) >= 0 ? p.get('sort') : 'new';
    st.fav = p.get('fav') === '1';
    st.shown = PAGE;
  }
  function writeUrl() {
    var p = new URLSearchParams();
    if (st.cat !== 'all') p.set('cat', st.cat);
    if (st.av !== 'all') p.set('av', st.av);
    if (st.cond !== 'all') p.set('cond', st.cond);
    if (st.q) p.set('q', st.q);
    if (st.sort !== 'new') p.set('sort', st.sort);
    if (st.fav) p.set('fav', '1');
    var s = p.toString();
    if (history.replaceState) history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
  }

  function base() {
    return RK.data.products.filter(function (p) { return !st.fav || RK.favs.has(p.id); });
  }

  function matches(p) {
    if (st.cat !== 'all' && p.category !== st.cat) return false;
    if (st.av !== 'all' && p.availability !== st.av) return false;
    if (st.cond !== 'all' && p.condition !== st.cond) return false;
    if (st.q) {
      var cat = RK.data.categories.filter(function (c) { return c.id === p.category; })[0];
      var hay = [p.ru, p.en, p.brand, cat ? cat.ru + ' ' + cat.en : ''].join(' ').toLowerCase();
      var ok = st.q.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
      if (!ok) return false;
    }
    return true;
  }

  function sorted(list) {
    var rank = function (p) { return p.availability === 'sold' ? 2 : p.availability === 'reserved' ? 1 : 0; };
    return list.slice().sort(function (a, b) {
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      if (st.sort === 'asc' || st.sort === 'desc') {
        var dir = st.sort === 'asc' ? 1 : -1;   // items without a price always go last
        var pa = a.price == null ? dir * Infinity : RK.priceOf(a), pb = b.price == null ? dir * Infinity : RK.priceOf(b);
        if (pa !== pb) return dir * (pa - pb);
      }
      if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }

  function chip(label, active, onclick, count) {
    return h('button', { class: 'chip' + (active ? ' is-on' : ''), type: 'button', 'aria-pressed': String(active), onclick: onclick },
      h('span', { text: label }), count != null ? h('i', { text: String(count) }) : null);
  }

  /* on a phone the chips sit in rows that scroll sideways: a redraw keeps the row where it was,
     the first one shows the chosen category */
  var chipRowsDrawn = false;
  function keepScroll(draw) {
    var rows = [RK.$('#catChips'), RK.$('#chipsLine')], at = rows.map(function (r) { return r ? r.scrollLeft : 0; });
    draw();
    rows.forEach(function (r, i) { if (r) r.scrollLeft = at[i]; });
    var cc = rows[0], on = cc && RK.$('.is-on', cc);
    if (!chipRowsDrawn && on && cc.scrollWidth > cc.clientWidth) cc.scrollLeft = on.offsetLeft - (cc.clientWidth - on.offsetWidth) / 2;
    chipRowsDrawn = true;
  }
  function renderChips() { keepScroll(drawChips); }
  function drawChips() {
    var all = base();
    var cc = RK.$('#catChips'); cc.textContent = '';
    cc.appendChild(chip(RK.t('catalog.all'), st.cat === 'all', function () { st.cat = 'all'; update(); }, all.length));
    RK.data.categories.forEach(function (c) {
      var n = all.filter(function (p) { return p.category === c.id; }).length;
      cc.appendChild(chip(RK.cname(c), st.cat === c.id, function () { st.cat = c.id; update(); }, n));
    });
    var ac = RK.$('#avChips'); ac.textContent = '';
    [['all', 'catalog.all'], ['instock', 'filter.instock'], ['order', 'filter.order'], ['reserved', 'filter.reserved'], ['sold', 'filter.sold']].forEach(function (a) {
      if (a[0] === 'reserved' && !RK.data.products.some(function (p) { return p.availability === 'reserved'; }) && st.av !== 'reserved') return;
      ac.appendChild(chip(RK.t(a[1]), st.av === a[0], function () { st.av = a[0]; update(); }));
    });
    // condition: a tap turns the filter on, a second tap on the same chip turns it off
    var nc = RK.$('#condChips'); nc.textContent = '';
    CONDS.forEach(function (c) {
      var n = all.filter(function (p) { return p.condition === c; }).length;
      if (!n && st.cond !== c) return;
      nc.appendChild(chip(RK.t('cond.' + c), st.cond === c, function () { st.cond = st.cond === c ? 'all' : c; update(); }, n));
    });
  }

  function renderGrid() {
    var list = sorted(base().filter(matches));
    var grid = RK.$('#grid'), more = RK.$('#more'), empty = RK.$('#empty');
    grid.textContent = '';
    list.slice(0, st.shown).forEach(function (p, i) {
      var c = RK.ui.card(p);
      c.classList.add('reveal'); c.style.setProperty('--d', (i % 4) * 70 + 'ms');
      grid.appendChild(c);
    });
    RK.listShown = st.shown;
    RK.reveal(grid);
    RK.$('#count').textContent = RK.t('catalog.found', { n: list.length });
    more.hidden = list.length <= st.shown;
    empty.hidden = list.length > 0;
    if (!list.length) RK.$('#emptyText').textContent = RK.t(st.fav && !RK.favs.count() ? 'catalog.fav.empty' : 'catalog.empty');
    RK.$('#resetBtn').hidden = !(st.cat !== 'all' || st.av !== 'all' || st.cond !== 'all' || st.q);
  }

  function renderHead() {
    RK.$('#shopTitle').textContent = RK.t(st.fav ? 'catalog.fav.title' : 'catalog.title');
    RK.$('#shopLead').textContent = RK.t(st.fav ? 'catalog.fav.lead' : 'catalog.lead');
    RK.$('#crumb').textContent = 'RELIKT / ' + RK.t(st.fav ? 'catalog.fav.title' : 'catalog.title').toUpperCase();
    doc.title = RK.t(st.fav ? 'catalog.fav.title' : 'catalog.title') + ' — RELIKT';
    var q = RK.$('#q'); if (q.value !== st.q) q.value = st.q;
    RK.$('#sort').value = st.sort;
  }

  function update() { st.shown = PAGE; writeUrl(); renderAll(); }
  function renderAll() { renderHead(); renderChips(); renderGrid(); }

  RK.start(function () {
    readUrl();
    var timer;
    RK.$('#q').addEventListener('input', function (e) {
      clearTimeout(timer);
      timer = setTimeout(function () { st.q = e.target.value.trim(); update(); }, 180);
    });
    RK.$('#sort').addEventListener('change', function (e) { st.sort = e.target.value; update(); });
    RK.$('#more').addEventListener('click', function () { st.shown += PAGE; renderGrid(); });
    RK.$('#resetBtn').addEventListener('click', function () { st.cat = 'all'; st.av = 'all'; st.cond = 'all'; st.q = ''; update(); });
    RK.on('lang', renderAll);
    // in the favourites view the grid must follow the hearts
    RK.on('favs', function () { if (st.fav) renderAll(); });
    // back from a product: as many cards as were open ("show more")
    var memo = RK.scrollMemo();
    if (memo && memo.shown > st.shown) st.shown = memo.shown;
    renderAll();
  });
  RK.run();
})();
