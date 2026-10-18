/*
 * RELIKT — shop UI shared by every page: product cards, favourites, cart drawer, checkout.
 */
(function () {
  'use strict';
  var RK = window.RK, h = RK.h, doc = document, root = doc.documentElement;
  var ui = RK.ui = {};

  var HEART = '<path d="M12 20.5C6 16 3.2 12.6 3.2 9a4.3 4.3 0 0 1 8.8-1.2A4.3 4.3 0 0 1 20.8 9c0 3.6-2.8 7-8.8 11.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>';
  var PLUS = '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.2" fill="none"/>';

  /* ---------- badges, price ---------- */
  ui.badges = function (p) {
    var out = [];
    if (p.availability === 'sold') out.push(h('span', { class: 'badge badge--sold', text: RK.t('badge.sold') }));
    else if (p.availability === 'reserved') out.push(h('span', { class: 'badge badge--reserved', text: RK.t('badge.reserved') }));
    else {
      var off = saleOff(p);
      if (off) out.push(h('span', { class: 'badge badge--sale', text: '−' + off + '%' }));
      if (RK.heldUntil(p)) out.push(h('span', { class: 'badge badge--reserved', text: RK.t('badge.held') }));
      if (p.availability === 'order') out.push(h('span', { class: 'badge', text: RK.t('badge.order') }));
      if (p.condition) out.push(h('span', { class: 'badge badge--ghost', text: RK.t('cond.' + p.condition) }));
    }
    return out;
  };
  /* "In stock: 3 pcs." / "One of a kind" for pieces that can be bought now */
  ui.stock = function (p, cls) {
    var n = RK.available(p) && !RK.heldUntil(p) ? RK.freeUnits(p) : null;
    if (!n) return null;
    return h('p', { class: cls || 'card__stock', text: n > 1 ? RK.t('product.stockMany', { n: n }) : RK.t('product.stockNote') });
  };
  /* the price before the sale: the full price when a discount is on, else the "old price" typed in the admin panel */
  function wasPrice(p) { return RK.discountOf(p) ? p.price : p.oldPrice && p.price != null && p.oldPrice > p.price ? p.oldPrice : null; }
  function saleOff(p) { var was = wasPrice(p); return was ? RK.discountOf(p) || Math.round((was - p.price) / was * 100) : 0; }
  ui.price = function (p) {
    if (p.availability === 'sold') return h('span', { class: 'price price--sold', text: RK.t('badge.sold') });
    var was = wasPrice(p);
    return h('span', { class: 'price' + (was ? ' price--sale' : '') },
      was ? h('s', { text: RK.money(was) }) : null,
      h('span', { text: RK.money(RK.priceOf(p)) }));
  };

  /* ---------- favourites ---------- */
  ui.favButton = function (p) {
    var b = h('button', { class: 'fav', type: 'button', 'data-fav-id': p.id, 'aria-pressed': 'false' }, RK.svg(HEART, 'fav__icon'));
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      var on = RK.favs.toggle(p.id);
      RK.toast(RK.t(on ? 'toast.fav' : 'toast.unfav'));
    });
    sync(b);
    return b;
  };
  function sync(b) {
    var on = RK.favs.has(b.getAttribute('data-fav-id'));
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', RK.t(on ? 'card.unfav' : 'card.fav'));
  }
  ui.syncFavs = function () { RK.$$('.fav[data-fav-id]').forEach(sync); };
  RK.on('favs', ui.syncFavs);
  RK.on('lang', ui.syncFavs);

  /* ---------- add to cart (shared by card + product page) ---------- */
  ui.addToCart = function (p, size, qty, opts) {
    var r = RK.cart.add(p, size, qty);
    if (r === 'exists') { ui.openCart(); return r; }
    RK.haptic('success');
    RK.toast(RK.t('toast.cart'));
    var btn = RK.$('#cartBtn');
    if (btn) { btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); }
    if (opts && opts.open) ui.openCart();
    return r;
  };

  /* ---------- quantity on a card: pieces with several units in stock ----------
     The chosen number stays while the page is open; the add button puts that many in the cart. */
  var cardQty = {};
  function cardLeft(p) { return p.availability === 'instock' ? Math.max(0, RK.cart.max(p) - RK.cart.qtyOf(p.id)) : 0; }
  function drawCardQty(box, p) {
    var left = cardLeft(p);
    box.textContent = '';
    box.hidden = left < 2;
    if (box.hidden) return;
    var q = cardQty[p.id] = RK.clamp(cardQty[p.id] || 1, 1, left);
    var set = function (v) { cardQty[p.id] = v; RK.haptic('select'); drawCardQty(box, p); };
    box.appendChild(h('button', { type: 'button', 'aria-label': '−', disabled: q <= 1, onclick: function (e) { e.preventDefault(); set(q - 1); } }, '−'));
    box.appendChild(h('span', { text: String(q), 'aria-live': 'polite' }));
    box.appendChild(h('button', { type: 'button', 'aria-label': '+', disabled: q >= left, onclick: function (e) { e.preventDefault(); set(q + 1); } }, '+'));
  }
  // the cart changed (added here, removed in the drawer): every card on the page shows what is still left
  RK.on('cart', function () {
    RK.$$('[data-qty-for]').forEach(function (box) { var p = RK.productById(box.getAttribute('data-qty-for')); if (p) drawCardQty(box, p); });
  });

  /* ---------- product card ---------- */
  ui.card = function (p) {
    var imgs = p.images || [];
    var url = RK.productUrl(p);
    var media = h('a', { class: 'card__media', href: url, tabindex: '-1', 'aria-hidden': 'true' },
      imgs[0] ? h('img', { src: RK.img(imgs[0]), alt: '', loading: 'lazy', decoding: 'async' }) : h('span', { class: 'card__noimg', 'data-orn': 'sigil', 'data-n': '8' }),
      imgs[1] ? h('img', { class: 'card__alt', src: RK.img(imgs[1]), alt: '', loading: 'lazy', decoding: 'async' }) : null,
      h('span', { class: 'card__badges' }, ui.badges(p)));
    var canQuick = RK.available(p) && (p.sizes || []).length <= 1;
    var add = RK.available(p) && !RK.heldUntil(p) ? h('button', {
      class: 'card__add', type: 'button', 'aria-label': RK.t('card.add'),
      onclick: function (e) {
        e.preventDefault();
        if (!canQuick) { location.href = url; return; }
        if (p.availability === 'instock' && RK.cart.max(p) > 1) {
          var left = cardLeft(p);
          if (!left) { ui.openCart(); return; }          // every unit is already in the cart
          var q = RK.clamp(cardQty[p.id] || 1, 1, left);
          cardQty[p.id] = 1;
          added(e.currentTarget, ui.addToCart(p, (p.sizes || [])[0] || '', q));
          return;
        }
        added(e.currentTarget, ui.addToCart(p, (p.sizes || [])[0] || '', 1));
      }
    }, RK.svg(PLUS, 'card__add-icon')) : null;
    var el = h('article', { class: 'card' + (p.availability === 'sold' ? ' is-sold' : p.availability === 'reserved' ? ' is-reserved' : ''), 'data-id': p.id },
      media,
      ui.favButton(p),
      h('div', { class: 'card__info' },
        h('div', { class: 'card__text' },
          p.brand ? h('p', { class: 'eyebrow card__brand', text: p.brand }) : null,
          h('h3', { class: 'card__name' }, h('a', { href: url, text: RK.pname(p) })),
          ui.price(p),
          ui.stock(p),
          add && p.availability === 'instock' && RK.cart.max(p) > 1 ? qtyBox(p) : null),
        add));
    RK.ornaments(el);
    return el;
  };
  // the + pops with a ring once the piece is really in the cart (not when the cart only opens)
  function added(btn, r) {
    if (!btn || r === 'exists') return;
    btn.classList.remove('is-added'); void btn.offsetWidth; btn.classList.add('is-added');
    setTimeout(function () { btn.classList.remove('is-added'); }, 700);
  }
  function qtyBox(p) { var box = h('div', { class: 'stepper stepper--card', 'data-qty-for': p.id, role: 'group', 'aria-label': RK.t('product.qty') }); drawCardQty(box, p); return box; }


  /* ======================================================================
     CART DRAWER: cart -> checkout (contacts, delivery) -> pay (details, receipt) -> done
     Orders go to the manager's Telegram through the Cloudflare Worker set in the admin panel.
     Without it (or outside Telegram without the order secret) the buyer sends a ready-made message instead.
     ====================================================================== */
  var view = 'cart', lastOrder = null, opener = null, drawer, scrim, bodyEl, footEl, titleEl, formState = null, receipt = null, sending = false;

  function S() { return RK.data.settings; }
  function payDetails() { var p = S().payment || {}; return p.details ? p : null; }
  function canSendDirect() { var s = S(); return !!(s.orderWebhook && (RK.tgInitData || s.orderSecret)); }

  function mountDrawer() {
    if (drawer) return;
    scrim = h('div', { class: 'scrim', id: 'scrim', hidden: true, onclick: function () { ui.closeCart(); } });
    titleEl = h('h2', { id: 'drawerTitle', class: 'drawer__title', tabindex: '-1' });
    bodyEl = h('div', { class: 'drawer__body', id: 'drawerBody' });
    footEl = h('div', { class: 'drawer__foot', id: 'drawerFoot' });
    drawer = h('aside', { class: 'drawer', id: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'drawerTitle', hidden: true },
      h('header', { class: 'drawer__head' }, titleEl,
        h('button', { class: 'drawer__close', type: 'button', 'aria-label': 'Close', onclick: function () { ui.closeCart(); } }, '×')),
      bodyEl, footEl);
    doc.body.appendChild(scrim);
    doc.body.appendChild(drawer);
    /* on a phone the keyboard takes half the screen: while it is open over a field, the total and the button
       step aside so the form keeps room to scroll, and come back as soon as the keyboard closes.
       Android can hide the keyboard and leave the field focused, so the keyboard is told by the visible height:
       noticeably shorter than the tallest seen (at this width) means it is open. */
    var touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    var vv = window.visualViewport;
    var visibleH = function () { return vv ? vv.height : window.innerHeight; };
    var fullH = visibleH(), fullW = window.innerWidth;
    var typing = function (el) { return !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|file|hidden)$/.test(el.type))); };
    var syncTyping = function () {
      var hgt = visibleH();
      if (window.innerWidth !== fullW) { fullW = window.innerWidth; fullH = hgt; }   // turned the phone
      if (hgt > fullH) fullH = hgt;
      var keyboard = hgt < fullH * 0.8;
      var field = drawer.contains(doc.activeElement) && typing(doc.activeElement);
      drawer.classList.toggle('is-typing', touch && field && keyboard);
    };
    if (vv) vv.addEventListener('resize', syncTyping);
    window.addEventListener('resize', syncTyping);
    drawer.addEventListener('focusin', function () { setTimeout(syncTyping, 350); });   // the keyboard slides in
    drawer.addEventListener('focusout', function () {
      // moving from one field to the next keeps the keyboard open: wait a moment before bringing the panel back
      setTimeout(syncTyping, 120);
    });
    doc.addEventListener('keydown', function (e) {
      if (drawer.hidden) return;
      if (e.key === 'Escape') ui.closeCart();
      if (e.key === 'Tab') {
        var f = RK.$$('a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select, textarea', drawer).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* Telegram back button inside the drawer: one step back, then close */
  function stepBack() {
    if (sending) return;
    if (view === 'pay') go('checkout');
    else if (view === 'checkout') { formState = collect(); go('cart'); }
    else ui.closeCart();
  }
  function go(v) { view = v; render(true); if (bodyEl) bodyEl.scrollTop = 0; }

  ui.openCart = function (v) {
    mountDrawer();
    opener = doc.activeElement;
    view = v || 'cart';
    scrim.hidden = false; drawer.hidden = false;
    root.classList.add('drawer-open');
    RK.overlay.open(stepBack);
    requestAnimationFrame(function () { scrim.classList.add('on'); drawer.classList.add('on'); });
    render(true);
  };
  ui.closeCart = function () {
    if (!drawer || drawer.hidden || sending) return;
    if (view === 'checkout') formState = collect();
    scrim.classList.remove('on'); drawer.classList.remove('on');
    root.classList.remove('drawer-open');
    RK.overlay.closed(stepBack);
    if (RK.tgConfirmClose) RK.tgConfirmClose(false);
    setTimeout(function () { drawer.hidden = true; scrim.hidden = true; }, 320);
    if (opener && opener.focus) try { opener.focus(); } catch (e) { /* gone */ }
    if (view === 'done') view = 'cart';
  };

  function render(focus) {
    if (!drawer || drawer.hidden) return;
    bodyEl.textContent = ''; footEl.textContent = '';
    var has = RK.cart.lines().length;
    if (view === 'checkout' && has) renderCheckout();
    else if (view === 'pay' && has && formState) renderPay();
    else if (view === 'done' && lastOrder) renderDone();
    else { view = 'cart'; renderCart(); }
    if (RK.tgConfirmClose) RK.tgConfirmClose(view === 'checkout' || view === 'pay');
    if (focus) titleEl.focus();
  }

  function sumList(t, pay) {
    return h('dl', { class: 'sum' },
      h('div', null, h('dt', { text: RK.t('cart.subtotal') }), h('dd', { text: RK.money(t.subtotal) })),
      t.cut ? h('div', null, h('dt', { text: RK.t('cart.discount') + (t.percent ? ' −' + t.percent + '%' : '') }), h('dd', { text: '−' + RK.money(t.cut) })) : null,
      h('div', { class: 'sum__total' }, h('dt', { text: RK.t('cart.total') }), h('dd', { text: RK.money(t.total) })),
      pay != null && pay !== t.total ? h('div', { class: 'sum__pay' }, h('dt', { text: RK.t('pay.now') }), h('dd', { text: RK.money(pay) })) : null);
  }

  function renderCart() {
    var lines = RK.cart.lines();
    titleEl.textContent = RK.t('cart.title') + (lines.length ? ' (' + RK.cart.count() + ')' : '');
    if (!lines.length) {
      bodyEl.appendChild(h('div', { class: 'drawer__empty' },
        RK.svg('<path d="M5 8.5h14l-1 11.5H6L5 8.5z" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" fill="none" stroke="currentColor" stroke-width="0.8"/>', 'drawer__empty-icon'),
        h('p', { text: RK.t('cart.empty') }),
        h('a', { class: 'btn btn--ghost', href: 'catalog.html', onclick: function () { ui.closeCart(); } }, h('span', { text: RK.t('cta.catalog') }))));
      return;
    }
    var list = h('ul', { class: 'lines' });
    lines.forEach(function (l) {
      var p = l.product, it = l.item, max = RK.cart.max(p);
      list.appendChild(h('li', { class: 'line' },
        h('a', { class: 'line__img', href: RK.productUrl(p), onclick: function () { ui.closeCart(); } },
          p.images && p.images[0] ? h('img', { src: RK.img(p.images[0]), alt: '' }) : null),
        h('div', { class: 'line__info' },
          h('a', { class: 'line__name', href: RK.productUrl(p), text: RK.pname(p), onclick: function () { ui.closeCart(); } }),
          it.size ? h('p', { class: 'line__meta', text: RK.t('product.size') + ': ' + it.size }) : null,
          RK.heldUntil(p) ? h('p', { class: 'line__meta line__meta--warn', text: RK.t('cart.heldLine', { min: RK.minutesLeft(RK.heldUntil(p)) }) }) : null,
          h('div', { class: 'line__row' },
            max > 1 ? stepper(l.idx, it.qty, max) : h('span', { class: 'line__meta', text: '1 ×' }),
            h('span', { class: 'price', text: RK.money(RK.priceOf(p) * it.qty) }))),
        h('button', { class: 'line__rm', type: 'button', 'aria-label': RK.t('cart.remove') + ': ' + RK.pname(p), onclick: function () { RK.haptic('light'); RK.cart.remove(l.idx); } }, '×')));
    });
    bodyEl.appendChild(list);

    var discounts = (S().discounts || []).filter(function (d) { return d.percent > 0; });
    if (discounts.length) {
      var picked = RK.cart.discounts();
      bodyEl.appendChild(h('fieldset', { class: 'disc' },
        h('legend', { class: 'eyebrow', text: RK.t('cart.discounts') }),
        discounts.map(function (d) {
          return h('label', { class: 'check' },
            h('input', { type: 'checkbox', checked: picked.indexOf(d.id) >= 0, onchange: function (e) {
              var cur = RK.cart.discounts().filter(function (x) { return x !== d.id; });
              if (e.target.checked) cur.push(d.id);
              RK.haptic('select');
              RK.cart.setDiscounts(cur);
            } }),
            h('span', { class: 'check__box', 'aria-hidden': 'true' }),
            h('span', { text: RK.dname(d) + ' · −' + d.percent + '%' }));
        })));
    }
    if ((S().promos || []).some(function (x) { return x.active !== false; })) bodyEl.appendChild(promoBox());

    footEl.appendChild(sumList(RK.cart.totals()));
    footEl.appendChild(h('button', { class: 'btn btn--solid btn--block', type: 'button', onclick: function () { go('checkout'); } },
      h('span', null, h('span', { text: RK.t('cart.checkout') }), ' ', h('b', { 'aria-hidden': 'true', text: '→' }))));
    footEl.appendChild(h('p', { class: 'drawer__note', text: RK.t('cart.note') }));
  }

  function promoBox() {
    var promo = RK.cart.promo(), typed = RK.cart.promoCode();
    var box = h('div', { class: 'promo' }, h('p', { class: 'eyebrow', text: RK.t('cart.promo') }));
    if (promo) {
      box.appendChild(h('div', { class: 'promo__on' },
        h('span', { class: 'promo__code', text: promo.code }),
        h('span', { class: 'promo__val', text: promo.type === 'percent' ? '−' + promo.value + '%' : '−' + RK.money(promo.value) }),
        h('button', { class: 'line__rm', type: 'button', 'aria-label': RK.t('cart.promoRemove'), onclick: function () { RK.cart.setPromo(''); } }, '×')));
      return box;
    }
    var input = h('input', { type: 'text', maxlength: '24', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': RK.t('cart.promo'), placeholder: RK.t('cart.promoPh') });
    // a code saved earlier that was switched off in the meantime
    var msg = h('p', { class: 'field__err', role: 'alert', text: typed ? RK.t('cart.promoBad') : '' });
    var apply = function () {
      var code = input.value.trim().toUpperCase();
      if (!code) return;
      var ok = (S().promos || []).some(function (x) { return x.active !== false && x.code === code; });
      if (!ok) { msg.textContent = RK.t('cart.promoBad'); RK.haptic('error'); return; }
      RK.haptic('success');
      RK.cart.setPromo(code);
      RK.toast(RK.t('cart.promoOk'));
    };
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
    box.appendChild(h('div', { class: 'promo__row' }, input, h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: apply }, h('span', { text: RK.t('cart.promoApply') }))));
    box.appendChild(msg);
    return box;
  }

  function stepper(idx, qty, max) {
    return h('div', { class: 'stepper' },
      h('button', { type: 'button', 'aria-label': '−', disabled: qty <= 1, onclick: function () { RK.haptic('light'); RK.cart.setQty(idx, qty - 1); } }, '−'),
      h('span', { text: String(qty) }),
      h('button', { type: 'button', 'aria-label': '+', disabled: qty >= max, onclick: function () { RK.haptic('light'); RK.cart.setQty(idx, qty + 1); } }, '+'));
  }

  /* ----- checkout: who and where ----- */
  function field(id, label, attrs, hint) {
    return h('div', { class: 'field' },
      h('label', { for: id, text: label }),
      h(attrs.tag || 'input', Object.assign({ id: id, name: id }, attrs.attrs)),
      hint ? h('p', { class: 'field__hint', id: id + 'Hint', text: hint }) : null,
      h('p', { class: 'field__err', id: id + 'Err', role: 'alert' }));
  }

  /* what we already know: the last order on this device, then the Telegram profile */
  function known() {
    var saved = RK.store.get('rk-customer', {}) || {}, u = RK.tgUser;
    if (u) {
      if (!saved.name) saved.name = [u.first_name, u.last_name].filter(Boolean).join(' ');
      if (!saved.contact && u.username) saved.contact = '@' + u.username;
    }
    return saved;
  }

  var REQUIRED = ['name', 'contact', 'phone', 'city', 'address'];

  function renderCheckout() {
    titleEl.textContent = RK.t('checkout.title');
    var s = S(), t = RK.cart.totals();
    var saved = known(), st = formState || {};
    var val = function (k) { return st[k] != null ? st[k] : saved[k] || ''; };

    var delivery = h('select', { id: 'f_delivery', name: 'delivery' },
      h('option', { value: '', text: RK.t('checkout.deliveryAny') }),
      (s.delivery || []).map(function (d) { return h('option', { value: RK.dname(d), text: RK.dname(d), selected: val('delivery') === RK.dname(d) }); }));

    var pay = st.payment === 'reserve' && s.reservePercent > 0 ? 'reserve' : 'full';
    var form = h('form', { class: 'form', id: 'checkoutForm', novalidate: true, autocomplete: 'on' },
      field('f_name', RK.t('checkout.name') + ' *', { attrs: { type: 'text', autocomplete: 'name', maxlength: '80', value: val('name'), required: true } }),
      field('f_contact', RK.t('checkout.contact') + ' *', { attrs: { type: 'text', autocomplete: 'off', maxlength: '80', value: val('contact'), placeholder: '@username', required: true, 'aria-describedby': 'f_contactHint' } }, RK.t('checkout.contactHint')),
      field('f_phone', RK.t('checkout.phone') + ' *', { attrs: { type: 'tel', inputmode: 'tel', autocomplete: 'tel', value: val('phone') ? formatPhone(val('phone')) : '', placeholder: '+7 900 000-00-00', required: true } }),
      field('f_city', RK.t('checkout.city') + ' *', { attrs: { type: 'text', autocomplete: 'address-level2', maxlength: '80', value: val('city'), required: true } }),
      h('div', { class: 'field' }, h('label', { for: 'f_delivery', text: RK.t('checkout.delivery') }), delivery),
      field('f_address', RK.t('checkout.address') + ' *', { tag: 'textarea', attrs: { rows: '2', autocomplete: 'street-address', maxlength: '300', text: val('address'), placeholder: RK.t('checkout.addressPh'), required: true } }),
      field('f_comment', RK.t('checkout.comment'), { tag: 'textarea', attrs: { rows: '2', maxlength: '600', text: val('comment') } }),
      h('fieldset', { class: 'pay' },
        h('legend', { class: 'eyebrow', text: RK.t('checkout.payment') }),
        radio('full', RK.t('checkout.payFull') + ' · ' + RK.money(t.total), pay === 'full'),
        s.reservePercent > 0 ? radio('reserve', RK.t('checkout.payReserve', { amount: RK.money(t.deposit) }), pay === 'reserve') : null),
      h('p', { class: 'form__error', id: 'formError', role: 'alert' }));
    form.addEventListener('submit', next);
    phoneMask(RK.$('#f_phone', form));
    form.addEventListener('input', function () { formState = collect(); });
    bodyEl.appendChild(h('button', { class: 'back', type: 'button', onclick: stepBack }, '← ' + RK.t('checkout.back')));
    bodyEl.appendChild(form);

    footEl.appendChild(sumList(t));
    footEl.appendChild(h('button', { class: 'btn btn--solid btn--block', type: 'submit', form: 'checkoutForm', id: 'submitBtn' },
      h('span', { text: RK.t(payDetails() ? 'checkout.toPay' : 'checkout.submit') + ' →' })));
  }

  /* phone: always +7 and ten digits, shown as +7 900 000-00-00; letters and symbols never get in */
  function formatPhone(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.charAt(0) === '8') d = '7' + d.slice(1);       // 8 900… is the same number as +7 900…
    else if (d.charAt(0) !== '7') d = '7' + d;
    var r = d.slice(1, 11);
    return '+7' + (r ? ' ' + r.slice(0, 3) : '') + (r.length > 3 ? ' ' + r.slice(3, 6) : '') + (r.length > 6 ? '-' + r.slice(6, 8) : '') + (r.length > 8 ? '-' + r.slice(8, 10) : '');
  }
  function phoneMask(el) {
    if (!el) return;
    var caretAfterDigits = function (n) {
      var i = 0, seen = 0;
      while (i < el.value.length && seen < n) { if (/\d/.test(el.value.charAt(i))) seen++; i++; }
      try { el.setSelectionRange(i, i); } catch (e) { /* not focused */ }
    };
    var fix = function () {
      var pos = el.selectionStart == null ? el.value.length : el.selectionStart;
      var atEnd = pos >= el.value.length;
      var digitsBefore = el.value.slice(0, pos).replace(/\D/g, '').length;
      var out = formatPhone(el.value);
      if (out.length <= 2) out = '+7 ';
      if (out !== el.value) el.value = out;
      if (atEnd) { try { el.setSelectionRange(out.length, out.length); } catch (e) { /* not focused */ } }
      else caretAfterDigits(Math.max(1, digitsBefore));
    };
    el.addEventListener('focus', function () { if (!el.value) { el.value = '+7 '; setTimeout(function () { try { el.setSelectionRange(3, 3); } catch (e) { /* gone */ } }, 0); } });
    el.addEventListener('input', fix);
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Backspace' || el.selectionStart !== el.selectionEnd) return;
      var p = el.selectionStart, v = el.value;
      // the +7 stays; a space or dash left of the caret takes the digit before it with it
      if (p <= 3) { e.preventDefault(); return; }
      if (/\d/.test(v.charAt(p - 1))) return;
      e.preventDefault();
      var q = p - 1;
      while (q > 3 && !/\d/.test(v.charAt(q - 1))) q--;
      if (q <= 3) return;
      var digitsBefore = v.slice(0, q - 1).replace(/\D/g, '').length;
      el.value = formatPhone(v.slice(0, q - 1) + v.slice(q));
      caretAfterDigits(digitsBefore);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  function radio(value, label, checked) {
    return h('label', { class: 'check' },
      h('input', { type: 'radio', name: 'payment', value: value, checked: checked }),
      h('span', { class: 'check__box check__box--round', 'aria-hidden': 'true' }),
      h('span', { text: label }));
  }

  /* reads the checkout form; keeps the bank typed on the pay step */
  function collect() {
    var prev = formState || {};
    if (!doc.getElementById('f_name')) return prev;
    var g = function (id) { var el = doc.getElementById(id); return el ? el.value.trim() : ''; };
    var pay = RK.$('input[name="payment"]:checked', drawer);
    return { name: g('f_name'), contact: g('f_contact'), phone: g('f_phone'), city: g('f_city'), delivery: g('f_delivery'), address: g('f_address'), comment: g('f_comment'),
      payment: pay ? pay.value : 'full', bank: prev.bank || '' };
  }

  function setErr(id, msg) {
    var e = doc.getElementById(id + 'Err'), i = doc.getElementById(id);
    if (e) e.textContent = msg || '';
    if (i) i.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function next(e) {
    e.preventDefault();
    var c = formState = collect();
    var bad = false;
    REQUIRED.forEach(function (k) {
      var short = k === 'phone' ? c.phone.replace(/\D/g, '').length !== 11 : c[k].length < 2;
      setErr('f_' + k, short ? RK.t(k === 'phone' && c.phone.replace(/\D/g, '').length > 1 ? 'checkout.phoneBad' : 'checkout.required') : '');
      if (short) bad = true;
    });
    if (bad) { RK.haptic('error'); var first = RK.$('[aria-invalid="true"]', drawer); if (first) first.focus(); return; }
    RK.store.set('rk-customer', { name: c.name, contact: c.contact, phone: c.phone, city: c.city, delivery: c.delivery, address: c.address });
    if (payDetails() && canSendDirect()) holdThenPay(doc.getElementById('submitBtn'), doc.getElementById('formError'));
    else if (payDetails()) go('pay');
    else send(doc.getElementById('submitBtn'), doc.getElementById('formError'));
  }

  /* ----- holding the pieces while the buyer pays ----- */
  var HOLD = null, holdTimer = null;
  function savedHold() { var x = RK.store.get('rk-hold', null); return x && x.token && Date.parse(x.until) > Date.now() ? x : null; }
  function requestHold() {
    var prev = savedHold();
    return fetch(new URL('/hold', workerUrl()).href, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: S().orderSecret || '', initData: RK.tgInitData || '', token: prev ? prev.token : '',
        items: RK.cart.lines().map(function (l) { return { id: l.product.id, qty: l.item.qty, size: l.item.size }; }) })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.ok && j.ok) { HOLD = { token: j.token, key: j.key, until: j.until }; RK.store.set('rk-hold', HOLD); return HOLD; }
        // the Worker in Cloudflare is still the version without holds: go on as before
        if (j.error === 'not_found' || j.error === 'catalog_not_configured') { HOLD = null; return null; }
        var e = new Error(j.error || 'HTTP ' + r.status); e.code = j.error; e.until = j.until; throw e;
      });
    }, function () { var e = new Error('offline'); e.code = 'offline'; throw e; });
  }
  function holdError(er) {
    if (er.code === 'held') return RK.t('checkout.err.held', { min: RK.minutesLeft(Date.parse(er.until) || Date.now()) });
    if (er.code === 'unavailable') return RK.t('checkout.err.sold');
    return RK.t('checkout.err.offline');
  }
  function holdThenPay(btn, errEl) {
    if (sending) return;
    sending = true;
    var label = btn && btn.querySelector('span'), was = label && label.textContent;
    if (btn) btn.disabled = true;
    if (label) label.textContent = RK.t('pay.holding');
    if (errEl) errEl.textContent = '';
    requestHold().then(function () { sending = false; go('pay'); }, function (er) {
      sending = false; RK.haptic('error');
      if (btn) btn.disabled = false;
      if (label) label.textContent = was;
      if (errEl) errEl.textContent = holdError(er);
      if (er.code === 'unavailable') RK.load().then(function () { RK.cart.prune(); });
    });
  }
  /* the countdown on the payment step; at zero the buyer holds the pieces again before paying */
  function holdBar() {
    clearInterval(holdTimer); holdTimer = null;
    if (!HOLD) return null;
    var bar = h('div', { class: 'holdbar', role: 'status' });
    var tick = function () {
      var left = Date.parse(HOLD.until) - Date.now();
      if (!bar.isConnected && holdTimer) { clearInterval(holdTimer); return; }
      if (left > 0) {
        var m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60;
        bar.className = 'holdbar';
        bar.textContent = RK.t(RK.cart.lines().length > 1 ? 'pay.heldMany' : 'pay.held', { time: m + ':' + (s < 10 ? '0' : '') + s });
        return;
      }
      clearInterval(holdTimer);
      bar.className = 'holdbar holdbar--over';
      bar.textContent = '';
      var again = h('button', { class: 'link-inline', type: 'button' }, RK.t('pay.rehold'));
      again.addEventListener('click', function () {
        again.disabled = true;
        requestHold().then(function () { render(false); }, function (er) { again.disabled = false; bar.firstChild.textContent = holdError(er) + ' '; });
      });
      bar.appendChild(h('span', { text: RK.t('pay.expired') + ' ' }));
      bar.appendChild(again);
    };
    tick();
    holdTimer = setInterval(tick, 1000);
    return bar;
  }

  /* ----- pay: details to transfer to, the bank and the receipt ----- */
  function renderPay() {
    titleEl.textContent = RK.t('pay.title');
    var t = RK.cart.totals(), c = formState, p = payDetails();
    var amount = c.payment === 'reserve' ? t.deposit : t.total;
    var direct = canSendDirect();
    if (direct && !HOLD) HOLD = savedHold();

    var row = function (label, value, copyable) {
      return h('div', { class: 'paycard__row' },
        h('dt', { class: 'eyebrow', text: label }),
        h('dd', null, h('span', { text: value }),
          copyable ? h('button', { class: 'paycard__copy', type: 'button', onclick: function () { RK.copy(value).then(function () { RK.haptic('success'); RK.toast(RK.t('pay.copied')); }); } }, RK.t('pay.copy')) : null));
    };
    bodyEl.appendChild(h('button', { class: 'back', type: 'button', onclick: stepBack }, '← ' + RK.t('pay.back')));
    if (direct) { var bar = holdBar(); if (bar) bodyEl.appendChild(bar); }
    bodyEl.appendChild(h('div', { class: 'paycard' },
      h('p', { class: 'eyebrow', text: RK.t(c.payment === 'reserve' ? 'pay.leadReserve' : 'pay.leadFull') }),
      h('p', { class: 'paycard__amount', text: RK.money(amount) }),
      h('dl', { class: 'paycard__list' },
        p.bank ? row(RK.t('pay.bank'), p.bank) : null,
        p.recipient ? row(RK.t('pay.recipient'), p.recipient) : null,
        row(RK.t('pay.details'), p.details, true),
        row(RK.t('pay.sum'), String(amount), true)),
      p.note ? h('p', { class: 'paycard__note', text: p.note }) : null));

    var form = h('form', { class: 'form', id: 'payForm', novalidate: true });
    if (direct) {
      var bankInput = h('input', { type: 'text', id: 'f_bank', maxlength: '60', autocomplete: 'off', placeholder: RK.t('pay.fromBankPh'), value: c.bank || '' });
      bankInput.addEventListener('input', function () { formState.bank = bankInput.value.trim(); });
      var file = h('input', { type: 'file', id: 'f_receipt', accept: 'image/*,application/pdf', class: 'receipt__input' });
      var fileName = h('span', { class: 'receipt__name', text: receipt ? receipt.name : RK.t('pay.receiptPick') });
      var label = h('label', { class: 'receipt' + (receipt ? ' is-set' : ''), for: 'f_receipt' },
        RK.svg('<path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5" fill="none" stroke="currentColor" stroke-width="1.2"/>', 'receipt__icon'), fileName);
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        setErr('f_receipt', '');
        if (!f) return;
        if (f.size > 6 * 1024 * 1024) { receipt = null; label.classList.remove('is-set'); fileName.textContent = RK.t('pay.receiptPick'); setErr('f_receipt', RK.t('pay.receiptBig')); RK.haptic('error'); return; }
        var r = new FileReader();
        r.onload = function () { receipt = { name: f.name.slice(0, 100), mime: f.type || 'application/octet-stream', data: r.result }; fileName.textContent = receipt.name; label.classList.add('is-set'); RK.haptic('light'); };
        r.readAsDataURL(f);
      });
      form.appendChild(h('div', { class: 'field' }, h('label', { for: 'f_bank', text: RK.t('pay.fromBank') + ' *' }), bankInput, h('p', { class: 'field__err', id: 'f_bankErr', role: 'alert' })));
      form.appendChild(h('div', { class: 'field' }, h('span', { class: 'field__label', text: RK.t('pay.receipt') + ' *' }), label, file, h('p', { class: 'field__err', id: 'f_receiptErr', role: 'alert' })));
    } else {
      form.appendChild(h('p', { class: 'field__hint', text: RK.t('pay.manualHint') }));
    }
    form.appendChild(h('p', { class: 'form__error', id: 'payError', role: 'alert' }));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (direct) {
        var bank = bankInput.value.trim();
        formState.bank = bank;
        setErr('f_bank', bank ? '' : RK.t('checkout.required'));
        setErr('f_receipt', receipt ? '' : RK.t('pay.receiptNeed'));
        if (!bank || !receipt) { RK.haptic('error'); return; }
      }
      send(doc.getElementById('submitBtn'), doc.getElementById('payError'));
    });
    bodyEl.appendChild(form);

    footEl.appendChild(sumList(t, amount));
    footEl.appendChild(h('button', { class: 'btn btn--solid btn--block', type: 'submit', form: 'payForm', id: 'submitBtn' },
      h('span', { text: RK.t(direct ? 'pay.submit' : 'checkout.submit') })));
  }

  /* ----- the message for the manager (always in Russian) ----- */
  function orderText(o) {
    var money = RK.money, s = S(), c = o.customer;
    var L = ['🛒 Заказ ' + o.number + (RK.tgApp ? ' · мини-апп' : ' · сайт'), ''];
    o.items.forEach(function (it, i) {
      L.push((i + 1) + '. ' + it.name + (it.size ? ' (' + it.size + ')' : '') + (it.qty > 1 ? ' × ' + it.qty : '') + ' — ' + money(it.price * it.qty) + (it.order ? ' · под заказ' : ''));
      L.push('   ' + it.url);
    });
    L.push('', 'Сумма: ' + money(o.subtotal));
    if (o.discounts.length) L.push('Скидки: ' + o.discounts.join(', ') + ' (проверить)');
    if (o.promo) L.push('Промокод: ' + o.promo);
    if (o.cut) L.push('Скидка всего: −' + money(o.cut));
    L.push('Итого: ' + money(o.total));
    L.push(o.payment === 'reserve' ? 'Бронь на ' + s.reserveDays + ' дн.: задаток ' + s.reservePercent + '% — ' + money(o.pay) : 'Оплата: полная предоплата — ' + money(o.pay));
    if (o.bank) L.push('Банк плательщика: ' + o.bank);
    if (o.receipt) L.push('Чек: прикреплён ниже');
    L.push('', 'Имя: ' + c.name, 'Telegram: ' + c.contact, 'Телефон: ' + c.phone, 'Город: ' + c.city);
    if (c.delivery) L.push('Доставка: ' + c.delivery);
    L.push('Пункт выдачи: ' + c.address);
    if (c.comment) L.push('Комментарий: ' + c.comment);
    return L.join('\n');
  }

  function buildOrder() {
    var t = RK.cart.totals(), c = formState;
    return {
      number: 'RK-' + Date.now().toString(36).slice(-5).toUpperCase(),
      items: RK.cart.lines().map(function (l) {
        var off = RK.discountOf(l.product);   // the manager sees the sale next to the name
        return { id: l.product.id, name: l.product.ru + (off ? ' (скидка −' + off + '%)' : ''), size: l.item.size, qty: l.item.qty, price: RK.priceOf(l.product),
          order: l.product.availability === 'order', url: RK.shareUrl(l.product), image: (l.product.images || [])[0] || '' };
      }),
      subtotal: t.subtotal, cut: t.cut, total: t.total,
      discounts: t.picked.map(function (d) { return d.ru + ' −' + d.percent + '%'; }),
      promo: t.promo ? t.promo.code + ' (' + (t.promo.type === 'percent' ? '−' + t.promo.value + '%' : '−' + RK.money(t.promo.value)) + ')' : '',
      payment: c.payment, pay: c.payment === 'reserve' ? t.deposit : t.total,
      bank: payDetails() && canSendDirect() ? c.bank : '', receipt: !!receipt && canSendDirect(),
      customer: { name: c.name, contact: c.contact, phone: c.phone, city: c.city, delivery: c.delivery, address: c.address, comment: c.comment }
    };
  }

  function workerUrl() {
    var u = new URL(S().orderWebhook);
    if (u.pathname === '' || u.pathname === '/') u.pathname = '/order';
    return u.href;
  }

  function send(btn, errEl) {
    if (sending) return;
    var o = buildOrder();
    o.text = orderText(o);
    o.chatUrl = RK.tg('manager') + '?text=' + encodeURIComponent(o.text.slice(0, 3000));
    if (!canSendDirect()) { finish(o, false); return; }

    sending = true;
    var label = btn && btn.querySelector('span'), was = label && label.textContent;
    if (btn) btn.disabled = true;
    if (label) label.textContent = RK.t('checkout.sending');
    if (errEl) errEl.textContent = '';
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 45000);
    fetch(workerUrl(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({
        secret: S().orderSecret || '', initData: RK.tgInitData || '', text: o.text, hold: HOLD ? HOLD.token : '',
        receipt: o.receipt ? receipt.data : '', name: o.receipt ? receipt.name : '', mime: o.receipt ? receipt.mime : '',
        items: o.items.map(function (it) { return { id: it.id, qty: it.qty, size: it.size }; }),
        // the same order as data: the Worker keeps it for the Orders tab and marks the pieces sold / reserved
        order: {
          number: o.number, payment: o.payment, pay: o.pay, subtotal: o.subtotal, cut: o.cut, total: o.total,
          discounts: o.discounts, promo: o.promo, bank: o.bank, receipt: o.receipt, customer: o.customer, lang: RK.lang, source: RK.tgApp ? 'miniapp' : 'site',
          items: o.items.map(function (it) { return { id: it.id, name: it.name, size: it.size, qty: it.qty, price: it.price, order: it.order, image: it.image }; })
        }
      })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) { var e = new Error(j.error || 'HTTP ' + r.status); e.code = j.error; e.until = j.until; throw e; } return j; });
    }).then(function (j) {
      sending = false; clearTimeout(timer);
      o.problem = j.problem === 'unavailable';
      finish(o, true);
    }).catch(function (er) {
      sending = false; clearTimeout(timer);
      console.error('[RELIKT] order not sent:', er);
      RK.haptic('error');
      if (btn) btn.disabled = false;
      if (label) label.textContent = was;
      // someone was faster: the Worker refused because a piece is already sold or reserved
      if (er.code === 'unavailable' || er.code === 'held') {
        if (errEl) errEl.textContent = er.code === 'held' ? holdError(er) : RK.t('checkout.err.sold');
        RK.load().then(function () { RK.cart.prune(); setTimeout(function () { go('cart'); }, 2500); });
        return;
      }
      if (errEl) {
        errEl.textContent = RK.t('checkout.err.generic') + ' ';
        errEl.appendChild(h('button', { class: 'link-inline', type: 'button', onclick: function () { o.receipt = false; o.bank = ''; o.text = orderText(o); o.chatUrl = RK.tg('manager') + '?text=' + encodeURIComponent(o.text.slice(0, 3000)); finish(o, false); } }, RK.t('checkout.err.manual')));
      }
    });
  }

  function finish(o, sent) {
    o.sent = sent;
    HOLD = null; clearInterval(holdTimer); RK.store.set('rk-hold', null);
    lastOrder = o;
    RK.haptic('success');
    RK.cart.clear(); RK.cart.setPromo('');
    formState = null; receipt = null;
    go('done');
  }

  function renderDone() {
    titleEl.textContent = RK.t('done.title');
    var o = lastOrder;
    bodyEl.appendChild(h('div', { class: 'done' },
      h('div', { class: 'done__mark', 'data-orn': 'sigil', 'data-n': '8' }),
      h('p', { class: 'eyebrow', text: RK.t('done.number') }),
      h('p', { class: 'done__num', text: o.number }),
      h('p', { class: 'done__text' + (o.problem ? ' done__text--warn' : ''), text: RK.t(o.problem ? 'done.problem' : o.sent ? 'done.sent' : 'done.text') }),
      o.sent ? null : h('pre', { class: 'done__summary', text: o.text })));
    RK.ornaments(bodyEl);
    // after an automatic order the chat opens with a short note, so the buyer never has to copy the number
    var followUp = RK.tg('manager') + '?text=' + encodeURIComponent(RK.t('done.msg', { number: o.number, items: o.items.map(function (it) { return it.name + (it.qty > 1 ? ' × ' + it.qty : ''); }).join(', '), amount: RK.money(o.pay) }));
    footEl.appendChild(h('a', { class: 'btn ' + (o.sent ? 'btn--ghost' : 'btn--solid') + ' btn--block', href: o.sent ? followUp : o.chatUrl, target: '_blank', rel: 'noopener' },
      h('span', null, h('span', { text: RK.t('done.open') }), ' ', h('b', { 'aria-hidden': 'true', text: '↗' }))));
    if (!o.sent) {
      var copyBtn = h('button', { class: 'btn btn--ghost btn--block', type: 'button' }, h('span', { text: RK.t('done.copy') }));
      copyBtn.addEventListener('click', function () { RK.copy(o.text).then(function () { RK.toast(RK.t('done.copied')); }); });
      footEl.appendChild(copyBtn);
    }
    // the order went through the Worker from inside Telegram: it is in «Мои заказы» right away
    if (o.sent && RK.tgInitData) footEl.appendChild(h('a', { class: 'btn btn--ghost btn--block', href: 'account.html' }, h('span', { text: RK.t('done.track') })));
    footEl.appendChild(h('button', { class: 'back back--center', type: 'button', onclick: function () { ui.closeCart(); } }, RK.t('done.close')));
  }

  /* keep the open drawer in sync */
  RK.on('cart', function () { if (drawer && !drawer.hidden && view === 'cart') render(false); });
  RK.on('lang', function () { if (drawer && !drawer.hidden && view !== 'done') { if (view === 'checkout') formState = collect(); render(false); } });

  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#cartBtn');
    if (b) ui.openCart('cart');
  });
})();
