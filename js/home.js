/*
 * RELIKT — home page: marquee, manifesto, new arrivals, category plates, terms, hero effects.
 */
(function () {
  'use strict';
  var RK = window.RK, h = RK.h, doc = document;

  var SIGILS = [
    { n: 8, curl: 1 }, { n: 6, curl: -1, reach: 1.05 }, { n: 10, curl: 0.7 },
    { n: 12, curl: 0.5 }, { n: 4, curl: 1.3, reach: 1.02 }, { n: 16, curl: 0.3 }
  ];

  /* ---------- marquee ---------- */
  function buildMarquee() {
    var track = RK.$('#marquee');
    if (!track) return;
    var items = [1, 2, 3, 4, 5].map(function (i) { return RK.t('marquee.' + i); }).filter(Boolean);
    var cross = '<svg class="marquee__sep" viewBox="0 0 681 1371" aria-hidden="true"><use href="#rk-cross"/></svg>';
    var group = '<div class="marquee__group">' + items.map(function (t) { return '<span class="marquee__item">' + RK.safeHtml(t) + '</span>' + cross; }).join('') + '</div>';
    track.innerHTML = group + group + group + group;
  }

  /* ---------- manifesto: words light up as you read ---------- */
  var words = [];
  function buildManifest() {
    var el = RK.$('#manifestText');
    if (!el) return;
    var text = RK.t('manifest.text');
    var chunks = text.split('*'), html = '';
    chunks.forEach(function (chunk, i) {
      var italic = i % 2 === 1;
      // punctuation hugging the previous word ("time*.") must not get a space in front
      var glue = i > 0 && chunk.length > 0 && !/^\s/.test(chunk) && !/\s$/.test(chunks[i - 1]);
      chunk.split(/\s+/).filter(Boolean).forEach(function (word, j) {
        if (glue && j === 0 && html.slice(-1) === ' ') html = html.slice(0, -1);
        html += '<span class="w' + (italic ? ' em' : '') + '">' + RK.safeHtml(word) + '</span> ';
      });
    });
    el.innerHTML = html;
    el.setAttribute('aria-label', text.replace(/\*/g, ''));
    words = RK.$$('.w', el);
    if (RK.reduce) el.classList.add('is-static');
    updateManifest();
  }
  function updateManifest() {
    var el = RK.$('#manifestText');
    if (!el || !words.length || RK.reduce) return;
    var r = el.getBoundingClientRect(), vh = window.innerHeight;
    var p = RK.clamp((vh * 0.82 - r.top) / (r.height * 0.85 + vh * 0.12), 0, 1);
    var lit = Math.round(p * words.length);
    for (var i = 0; i < words.length; i++) {
      var on = i < lit;
      if (words[i].classList.contains('on') !== on) words[i].classList.toggle('on', on);
    }
  }

  /* ---------- new arrivals ---------- */
  function buildNew() {
    var grid = RK.$('#newGrid');
    if (!grid) return;
    grid.textContent = '';
    var list = RK.data.products.filter(function (p) { return p.availability !== 'sold'; })
      .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }).slice(0, 8);
    list.forEach(function (p, i) {
      var c = RK.ui.card(p);
      c.classList.add('reveal'); c.style.setProperty('--d', (i % 4) * 90 + 'ms');
      grid.appendChild(c);
    });
    RK.reveal(grid);
  }

  /* ---------- category plates ---------- */
  function buildPlates() {
    var wrap = RK.$('#plates');
    if (!wrap) return;
    wrap.textContent = '';
    RK.data.categories.forEach(function (c, i) {
      var sg = SIGILS[i % SIGILS.length];
      var count = RK.data.products.filter(function (p) { return p.category === c.id && p.availability !== 'sold'; }).length;
      var a = h('a', { class: 'plate reveal', href: 'catalog.html?cat=' + encodeURIComponent(c.id), style: { '--d': (i % 3) * 120 + 'ms' } },
        h('span', { class: 'plate__corner', 'data-orn': 'corner', 'aria-hidden': 'true' }),
        h('span', { class: 'plate__sigil', 'data-orn': 'sigil', 'data-n': sg.n, 'data-curl': sg.curl, 'data-reach': sg.reach || 1, 'aria-hidden': 'true' }),
        h('span', { class: 'plate__top' }, h('span', { class: 'eyebrow', text: 'REL—' + String(i + 1).padStart(2, '0') }), h('b', { 'aria-hidden': 'true', text: '↗' })),
        h('span', { class: 'plate__bottom' },
          h('span', { class: 'plate__name', text: RK.cname(c) }),
          h('span', { class: 'plate__sub', text: RK.csub(c) }),
          h('span', { class: 'plate__cta eyebrow', text: count + ' ' + RK.t('archive.items') + ' · ' + RK.t('archive.open') })));
      a.addEventListener('pointermove', function (e) {
        var r = a.getBoundingClientRect();
        a.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        a.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      });
      wrap.appendChild(a);
    });
    RK.ornaments(wrap);
    RK.reveal(wrap);
  }

  /* ---------- terms accordion ---------- */
  function buildTerms() {
    var list = RK.$('#termsList');
    if (!list) return;
    var open = RK.$$('details[open]', list).map(function (d) { return d.getAttribute('data-q'); });
    list.textContent = '';
    for (var i = 1; i <= 6; i++) {
      if (!RK.t('terms.q' + i) || RK.t('terms.q' + i) === 'terms.q' + i) continue;
      list.appendChild(h('details', { class: 'acc', 'data-q': i, open: open.indexOf(String(i)) >= 0 },
        h('summary', null, h('span', { text: RK.t('terms.q' + i) }), h('i', { 'aria-hidden': 'true' })),
        h('div', { class: 'acc__body' }, h('p', { text: RK.t('terms.a' + i) }))));
    }
  }

  /* ---------- hero parallax ---------- */
  function initHero() {
    var hero = RK.$('.hero'), box = RK.$('.hero__logo-box');
    if (!hero || !box || !RK.finePointer || RK.reduce) return;
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      box.style.setProperty('--px', (((e.clientX - r.left) / r.width - 0.5) * -18).toFixed(1) + 'px');
      box.style.setProperty('--py', (((e.clientY - r.top) / r.height - 0.5) * -12).toFixed(1) + 'px');
    });
    hero.addEventListener('mouseleave', function () { box.style.setProperty('--px', '0px'); box.style.setProperty('--py', '0px'); });
  }

  /* ---------- ash: slow embers drifting up through the hero ---------- */
  function initAsh() {
    var c = RK.$('#ash');
    if (!c || RK.reduce || !c.getContext) return;
    var ctx = c.getContext('2d'), w = 0, hh = 0, parts = [], running = true, visible = true;
    function make(initial) {
      return { x: Math.random() * w, y: initial ? Math.random() * hh : hh + 10, r: Math.random() * 1.3 + 0.3, vy: -(Math.random() * 0.28 + 0.06),
        vx: (Math.random() - 0.5) * 0.12, a: Math.random() * 0.34 + 0.06, t: Math.random() * 6.28, hot: Math.random() < 0.13 };
    }
    function resize() {
      var r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; hh = r.height;
      c.width = Math.round(w * dpr); c.height = Math.round(hh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = RK.clamp(Math.round(w * hh / 16000), 28, 90);
      parts = []; for (var i = 0; i < n; i++) parts.push(make(true));
    }
    function frame() {
      if (!running) return;
      requestAnimationFrame(frame);
      if (!visible) return;
      ctx.clearRect(0, 0, w, hh);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.t += 0.012; p.x += p.vx + Math.sin(p.t) * 0.12; p.y += p.vy;
        if (p.y < -10 || p.x < -10 || p.x > w + 10) parts[i] = make(false);
        ctx.beginPath();
        ctx.fillStyle = p.hot ? 'rgba(216,38,47,' + p.a + ')' : 'rgba(233,227,215,' + p.a + ')';
        ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
    }
    resize();
    window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(c);
    doc.addEventListener('visibilitychange', function () { running = !doc.hidden; if (running) frame(); });
    frame();
  }

  /* endless animations only run while their section is on screen (saves battery and keeps scrolling smooth) */
  function pauseOffscreen() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-off', !en.isIntersecting); });
    }, { threshold: 0 });
    RK.$$('.hero, .marquee').forEach(function (el) { io.observe(el); });
  }

  function renderAll() { buildMarquee(); buildManifest(); buildNew(); buildPlates(); buildTerms(); }

  RK.start(function () {
    renderAll();
    initHero(); initAsh(); pauseOffscreen();
    RK.on('lang', renderAll);
    RK.on('scroll', updateManifest);
    RK.on('cart', function () { /* cards do not depend on the cart */ });
    try { sessionStorage.setItem('rk-intro', '1'); } catch (e) { /* blocked */ }
  });
  RK.run();
})();
