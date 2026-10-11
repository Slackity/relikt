/*
 * RELIKT — shared core (window.RK).
 * Data loading, language + admin text overrides, cart & favourites, DOM helper, effects.
 * Load order on every page: sprite, ornaments, i18n-defaults, app, chrome, shop, <page>.
 */
(function () {
  'use strict';

  var doc = document, root = doc.documentElement;
  var RK = window.RK = {};

  RK.$ = function (s, c) { return (c || doc).querySelector(s); };
  RK.$$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  RK.clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  RK.reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  RK.finePointer = !!(window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches);

  /* ---------- storage that never throws ---------- */
  RK.store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  };

  /* ---------- tiny event bus ---------- */
  var handlers = {};
  RK.on = function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); };
  RK.emit = function (ev, arg) { (handlers[ev] || []).slice().forEach(function (fn) { try { fn(arg); } catch (e) { console.error(e); } }); };

  /* ---------- DOM builder: h('a', {class:'x', href:'#', onclick:fn}, 'text', child) ---------- */
  RK.h = function (tag, attrs) {
    var el = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) { el.style.setProperty(s, v[s]); });
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { append(el, x); });
    else el.appendChild(c.nodeType ? c : doc.createTextNode(String(c)));
  }
  RK.svg = function (inner, cls, vb) {
    var d = doc.createElement('div');
    d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (vb || '0 0 24 24') + '" class="' + (cls || '') + '" aria-hidden="true" focusable="false">' + inner + '</svg>';
    return d.firstChild;
  };

  /* ---------- language ---------- */
  RK.lang = RK.store.get('rk-lang', 'ru') === 'en' ? 'en' : 'ru';
  RK.data = null;       // { settings, categories, products, content }

  RK.vars = function () {
    var s = (RK.data && RK.data.settings) || {};
    return { percent: s.reservePercent != null ? s.reservePercent : 20, days: s.reserveDays != null ? s.reserveDays : 3 };
  };

  RK.t = function (key, vars) {
    var over = RK.data && RK.data.content && RK.data.content[RK.lang] && RK.data.content[RK.lang][key];
    var def = window.RK_I18N && RK_I18N[RK.lang] && RK_I18N[RK.lang][key];
    var s = over || def || (RK_I18N && RK_I18N.ru[key]) || key;
    var all = RK.vars();
    if (vars) Object.keys(vars).forEach(function (k) { all[k] = vars[k]; });
    return s.replace(/\{(\w+)\}/g, function (m, k) { return all[k] != null ? all[k] : m; });
  };

  /* escape everything, then allow only <br> and <em> */
  RK.safeHtml = function (s) {
    return String(s).replace(/&(?!amp;|lt;|gt;|quot;|#39;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/&lt;(\/?)(br|em)\s*\/?&gt;/gi, '<$1$2>');
  };

  RK.apply = function (scope) {
    scope = scope || doc;
    RK.$$('[data-i18n]', scope).forEach(function (el) { el.textContent = RK.t(el.getAttribute('data-i18n')); });
    RK.$$('[data-i18n-html]', scope).forEach(function (el) { el.innerHTML = RK.safeHtml(RK.t(el.getAttribute('data-i18n-html'))); });
    RK.$$('[data-i18n-attr]', scope).forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':'); if (p.length === 2) el.setAttribute(p[0].trim(), RK.t(p[1].trim()));
      });
    });
  };

  RK.setLang = function (l) {
    RK.lang = l === 'en' ? 'en' : 'ru';
    RK.store.set('rk-lang', RK.lang);
    root.lang = RK.lang;
    doc.title = RK.t('meta.title');
    RK.apply();
    RK.$$('[data-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === RK.lang)); });
    RK.emit('lang', RK.lang);
  };

  /* ---------- data-aware helpers ---------- */
  RK.pname = function (p) { return (RK.lang === 'en' ? p.en : p.ru) || p.ru || p.en || ''; };
  RK.pdesc = function (p) { return (RK.lang === 'en' ? p.descEn : p.descRu) || ''; };
  RK.cname = function (c) { return (RK.lang === 'en' ? c.en : c.ru) || c.ru; };
  RK.csub = function (c) { return (RK.lang === 'en' ? c.subEn : c.subRu) || ''; };
  RK.dname = function (d) { return (RK.lang === 'en' ? d.en : d.ru) || d.ru; };
  RK.img = function (u) { return u ? String(u).replace(/^\//, '') : ''; };   // relative so the site also works from a sub-folder
  RK.money = function (n) {
    if (n == null) return RK.t('price.ask');
    var cur = (RK.data && RK.data.settings && RK.data.settings.currency) || '₽';
    return Number(n).toLocaleString('ru-RU').replace(/ | /g, ' ') + ' ' + cur;
  };
  RK.tg = function (kind) {
    var s = (RK.data && RK.data.settings) || {};
    var h = kind === 'manager' ? s.manager : kind === 'reviews' ? s.reviews : s.channel;
    return 'https://t.me/' + (h || 'relikt_store');
  };
  RK.handle = function (kind) {
    var s = (RK.data && RK.data.settings) || {};
    return '@' + (kind === 'manager' ? s.manager : kind === 'reviews' ? s.reviews : s.channel);
  };
  RK.productById = function (id) {
    var list = (RK.data && RK.data.products) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id || list[i].slug === id) return list[i];
    return null;
  };
  RK.available = function (p) { return p && p.availability !== 'sold' && p.price != null; };
  RK.isRecent = function (p) { return Date.now() - new Date(p.createdAt).getTime() < 14 * 864e5; };
  RK.productUrl = function (p) { return 'product.html?id=' + encodeURIComponent(p.slug || p.id); };

  /* ---------- loading ---------- */
  function fetchJson(url, opts) {
    return fetch(url, Object.assign({ cache: 'no-store', credentials: 'same-origin' }, opts)).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  RK.fetchJson = fetchJson;

  /* The catalog is one JSON file next to the pages (GitHub Pages has no server).
     The timestamp skips the CDN cache, so admin changes show up as soon as the site is rebuilt.
     The last good copy is kept for a bad connection. */
  RK.load = function () {
    return fetchJson('data/store.json?t=' + Date.now())
      .then(function (d) { RK.store.set('rk-catalog', d); return d; })
      .catch(function (e) { var c = RK.store.get('rk-catalog', null); if (c && c.products) return c; throw e; })
      .then(function (d) {
        d.products = (d.products || []).filter(function (p) { return p.visible; });
        d.content = d.content || { ru: {}, en: {} };
        RK.data = d; RK.cart.prune(); RK.emit('data', d); return d;
      });
  };

  /* ---------- overlays (cart drawer, menu, lightbox) close one by one: Esc, Telegram back button ---------- */
  var overlays = [];
  RK.overlay = {
    open: function (close) { if (overlays.indexOf(close) < 0) overlays.push(close); RK.emit('overlay', overlays.length); },
    closed: function (close) { var i = overlays.indexOf(close); if (i >= 0) { overlays.splice(i, 1); RK.emit('overlay', overlays.length); } },
    count: function () { return overlays.length; },
    closeTop: function () { var fn = overlays[overlays.length - 1]; if (fn) { fn(); return true; } return false; }
  };

  /* vibration feedback inside Telegram (js/tg.js replaces it) */
  RK.haptic = function () {};

  /* ---------- favourites ---------- */
  var favIds = RK.store.get('rk-favs', []);
  if (!Array.isArray(favIds)) favIds = [];
  RK.favs = {
    has: function (id) { return favIds.indexOf(id) >= 0; },
    list: function () { return favIds.slice(); },
    count: function () { return favIds.length; },
    toggle: function (id) {
      var i = favIds.indexOf(id);
      if (i >= 0) favIds.splice(i, 1); else favIds.push(id);
      RK.store.set('rk-favs', favIds);
      RK.emit('favs', id);
      return i < 0;
    }
  };

  /* ---------- cart ---------- */
  var cartItems = RK.store.get('rk-cart', []);
  if (!Array.isArray(cartItems)) cartItems = [];
  function saveCart() { RK.store.set('rk-cart', cartItems); RK.emit('cart'); }

  RK.cart = {
    items: function () { return cartItems.slice(); },
    count: function () { return cartItems.reduce(function (n, i) { return n + i.qty; }, 0); },
    has: function (id) { return cartItems.some(function (i) { return i.id === id; }); },
    /* units of one product a cart may hold: a unique piece 1, several in stock up to the stock, made to order up to 5 */
    max: function (p) { return p.availability === 'instock' ? RK.clamp(p.stock || 1, 1, 5) : 5; },
    /* returns 'added' | 'exists' */
    add: function (p, size, qty) {
      size = String(size || '').slice(0, 24);
      var max = RK.cart.max(p);
      qty = RK.clamp(parseInt(qty, 10) || 1, 1, max);
      if (max === 1 && cartItems.some(function (i) { return i.id === p.id; })) return 'exists'; // unique pieces: one per cart
      var found = cartItems.filter(function (i) { return i.id === p.id && i.size === size; })[0];
      if (found) found.qty = Math.min(max, found.qty + qty);
      else cartItems.push({ id: p.id, size: size, qty: qty });
      saveCart();
      return 'added';
    },
    remove: function (idx) { cartItems.splice(idx, 1); saveCart(); },
    setQty: function (idx, q) {
      var it = cartItems[idx], p = it && RK.productById(it.id);
      if (it) { it.qty = RK.clamp(q, 1, p ? RK.cart.max(p) : 1); saveCart(); }
    },
    clear: function () { cartItems = []; saveCart(); },
    /* drop lines whose product disappeared or was sold; returns true if something changed */
    prune: function () {
      if (!RK.data) return false;
      var before = cartItems.length;
      var trimmed = false;
      cartItems = cartItems.filter(function (i) {
        var p = RK.productById(i.id);
        if (!p || !RK.available(p)) return false;
        if (i.qty > RK.cart.max(p)) { i.qty = RK.cart.max(p); trimmed = true; }
        return true;
      });
      if (cartItems.length !== before || trimmed) { RK.store.set('rk-cart', cartItems); RK.emit('cart'); }
      return cartItems.length !== before;
    },
    lines: function () {
      return cartItems.map(function (it, idx) { return { idx: idx, item: it, product: RK.productById(it.id) }; })
        .filter(function (l) { return l.product; });
    },
    discounts: function () { return RK.store.get('rk-disc', []); },
    setDiscounts: function (ids) { RK.store.set('rk-disc', ids); RK.emit('cart'); },
    /* promo code typed by the buyer; only active codes from the settings count */
    promoCode: function () { return RK.store.get('rk-promo', '') || ''; },
    promo: function () {
      var code = RK.cart.promoCode();
      var list = (RK.data && RK.data.settings.promos) || [];
      return code ? list.filter(function (x) { return x.active !== false && x.code === code; })[0] || null : null;
    },
    setPromo: function (code) { RK.store.set('rk-promo', String(code || '').trim().toUpperCase()); RK.emit('cart'); },
    totals: function () {
      var lines = RK.cart.lines();
      var subtotal = lines.reduce(function (t, l) { return t + (l.product.price || 0) * l.item.qty; }, 0);
      var picked = RK.cart.discounts();
      var list = ((RK.data && RK.data.settings.discounts) || []).filter(function (d) { return picked.indexOf(d.id) >= 0; });
      var promo = RK.cart.promo();
      var percent = Math.min(90, list.reduce(function (t, d) { return t + d.percent; }, 0) + (promo && promo.type === 'percent' ? promo.value : 0));
      var cut = Math.round(subtotal * percent / 100) + (promo && promo.type === 'amount' ? promo.value : 0);
      var total = Math.max(0, subtotal - cut);
      var rp = RK.data && RK.data.settings.reservePercent != null ? RK.data.settings.reservePercent : 20;
      return { subtotal: subtotal, percent: percent, cut: subtotal - total, total: total, deposit: Math.round(total * rp / 100), picked: list, promo: promo };
    }
  };

  /* ---------- toast ---------- */
  var toastTimer;
  RK.toast = function (msg) {
    var el = RK.$('#toast');
    if (!el) { el = RK.h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' }); doc.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2400);
  };

  RK.copy = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    return Promise.resolve(fallbackCopy(text));
  };
  function fallbackCopy(text) {
    try {
      var ta = RK.h('textarea', { style: { position: 'fixed', opacity: '0' } }); ta.value = text; doc.body.appendChild(ta); ta.select();
      var ok = doc.execCommand('copy'); ta.remove(); return ok;
    } catch (e) { return false; }
  }

  /* ---------- ornaments inside a container ---------- */
  RK.ornaments = function (scope) {
    if (!window.Orn) return;
    RK.$$('[data-orn]', scope || doc).forEach(function (el) {
      if (el.firstChild) return;
      var kind = el.getAttribute('data-orn'), d = el.dataset;
      if (kind === 'sigil') el.innerHTML = Orn.sigil({ n: d.n ? +d.n : 8, curl: d.curl != null ? +d.curl : 1, reach: d.reach ? +d.reach : 1 });
      else if (kind === 'divider') el.innerHTML = Orn.divider();
      else if (kind === 'corner') el.innerHTML = Orn.corner();
    });
  };

  /* ---------- reveal on scroll ---------- */
  var io = null;
  RK.reveal = function (scope) {
    var els = RK.$$('.reveal:not(.in)', scope || doc);
    if (!('IntersectionObserver' in window) || RK.reduce) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    io = io || new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    els.forEach(function (el) { io.observe(el); });
  };

  /* ---------- in-page anchors with smooth scroll (also for index.html#x links on the home page) ---------- */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    var norm = function (p) { return p.replace(/index\.html$/, '').replace(/\/$/, '') || '/'; };
    if (u.origin !== location.origin || norm(u.pathname) !== norm(location.pathname) || !u.hash) return;
    var id = u.hash.slice(1);
    var target = id === 'top' ? doc.body : doc.getElementById(id);
    if (!target) return;
    e.preventDefault();
    if (id === 'top') window.scrollTo({ top: 0, behavior: RK.reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: RK.reduce ? 'auto' : 'smooth', block: 'start' });
    if (history.replaceState) history.replaceState(null, '', u.hash);
    RK.emit('anchor');
  });

  /* ---------- custom cursor + magnetic buttons ---------- */
  RK.initPointer = function () {
    if (!RK.finePointer || RK.reduce) return;
    var cur = RK.$('.cursor');
    if (cur) {
      var x = -100, y = -100, cx = -100, cy = -100, on = false;
      doc.addEventListener('mousemove', function (e) {
        x = e.clientX; y = e.clientY;
        if (!on) { on = true; cx = x; cy = y; root.classList.add('has-cursor'); }
      }, { passive: true });
      doc.addEventListener('mouseleave', function () { root.classList.remove('has-cursor'); on = false; });
      doc.addEventListener('mouseover', function (e) {
        cur.classList.toggle('is-hover', !!(e.target.closest && e.target.closest('a, button, summary, label, select, input, textarea')));
      });
      (function loop() {
        cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
        cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
        requestAnimationFrame(loop);
      })();
    }
    doc.addEventListener('mousemove', function (e) {
      var el = e.target.closest && e.target.closest('[data-magnet]');
      RK.$$('[data-magnet].is-pulled').forEach(function (m) { if (m !== el) { m.style.transform = ''; m.classList.remove('is-pulled'); } });
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.transform = 'translate(' + ((e.clientX - (r.left + r.width / 2)) * 0.22).toFixed(1) + 'px,' + ((e.clientY - (r.top + r.height / 2)) * 0.32).toFixed(1) + 'px)';
      el.classList.add('is-pulled');
    }, { passive: true });
  };

  /* ---------- page boot ---------- */
  var starters = [];
  RK.start = function (fn) {
    if (fn) starters.push(fn);
  };
  RK.run = function () {
    root.lang = RK.lang;
    if (RK.chrome) RK.chrome.mount();
    RK.apply();
    RK.setLang(RK.lang);
    RK.ornaments();
    RK.initPointer();
    RK.load().then(function () {
      if (RK.chrome) RK.chrome.update();
      RK.setLang(RK.lang);
      starters.forEach(function (fn) { fn(); });
      RK.reveal();
    }).catch(function (e) {
      console.error(e);
      var m = RK.$('#pageMessage');
      if (m) m.textContent = RK.lang === 'en' ? 'Could not load the catalog. Please reload the page.' : 'Не удалось загрузить каталог. Обнови страницу.';
    });
  };
})();
