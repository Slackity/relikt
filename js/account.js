/*
 * RELIKT — «Мои заказы»: the buyer's orders with their status, contents and tracking number.
 * Inside Telegram only: the Mini App's signed initData goes to the order Worker (POST /my/orders), which checks the
 * signature and answers with this buyer's orders and nothing else. Outside Telegram the page explains why and links
 * to the Mini App. Orders are not kept on the device: every visit asks the Worker again.
 */
(function () {
  'use strict';
  var RK = window.RK, h = RK.h, doc = document;
  var STEPS = ['placed', 'paid', 'shipped', 'done'];
  // how far along the line each status is; new / reserved wait for the manager on the second step
  var REACHED = { new: 1, reserved: 1, paid: 2, shipped: 3, done: 4 };
  var tries = 0, shown = null;   // the orders on screen, in memory only

  function worker() { var w = RK.data && RK.data.settings.orderWebhook; return w ? String(w).replace(/\/+$/, '') : ''; }
  function day(iso, plusDays) {
    var d = new Date(iso); if (isNaN(d)) return '';
    if (plusDays) d.setDate(d.getDate() + plusDays);
    var opts = { day: 'numeric', month: 'long' };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';   // "21 октября"; the year only when it is not this one
    return d.toLocaleDateString(RK.lang === 'en' ? 'en-GB' : 'ru-RU', opts);
  }
  function box() { return RK.$('#orders'); }

  function notice(text, action) {
    var b = box(); b.textContent = '';
    b.appendChild(h('div', { class: 'empty acc-empty' },
      h('div', { class: 'empty__sigil', 'data-orn': 'sigil', 'data-n': '8', 'aria-hidden': 'true' }),
      h('p', { text: text }), action || null));
    RK.ornaments(b);
  }
  function catalogBtn() { return h('a', { class: 'btn btn--ghost', href: 'catalog.html' }, h('span', { text: RK.t('cta.catalog') })); }

  function head() {
    var u = RK.tgUser;
    RK.$('#accLead').textContent = u ? RK.t('acc.hello', { name: u.first_name || (u.username ? '@' + u.username : '') }) : RK.t('acc.lead');
  }

  function load() {
    head();
    if (!RK.tgInitData) {
      // the Telegram library may still be on its way on a slow connection
      if (doc.documentElement.classList.contains('in-tg') && tries++ < 8) { setTimeout(load, 400); return; }
      var app = RK.data.settings.miniAppUrl;
      notice(RK.t('acc.outside'), app ? h('a', { class: 'btn btn--solid', href: app + '?startapp=account', target: '_blank', rel: 'noopener' },
        h('span', null, h('span', { text: RK.t('acc.openTg') }), ' ', h('b', { 'aria-hidden': 'true', text: '↗' }))) : null);
      return;
    }
    if (!worker()) { notice(RK.t('acc.error')); return; }
    notice(RK.t('acc.loading'));
    fetch(worker() + '/my/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ initData: RK.tgInitData }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw j; return j; }); })
      .then(function (j) { draw(j.orders || []); }, function (e) {
        var again = h('button', { class: 'btn btn--ghost', type: 'button', onclick: load }, h('span', { text: RK.t('acc.retry') }));
        notice(RK.t(e && e.error === 'forbidden' ? 'acc.expired' : 'acc.error'), again);
      });
  }

  function draw(orders) {
    shown = orders;
    if (!orders.length) { notice(RK.t('acc.empty'), catalogBtn()); return; }
    var b = box(); b.textContent = '';
    orders.forEach(function (o) { b.appendChild(card(o)); });
  }

  function steps(o) {
    var reached = REACHED[o.status] || 0;
    return h('ol', { class: 'acc-steps', 'aria-label': RK.t('acc.progress') }, STEPS.map(function (s, i) {
      var cls = i < reached ? ' is-done' : i === reached && (o.status === 'new' || o.status === 'reserved') ? ' is-now' : '';
      return h('li', { class: 'acc-step' + cls }, h('i', { 'aria-hidden': 'true' }), h('span', { text: RK.t('acc.step.' + s) }));
    }));
  }

  function note(o) {
    var left = Math.max(0, (o.total || 0) - (o.pay || 0));
    if (o.status === 'reserved') return RK.t('acc.note.reserved', { date: day(o.createdAt, RK.vars().days), left: RK.money(left) });
    if (o.status === 'shipped' && !o.track) return RK.t('acc.note.shippedNoTrack');
    return RK.t('acc.note.' + o.status);
  }

  function track(o) {
    if (!o.track) return null;
    var url = /^https:\/\/[^\s]+$/i.test(o.track) ? o.track : '';
    return h('div', { class: 'acc-track' },
      h('span', { class: 'eyebrow', text: RK.t('acc.track') }),
      url ? h('a', { class: 'acc-track__val', href: url, target: '_blank', rel: 'noopener', text: RK.t('acc.trackOpen') + ' ↗' }) : h('b', { class: 'acc-track__val', text: o.track }),
      url ? null : h('button', { class: 'link-inline', type: 'button', onclick: function () { RK.copy(o.track).then(function () { RK.toast(RK.t('done.copied')); }); }, text: RK.t('acc.copy') }));
  }

  function item(it) {
    var p = RK.productById(it.id);
    return h('li', { class: 'acc-item' },
      it.image ? h('img', { src: RK.img(it.image), alt: '', loading: 'lazy', decoding: 'async' }) : h('span', { class: 'acc-item__ph', 'aria-hidden': 'true' }),
      h('div', { class: 'acc-item__text' },
        p ? h('a', { href: RK.productUrl(p), text: it.name }) : h('span', { text: it.name }),
        h('small', { text: [it.size, it.qty > 1 ? '× ' + it.qty : '', it.order ? RK.t('badge.order') : ''].filter(Boolean).join(' · ') })),
      h('span', { class: 'acc-item__price', text: RK.money((it.price || 0) * (it.qty || 1)) }));
  }

  function sums(o) {
    var row = function (k, v, cls) { return h('div', cls ? { class: cls } : null, h('dt', { text: k }), h('dd', { text: v })); };
    var reserve = o.payment === 'reserve';
    return h('dl', { class: 'acc-sum' },
      o.cut ? row(RK.t('cart.discount'), '−' + RK.money(o.cut)) : null,
      row(RK.t('cart.total'), RK.money(o.total), 'acc-sum__total'),
      o.status === 'cancelled' ? null : row(RK.t(reserve ? 'acc.deposit' : 'acc.paid'), RK.money(o.pay)),
      reserve && o.status === 'reserved' && o.total > o.pay ? row(RK.t('acc.left'), RK.money(o.total - o.pay)) : null,
      o.delivery || o.city ? row(RK.t('acc.delivery'), [o.delivery, o.city].filter(Boolean).join(', ') + (o.address ? ' — ' + o.address : '')) : null);
  }

  function card(o) {
    var chat = RK.tg('manager') + '?text=' + encodeURIComponent(RK.t('acc.msg', { number: o.number }));
    return h('article', { class: 'acc-order acc-order--' + o.status },
      h('header', { class: 'acc-order__head' },
        h('div', null, h('p', { class: 'eyebrow', text: day(o.createdAt) }), h('h2', { class: 'acc-order__num', text: o.number })),
        h('span', { class: 'acc-status acc-status--' + o.status, text: RK.t('acc.st.' + o.status) })),
      REACHED[o.status] ? steps(o) : null,
      // the manager's own words, when there are any, instead of the standard text for the status
      o.message ? h('div', { class: 'acc-msg' }, h('p', { class: 'eyebrow', text: RK.t('acc.fromShop') }), h('p', { text: o.message })) : h('p', { class: 'acc-order__note', text: note(o) }),
      track(o),
      h('ul', { class: 'acc-items' }, (o.items || []).map(item)),
      sums(o),
      h('a', { class: 'link-inline acc-order__ask', href: chat, target: '_blank', rel: 'noopener', text: RK.t('acc.ask') + ' ↗' }));
  }

  RK.start(function () {
    load();
    RK.on('lang', function () { if (shown) { head(); draw(shown); } else load(); });
  });
  RK.run();
})();
