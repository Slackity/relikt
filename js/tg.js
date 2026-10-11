/*
 * RELIKT — Telegram Mini App layer. Does nothing in a normal browser.
 * Inside Telegram: dark header, native back button (closes the cart / menu / photo first, then goes back a page),
 * haptic feedback, t.me links open in Telegram, buyer name + @username for checkout, admin link for the owner.
 * On every page: a reload when a newer build of the site is published (Telegram caches the start page hard).
 * Load order: app.js, tg.js, chrome.js, shop.js, <page>.
 */
(function () {
  'use strict';
  var RK = window.RK, doc = document, root = doc.documentElement;
  var BG = '#080707', SDK = 'https://telegram.org/js/telegram-web-app.js?63';

  RK.tgApp = null;
  RK.tgUser = null;
  RK.tgInitData = '';

  /* ---------- self-update (all pages, also outside Telegram) ---------- */
  var BUILD = ((doc.querySelector('meta[name="relikt-build"]') || {}).content || '').trim();
  function checkForUpdate() {
    if (!BUILD || !window.fetch) return;
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (v) {
      var fresh = v && String(v.build || '').trim();
      if (!fresh || fresh === BUILD) return;
      var mark = 'rk-reload-' + fresh;
      try { if (sessionStorage.getItem(mark)) return; sessionStorage.setItem(mark, '1'); } catch (e) { return; }
      if (RK.overlay.count()) return;      // never pull the page from under an open cart or form
      var u = new URL(location.href);
      u.searchParams.set('v', fresh);
      location.replace(u.href);
    }).catch(function () { /* offline: keep working */ });
  }
  setTimeout(checkForUpdate, 1500);

  function call(fn) { try { fn(); } catch (e) { /* older Telegram versions */ } }

  function init(app) {
    RK.tgApp = app;
    RK.tgUser = app.initDataUnsafe && app.initDataUnsafe.user || null;
    RK.tgInitData = app.initData;
    root.classList.add('in-tg');

    /* opened from a product link (t.me/<bot>?startapp=p_<slug>): go to that product once */
    var start = app.initDataUnsafe && app.initDataUnsafe.start_param;
    if (start && /^p_[A-Za-z0-9_-]{1,100}$/.test(start)) {
      var mark = 'rk-start-' + start, fresh = false;
      try { fresh = !sessionStorage.getItem(mark); sessionStorage.setItem(mark, '1'); } catch (e) { /* storage blocked */ }
      if (fresh) { call(function () { app.ready(); }); location.replace('product.html?id=' + encodeURIComponent(start.slice(2))); return; }
    }

    /* ---------- look ---------- */
    call(function () { app.ready(); });
    call(function () { app.expand(); });
    call(function () { app.setHeaderColor(BG); });
    call(function () { app.setBackgroundColor(BG); });
    if (app.isVersionAtLeast && app.isVersionAtLeast('7.10')) call(function () { app.setBottomBarColor(BG); });
    // scrolling the catalog must not swipe the shop closed
    if (app.isVersionAtLeast && app.isVersionAtLeast('7.7')) call(function () { app.disableVerticalSwipes(); });

    function viewport() {
      var hgt = app.viewportStableHeight || app.viewportHeight;
      if (hgt) root.style.setProperty('--app-h', hgt + 'px');
    }
    viewport();
    call(function () { app.onEvent('viewportChanged', viewport); });

    /* ---------- haptics ---------- */
    RK.haptic = function (kind) {
      var hf = app.HapticFeedback; if (!hf) return;
      call(function () {
        if (kind === 'success' || kind === 'error' || kind === 'warning') hf.notificationOccurred(kind);
        else if (kind === 'select') hf.selectionChanged();
        else hf.impactOccurred(kind || 'light');
      });
    };
    RK.on('favs', function () { RK.haptic('select'); });

    /* ---------- back button: overlays first, then the previous page ---------- */
    var isHome = /(^|\/)(index\.html)?$/.test(location.pathname);
    function syncBack() {
      var show = RK.overlay.count() > 0 || !isHome;
      call(function () { if (show) app.BackButton.show(); else app.BackButton.hide(); });
    }
    call(function () {
      app.BackButton.onClick(function () {
        RK.haptic('light');
        if (RK.overlay.closeTop()) return;
        var ref = doc.referrer && doc.referrer.indexOf(location.origin) === 0;
        if (ref && history.length > 1) history.back();
        else location.href = 'index.html';
      });
    });
    RK.on('overlay', syncBack);
    syncBack();
    // pages restored from the back/forward cache keep their old button state
    window.addEventListener('pageshow', syncBack);

    /* ---------- links to other sites open through Telegram ---------- */
    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented) return;
      var u;
      try { u = new URL(a.href, location.href); } catch (err) { return; }
      if (u.origin === location.origin || !/^https?:$/.test(u.protocol)) return;
      e.preventDefault();
      if (/^(t\.me|telegram\.me)$/i.test(u.hostname)) call(function () { app.openTelegramLink(u.href); });
      else call(function () { app.openLink(u.href); });
    }, true);

    /* ---------- the owner sees a way into the admin panel ---------- */
    function adminLink(d) {
      var ids = (d && d.settings && d.settings.adminIds) || [];
      if (!RK.tgUser || ids.indexOf(String(RK.tgUser.id)) < 0 || RK.$('.admin-link')) return;
      var mk = function () { return RK.h('a', { class: 'admin-link eyebrow', href: 'admin.html', text: RK.lang === 'en' ? 'Admin panel' : 'Админка' }); };
      var menu = RK.$('#menu .menu__links'); if (menu) menu.appendChild(mk());
      var foot = RK.$('.footer__nav'); if (foot) foot.appendChild(mk());
    }
    RK.on('data', adminLink);
    if (RK.data) adminLink(RK.data);

    /* leaving mid-checkout asks first */
    RK.tgConfirmClose = function (on) { call(function () { if (on) app.enableClosingConfirmation(); else app.disableClosingConfirmation(); }); };
  }

  /* boot.js loads the Telegram library in <head> when the page runs inside Telegram.
     On a very slow connection the browser may skip that, so load it here instead. */
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg && tg.initData) init(tg);
  else if (!tg && root.classList.contains('in-tg')) {
    var s = doc.createElement('script');
    s.src = SDK; s.async = true;
    s.onload = function () { var w = window.Telegram && window.Telegram.WebApp; if (w && w.initData) init(w); };
    doc.head.appendChild(s);
  }
})();
