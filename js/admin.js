/*
 * RELIKT admin panel for the GitHub Pages version of the shop.
 * There is no server: the panel reads data/store.json from the GitHub repository and saves every change
 * straight back as a commit (GitHub Pages republishes the site in 1–2 minutes). Photos go to uploads/.
 * The key is a GitHub token that only the owner has; it is kept on this device (same "relikt_conn" entry as the old panel).
 * Inside Telegram the panel also checks that the user is one of the admins listed in the settings.
 * All user-supplied data is rendered with textContent / DOM nodes, never as HTML.
 */
(function () {
  'use strict';
  var doc = document;
  var Core = window.RKCore;
  var $ = function (s, c) { return (c || doc).querySelector(s); };

  /* ---------- tiny DOM helper ---------- */
  function h(tag, attrs) {
    var el = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(el, x); });
    else el.appendChild(c.nodeType ? c : doc.createTextNode(String(c)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function logoSvg(cls) {
    var s = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 3324 1374'); if (cls) s.setAttribute('class', cls); s.setAttribute('aria-label', 'RELIKT');
    s.innerHTML = '<use href="#rk-logo"/>';
    return s;
  }

  /* ---------- interface language (the shop has its own RU/EN texts) ---------- */
  var STR = {
    ru: {
      'login.title': 'Админка', 'login.lead': 'Изменения сохраняются прямо в репозиторий на GitHub, сайт обновляется через 1–2 минуты. Для входа нужен ваш GitHub-токен: он хранится только на этом устройстве.',
      'login.token': 'GitHub-токен', 'login.repo': 'Репозиторий (владелец/название)', 'login.branch': 'Ветка', 'login.submit': 'Подключить', 'login.checking': 'Проверяем…',
      'login.bad': 'GitHub не принял токен. Проверьте, что он скопирован целиком и не истёк.', 'login.noRepo': 'Репозиторий не найден или у токена нет к нему доступа.',
      'login.noPush': 'У токена нет права на запись (Contents: Read and write).', 'login.net': 'Нет связи с GitHub. Проверьте интернет.',
      'login.howto': 'Как получить токен', 'login.howto1': 'GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.',
      'login.howto2': 'Repository access: Only select repositories → ваш репозиторий магазина.', 'login.howto3': 'Permissions: Contents — Read and write, Actions — Read and write (для импорта из канала).',
      'login.howto4': 'Скопируйте токен и вставьте сюда. Никому его не пересылайте.', 'login.open': 'Открыть страницу создания токена ↗',
      'login.denied': 'Доступ закрыт', 'login.deniedText': 'Эта панель только для владельца магазина.', 'login.toShop': 'В магазин',
      'nav.products': 'Товары', 'nav.categories': 'Категории', 'nav.texts': 'Тексты', 'nav.settings': 'Настройки',
      'nav.site': 'Открыть сайт', 'nav.logout': 'Отключить устройство', 'nav.logoutQ': 'Забыть токен на этом устройстве? Чтобы снова войти, его нужно будет вставить заново.',
      'common.save': 'Сохранить', 'common.saved': 'Сохранено. На сайте через 1–2 мин.', 'common.saving': 'Сохраняем на GitHub…', 'common.cancel': 'Отмена', 'common.delete': 'Удалить', 'common.close': 'Закрыть', 'common.all': 'Все',
      'common.confirm': 'Подтвердить', 'common.error': 'Что-то пошло не так', 'common.add': 'Добавить', 'common.remove': 'Убрать', 'common.edit': 'Изменить', 'common.search': 'Поиск…', 'common.reload': 'Обновить',
      'err.auth': 'GitHub больше не принимает токен. Подключитесь заново.', 'err.forbidden': 'GitHub отказал в доступе. Проверьте права токена.',
      'err.conflict': 'Каталог на GitHub изменился (например, закончился импорт). Нажмите «Обновить» и повторите.', 'err.net': 'Нет связи с GitHub. Изменение не сохранено.',
      'prod.title': 'Товары', 'prod.add': 'Добавить товар', 'prod.import': 'Импорт из Telegram', 'prod.empty': 'Ничего не найдено.', 'prod.name': 'Название', 'prod.category': 'Категория', 'prod.price': 'Цена',
      'prod.stock': 'Наличие', 'prod.visible': 'Опубликован', 'prod.draft': 'Черновик', 'prod.filter.all': 'Все товары', 'prod.filter.pub': 'Опубликованные', 'prod.filter.draft': 'Черновики',
      'prod.allcats': 'Все категории', 'prod.selected': 'выбрано', 'prod.publish': 'Опубликовать', 'prod.hide': 'Скрыть', 'prod.deleteQ': 'Удалить выбранные товары?', 'prod.deleteOne': 'Удалить этот товар?',
      'av.instock': 'В наличии', 'av.order': 'Под заказ', 'av.sold': 'Продано',
      'prod.new': 'Новый товар', 'prod.edit': 'Редактирование товара', 'prod.nameRu': 'Название (рус.)', 'prod.nameEn': 'Название (англ.)', 'prod.brand': 'Бренд', 'prod.oldPrice': 'Старая цена (зачёркнутая)',
      'prod.qty': 'Штук в наличии', 'prod.cond': 'Состояние', 'prod.sizes': 'Размеры (через запятую)', 'prod.descRu': 'Описание (рус.)', 'prod.descEn': 'Описание (англ.)',
      'prod.tgPost': 'Номер поста в Telegram', 'prod.featured': 'Закрепить вверху каталога', 'prod.photos': 'Фото', 'prod.addPhotos': 'Добавить фото', 'prod.photosHint': 'Первое фото — обложка. Стрелками фото двигаются, × убирает.',
      'prod.nameReq': 'Сначала введите название.', 'prod.uploading': 'Загружаем фото…', 'prod.uploaded': 'Фото загружено', 'prod.cover': 'Обложка',
      'cond.': 'Не указано', 'cond.new': 'Новое', 'cond.vintage': 'Винтаж', 'cond.used': 'Б/у',
      'imp.title': 'Импорт из Telegram', 'imp.text': 'GitHub прочитает публичные посты канала и добавит товары, которых ещё нет в каталоге: с ценами (эмодзи-цифры распознаются), размерами и фото. Посты «Продано» помечают товары проданными. Обычно это 1–3 минуты.',
      'imp.publish': 'Сразу опубликовать новые товары (иначе сохранятся черновиками для проверки)', 'imp.run': 'Импортировать', 'imp.start': 'Запускаем на GitHub…', 'imp.running': 'GitHub читает канал… Не закрывайте окно.',
      'imp.done': 'Импорт завершён', 'imp.added': 'Новых товаров', 'imp.sold': 'Помечено проданными', 'imp.skipped': 'Постов пропущено (не товары)',
      'imp.failed': 'Импорт не удался. Подробности на GitHub:', 'imp.noActions': 'Не получилось запустить импорт. Токену нужно право Actions: Read and write, а в репозитории должен быть файл .github/workflows/import.yml.', 'imp.log': 'журнал запуска ↗',
      'cat.title': 'Категории', 'cat.hint': 'Это фильтры в каталоге и плитки на главной. Порядок здесь — порядок на сайте.', 'cat.add': 'Добавить категорию',
      'cat.ru': 'Название (рус.)', 'cat.en': 'Название (англ.)', 'cat.subRu': 'Подпись (рус.)', 'cat.subEn': 'Подпись (англ.)', 'cat.removeQ': 'Убрать категорию? Её товары перейдут в первую категорию.', 'cat.items': 'товаров',
      'tx.title': 'Тексты', 'tx.hint': 'Все тексты сайта на русском и английском. Правьте прямо в поле и нажмите «Сохранить». «Сбросить» возвращает исходный текст. *Звёздочки* дают курсив в большом тексте «О нас», а {percent} и {days} подставляют числа брони из настроек.',
      'tx.changed': 'несохранённых правок', 'tx.reset': 'Сбросить', 'tx.search': 'Поиск по текстам…', 'tx.html': 'Можно <br> и <em>',
      'set.title': 'Настройки', 'set.telegram': 'Telegram', 'set.channel': 'Канал', 'set.manager': 'Менеджер (ссылки «Написать»)', 'set.reviews': 'Канал с отзывами', 'set.currency': 'Знак валюты',
      'set.reserve': 'Бронь', 'set.reservePct': 'Задаток, % от цены (0 — без брони)', 'set.reserveDays': 'Вещь держим, дней', 'set.banner': 'Плашка-объявление', 'set.bannerOn': 'Показывать плашку вверху каждой страницы', 'set.bannerRu': 'Текст (рус.)', 'set.bannerEn': 'Текст (англ.)',
      'set.payment': 'Реквизиты для оплаты', 'set.paymentHint': 'Покупатель видит их на шаге оплаты и прикладывает чек. Если номер пустой, заказ уходит менеджеру без шага оплаты.',
      'set.payBank': 'Банк', 'set.payRecipient': 'Получатель', 'set.payDetails': 'Номер телефона или карты', 'set.payNote': 'Подпись под реквизитами',
      'set.promos': 'Промокоды', 'set.promosHint': 'Покупатель вводит код в корзине. Коды видны в данных сайта, так что не делайте их «секретными».', 'set.code': 'Код', 'set.type': 'Тип', 'set.value': 'Скидка', 'set.active': 'Действует',
      'set.percentType': 'Процент', 'set.amountType': 'Сумма',
      'set.delivery': 'Службы доставки', 'set.deliveryHint': 'Показываются списком при оформлении заказа.', 'set.discounts': 'Скидки-галочки', 'set.discountsHint': 'Покупатель отмечает подходящие в корзине, менеджер проверяет. Не дублируйте их промокодами, иначе скидка сложится дважды.',
      'set.orders': 'Приём заказов', 'set.ordersHint': 'Адрес Cloudflare Worker: он пересылает заказ и чек менеджеру в Telegram. Без адреса покупатель отправляет заказ сообщением сам.',
      'set.webhook': 'Адрес Worker', 'set.secret': 'Секрет заказа (APP_SECRET)', 'set.secretHint': 'Нужен только для заказов с обычного сайта, не из Telegram. Он виден в данных сайта, поэтому защищает слабо. Если оставить пустым, через Worker принимаются только заказы из мини-аппа (их Telegram подписывает сам), а с сайта заказ уходит сообщением менеджеру.',
      'set.check': 'Проверить Worker', 'set.webhookBad': 'Адрес Worker должен начинаться с https://', 'set.checkOk': 'Worker на связи, Telegram настроен.', 'set.checkNoTg': 'Worker отвечает, но в нём не заданы BOT_TOKEN и CHAT_ID.', 'set.checkFail': 'Worker не отвечает по этому адресу.',
      'set.access': 'Доступ', 'set.accessHint': 'Telegram ID тех, кому в мини-аппе видна кнопка «Админка» (через запятую). Свой ID можно узнать у @userinfobot. Для входа всё равно нужен GitHub-токен.',
      'set.adminIds': 'Telegram ID админов', 'set.yourId': 'Ваш Telegram ID',
      'set.github': 'GitHub', 'set.githubHint': 'Панель работает с этим репозиторием. Токен хранится только на этом устройстве.', 'set.repo': 'Репозиторий', 'set.branch': 'Ветка',
      'set.name': 'Название (рус.)', 'set.nameEn': 'Название (англ.)'
    },
    en: {
      'login.title': 'Admin', 'login.lead': 'Changes are saved straight into the GitHub repository; the site updates in 1–2 minutes. Sign in with your GitHub token: it is stored on this device only.',
      'login.token': 'GitHub token', 'login.repo': 'Repository (owner/name)', 'login.branch': 'Branch', 'login.submit': 'Connect', 'login.checking': 'Checking…',
      'login.bad': 'GitHub did not accept the token. Check that it is complete and not expired.', 'login.noRepo': 'Repository not found, or the token has no access to it.',
      'login.noPush': 'The token cannot write to the repository (Contents: Read and write).', 'login.net': 'Cannot reach GitHub. Check the connection.',
      'login.howto': 'How to get a token', 'login.howto1': 'GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.',
      'login.howto2': 'Repository access: Only select repositories → your shop repository.', 'login.howto3': 'Permissions: Contents — Read and write, Actions — Read and write (for the channel import).',
      'login.howto4': 'Copy the token and paste it here. Never send it to anyone.', 'login.open': 'Open the token page ↗',
      'login.denied': 'Access denied', 'login.deniedText': 'This panel is for the shop owner only.', 'login.toShop': 'Back to the shop',
      'nav.products': 'Products', 'nav.categories': 'Categories', 'nav.texts': 'Texts', 'nav.settings': 'Settings',
      'nav.site': 'View site', 'nav.logout': 'Disconnect device', 'nav.logoutQ': 'Forget the token on this device? You will need to paste it again to sign in.',
      'common.save': 'Save', 'common.saved': 'Saved. Live on the site in 1–2 min.', 'common.saving': 'Saving to GitHub…', 'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.close': 'Close', 'common.all': 'All',
      'common.confirm': 'Confirm', 'common.error': 'Something went wrong', 'common.add': 'Add', 'common.remove': 'Remove', 'common.edit': 'Edit', 'common.search': 'Search…', 'common.reload': 'Reload',
      'err.auth': 'GitHub no longer accepts the token. Connect again.', 'err.forbidden': 'GitHub refused access. Check the token permissions.',
      'err.conflict': 'The catalog changed on GitHub (an import finished, for example). Press Reload and try again.', 'err.net': 'Cannot reach GitHub. The change was not saved.',
      'prod.title': 'Products', 'prod.add': 'Add product', 'prod.import': 'Import from Telegram', 'prod.empty': 'No products match.', 'prod.name': 'Name', 'prod.category': 'Category', 'prod.price': 'Price',
      'prod.stock': 'Availability', 'prod.visible': 'Published', 'prod.draft': 'Draft', 'prod.filter.all': 'All products', 'prod.filter.pub': 'Published', 'prod.filter.draft': 'Drafts',
      'prod.allcats': 'All categories', 'prod.selected': 'selected', 'prod.publish': 'Publish', 'prod.hide': 'Hide', 'prod.deleteQ': 'Delete the selected products?', 'prod.deleteOne': 'Delete this product?',
      'av.instock': 'In stock', 'av.order': 'Made to order', 'av.sold': 'Sold',
      'prod.new': 'New product', 'prod.edit': 'Edit product', 'prod.nameRu': 'Name (Russian)', 'prod.nameEn': 'Name (English)', 'prod.brand': 'Brand', 'prod.oldPrice': 'Old price (crossed out)',
      'prod.qty': 'Units in stock', 'prod.cond': 'Condition', 'prod.sizes': 'Sizes (comma separated)', 'prod.descRu': 'Description (Russian)', 'prod.descEn': 'Description (English)',
      'prod.tgPost': 'Telegram post number', 'prod.featured': 'Pin to the top of the catalog', 'prod.photos': 'Photos', 'prod.addPhotos': 'Add photos', 'prod.photosHint': 'The first photo is the cover. Arrows move a photo, × removes it.',
      'prod.nameReq': 'Enter a name first.', 'prod.uploading': 'Uploading photo…', 'prod.uploaded': 'Photo uploaded', 'prod.cover': 'Cover',
      'cond.': 'Not specified', 'cond.new': 'New', 'cond.vintage': 'Vintage', 'cond.used': 'Pre-owned',
      'imp.title': 'Import from Telegram', 'imp.text': 'GitHub reads the public posts of your channel and adds products that are not in the catalog yet, with prices (emoji digits are recognised), sizes and photos. Posts marked “Продано” mark products as sold. Usually 1–3 minutes.',
      'imp.publish': 'Publish new products immediately (otherwise they are saved as drafts for review)', 'imp.run': 'Import now', 'imp.start': 'Starting on GitHub…', 'imp.running': 'GitHub is reading the channel… Keep this window open.',
      'imp.done': 'Import finished', 'imp.added': 'New products', 'imp.sold': 'Marked as sold', 'imp.skipped': 'Posts skipped (not products)',
      'imp.failed': 'The import failed. Details on GitHub:', 'imp.noActions': 'Could not start the import. The token needs Actions: Read and write, and the repository needs .github/workflows/import.yml.', 'imp.log': 'run log ↗',
      'cat.title': 'Categories', 'cat.hint': 'These are the filters in the catalog and the tiles on the home page. The order here is the order on the site.', 'cat.add': 'Add category',
      'cat.ru': 'Name (Russian)', 'cat.en': 'Name (English)', 'cat.subRu': 'Subtitle (Russian)', 'cat.subEn': 'Subtitle (English)', 'cat.removeQ': 'Remove this category? Its products move to the first category.', 'cat.items': 'products',
      'tx.title': 'Texts', 'tx.hint': 'Every text on the site, in Russian and English. Edit it in place and press Save. “Reset” brings back the original wording. Use *stars* for italics in the large About text, and {percent} / {days} for the reservation numbers from Settings.',
      'tx.changed': 'unsaved changes', 'tx.reset': 'Reset', 'tx.search': 'Search texts…', 'tx.html': 'May contain <br> and <em>',
      'set.title': 'Settings', 'set.telegram': 'Telegram', 'set.channel': 'Channel handle', 'set.manager': 'Manager handle (“Message” links)', 'set.reviews': 'Reviews channel handle', 'set.currency': 'Currency symbol',
      'set.reserve': 'Reservation', 'set.reservePct': 'Deposit, % of the price (0 = no reservations)', 'set.reserveDays': 'Held for, days', 'set.banner': 'Announcement bar', 'set.bannerOn': 'Show the bar at the top of every page', 'set.bannerRu': 'Text (Russian)', 'set.bannerEn': 'Text (English)',
      'set.payment': 'Payment details', 'set.paymentHint': 'Shown to the buyer on the payment step, who then attaches the receipt. With an empty number the order goes to the manager without a payment step.',
      'set.payBank': 'Bank', 'set.payRecipient': 'Recipient', 'set.payDetails': 'Phone or card number', 'set.payNote': 'Note under the details',
      'set.promos': 'Promo codes', 'set.promosHint': 'Buyers type a code in the cart. Codes are readable in the site data, so do not treat them as secret.', 'set.code': 'Code', 'set.type': 'Type', 'set.value': 'Discount', 'set.active': 'Active',
      'set.percentType': 'Percent', 'set.amountType': 'Amount',
      'set.delivery': 'Delivery services', 'set.deliveryHint': 'Shown as a dropdown at checkout.', 'set.discounts': 'Tick-box discounts', 'set.discountsHint': 'Buyers tick the ones that apply in the cart and the manager checks them. Do not duplicate them with promo codes or the discount adds up twice.',
      'set.orders': 'Order intake', 'set.ordersHint': 'Address of the Cloudflare Worker that forwards the order and receipt to the manager on Telegram. Without it the buyer sends the order as a message.',
      'set.webhook': 'Worker address', 'set.secret': 'Order secret (APP_SECRET)', 'set.secretHint': 'Only needed for orders from the plain website, not from Telegram. It is readable in the site data, so it protects weakly. Leave it empty and the Worker only accepts mini-app orders (signed by Telegram); website orders then go to the manager as a message.',
      'set.check': 'Test the Worker', 'set.webhookBad': 'The Worker address must start with https://', 'set.checkOk': 'The Worker answers and Telegram is set up.', 'set.checkNoTg': 'The Worker answers but BOT_TOKEN and CHAT_ID are not set in it.', 'set.checkFail': 'No Worker answers at this address.',
      'set.access': 'Access', 'set.accessHint': 'Telegram IDs of the people who see the Admin button in the mini app (comma separated). @userinfobot shows your ID. Signing in still needs the GitHub token.',
      'set.adminIds': 'Admin Telegram IDs', 'set.yourId': 'Your Telegram ID',
      'set.github': 'GitHub', 'set.githubHint': 'The panel works with this repository. The token is stored on this device only.', 'set.repo': 'Repository', 'set.branch': 'Branch',
      'set.name': 'Name (Russian)', 'set.nameEn': 'Name (English)'
    }
  };
  var lang = 'ru';
  try { lang = localStorage.getItem('rk-admin-lang') === 'en' ? 'en' : 'ru'; } catch (e) { /* storage blocked */ }
  function t(k) { return (STR[lang] && STR[lang][k]) || STR.ru[k] || k; }
  function setLang(l) { lang = l; try { localStorage.setItem('rk-admin-lang', l); } catch (e) { /* blocked */ } doc.documentElement.lang = l; start(); }

  /* ---------- Telegram ---------- */
  var tg = window.Telegram && window.Telegram.WebApp;
  var tgApp = tg && tg.initData ? tg : null;
  var tgUser = tgApp && tgApp.initDataUnsafe && tgApp.initDataUnsafe.user || null;
  if (tgApp) {
    try { tgApp.ready(); tgApp.expand(); tgApp.setHeaderColor('#080707'); tgApp.setBackgroundColor('#080707'); } catch (e) { /* old client */ }
    try {
      tgApp.BackButton.show();
      tgApp.BackButton.onClick(function () {
        var close = $('.modal .modal__head .icon');
        if (close) close.click(); else location.href = 'index.html';
      });
    } catch (e) { /* old client */ }
  }

  /* ======================================================================
     GITHUB STORAGE
     ====================================================================== */
  var DATA_PATH = 'data/store.json', REPORT_PATH = 'data/import-report.json', WORKFLOW = 'import.yml';
  function readConn() { try { return JSON.parse(localStorage.getItem('relikt_conn') || '{}') || {}; } catch (e) { return {}; } }
  var CONN = readConn();
  // where this page is published: <owner>.github.io/<repo>/
  var guess = (function () {
    var m = location.hostname.match(/^([a-z0-9-]+)\.github\.io$/i);
    var seg = location.pathname.split('/').filter(Boolean)[0];
    return m ? { owner: m[1], repo: seg && !/\.html$/.test(seg) ? seg : m[1] + '.github.io' } : {};
  })();
  // a same-origin API base is only used by the local test setup
  function apiBase() { return typeof CONN.api === 'string' && /^\/[\w/-]*$/.test(CONN.api) ? CONN.api : 'https://api.github.com'; }
  function connected() { return !!(CONN.token && CONN.owner && CONN.repo); }

  function ghErr(status, msg) { var e = new Error(msg || 'GitHub ' + status); e.status = status; return e; }
  function gh(method, path, body) {
    var url = apiBase() + '/repos/' + encodeURIComponent(CONN.owner) + '/' + encodeURIComponent(CONN.repo) + path;
    return fetch(url, {
      method: method, cache: 'no-store',
      headers: Object.assign({ Authorization: 'Bearer ' + CONN.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (r.status === 204) return {};
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw ghErr(r.status, j.message);
        return j;
      });
    }, function () { throw ghErr(0, t('err.net')); });
  }
  function enc(path) { return path.split('/').map(encodeURIComponent).join('/'); }
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(String(b64).replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function getFile(path) {
    return gh('GET', '/contents/' + enc(path) + '?ref=' + encodeURIComponent(CONN.branch || 'main')).then(function (r) {
      return { sha: r.sha, text: b64decode(r.content || '') };
    });
  }
  function putFile(path, base64, message, sha) {
    var body = { message: message, content: base64, branch: CONN.branch || 'main' };
    if (sha) body.sha = sha;
    return gh('PUT', '/contents/' + enc(path), body);
  }

  /* the shop data and the version of the file it came from */
  var S = null, SHA = null;
  function loadStore() {
    return getFile(DATA_PATH).then(function (f) { S = Core.normalize(JSON.parse(f.text)); SHA = f.sha; return S; });
  }

  /* Every change: apply it to a copy of the data, commit the file, keep the copy only if GitHub took it.
     Changes run one after another, so two quick clicks never fight over the same file version. */
  var queue = Promise.resolve(), pending = 0;
  function mutate(fn, message) {
    var job = queue.then(function () {
      var next = Core.clone(S), out = fn(next);
      return putFile(DATA_PATH, b64encode(JSON.stringify(next, null, 2) + '\n'), message, SHA).then(function (r) {
        S = next; SHA = r.content.sha;
        return out;
      });
    });
    queue = job.catch(function () {});
    pending++; busy(true);
    return job.then(function (out) { pending--; busy(pending > 0); return out; }, function (e) { pending--; busy(pending > 0); throw e; });
  }
  function busy(on) {
    var el = $('#saving');
    if (!el && on) { el = h('div', { id: 'saving', class: 'saving', role: 'status' }, h('span', { class: 'spinner' }), h('span', { text: t('common.saving') })); doc.body.appendChild(el); }
    if (el) el.hidden = !on;
  }

  /* photos: new files in uploads/, shown from memory until GitHub Pages has them */
  var PREVIEW = {};
  function img(u) { return PREVIEW[u] || String(u || '').replace(/^\//, ''); }
  function uploadPhoto(dataUrl) {
    var m = dataUrl.match(/^data:image\/(webp|jpeg|png);base64,(.+)$/);
    if (!m) return Promise.reject(new Error(t('common.error')));
    var name = Date.now().toString(36) + '-' + Core.rid(4) + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
    return putFile('uploads/' + name, m[2], 'Фото ' + name).then(function () {
      var url = '/uploads/' + name; PREVIEW[url] = dataUrl; return url;
    });
  }

  function fail(e) {
    var msg = !e ? t('common.error') : e.code === 'WEBHOOK' ? t('set.webhookBad') : e.status === 401 ? t('err.auth') : e.status === 403 ? t('err.forbidden') : e.status === 409 || e.status === 422 ? t('err.conflict') : e.status === 0 ? t('err.net') : e.message || t('common.error');
    toast(msg, true);
    if (e && e.status === 401) { CONN.token = ''; saveConn(); start(); }
  }
  function saveConn() { try { localStorage.setItem('relikt_conn', JSON.stringify(CONN)); } catch (e) { /* blocked */ } }

  /* ---------- toast + modals ---------- */
  function toast(msg, isErr) {
    var box = $('#toast');
    if (!box) { box = h('div', { id: 'toast', class: 'toast', role: 'status' }); doc.body.appendChild(box); }
    var m = h('div', { class: isErr ? 'err' : '', text: msg });
    box.appendChild(m);
    setTimeout(function () { m.remove(); }, isErr ? 6000 : 3600);
  }
  function modal(title, body, foot, small) {
    var prev = doc.activeElement;
    var closeBtn = h('button', { class: 'icon', type: 'button', 'aria-label': t('common.close') }, '×');
    var box = h('div', { class: 'modal__box' + (small ? ' modal__box--sm' : ''), role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'modal__head' }, h('h2', { text: title }), closeBtn),
      h('div', { class: 'modal__body' }, body), foot ? h('div', { class: 'modal__foot' }, foot) : null);
    var wrap = h('div', { class: 'modal' }, box);
    var api = { el: wrap, onclose: null };
    function close() { wrap.remove(); doc.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); if (api.onclose) api.onclose(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    api.close = close;
    closeBtn.addEventListener('click', close);
    wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) close(); });
    doc.addEventListener('keydown', onKey);
    doc.body.appendChild(wrap);
    var first = $('input:not([type="file"]), select, textarea', box); if (first && !tgApp) first.focus(); else closeBtn.focus();
    return api;
  }
  function confirmBox(message, danger) {
    return new Promise(function (resolve) {
      var m, done = false;
      var answer = function (v) { if (done) return; done = true; m.close(); resolve(v); };
      var ok = h('button', { class: 'btn ' + (danger ? 'btn--danger' : 'btn--solid'), type: 'button', onclick: function () { answer(true); } }, h('span', { text: t('common.confirm') }));
      var no = h('button', { class: 'btn', type: 'button', onclick: function () { answer(false); } }, h('span', { text: t('common.cancel') }));
      m = modal(t('common.confirm'), h('p', { text: message }), [no, ok], true);
      m.onclose = function () { if (!done) { done = true; resolve(false); } };
    });
  }

  /* ---------- formatting ---------- */
  function money(n) { return n == null ? '—' : Number(n).toLocaleString('ru-RU') + ' ' + ((S && S.settings.currency) || '₽'); }
  function langSwitch() {
    return h('div', { class: 'lang' },
      h('button', { type: 'button', 'aria-pressed': String(lang === 'ru'), onclick: function () { setLang('ru'); } }, 'RU'), '/',
      h('button', { type: 'button', 'aria-pressed': String(lang === 'en'), onclick: function () { setLang('en'); } }, 'EN'));
  }

  /* ======================================================================
     SIGN IN
     ====================================================================== */
  function renderDenied() {
    clear($('#app')).appendChild(h('div', { class: 'login' }, h('div', { class: 'login__card' },
      logoSvg('login__logo'), h('p', { class: 'eyebrow login__title', text: t('login.denied') }),
      h('p', { class: 'muted', style: 'text-align:center', text: t('login.deniedText') }),
      h('a', { class: 'btn', href: 'index.html' }, h('span', { text: t('login.toShop') })))));
  }

  function renderLogin() {
    var app = clear($('#app'));
    var token = h('input', { type: 'password', autocomplete: 'off', spellcheck: 'false', required: true, placeholder: 'github_pat_…' });
    var repo = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', value: [CONN.owner || guess.owner, CONN.repo || guess.repo].filter(Boolean).join('/') });
    var branch = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', value: CONN.branch || 'main' });
    var msg = h('p', { class: 'login__msg', role: 'alert' });
    var btn = h('button', { class: 'btn btn--solid', type: 'submit' }, h('span', { text: t('login.submit') }));
    var form = h('form', { class: 'stack', onsubmit: function (e) {
      e.preventDefault(); msg.textContent = '';
      var parts = repo.value.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/, '').split('/');
      var next = { owner: (parts[0] || '').trim(), repo: (parts[1] || '').trim(), branch: branch.value.trim() || 'main', token: token.value.trim(), api: CONN.api };
      if (!next.owner || !next.repo || !next.token) { msg.textContent = t('login.noRepo'); return; }
      btn.disabled = true; btn.firstChild.textContent = t('login.checking');
      var prevConn = CONN; CONN = next;
      gh('GET', '').then(function (r) {
        if (r.permissions && r.permissions.push === false) throw ghErr(-1);
        saveConn(); token.value = ''; start();
      }).catch(function (er) {
        CONN = prevConn;
        btn.disabled = false; btn.firstChild.textContent = t('login.submit');
        msg.textContent = er.status === 401 ? t('login.bad') : er.status === 404 || er.status === 403 ? t('login.noRepo') : er.status === -1 ? t('login.noPush') : t('login.net');
      });
    } },
      h('p', { class: 'muted', style: 'font-size:13px', text: t('login.lead') }),
      h('label', { class: 'field' }, h('span', { text: t('login.token') }), token),
      h('details', { class: 'howto' }, h('summary', { text: t('login.repo') + ' · ' + t('login.branch') }),
        h('div', { class: 'stack', style: 'margin-top:12px' }, h('label', { class: 'field' }, h('span', { text: t('login.repo') }), repo), h('label', { class: 'field' }, h('span', { text: t('login.branch') }), branch))),
      msg, btn,
      h('details', { class: 'howto' }, h('summary', { text: t('login.howto') }),
        h('ol', null, ['login.howto1', 'login.howto2', 'login.howto3', 'login.howto4'].map(function (k) { return h('li', { text: t(k) }); })),
        h('a', { class: 'link', href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener', text: t('login.open') })));
    app.appendChild(h('div', { class: 'login' }, h('div', { class: 'login__card' },
      logoSvg('login__logo'), h('p', { class: 'eyebrow login__title', text: t('login.title') }), form, langSwitch())));
  }

  /* ======================================================================
     SHELL
     ====================================================================== */
  var VIEWS = ['products', 'categories', 'texts', 'settings'];
  var view = location.hash.replace('#/', '');
  if (VIEWS.indexOf(view) < 0) view = 'products';

  function renderShell() {
    var app = clear($('#app'));
    var side = h('aside', { class: 'side' },
      h('a', { class: 'side__brand', href: 'index.html', 'aria-label': 'RELIKT' }, logoSvg()),
      h('nav', { class: 'nav', 'aria-label': 'Admin' }, VIEWS.map(function (v) {
        return h('button', { type: 'button', class: view === v ? 'on' : '', onclick: function () { go(v); } }, h('span', { text: t('nav.' + v) }));
      })),
      h('div', { class: 'side__foot' },
        h('p', { class: 'muted mono', style: 'font-size:11px;word-break:break-all', text: CONN.owner + '/' + CONN.repo }),
        h('a', { class: 'link', href: 'index.html', text: t('nav.site') + ' ↗' }),
        h('button', { class: 'link', type: 'button', style: 'text-align:left', onclick: logout, text: t('nav.logout') }),
        langSwitch()));
    var top = h('div', { class: 'topbar' }, VIEWS.map(function (v) {
      return h('button', { type: 'button', class: view === v ? 'on' : '', onclick: function () { go(v); } }, t('nav.' + v));
    }), langSwitch());
    app.appendChild(h('div', { class: 'shell' }, side, h('div', null, top, h('main', { class: 'main', id: 'main' }))));
    route();
  }
  function logout() {
    confirmBox(t('nav.logoutQ'), true).then(function (ok) {
      if (!ok) return;
      CONN = { owner: CONN.owner, repo: CONN.repo, branch: CONN.branch, api: CONN.api }; saveConn(); S = null; start();
    });
  }
  function go(v) { view = v; history.replaceState(null, '', '#/' + v); renderShell(); window.scrollTo(0, 0); }
  function route() {
    var main = clear($('#main'));
    ({ products: viewProducts, categories: viewCategories, texts: viewTexts, settings: viewSettings })[view](main);
  }
  function head(title, actions) {
    return h('div', { class: 'head' }, h('h1', { text: title }), actions ? h('div', { class: 'head__actions' }, actions) : null);
  }
  function catName(id) { var c = S.categories.filter(function (x) { return x.id === id; })[0]; return c ? (lang === 'ru' ? c.ru : c.en) : id; }
  function reload() {
    return loadStore().then(function () { toast(t('common.reload') + ' ✓'); renderShell(); }).catch(fail);
  }

  /* ======================================================================
     PRODUCTS
     ====================================================================== */
  var pf = { q: '', status: 'all', cat: 'all', selected: {} };

  function viewProducts(main) {
    main.appendChild(head(t('prod.title'), [
      h('button', { class: 'btn btn--sm', type: 'button', onclick: reload }, h('span', { text: t('common.reload') })),
      h('button', { class: 'btn btn--sm', type: 'button', onclick: openImport }, h('span', { text: t('prod.import') })),
      h('button', { class: 'btn btn--sm btn--solid', type: 'button', onclick: function () { openProduct(null); } }, h('span', { text: '+ ' + t('prod.add') }))]));

    var q = h('input', { type: 'search', placeholder: t('common.search'), 'aria-label': t('common.search') }); q.value = pf.q;
    var st = h('select', { 'aria-label': t('prod.filter.all') }, [['all', 'prod.filter.all'], ['pub', 'prod.filter.pub'], ['draft', 'prod.filter.draft'], ['instock', 'av.instock'], ['order', 'av.order'], ['sold', 'av.sold']]
      .map(function (o) { var op = h('option', { value: o[0], text: t(o[1]) }); if (o[0] === pf.status) op.selected = true; return op; }));
    var ct = h('select', { 'aria-label': t('prod.category') }, [h('option', { value: 'all', text: t('prod.allcats') })].concat(S.categories.map(function (c) { var op = h('option', { value: c.id, text: lang === 'ru' ? c.ru : c.en }); if (c.id === pf.cat) op.selected = true; return op; })));
    var tableHost = h('div');
    var apply = function () { pf.q = q.value; pf.status = st.value; pf.cat = ct.value; renderTable(tableHost); };
    q.addEventListener('input', apply); st.addEventListener('change', apply); ct.addEventListener('change', apply);
    main.appendChild(h('div', { class: 'toolbar' }, q, st, ct));
    main.appendChild(tableHost);
    renderTable(tableHost);
  }

  function filteredProducts() {
    var q = pf.q.trim().toLowerCase();
    return S.products.filter(function (p) {
      if (pf.cat !== 'all' && p.category !== pf.cat) return false;
      if (pf.status === 'pub' && !p.visible) return false;
      if (pf.status === 'draft' && p.visible) return false;
      if (['instock', 'order', 'sold'].indexOf(pf.status) >= 0 && p.availability !== pf.status) return false;
      if (q && [p.ru, p.en, p.brand].join(' ').toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function renderTable(host) {
    clear(host);
    var list = filteredProducts();
    var sel = Object.keys(pf.selected).filter(function (id) { return pf.selected[id]; });
    if (sel.length) {
      host.appendChild(h('div', { class: 'bulk' }, h('span', { class: 'eyebrow', text: sel.length + ' ' + t('prod.selected') }),
        h('button', { class: 'btn btn--sm', type: 'button', onclick: function () { bulk('publish', sel); } }, h('span', { text: t('prod.publish') })),
        h('button', { class: 'btn btn--sm', type: 'button', onclick: function () { bulk('hide', sel); } }, h('span', { text: t('prod.hide') })),
        h('button', { class: 'btn btn--sm btn--danger', type: 'button', onclick: function () { confirmBox(t('prod.deleteQ'), true).then(function (ok) { if (ok) bulk('delete', sel); }); } }, h('span', { text: t('common.delete') }))));
    }
    if (!list.length) { host.appendChild(h('div', { class: 'empty', text: t('prod.empty') })); return; }
    var all = h('input', { type: 'checkbox', 'aria-label': t('common.all') });
    all.checked = list.length > 0 && list.every(function (p) { return pf.selected[p.id]; });
    all.addEventListener('change', function () { list.forEach(function (p) { pf.selected[p.id] = all.checked; }); renderTable(host); });
    var tbody = h('tbody');
    list.forEach(function (p) {
      var cb = h('input', { type: 'checkbox', 'aria-label': p.ru }); cb.checked = !!pf.selected[p.id];
      cb.addEventListener('change', function () { pf.selected[p.id] = cb.checked; renderTable(host); });
      var av = h('select', { 'aria-label': t('prod.stock') }, ['instock', 'order', 'sold'].map(function (a) { var op = h('option', { value: a, text: t('av.' + a) }); if (a === p.availability) op.selected = true; return op; }));
      av.addEventListener('change', function () { quick(p, { availability: av.value }); });
      var sw = h('label', { class: 'switch', title: t('prod.visible') }, h('input', { type: 'checkbox', 'aria-label': t('prod.visible') }), h('i'));
      $('input', sw).checked = !!p.visible;
      $('input', sw).addEventListener('change', function (e) { quick(p, { visible: e.target.checked }); });
      tbody.appendChild(h('tr', null,
        h('td', null, cb),
        h('td', null, p.images[0] ? h('img', { class: 'thumb', src: img(p.images[0]), alt: '', loading: 'lazy' }) : h('span', { class: 'thumb' })),
        h('td', null, h('div', { class: 'name', text: p.ru }), h('div', { class: 'muted', text: [p.brand, p.en !== p.ru ? p.en : ''].filter(Boolean).join(' · ') }), !p.visible ? h('span', { class: 'tag tag--draft', text: t('prod.draft') }) : null),
        h('td', { class: 'hide-m' }, catName(p.category)),
        h('td', { class: 'num' }, money(p.price)),
        h('td', null, av),
        h('td', null, sw),
        h('td', null, h('button', { class: 'btn btn--sm', type: 'button', onclick: function () { openProduct(p); } }, h('span', { text: t('common.edit') })))));
    });
    host.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'table' },
      h('thead', null, h('tr', null, h('th', null, all), h('th'), h('th', { text: t('prod.name') }), h('th', { class: 'hide-m', text: t('prod.category') }), h('th', { text: t('prod.price') }), h('th', { text: t('prod.stock') }), h('th', { text: t('prod.visible') }), h('th'))), tbody)));
  }

  function quick(p, patch) {
    mutate(function (d) { return Core.upsertProduct(d, Object.assign({ id: p.id }, patch)); }, 'Товар: ' + p.ru)
      .then(function () { toast(t('common.saved')); route(); }).catch(function (e) { fail(e); route(); });
  }
  function bulk(action, ids) {
    mutate(function (d) {
      var n = 0;
      ids.forEach(function (id) {
        if (!d.products.some(function (p) { return p.id === id; })) return;
        if (action === 'delete') Core.deleteProduct(d, id);
        else Core.upsertProduct(d, { id: id, visible: action === 'publish' });
        n++;
      });
      return n;
    }, 'Товары: ' + action + ' (' + ids.length + ')').then(function (n) { pf.selected = {}; toast(t('common.saved') + ' (' + n + ')'); renderShell(); }).catch(fail);
  }

  /* ----- product editor ----- */
  function openProduct(p) {
    var isNew = !p;
    var d = p ? JSON.parse(JSON.stringify(p)) : { ru: '', en: '', brand: '', category: S.categories[0].id, price: null, oldPrice: null, availability: 'instock', stock: 1, condition: '', sizes: [], descRu: '', descEn: '', images: [], visible: true, featured: false, tgPost: null };
    var f = {};
    var inp = function (name, type, val, attrs) { var e = h('input', Object.assign({ type: type || 'text', id: 'pf_' + name }, attrs || {})); e.value = val == null ? '' : val; f[name] = e; return e; };
    var fld = function (label, el, hint) { return h('label', { class: 'field' }, h('span', { text: label }), el, hint ? h('span', { class: 'field__hint', text: hint }) : null); };
    var sel = function (name, opts, val) { var s = h('select', { id: 'pf_' + name }, opts.map(function (o) { var op = h('option', { value: o[0], text: o[1] }); if (o[0] === val) op.selected = true; return op; })); f[name] = s; return s; };
    var ta = function (name, val) { var e = h('textarea', { id: 'pf_' + name, rows: '3' }); e.value = val || ''; f[name] = e; return e; };

    var avSel = sel('availability', ['instock', 'order', 'sold'].map(function (a) { return [a, t('av.' + a)]; }), d.availability);
    var stockInp = inp('stock', 'number', d.stock, { min: '0', max: '999' });
    var stockFld = fld(t('prod.qty'), stockInp);
    var syncStock = function () { stockFld.hidden = avSel.value !== 'instock'; };
    avSel.addEventListener('change', syncStock); syncStock();

    var photos = d.images.slice(), uploading = 0;
    var photosHost = h('div', { class: 'photos' });
    var fileInput = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true });
    function drawPhotos() {
      clear(photosHost);
      photos.forEach(function (u, i) {
        photosHost.appendChild(h('div', { class: 'photo' },
          h('img', { src: img(u), alt: '' }), i === 0 ? h('span', { class: 'tag photo__main', text: t('prod.cover') }) : null,
          h('div', { class: 'photo__bar' },
            h('button', { type: 'button', 'aria-label': '←', disabled: i === 0, onclick: function () { photos.splice(i - 1, 0, photos.splice(i, 1)[0]); drawPhotos(); } }, '←'),
            h('button', { type: 'button', 'aria-label': t('common.remove'), onclick: function () { photos.splice(i, 1); drawPhotos(); } }, '×'),
            h('button', { type: 'button', 'aria-label': '→', disabled: i === photos.length - 1, onclick: function () { photos.splice(i + 1, 0, photos.splice(i, 1)[0]); drawPhotos(); } }, '→'))));
      });
      for (var k = 0; k < uploading; k++) photosHost.appendChild(h('div', { class: 'photo photo--loading' }, h('span', { class: 'spinner' })));
      var drop = h('label', { class: 'drop' }, h('span', { text: '+' }), h('span', { text: t('prod.addPhotos') }), fileInput);
      ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
      drop.addEventListener('drop', function (e) { upload(e.dataTransfer.files); });
      photosHost.appendChild(drop);
    }
    function upload(files) {
      var list = Array.prototype.slice.call(files || []).filter(function (x) { return /^image\/(jpeg|png|webp)$/.test(x.type); }).slice(0, 12 - photos.length);
      if (!list.length) return;
      uploading += list.length; drawPhotos(); saveBtn.disabled = true;
      list.reduce(function (chain, file) {
        return chain.then(function () {
          return prepareImage(file).then(uploadPhoto).then(function (url) { photos.push(url); }).catch(fail)
            .then(function () { uploading--; drawPhotos(); });
        });
      }, Promise.resolve()).then(function () { saveBtn.disabled = false; toast(t('prod.uploaded')); });
    }
    fileInput.addEventListener('change', function () { upload(fileInput.files); fileInput.value = ''; });

    var body = h('div', { class: 'stack' },
      h('div', { class: 'row row--2' }, fld(t('prod.nameRu'), inp('ru', 'text', d.ru, { maxlength: '160', required: true })), fld(t('prod.nameEn'), inp('en', 'text', d.en, { maxlength: '160' }))),
      h('div', { class: 'row row--2' }, fld(t('prod.brand'), inp('brand', 'text', d.brand, { maxlength: '80' })),
        fld(t('prod.category'), sel('category', S.categories.map(function (c) { return [c.id, lang === 'ru' ? c.ru : c.en]; }), d.category))),
      h('div', { class: 'row row--3' }, fld(t('prod.price') + ' (' + S.settings.currency + ')', inp('price', 'number', d.price, { min: '0', step: '1', inputmode: 'numeric' })), fld(t('prod.oldPrice'), inp('oldPrice', 'number', d.oldPrice, { min: '0', step: '1', inputmode: 'numeric' })),
        fld(t('prod.cond'), sel('condition', ['', 'new', 'vintage', 'used'].map(function (c) { return [c, t('cond.' + c)]; }), d.condition))),
      h('div', { class: 'row row--3' }, fld(t('prod.stock'), avSel), stockFld, fld(t('prod.sizes'), inp('sizes', 'text', (d.sizes || []).join(', '), { placeholder: 'S, M, L' }))),
      h('div', { class: 'row row--2' }, fld(t('prod.descRu'), ta('descRu', d.descRu)), fld(t('prod.descEn'), ta('descEn', d.descEn))),
      h('div', { class: 'row row--2' }, fld(t('prod.tgPost'), inp('tgPost', 'number', d.tgPost, { min: '0', inputmode: 'numeric' })),
        h('div', { class: 'stack', style: 'align-content:end' },
          h('label', { class: 'check' }, (f.visible = h('input', { type: 'checkbox' })), h('span', { text: t('prod.visible') })),
          h('label', { class: 'check' }, (f.featured = h('input', { type: 'checkbox' })), h('span', { text: t('prod.featured') })))),
      h('div', { class: 'stack' }, h('span', { class: 'field__label', text: t('prod.photos') }), photosHost, h('p', { class: 'field__hint', text: t('prod.photosHint') })));
    f.visible.checked = !!d.visible; f.featured.checked = !!d.featured;

    var m;
    var saveBtn = h('button', { class: 'btn btn--solid', type: 'button' }, h('span', { text: t('common.save') }));
    drawPhotos();
    saveBtn.addEventListener('click', function () {
      var ru = f.ru.value.trim(), en = f.en.value.trim();
      if (!ru && !en) { toast(t('prod.nameReq'), true); f.ru.focus(); return; }
      var payload = {
        ru: ru, en: en, brand: f.brand.value.trim(), category: f.category.value,
        price: f.price.value === '' ? '' : Number(f.price.value), oldPrice: f.oldPrice.value === '' ? '' : Number(f.oldPrice.value),
        availability: f.availability.value, stock: Number(f.stock.value || 0), condition: f.condition.value,
        sizes: f.sizes.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean),
        descRu: f.descRu.value.trim(), descEn: f.descEn.value.trim(), images: photos,
        visible: f.visible.checked, featured: f.featured.checked, tgPost: f.tgPost.value === '' ? 0 : Number(f.tgPost.value)
      };
      if (!isNew) payload.id = p.id;
      saveBtn.disabled = true;
      mutate(function (dd) { return Core.upsertProduct(dd, payload); }, (isNew ? 'Новый товар: ' : 'Товар: ') + (ru || en))
        .then(function () { m.close(); toast(t('common.saved')); renderShell(); }).catch(function (e) { saveBtn.disabled = false; fail(e); });
    });
    var foot = [h('div', null, isNew ? null : h('button', { class: 'btn btn--danger', type: 'button', onclick: function () {
      confirmBox(t('prod.deleteOne'), true).then(function (ok) {
        if (!ok) return;
        mutate(function (dd) { return Core.deleteProduct(dd, p.id); }, 'Удалён товар: ' + p.ru).then(function () { m.close(); renderShell(); }).catch(fail);
      });
    } }, h('span', { text: t('common.delete') }))),
      h('div', null, h('button', { class: 'btn', type: 'button', onclick: function () { m.close(); } }, h('span', { text: t('common.cancel') })), saveBtn)];
    m = modal(isNew ? t('prod.new') : t('prod.edit'), body, foot);
  }

  /* resize in the browser (max 1600px) so phone photos upload fast and stay small on the site */
  function prepareImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () {
        var max = 1600, s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
        var c = doc.createElement('canvas'); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var data = c.toDataURL('image/webp', 0.86);
        if (data.indexOf('data:image/webp') !== 0) data = c.toDataURL('image/jpeg', 0.88);
        resolve(data);
      };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error(t('common.error'))); };
      im.src = url;
    });
  }

  /* ----- import from Telegram: runs as a GitHub Action (.github/workflows/import.yml) ----- */
  function latestRun() {
    return gh('GET', '/actions/workflows/' + WORKFLOW + '/runs?event=workflow_dispatch&per_page=1').then(function (r) { return (r.workflow_runs || [])[0] || null; });
  }
  function runImport(publish, status) {
    var before = null;
    return latestRun().catch(function (e) { e.importStart = true; throw e; }).then(function (r) {
      before = r ? r.id : 0;
      return gh('POST', '/actions/workflows/' + WORKFLOW + '/dispatches', { ref: CONN.branch || 'main', inputs: { publish: publish ? 'true' : 'false' } })
        .catch(function (e) { e.importStart = true; throw e; });
    }).then(function () {
      status(t('imp.running'));
      return new Promise(function (resolve, reject) {
        var tries = 0;
        (function poll() {
          setTimeout(function () {
            latestRun().then(function (run) {
              if (run && run.id !== before && run.status === 'completed') {
                if (run.conclusion === 'success') resolve(run);
                else { var e = new Error(t('imp.failed')); e.url = run.html_url; reject(e); }
              } else if (++tries > 150) { var e2 = new Error(t('imp.failed')); e2.url = run && run.html_url; reject(e2); }
              else poll();
            }, function () { if (++tries > 150) reject(new Error(t('err.net'))); else poll(); });
          }, tries < 3 ? 5000 : 4000);
        })();
      });
    }).then(function () {
      return queue.then(function () { return Promise.all([loadStore(), getFile(REPORT_PATH).then(function (f) { return JSON.parse(f.text); }).catch(function () { return null; })]); });
    }).then(function (res) { return res[1]; });
  }

  function openImport() {
    var pub = h('input', { type: 'checkbox' });
    var out = h('div');
    var run = h('button', { class: 'btn btn--solid', type: 'button' }, h('span', { text: t('imp.run') }));
    var m;
    var status = function (text) { clear(out).appendChild(h('div', { class: 'report', style: 'display:flex;gap:12px;align-items:center' }, h('div', { class: 'spinner' }), h('span', { text: text }))); };
    run.addEventListener('click', function () {
      run.disabled = true; status(t('imp.start'));
      runImport(pub.checked, status).then(function (rep) {
        rep = rep || { added: [], markedSold: [], skipped: 0 };
        clear(out).appendChild(h('div', { class: 'report' }, h('b', { text: t('imp.done') }),
          h('span', { text: t('imp.added') + ': ' + rep.added.length }), h('span', { text: t('imp.sold') + ': ' + rep.markedSold.length }), h('span', { text: t('imp.skipped') + ': ' + rep.skipped }),
          rep.added.length ? h('ul', null, rep.added.map(function (a) { return h('li', { text: a.ru + (a.price ? ' — ' + money(a.price) : '') }); })) : null));
        run.disabled = false; renderShell();
      }).catch(function (e) {
        run.disabled = false;
        clear(out).appendChild(h('div', { class: 'report' },
          h('span', { text: e.importStart ? t('imp.noActions') : e.message }),
          e.url ? h('a', { class: 'link', href: e.url, target: '_blank', rel: 'noopener', text: t('imp.log') }) : null));
        if (e.status === 401) fail(e);
      });
    });
    m = modal(t('imp.title'), h('div', { class: 'stack' }, h('p', { class: 'panel__hint', text: t('imp.text') }), h('label', { class: 'check' }, pub, h('span', { text: t('imp.publish') })), out),
      [h('div'), h('div', null, h('button', { class: 'btn', type: 'button', onclick: function () { m.close(); } }, h('span', { text: t('common.close') })), run)]);
  }

  /* ======================================================================
     CATEGORIES
     ====================================================================== */
  function viewCategories(main) {
    var cats = JSON.parse(JSON.stringify(S.categories));
    var host = h('div');
    function draw() {
      clear(host);
      cats.forEach(function (c, i) {
        var n = S.products.filter(function (p) { return p.category === c.id; }).length;
        var mk = function (key, label) { var e = h('input', { type: 'text', maxlength: '120', 'aria-label': label }); e.value = c[key] || ''; e.addEventListener('input', function () { c[key] = e.value; }); return h('label', { class: 'field' }, h('span', { text: label }), e); };
        host.appendChild(h('div', { class: 'listrow' }, mk('ru', t('cat.ru')), mk('en', t('cat.en')), mk('subRu', t('cat.subRu')), mk('subEn', t('cat.subEn')),
          h('div', { class: 'listrow__btns' },
            h('span', { class: 'muted mono', style: 'align-self:center;font-size:11px', text: n + ' ' + t('cat.items') }),
            h('button', { class: 'icon', type: 'button', disabled: i === 0, 'aria-label': '↑', onclick: function () { cats.splice(i - 1, 0, cats.splice(i, 1)[0]); draw(); } }, '↑'),
            h('button', { class: 'icon', type: 'button', disabled: i === cats.length - 1, 'aria-label': '↓', onclick: function () { cats.splice(i + 1, 0, cats.splice(i, 1)[0]); draw(); } }, '↓'),
            h('button', { class: 'icon icon--danger', type: 'button', disabled: cats.length < 2, 'aria-label': t('common.remove'), onclick: function () {
              (n ? confirmBox(t('cat.removeQ'), true) : Promise.resolve(true)).then(function (ok) { if (ok) { cats.splice(i, 1); draw(); } });
            } }, '×'))));
      });
    }
    draw();
    main.appendChild(head(t('cat.title')));
    main.appendChild(h('div', { class: 'panel' }, h('p', { class: 'panel__hint', text: t('cat.hint') }), host,
      h('div', { class: 'head__actions' },
        h('button', { class: 'btn btn--sm', type: 'button', onclick: function () { cats.push({ id: '', ru: '', en: '', subRu: '', subEn: '' }); draw(); } }, h('span', { text: '+ ' + t('cat.add') })),
        h('button', { class: 'btn btn--solid', type: 'button', onclick: function () {
          mutate(function (d) { return Core.setCategories(d, cats); }, 'Категории').then(function () { toast(t('common.saved')); renderShell(); }).catch(fail);
        } }, h('span', { text: t('common.save') })))));
  }

  /* ======================================================================
     TEXTS
     ====================================================================== */
  var textGroup = 'home', textQuery = '';
  function viewTexts(main) {
    var groups = window.RK_GROUPS, texts = window.RK_TEXTS, defaults = window.RK_I18N;
    var over = { ru: Object.assign({}, S.content.ru), en: Object.assign({}, S.content.en) };
    var work = { ru: {}, en: {} };
    texts.forEach(function (x) { ['ru', 'en'].forEach(function (l) { work[l][x.k] = over[l][x.k] != null ? over[l][x.k] : defaults[l][x.k]; }); });
    var bar = h('span', { class: 'muted', text: '' });
    var saveBtn = h('button', { class: 'btn btn--solid', type: 'button', onclick: save }, h('span', { text: t('common.save') }));
    var listHost = h('div'), navHost = h('nav', { class: 'texts__nav' });

    function dirty() { return texts.filter(function (x) { return work.ru[x.k] !== (over.ru[x.k] != null ? over.ru[x.k] : defaults.ru[x.k]) || work.en[x.k] !== (over.en[x.k] != null ? over.en[x.k] : defaults.en[x.k]); }).length; }
    function updBar() { var n = dirty(); bar.textContent = n ? n + ' ' + t('tx.changed') : ''; }

    function drawNav() {
      clear(navHost);
      groups.forEach(function (g) { navHost.appendChild(h('button', { type: 'button', class: textGroup === g[0] && !textQuery ? 'on' : '', onclick: function () { textGroup = g[0]; textQuery = ''; draw(); } }, lang === 'ru' ? g[1].split(' / ')[0] : g[1].split(' / ')[1] || g[1])); });
    }
    function draw() {
      drawNav(); clear(listHost);
      var q = textQuery.trim().toLowerCase();
      var rows = texts.filter(function (x) { return q ? (x.k + ' ' + x.l + ' ' + work.ru[x.k] + ' ' + work.en[x.k]).toLowerCase().indexOf(q) >= 0 : x.g === textGroup; });
      rows.forEach(function (x) {
        var row = h('div', { class: 'trow' });
        var isMod = function () { return work.ru[x.k] !== defaults.ru[x.k] || work.en[x.k] !== defaults.en[x.k]; };
        var mk = function (l) {
          var e = h(x.multi ? 'textarea' : 'input', x.multi ? { rows: '2', maxlength: '2000' } : { type: 'text', maxlength: '2000' });
          e.value = work[l][x.k];
          e.addEventListener('input', function () { work[l][x.k] = e.value; row.classList.toggle('mod', isMod()); updBar(); });
          return h('div', null, h('span', { text: l.toUpperCase() }), e);
        };
        row.classList.toggle('mod', isMod());
        row.appendChild(h('div', { class: 'trow__head' }, h('span', { class: 'trow__label', text: x.l + (x.html ? ' — ' + t('tx.html') : '') }),
          h('span', null, h('span', { class: 'trow__key', text: x.k + '  ' }),
            h('button', { class: 'link', type: 'button', onclick: function () { work.ru[x.k] = defaults.ru[x.k]; work.en[x.k] = defaults.en[x.k]; draw(); updBar(); }, text: t('tx.reset') }))));
        row.appendChild(h('div', { class: 'trow__cols' }, mk('ru'), mk('en')));
        listHost.appendChild(row);
      });
      updBar();
    }
    function save() {
      var payload = { ru: {}, en: {} };
      texts.forEach(function (x) { ['ru', 'en'].forEach(function (l) { var v = (work[l][x.k] || '').trim(); if (v && v !== defaults[l][x.k]) payload[l][x.k] = v; }); });
      saveBtn.disabled = true;
      mutate(function (d) { return Core.setContent(d, payload); }, 'Тексты сайта').then(function (content) {
        over = { ru: Object.assign({}, content.ru), en: Object.assign({}, content.en) }; toast(t('common.saved')); saveBtn.disabled = false; updBar();
      }).catch(function (e) { saveBtn.disabled = false; fail(e); });
    }
    var search = h('input', { type: 'search', placeholder: t('tx.search'), 'aria-label': t('tx.search') });
    search.addEventListener('input', function () { textQuery = search.value; draw(); });
    main.appendChild(head(t('tx.title')));
    main.appendChild(h('p', { class: 'panel__hint', style: 'margin:-8px 0 18px', text: t('tx.hint') }));
    main.appendChild(h('div', { class: 'texts' }, h('div', { class: 'stack' }, search, navHost), h('div', null, listHost, h('div', { class: 'savebar' }, bar, saveBtn))));
    draw();
  }

  /* ======================================================================
     SETTINGS
     ====================================================================== */
  function viewSettings(main) {
    var s = Core.clone(S.settings);
    var f = {};
    var inp = function (k, val, attrs) { var e = h('input', Object.assign({ type: 'text' }, attrs || {})); e.value = val == null ? '' : val; f[k] = e; return e; };
    var fld = function (label, el, hint) { return h('label', { class: 'field' }, h('span', { text: label }), el, hint ? h('span', { class: 'field__hint', text: hint }) : null); };
    var panel = function (title, hint) { return h('div', { class: 'panel' }, h('h2', { text: title }), hint ? h('p', { class: 'panel__hint', text: hint }) : null, Array.prototype.slice.call(arguments, 2)); };
    var rmBtn = function (fn) { return h('div', { class: 'listrow__btns' }, h('button', { class: 'icon icon--danger', type: 'button', 'aria-label': t('common.remove'), onclick: fn }, '×')); };

    var banner = h('input', { type: 'checkbox' }); banner.checked = !!s.banner.on;
    var delivery = s.delivery, discounts = s.discounts, promos = s.promos;
    var dHost = h('div'), vHost = h('div'), pHost = h('div');
    function drawDelivery() {
      clear(dHost);
      delivery.forEach(function (d, i) {
        var a = h('input', { type: 'text', maxlength: '40' }); a.value = d.ru; a.addEventListener('input', function () { d.ru = a.value; });
        var b = h('input', { type: 'text', maxlength: '40' }); b.value = d.en; b.addEventListener('input', function () { d.en = b.value; });
        dHost.appendChild(h('div', { class: 'listrow listrow--v' }, fld(t('set.name'), a), fld(t('set.nameEn'), b), rmBtn(function () { delivery.splice(i, 1); drawDelivery(); })));
      });
    }
    function drawDiscounts() {
      clear(vHost);
      discounts.forEach(function (d, i) {
        var a = h('input', { type: 'text', maxlength: '60' }); a.value = d.ru; a.addEventListener('input', function () { d.ru = a.value; });
        var b = h('input', { type: 'text', maxlength: '60' }); b.value = d.en; b.addEventListener('input', function () { d.en = b.value; });
        var c = h('input', { type: 'number', min: '0', max: '90', inputmode: 'numeric' }); c.value = d.percent; c.addEventListener('input', function () { d.percent = Number(c.value); });
        vHost.appendChild(h('div', { class: 'listrow listrow--d' }, fld(t('set.name'), a), fld(t('set.nameEn'), b), fld('%', c), rmBtn(function () { discounts.splice(i, 1); drawDiscounts(); })));
      });
    }
    function drawPromos() {
      clear(pHost);
      promos.forEach(function (x, i) {
        var code = h('input', { type: 'text', maxlength: '24', autocapitalize: 'characters', spellcheck: 'false' }); code.value = x.code; code.addEventListener('input', function () { x.code = code.value; });
        var type = h('select', null, h('option', { value: 'percent', text: t('set.percentType') + ', %' }), h('option', { value: 'amount', text: t('set.amountType') + ', ' + s.currency }));
        type.value = x.type; type.addEventListener('change', function () { x.type = type.value; });
        var val = h('input', { type: 'number', min: '1', inputmode: 'numeric' }); val.value = x.value; val.addEventListener('input', function () { x.value = Number(val.value); });
        var on = h('input', { type: 'checkbox' }); on.checked = x.active !== false; on.addEventListener('change', function () { x.active = on.checked; });
        pHost.appendChild(h('div', { class: 'listrow listrow--p' }, fld(t('set.code'), code), fld(t('set.type'), type), fld(t('set.value'), val),
          h('label', { class: 'check', style: 'padding-bottom:10px' }, on, h('span', { text: t('set.active') })), rmBtn(function () { promos.splice(i, 1); drawPromos(); })));
      });
    }
    drawDelivery(); drawDiscounts(); drawPromos();

    var saveBtn = h('button', { class: 'btn btn--solid', type: 'button' }, h('span', { text: t('common.save') }));
    saveBtn.addEventListener('click', function () {
      var payload = {
        channel: f.channel.value, manager: f.manager.value, reviews: f.reviews.value, currency: f.currency.value,
        reservePercent: Number(f.reservePercent.value), reserveDays: Number(f.reserveDays.value),
        banner: { on: banner.checked, ru: f.bannerRu.value, en: f.bannerEn.value },
        payment: { bank: f.payBank.value, recipient: f.payRecipient.value, details: f.payDetails.value, note: f.payNote.value },
        promos: promos, delivery: delivery, discounts: discounts,
        orderWebhook: f.orderWebhook.value, orderSecret: f.orderSecret.value, adminIds: f.adminIds.value
      };
      saveBtn.disabled = true;
      mutate(function (d) { return Core.setSettings(d, payload); }, 'Настройки магазина').then(function () { toast(t('common.saved')); saveBtn.disabled = false; route(); })
        .catch(function (e) { saveBtn.disabled = false; fail(e); });
    });

    var checkOut = h('span', { class: 'muted', style: 'font-size:13px' });
    var checkBtn = h('button', { class: 'btn btn--sm', type: 'button', onclick: function () {
      var raw = f.orderWebhook.value.trim(); if (!raw) return;
      if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
      var url; try { url = new URL(raw); } catch (e) { checkOut.textContent = t('set.checkFail'); return; }
      checkOut.textContent = '…';
      fetch(url.origin + '/health', { cache: 'no-store' }).then(function (r) { return r.json(); })
        .then(function (j) { checkOut.textContent = j && j.ok ? (j.telegram ? t('set.checkOk') : t('set.checkNoTg')) : t('set.checkFail'); })
        .catch(function () { checkOut.textContent = t('set.checkFail'); });
    } }, h('span', { text: t('set.check') }));

    main.appendChild(head(t('set.title'), saveBtn));
    main.appendChild(panel(t('set.telegram'), null,
      h('div', { class: 'row row--3' }, fld(t('set.channel'), inp('channel', s.channel)), fld(t('set.manager'), inp('manager', s.manager)), fld(t('set.reviews'), inp('reviews', s.reviews))),
      h('div', { class: 'row row--3' }, fld(t('set.currency'), inp('currency', s.currency, { maxlength: '6' })))));
    main.appendChild(panel(t('set.payment'), t('set.paymentHint'),
      h('div', { class: 'row row--3' }, fld(t('set.payBank'), inp('payBank', s.payment.bank, { maxlength: '60' })), fld(t('set.payRecipient'), inp('payRecipient', s.payment.recipient, { maxlength: '80' })), fld(t('set.payDetails'), inp('payDetails', s.payment.details, { maxlength: '120' }))),
      fld(t('set.payNote'), inp('payNote', s.payment.note, { maxlength: '300' }))));
    main.appendChild(panel(t('set.reserve'), null,
      h('div', { class: 'row row--3' }, fld(t('set.reservePct'), inp('reservePercent', s.reservePercent, { type: 'number', min: '0', max: '100', inputmode: 'numeric' })), fld(t('set.reserveDays'), inp('reserveDays', s.reserveDays, { type: 'number', min: '0', max: '60', inputmode: 'numeric' })))));
    main.appendChild(panel(t('set.promos'), t('set.promosHint'), pHost,
      h('div', null, h('button', { class: 'btn btn--sm', type: 'button', onclick: function () { promos.push({ code: '', type: 'percent', value: 10, active: true }); drawPromos(); } }, h('span', { text: '+ ' + t('common.add') })))));
    main.appendChild(panel(t('set.discounts'), t('set.discountsHint'), vHost,
      h('div', null, h('button', { class: 'btn btn--sm', type: 'button', onclick: function () { discounts.push({ id: '', ru: '', en: '', percent: 5 }); drawDiscounts(); } }, h('span', { text: '+ ' + t('common.add') })))));
    main.appendChild(panel(t('set.banner'), null,
      h('label', { class: 'check' }, banner, h('span', { text: t('set.bannerOn') })),
      h('div', { class: 'row row--2' }, fld(t('set.bannerRu'), inp('bannerRu', s.banner.ru, { maxlength: '200' })), fld(t('set.bannerEn'), inp('bannerEn', s.banner.en, { maxlength: '200' })))));
    main.appendChild(panel(t('set.delivery'), t('set.deliveryHint'), dHost,
      h('div', null, h('button', { class: 'btn btn--sm', type: 'button', onclick: function () { delivery.push({ id: '', ru: '', en: '' }); drawDelivery(); } }, h('span', { text: '+ ' + t('common.add') })))));
    main.appendChild(panel(t('set.orders'), t('set.ordersHint'),
      h('div', { class: 'row row--2' }, fld(t('set.webhook'), inp('orderWebhook', s.orderWebhook, { type: 'url', placeholder: 'https://…workers.dev', spellcheck: 'false' })),
        fld(t('set.secret'), inp('orderSecret', s.orderSecret, { spellcheck: 'false', autocomplete: 'off' }), t('set.secretHint'))),
      h('div', { class: 'head__actions', style: 'align-items:center' }, checkBtn, checkOut)));
    main.appendChild(panel(t('set.access'), t('set.accessHint'),
      h('div', { class: 'row row--2' }, fld(t('set.adminIds'), inp('adminIds', (s.adminIds || []).join(', '), { inputmode: 'numeric', spellcheck: 'false' })),
        tgUser ? fld(t('set.yourId'), h('input', { type: 'text', readonly: true, value: String(tgUser.id) })) : null)));
    main.appendChild(panel(t('set.github'), t('set.githubHint'),
      h('div', { class: 'row row--3' }, fld(t('set.repo'), h('input', { type: 'text', readonly: true, value: CONN.owner + '/' + CONN.repo })), fld(t('set.branch'), h('input', { type: 'text', readonly: true, value: CONN.branch || 'main' }))),
      h('div', null, h('button', { class: 'btn btn--sm btn--danger', type: 'button', onclick: logout }, h('span', { text: t('nav.logout') })))));
  }

  /* ======================================================================
     START
     ====================================================================== */
  function loading() {
    clear($('#app')).appendChild(h('div', { class: 'login' }, h('div', { class: 'spinner', role: 'status', 'aria-label': '…' })));
  }

  /* inside Telegram only the admins from the settings get the panel */
  var gate = null;
  function checkGate() {
    if (!tgApp) return Promise.resolve(true);
    gate = gate || fetch('data/store.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (d) { var ids = (d.settings && d.settings.adminIds) || []; return !!tgUser && ids.indexOf(String(tgUser.id)) >= 0; })
      .catch(function () { return false; });
    return gate;
  }

  function start() {
    doc.documentElement.lang = lang;
    loading();
    checkGate().then(function (ok) {
      if (!ok) { renderDenied(); return; }
      if (!connected()) { renderLogin(); return; }
      if (!CONN.branch) CONN.branch = 'main';
      return loadStore().then(renderShell, function (e) {
        if (e.status === 401 || e.status === 403 || e.status === 404) { CONN.token = ''; saveConn(); renderLogin(); toast(e.status === 401 ? t('err.auth') : t('login.noRepo'), true); }
        else { renderLogin(); toast(t('login.net'), true); }
      });
    });
  }
  window.addEventListener('beforeunload', function (e) { if (pending) { e.preventDefault(); e.returnValue = ''; } });
  start();
})();
