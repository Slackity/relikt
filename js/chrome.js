/*
 * RELIKT — shared page chrome: announcement banner, header, mobile menu, footer.
 * Injected by JS so every page shares one template.
 */
(function () {
  'use strict';
  var RK = window.RK, doc = document, root = doc.documentElement;

  var HEART = '<path d="M12 20.5C6 16 3.2 12.6 3.2 9a4.3 4.3 0 0 1 8.8-1.2A4.3 4.3 0 0 1 20.8 9c0 3.600-2.800 7-8.800 11.500z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>';
  var BAG = '<path d="M5 8.500h14l-1 11.500H6L5 8.500z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M9 8.500V7a3 3 0 0 1 6 0v1.500" fill="none" stroke="currentColor" stroke-width="1.2"/>';

  var HEADER = '' +
    '<div class="banner" id="banner" hidden><span id="bannerText"></span></div>' +
    '<div class="progress" aria-hidden="true"><i></i></div>' +
    '<div class="cursor" aria-hidden="true"><svg viewBox="0 0 681 1371"><use href="#rk-cross"/></svg></div>' +
    '<header class="header" id="header">' +
    '  <nav class="header__nav" aria-label="Main">' +
    '    <button class="burger" id="burger" type="button" aria-expanded="false" aria-controls="menu" data-i18n-attr="aria-label:header.menu"><i></i><i></i></button>' +
    '    <a href="catalog.html" data-i18n="nav.catalog">Каталог</a>' +
    '    <a href="index.html#process" data-i18n="nav.how">Как заказать</a>' +
    '    <a href="index.html#manifest" data-i18n="nav.about">О нас</a>' +
    '    <a href="index.html#contact" data-i18n="nav.contact">Контакты</a>' +
    '  </nav>' +
    '  <a class="brand" href="index.html" aria-label="RELIKT"><svg viewBox="0 0 3324 1374" role="img" aria-label="RELIKT"><use href="#rk-logo"/></svg></a>' +
    '  <div class="header__end">' +
    '    <div class="lang" role="group" aria-label="Language"><button type="button" data-lang="ru" aria-pressed="true">RU</button><span aria-hidden="true">/</span><button type="button" data-lang="en" aria-pressed="false">EN</button></div>' +
    '    <a class="icon-btn" href="catalog.html?fav=1" data-i18n-attr="aria-label:header.fav"><svg viewBox="0 0 24 24" aria-hidden="true">' + HEART + '</svg><span class="count" data-count="fav" hidden></span></a>' +
    '    <button class="icon-btn" id="cartBtn" type="button" data-i18n-attr="aria-label:header.cart"><svg viewBox="0 0 24 24" aria-hidden="true">' + BAG + '</svg><span class="count" data-count="cart" hidden></span></button>' +
    '    <a class="btn btn--sm btn--ghost header__tg" href="https://t.me/relikt_store" data-tg="channel" target="_blank" rel="noopener" data-magnet><span>Telegram <b aria-hidden="true">↗</b></span></a>' +
    '  </div>' +
    '</header>' +
    '<div class="menu" id="menu" hidden>' +
    '  <div class="menu__sigil" data-orn="sigil" data-n="8" data-curl="1" aria-hidden="true"></div>' +
    '  <nav class="menu__links" aria-label="Mobile">' +
    '    <a href="catalog.html" data-i18n="nav.catalog">Каталог</a>' +
    '    <a href="catalog.html?fav=1" data-i18n="header.fav">Избранное</a>' +
    '    <a href="account.html" data-i18n="nav.account">Мои заказы</a>' +
    '    <a href="index.html#process" data-i18n="nav.how">Как заказать</a>' +
    '    <a href="index.html#manifest" data-i18n="nav.about">О нас</a>' +
    '    <a href="index.html#contact" data-i18n="nav.contact">Контакты</a>' +
    '  </nav>' +
    '  <a class="btn btn--solid" href="https://t.me/relikt_store" data-tg="channel" target="_blank" rel="noopener"><span><span data-i18n="cta.channel">Открыть канал</span> <b aria-hidden="true">↗</b></span></a>' +
    '</div>';

  var FOOTER = '' +
    '<footer class="footer" id="footer">' +
    '  <div class="wrap footer__row">' +
    '    <a class="footer__brand" href="index.html" aria-label="RELIKT"><svg viewBox="0 0 3324 1374" role="img" aria-label="RELIKT"><use href="#rk-logo"/></svg></a>' +
    '    <nav class="footer__nav" aria-label="Footer">' +
    '      <a href="catalog.html" data-i18n="nav.catalog">Каталог</a>' +
    '      <a href="index.html#process" data-i18n="nav.how">Как заказать</a>' +
    '      <a href="index.html#manifest" data-i18n="nav.about">О нас</a>' +
    '      <a href="account.html" data-i18n="nav.account">Мои заказы</a>' +
    '      <a href="https://t.me/relikt_store" data-tg="channel" target="_blank" rel="noopener">Telegram ↗</a>' +
    '    </nav>' +
    '    <p class="footer__tag" data-i18n="hero.tag">Твой личный импорт</p>' +
    '  </div>' +
    '  <div class="wrap footer__legal eyebrow"><span>© <span id="year">2026</span> RELIKT</span><span data-i18n="footer.rights">Все права защищены</span></div>' +
    '  <svg class="footer__mark" viewBox="0 0 3324 1374" aria-hidden="true"><use href="#rk-logo"/></svg>' +
    '</footer>';

  var header, bar, lastY = 0, ticking = false;

  function counts() {
    RK.$$('[data-count]').forEach(function (el) {
      var n = el.getAttribute('data-count') === 'fav' ? RK.favs.count() : RK.cart.count();
      el.textContent = n; el.hidden = !n;
    });
  }

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var max = Math.max(1, doc.documentElement.scrollHeight - window.innerHeight);
    if (bar) bar.style.transform = 'scaleX(' + RK.clamp(y / max, 0, 1) + ')';
    if (header) {
      header.classList.toggle('is-solid', y > 40);
      var locked = root.classList.contains('menu-open') || root.classList.contains('drawer-open');
      header.classList.toggle('is-hidden', !locked && y > 240 && y > lastY + 4);
      if (y < lastY - 4 || y < 240) header.classList.remove('is-hidden');
    }
    lastY = y; ticking = false;
    RK.emit('scroll', y);
  }

  function setMenu(open) {
    var menu = RK.$('#menu'), burger = RK.$('#burger');
    if (!menu || !burger) return;
    if (menu.hidden === !open) return;
    menu.hidden = !open;
    root.classList.toggle('menu-open', open);
    if (open) RK.overlay.open(closeMenu); else RK.overlay.closed(closeMenu);
    burger.setAttribute('aria-expanded', String(open));
    if (header) header.classList.remove('is-hidden');
  }

  function closeMenu() { setMenu(false); }

  RK.chrome = {
    mount: function () {
      doc.body.insertAdjacentHTML('afterbegin', HEADER);
      var fm = RK.$('#footerMount');
      if (fm) fm.outerHTML = FOOTER; else doc.body.insertAdjacentHTML('beforeend', FOOTER);
      var yr = RK.$('#year'); if (yr) yr.textContent = new Date().getFullYear();

      header = RK.$('#header'); bar = RK.$('.progress i');
      RK.$$('[data-lang]').forEach(function (b) { b.addEventListener('click', function () { RK.setLang(b.getAttribute('data-lang')); }); });
      RK.$('#burger').addEventListener('click', function () { setMenu(RK.$('#menu').hidden); });
      RK.$$('#menu a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
      window.addEventListener('resize', function () { if (window.innerWidth > 1100) setMenu(false); onScroll(); });
      window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
      RK.on('cart', counts); RK.on('favs', counts);
      RK.on('lang', function () { RK.chrome.update(); });
      counts(); onScroll();
    },

    /* after the data arrives: Telegram links, announcement banner, counters */
    update: function () {
      if (!RK.data) return;
      RK.$$('[data-tg]').forEach(function (a) { a.setAttribute('href', RK.tg(a.getAttribute('data-tg'))); });
      RK.$$('[data-handle]').forEach(function (el) { el.textContent = RK.handle(el.getAttribute('data-handle')); });
      var b = RK.data.settings.banner, banner = RK.$('#banner');
      var text = b && b.on ? (RK.lang === 'en' ? b.en || b.ru : b.ru || b.en) : '';
      if (banner) { banner.hidden = !text; RK.$('#bannerText').textContent = text; root.classList.toggle('has-banner', !!text); }
      counts();
    }
  };
})();
