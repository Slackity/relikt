/* Runs in <head> before first paint: enables JS-only styles, skips the intro on repeat visits,
   and loads the Telegram Mini App library only when the page is opened inside Telegram
   (Telegram passes #tgWebAppData on the first page; its library keeps it in sessionStorage for the next pages). */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  d.classList.add('i18n-wait');      // texts stay hidden until app.js knows the shop's own (style.css, at most 2.5 s)
  var inTg = /tgWebApp/.test(location.hash) || !!window.TelegramWebviewProxy;
  try { inTg = inTg || !!sessionStorage.getItem('__telegram__initParams'); } catch (e) { /* storage blocked */ }
  try { if (inTg || sessionStorage.getItem('rk-intro')) d.classList.add('skip-intro'); } catch (e) { /* storage blocked */ }
  if (inTg) {
    d.classList.add('in-tg');
    document.write('<script src="https://telegram.org/js/telegram-web-app.js?63"><\/script>');
  }
})();
