/*
 * RELIKT — product page: gallery + lightbox, size / quantity, add to cart, favourites, ask on Telegram, related items.
 */
(function () {
  'use strict';
  var RK = window.RK, h = RK.h, doc = document;
  var current = null, photoIdx = 0, size = '', qty = 1, lbOpen = false, lbOpener = null;

  function find() {
    var id = new URLSearchParams(location.search).get('id') || '';
    return RK.productById(id);
  }

  /* ---------- lightbox ---------- */
  function lb(open, idx) {
    var el = RK.$('#lightbox');
    if (!current || !current.images.length) return;
    if (open) { lbOpener = doc.activeElement; photoIdx = idx != null ? idx : photoIdx; }
    lbOpen = open;
    el.hidden = !open;
    doc.documentElement.classList.toggle('drawer-open', open);
    if (open) RK.overlay.open(closeLb); else RK.overlay.closed(closeLb);
    if (open) { showLb(); RK.$('#lbClose').focus(); } else { syncGallery('jump'); if (lbOpener && lbOpener.focus) lbOpener.focus(); }
  }
  function closeLb() { lb(false); }
  function showLb() {
    var imgs = current.images;
    RK.$('#lbImg').src = RK.img(imgs[photoIdx]);
    RK.$('#lbImg').alt = RK.pname(current);
    RK.$('#lbCount').textContent = (photoIdx + 1) + ' / ' + imgs.length;
    RK.$('#lbPrev').hidden = RK.$('#lbNext').hidden = imgs.length < 2;
  }
  function step(d) {
    var n = current.images.length;
    photoIdx = (photoIdx + d + n) % n;
    if (lbOpen) showLb();
    syncGallery(true);
  }
  function initLightbox() {
    RK.$('#lbClose').addEventListener('click', function () { lb(false); });
    RK.$('#lbPrev').addEventListener('click', function () { step(-1); });
    RK.$('#lbNext').addEventListener('click', function () { step(1); });
    RK.$('#lightbox').addEventListener('click', function (e) { if (e.target.id === 'lightbox') lb(false); });
    doc.addEventListener('keydown', function (e) {
      if (!lbOpen) return;
      if (e.key === 'Escape') lb(false);
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
    var x0 = null;
    RK.$('#lightbox').addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    RK.$('#lightbox').addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* scroll: true glides the photo strip to the current photo, 'jump' moves it at once, false leaves it (the finger moved it) */
  function syncGallery(scroll) {
    var t = RK.$('#gTrack');
    if (t && scroll) t.scrollTo({ left: photoIdx * t.clientWidth, behavior: scroll === 'jump' || RK.reduce ? 'auto' : 'smooth' });
    RK.$$('.thumb').forEach(function (t, i) { t.classList.toggle('is-on', i === photoIdx); t.setAttribute('aria-current', String(i === photoIdx)); });
    var c = RK.$('#gCount'); if (c) c.textContent = (photoIdx + 1) + ' / ' + current.images.length;
  }

  /* ---------- page ---------- */
  function gallery(p) {
    var imgs = p.images || [];
    if (!imgs.length) return h('div', { class: 'gallery' }, h('div', { class: 'gallery__main gallery__main--empty', 'data-orn': 'sigil', 'data-n': '8' }));
    var nav = imgs.length > 1 ? [
      h('button', { class: 'gallery__nav gallery__nav--prev', type: 'button', 'aria-label': '‹', onclick: function (e) { e.stopPropagation(); step(-1); } }, '‹'),
      h('button', { class: 'gallery__nav gallery__nav--next', type: 'button', 'aria-label': '›', onclick: function (e) { e.stopPropagation(); step(1); } }, '›'),
      h('span', { class: 'gallery__count eyebrow', id: 'gCount', text: '1 / ' + imgs.length })
    ] : null;
    return h('div', { class: 'gallery' },
      imgs.length > 1 ? h('div', { class: 'gallery__thumbs' }, imgs.map(function (u, i) {
        return h('button', { class: 'thumb' + (i === 0 ? ' is-on' : ''), type: 'button', 'aria-label': 'Photo ' + (i + 1), onclick: function () { photoIdx = i; syncGallery(true); } },
          h('img', { src: RK.img(u), alt: '', loading: 'lazy', decoding: 'async' }));
      })) : null,
      h('div', { class: 'gallery__main' }, photoStrip(p, imgs),
        h('span', { class: 'card__badges' }, RK.ui.badges(p)),
        nav));
  }

  /* the photos sit side by side in a strip that snaps photo by photo: swipe it, or use the arrows and thumbnails */
  function photoStrip(p, imgs) {
    var strip = h('div', { class: 'gallery__track', id: 'gTrack' }, imgs.map(function (u, i) {
      return h('div', { class: 'gallery__slide' }, h('img', { src: RK.img(u), alt: i ? '' : RK.pname(p), loading: i ? 'lazy' : 'eager', decoding: 'async', draggable: 'false' }));
    }));
    var ticking = false;
    strip.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var i = Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth));
        if (i !== photoIdx && i >= 0 && i < imgs.length) { photoIdx = i; syncGallery(false); }
      });
    }, { passive: true });
    // a tap opens the photo full screen; a swipe never fires a click
    strip.addEventListener('click', function () { lb(true); });
    return strip;
  }

  function sizeBlock(p) {
    if (p.availability === 'sold' || p.availability === 'reserved') return null;
    var sizes = p.sizes || [];
    if (sizes.length > 1) {
      return h('div', { class: 'opt', id: 'sizeBlock' },
        h('p', { class: 'opt__label eyebrow', text: RK.t('product.size') }),
        h('div', { class: 'sizes', role: 'radiogroup', 'aria-label': RK.t('product.size') }, sizes.map(function (s) {
          return h('button', { class: 'size' + (size === s ? ' is-on' : ''), type: 'button', role: 'radio', 'aria-checked': String(size === s), onclick: function () {
            size = s; RK.$$('.size').forEach(function (b) { var on = b.textContent === s; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', String(on)); });
            RK.$('#sizeBlock').classList.remove('has-error');
          } }, s);
        })),
        h('p', { class: 'opt__err', text: RK.t('product.pickSize') }));
    }
    if (sizes.length === 1) {
      size = sizes[0];
      return h('div', { class: 'opt' }, h('p', { class: 'opt__label eyebrow', text: RK.t('product.size') }), h('p', { class: 'opt__value', text: sizes[0] }));
    }
    return h('div', { class: 'opt' },
      h('label', { class: 'opt__label eyebrow', for: 'sizeNote', text: RK.t('product.size') }),
      h('input', { class: 'opt__input', id: 'sizeNote', type: 'text', maxlength: '24', placeholder: RK.t('product.sizeNote'), value: size, oninput: function (e) { size = e.target.value.trim(); } }),
      h('p', { class: 'opt__hint', text: RK.t('product.sizeAsk') }));
  }

  function reservedNote(p) {
    var d = p.reservedUntil ? new Date(p.reservedUntil) : null;
    var until = d && !isNaN(d) ? d.toLocaleDateString(RK.lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long' }) : '';
    return RK.t(until ? 'product.reservedUntil' : 'product.reservedNote', { date: until });
  }

  function actions(p) {
    var wrap = h('div', { class: 'actions' });
    if (p.availability === 'sold' || p.availability === 'reserved') {
      wrap.appendChild(h('p', { class: 'note', text: p.availability === 'sold' ? RK.t('product.soldNote') : reservedNote(p) }));
      wrap.appendChild(h('a', { class: 'btn btn--ghost', href: RK.tg('channel'), target: '_blank', rel: 'noopener' }, h('span', null, h('span', { text: RK.t('cta.channel') }), ' ', h('b', { 'aria-hidden': 'true', text: '↗' }))));
      return wrap;
    }
    var held = RK.heldUntil(p);
    if (held && !RK.cart.has(p.id)) {
      // someone else is paying for it right now
      wrap.appendChild(h('p', { class: 'note', text: RK.t('product.heldNote', { min: RK.minutesLeft(held) }) }));
      wrap.appendChild(h('div', { class: 'actions__row' }, RK.ui.favButton(p)));
      return wrap;
    }
    var max = RK.cart.max(p);
    var inCartQty = RK.cart.qtyOf(p.id);
    var left = p.availability === 'instock' ? Math.max(0, max - inCartQty) : max;
    var inCart = left === 0;            // all units that can be bought are already in the cart
    qty = Math.max(1, Math.min(qty, left || 1));
    if (left > 1) {
      wrap.appendChild(h('div', { class: 'opt' },
        h('p', { class: 'opt__label eyebrow', text: RK.t('product.qty') }),
        h('div', { class: 'stepper stepper--lg' },
          h('button', { type: 'button', 'aria-label': '−', onclick: function () { qty = Math.max(1, qty - 1); RK.$('#qtyVal').textContent = qty; } }, '−'),
          h('span', { id: 'qtyVal', text: String(qty) }),
          h('button', { type: 'button', 'aria-label': '+', onclick: function () { qty = Math.min(left, qty + 1); RK.$('#qtyVal').textContent = qty; } }, '+'))));
    }
    var addBtn = h('button', { class: 'btn btn--solid btn--lg btn--grow', type: 'button', id: 'addBtn', 'data-magnet': true },
      h('span', { text: inCart ? RK.t('product.inCart') : RK.t('product.add') }));
    addBtn.addEventListener('click', function () {
      if (inCart) { RK.ui.openCart(); return; }
      if ((p.sizes || []).length > 1 && !size) {
        var sb = RK.$('#sizeBlock');
        sb.classList.remove('has-error'); void sb.offsetWidth; sb.classList.add('has-error');
        sb.scrollIntoView({ behavior: RK.reduce ? 'auto' : 'smooth', block: 'center' });
        RK.haptic('error');
        return;
      }
      RK.ui.addToCart(p, size, qty, { open: true });
      qty = 1;
    });
    wrap.appendChild(h('div', { class: 'actions__row' }, addBtn, RK.ui.favButton(p)));
    if (p.availability === 'order') wrap.appendChild(h('p', { class: 'note', text: RK.t('product.orderNote') }));
    else if (inCartQty && !inCart) wrap.appendChild(h('p', { class: 'note', text: RK.t('product.inCartN', { n: inCartQty }) }));
    return wrap;
  }

  function render() {
    var root = RK.$('#pdp');
    root.textContent = '';
    var p = current = find();
    if (!p) {
      doc.title = 'RELIKT';
      root.appendChild(h('div', { class: 'empty' },
        h('div', { class: 'empty__sigil', 'data-orn': 'sigil', 'data-n': '8', 'aria-hidden': 'true' }),
        h('p', { text: RK.t('product.notfound') }),
        h('a', { class: 'btn btn--ghost', href: 'catalog.html' }, h('span', { text: RK.t('cta.catalog') }))));
      RK.ornaments(root); RK.$('#related').hidden = true;
      return;
    }
    doc.title = RK.pname(p) + ' — RELIKT';
    if (!(p.images || [])[photoIdx]) photoIdx = 0;
    var cat = RK.data.categories.filter(function (c) { return c.id === p.category; })[0];
    var url = RK.shareUrl(p);
    var askUrl = RK.tg('manager') + '?text=' + encodeURIComponent(RK.t('product.askText', { name: RK.pname(p), url: url }));

    var facts = [];
    if (p.brand) facts.push([RK.t('product.brand'), p.brand]);
    if (p.condition) facts.push([RK.t('product.condition'), RK.t('cond.' + p.condition)]);

    var info = h('div', { class: 'pdp__info' },
      h('nav', { class: 'crumbs eyebrow', 'aria-label': 'Breadcrumb' },
        h('a', { href: 'catalog.html', text: RK.t('product.back') }),
        cat ? [h('span', { 'aria-hidden': 'true', text: ' / ' }), h('a', { href: 'catalog.html?cat=' + encodeURIComponent(cat.id), text: RK.cname(cat) })] : null),
      p.brand ? h('p', { class: 'eyebrow pdp__brand', text: p.brand }) : null,
      h('h1', { class: 'pdp__name', text: RK.pname(p) }),
      h('div', { class: 'pdp__price' }, RK.ui.price(p), RK.ui.stock(p, 'pdp__stock')),
      RK.pdesc(p) ? h('p', { class: 'pdp__desc', text: RK.pdesc(p) }) : null,
      facts.length ? h('dl', { class: 'facts' }, facts.map(function (f) { return h('div', null, h('dt', { class: 'eyebrow', text: f[0] }), h('dd', { text: f[1] })); })) : null,
      sizeBlock(p),
      actions(p),
      h('div', { class: 'pdp__links' },
        h('a', { class: 'link-inline', href: askUrl, target: '_blank', rel: 'noopener', text: RK.t('product.ask') + ' ↗' }),
        h('button', { class: 'link-inline', type: 'button', onclick: function () { RK.copy(url).then(function () { RK.toast(RK.t('product.copied')); }); }, text: RK.t('product.copy') })),
      h('div', { class: 'pdp__terms' },
        h('p', { class: 'eyebrow', text: RK.t('product.terms') }),
        [1, 2, 5].map(function (i) {
          return h('details', { class: 'acc acc--sm' }, h('summary', null, h('span', { text: RK.t('terms.q' + i) }), h('i', { 'aria-hidden': 'true' })),
            h('div', { class: 'acc__body' }, h('p', { text: RK.t('terms.a' + i) })));
        })));

    root.appendChild(h('a', { class: 'pdp-back', href: 'catalog.html', 'aria-label': RK.lang === 'en' ? 'Back' : 'Назад',
      onclick: function (e) { e.preventDefault(); RK.back('catalog.html'); } }));
    root.appendChild(h('article', { class: 'pdp', 'data-id': p.id }, gallery(p), info));
    if (photoIdx) requestAnimationFrame(function () { syncGallery('jump'); });
    RK.ornaments(root);

    /* related */
    var rel = RK.data.products.filter(function (x) { return x.category === p.category && x.id !== p.id; })
      .sort(function (a, b) { return (a.availability === 'sold') - (b.availability === 'sold') || String(b.createdAt).localeCompare(String(a.createdAt)); }).slice(0, 4);
    var grid = RK.$('#relatedGrid'); grid.textContent = '';
    rel.forEach(function (x) { grid.appendChild(RK.ui.card(x)); });
    RK.$('#related').hidden = !rel.length;
  }

  RK.start(function () {
    initLightbox();
    render();
    RK.on('lang', render);
    RK.on('cart', function () {
      // quantity and button follow the cart (e.g. after removing the piece in the drawer)
      var box = RK.$('.pdp .actions'); if (!box || !current) return;
      box.parentNode.replaceChild(actions(current), box);
    });
  });
  RK.run();
})();
