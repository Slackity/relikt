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
      'nodata.title': 'Каталог не найден', 'nodata.text': 'Токен подошёл, но в этой ветке репозитория нет файла с каталогом:', 'nodata.hint': 'Так бывает, пока новая версия сайта не загружена в GitHub. После загрузки нажмите «Проверить снова». Если сайт лежит в другой ветке, укажите её.', 'nodata.retry': 'Проверить снова', 'nodata.change': 'Другой репозиторий или ветка',
      'nav.orders': 'Заказы', 'ord.status': 'Статус', 'ord.note': 'Заметка (видна только вам)', 'ord.items': 'Состав', 'ord.subtotal': 'Сумма', 'ord.discount': 'Скидка', 'ord.total': 'Итого', 'ord.deposit': 'Задаток', 'ord.paid': 'Оплачено', 'ord.contact': 'Telegram', 'ord.phone': 'Телефон', 'ord.city': 'Город', 'ord.delivery': 'Доставка', 'ord.address': 'ПВЗ', 'ord.comment': 'Комментарий', 'ord.bank': 'Банк', 'ord.receipt': 'Чек', 'ord.receiptYes': 'прислан в чат менеджера', 'ord.source': 'Откуда', 'ord.site': 'сайт', 'ord.miniapp': 'мини-апп', 'ord.catalog': 'В каталоге', 'ord.released': 'возвращено в продажу', 'ord.gone': 'товар удалён', 'ord.photos': 'Все фото вещи', 'ord.post': 'пост', 'ord.openPost': 'Открыть пост в канале', 'ord.copy': 'Скопировать заказ', 'ord.copied': 'Скопировано', 'ord.chat': 'Написать покупателю', 'ord.more': 'Показать ещё', 'ord.newCount': 'нов. заказ(ов)', 'ord.empty': 'Заказов пока нет. Новые заказы из мини-аппа и с сайта появятся здесь.', 'ord.hint': '«Новый» — оплачен полностью, проверьте чек. «Бронь» — внесён задаток, вещь отмечена бронью. «Оплачен» для брони переводит вещь в «Продано». «Возврат/замена» — покупатель оплатил, но вещь уже ушла: верните деньги или предложите другую. «Отменён» возвращает вещи в продажу. Заказы хранятся год.', 'ord.cancelQ': 'Отменить заказ? Вещи из него снова появятся в продаже.', 'ord.deleteQ': 'Удалить заказ из списка? Это не меняет каталог: чтобы вернуть вещи в продажу, сначала отмените заказ.', 'ord.skipped': 'Часть вещей вы меняли вручную, их наличие не тронуто — проверьте на вкладке «Товары».', 'ord.noWorker': 'Укажите адрес Worker в «Настройки → Приём заказов».', 'ord.offline': 'Worker не отвечает. Проверьте интернет и адрес в настройках.', 'ord.oldWorker': 'В Cloudflare ещё старая версия Worker. Замените его код на worker/index.js из репозитория (инструкция в README).', 'ord.noKv': 'Worker не подключён к хранилищу заказов: добавьте ему KV namespace с именем привязки ORDERS (инструкция в README).', 'ord.noCatalog': 'В Worker нет секрета GITHUB_TOKEN, поэтому он не может менять наличие в каталоге.', 'ord.forbidden': 'Worker не принял GitHub-токен этой админки: у токена должно быть право записи в репозиторий.', 'ord.unavailable': 'Эту вещь уже купили в другом заказе.', 'st.new': 'Новый', 'st.reserved': 'Бронь', 'st.problem': 'Возврат/замена', 'st.paid': 'Оплачен', 'st.shipped': 'Отправлен', 'st.done': 'Выполнен', 'st.cancelled': 'Отменён', 'set.miniApp': 'Ссылка на мини-апп', 'set.miniAppHint': 'Например https://t.me/имя_бота или https://t.me/имя_бота/app. По ней «Скопировать ссылку» и «Спросить в Telegram» дают ссылку, которая открывает товар прямо в мини-аппе.', 'set.miniAppBad': 'Ссылка на мини-апп должна быть вида t.me/имя_бота или t.me/имя_бота/app',
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
      'av.instock': 'В наличии', 'av.order': 'Под заказ', 'av.reserved': 'Бронь', 'av.sold': 'Продано',
      'prod.new': 'Новый товар', 'prod.edit': 'Редактирование товара', 'prod.nameRu': 'Название (рус.)', 'prod.nameEn': 'Название (англ.)', 'prod.brand': 'Бренд', 'prod.oldPrice': 'Старая цена (зачёркнутая)',
      'prod.qty': 'Штук в наличии', 'prod.cond': 'Состояние', 'prod.sizes': 'Размеры (через запятую)', 'prod.descRu': 'Описание (рус.)', 'prod.descEn': 'Описание (англ.)',
      'prod.tgPost': 'Номер поста в Telegram', 'prod.featured': 'Закрепить вверху каталога', 'prod.photos': 'Фото', 'prod.addPhotos': 'Добавить фото', 'prod.photosHint': 'Первое фото — обложка. Стрелками фото двигаются, × убирает.',
      'prod.nameReq': 'Сначала введите название.', 'prod.uploading': 'Загружаем фото…', 'prod.uploaded': 'Фото загружено', 'prod.cover': 'Обложка',
      'cond.': 'Не указано', 'cond.new': 'Новая', 'cond.vintage': 'Винтаж', 'cond.used': 'Б/у',
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
      'set.pin': 'Закрепить пост с каталогом', 'set.pinHint': 'Бот опубликует в канале пост «RELIKT — каталог» с кнопкой «Открыть каталог» (она открывает мини-апп) и тихо закрепит его. Бот должен быть админом канала с правами публиковать и закреплять сообщения.', 'set.pinQ': 'Опубликовать в канале пост с кнопкой «Открыть каталог» и закрепить его?', 'set.pinOk': 'Готово: пост опубликован и закреплён.', 'set.pinNoPin': 'Пост опубликован, но закрепить не вышло — закрепите вручную.', 'set.pinNeed': 'Сначала заполните «Канал» и «Ссылку на мини-апп» в панели Telegram и сохраните.', 'set.pinRights': 'Telegram не дал опубликовать пост: проверьте, что бот — админ канала с правом публиковать сообщения.',
      'set.bot': 'Подключить бота', 'set.botHint': 'Чтобы бот отвечал на /start кнопкой «Открыть каталог». Нажать один раз после обновления Worker; повторно — если меняли адрес Worker или токен бота.', 'set.botOk': 'Готово: бот отвечает на /start и открывает каталог.', 'set.botMenu': 'Кнопка меню «Каталог» добавлена.', 'set.botPrev': 'Раньше сообщения бота уходили на другой адрес:',
      'set.check': 'Проверить Worker', 'set.checkOld': 'Worker отвечает, но это старая версия: заказы не сохраняются и вещи не отмечаются. Обновите его код (README).', 'set.checkMissing': 'Worker новый, но в нём не настроено:', 'set.checkAll': 'Worker на связи: Telegram, заказы и наличие в каталоге настроены.', 'set.webhookBad': 'Адрес Worker должен начинаться с https://', 'set.checkOk': 'Worker на связи, Telegram настроен.', 'set.checkNoTg': 'Worker отвечает, но в нём не заданы BOT_TOKEN и CHAT_ID.', 'set.checkFail': 'Worker не отвечает по этому адресу.',
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
      'nodata.title': 'Catalog not found', 'nodata.text': 'The token works, but this branch of the repository has no catalog file:', 'nodata.hint': 'This happens until the new site is uploaded to GitHub. After that press “Check again”. If the site is in another branch, enter it.', 'nodata.retry': 'Check again', 'nodata.change': 'Another repository or branch',
      'nav.orders': 'Orders', 'ord.status': 'Status', 'ord.note': 'Private note', 'ord.items': 'Items', 'ord.subtotal': 'Subtotal', 'ord.discount': 'Discount', 'ord.total': 'Total', 'ord.deposit': 'Deposit', 'ord.paid': 'Paid', 'ord.contact': 'Telegram', 'ord.phone': 'Phone', 'ord.city': 'City', 'ord.delivery': 'Delivery', 'ord.address': 'Pickup point', 'ord.comment': 'Comment', 'ord.bank': 'Bank', 'ord.receipt': 'Receipt', 'ord.receiptYes': 'sent to the manager chat', 'ord.source': 'From', 'ord.site': 'website', 'ord.miniapp': 'mini app', 'ord.catalog': 'Catalog', 'ord.released': 'back on sale', 'ord.gone': 'product deleted', 'ord.photos': 'All photos of the piece', 'ord.post': 'post', 'ord.openPost': 'Open the channel post', 'ord.copy': 'Copy order', 'ord.copied': 'Copied', 'ord.chat': 'Message buyer', 'ord.more': 'Show more', 'ord.newCount': 'new order(s)', 'ord.empty': 'No orders yet. New orders from the mini app and the website appear here.', 'ord.hint': '“New” is paid in full, check the receipt. “Reserved” has a deposit and the piece is marked reserved. “Paid” turns a reserved piece into sold. “Refund/swap” means the buyer paid but the piece was already gone: refund or offer another. “Cancelled” puts the pieces back on sale. Orders are kept for a year.', 'ord.cancelQ': 'Cancel this order? Its pieces go back on sale.', 'ord.deleteQ': 'Remove this order from the list? The catalog does not change: cancel the order first to put pieces back on sale.', 'ord.skipped': 'Some pieces were changed by hand, their availability was left as is. Check the Products tab.', 'ord.noWorker': 'Set the Worker address in Settings → Order intake.', 'ord.offline': 'The Worker does not answer. Check the connection and the address in Settings.', 'ord.oldWorker': 'Cloudflare still runs the old Worker. Replace its code with worker/index.js from the repository (see README).', 'ord.noKv': 'The Worker has no order storage: add a KV namespace binding named ORDERS (see README).', 'ord.noCatalog': 'The Worker has no GITHUB_TOKEN secret, so it cannot change availability in the catalog.', 'ord.forbidden': 'The Worker did not accept this panel’s GitHub token: it needs write access to the repository.', 'ord.unavailable': 'This piece was bought in another order.', 'st.new': 'New', 'st.reserved': 'Reserved', 'st.problem': 'Refund/swap', 'st.paid': 'Paid', 'st.shipped': 'Shipped', 'st.done': 'Done', 'st.cancelled': 'Cancelled', 'set.miniApp': 'Mini App link', 'set.miniAppHint': 'For example https://t.me/your_bot or https://t.me/your_bot/app. “Copy link” and “Ask on Telegram” then give a link that opens the product right in the mini app.', 'set.miniAppBad': 'The Mini App link must look like t.me/your_bot or t.me/your_bot/app',
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
      'av.instock': 'In stock', 'av.order': 'Made to order', 'av.reserved': 'Reserved', 'av.sold': 'Sold',
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
      'set.pin': 'Pin a catalog post', 'set.pinHint': 'The bot publishes a “RELIKT — catalog” post with an “Open catalog” button (it opens the mini app) in the channel and pins it silently. The bot must be a channel admin allowed to post and pin messages.', 'set.pinQ': 'Publish a post with the “Open catalog” button in the channel and pin it?', 'set.pinOk': 'Done: the post is published and pinned.', 'set.pinNoPin': 'The post is published but could not be pinned — pin it by hand.', 'set.pinNeed': 'Fill in “Channel” and “Mini App link” in the Telegram panel and save first.', 'set.pinRights': 'Telegram refused the post: check that the bot is a channel admin allowed to post messages.',
      'set.bot': 'Connect the bot', 'set.botHint': 'Makes the bot answer /start with an “Open catalog” button. Press once after updating the Worker; again if the Worker address or the bot token changes.', 'set.botOk': 'Done: the bot answers /start and opens the catalog.', 'set.botMenu': 'A “Catalog” menu button was added.', 'set.botPrev': 'Before, the bot’s messages went to another address:',
      'set.check': 'Test the Worker', 'set.checkOld': 'The Worker answers but it is the old version: orders are not kept and pieces are not marked. Update its code (README).', 'set.checkMissing': 'The Worker is new but these are not set up:', 'set.checkAll': 'The Worker answers: Telegram, orders and catalog availability are set up.', 'set.webhookBad': 'The Worker address must start with https://', 'set.checkOk': 'The Worker answers and Telegram is set up.', 'set.checkNoTg': 'The Worker answers but BOT_TOKEN and CHAT_ID are not set in it.', 'set.checkFail': 'No Worker answers at this address.',
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
     Changes run one after another, so two quick clicks never fight over the same file version.
     If the file changed on GitHub meanwhile (an order marked a piece sold, an import finished),
     the fresh file is loaded and the same change is applied to it. */
  var queue = Promise.resolve(), pending = 0;
  function mutate(fn, message) {
    function attempt(tries) {
      var next = Core.clone(S), out = fn(next);
      return putFile(DATA_PATH, b64encode(JSON.stringify(next, null, 2) + '\n'), message, SHA).then(function (r) {
        S = next; SHA = r.content.sha;
        return out;
      }, function (e) {
        if ((e.status !== 409 && e.status !== 422) || tries >= 2) throw e;
        return loadStore().then(function () { return attempt(tries + 1); });
      });
    }
    var job = queue.then(function () { return attempt(0); });
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
    var msg = !e ? t('common.error') : e.code === 'WEBHOOK' ? t('set.webhookBad') : e.code === 'MINIAPP' ? t('set.miniAppBad') : e.status === 401 ? t('err.auth') : e.status === 403 ? t('err.forbidden') : e.status === 409 || e.status === 422 ? t('err.conflict') : e.status === 0 ? t('err.net') : e.message || t('common.error');
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

  /* the token works, but the branch has no shop data: the new site is not on GitHub yet, or the branch is wrong */
  function renderNoData() {
    var where = CONN.owner + '/' + CONN.repo + ' · ' + (CONN.branch || 'main');
    clear($('#app')).appendChild(h('div', { class: 'login' }, h('div', { class: 'login__card' },
      logoSvg('login__logo'), h('p', { class: 'eyebrow login__title', text: t('nodata.title') }),
      h('p', { text: t('nodata.text') }),
      h('code', { text: where + ' → ' + DATA_PATH }),
      h('p', { class: 'muted', style: 'font-size:13px', text: t('nodata.hint') }),
      h('button', { class: 'btn btn--solid', type: 'button', onclick: start }, h('span', { text: t('nodata.retry') })),
      h('button', { class: 'link', type: 'button', style: 'justify-self:center', onclick: renderLogin, text: t('nodata.change') }),
      langSwitch())));
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
  var VIEWS = ['orders', 'products', 'categories', 'texts', 'settings'];
  var view = location.hash.replace('#/', '');
  if (VIEWS.indexOf(view) < 0) view = 'orders';

  function renderShell() {
    var app = clear($('#app'));
    var side = h('aside', { class: 'side' },
      h('a', { class: 'side__brand', href: 'index.html', 'aria-label': 'RELIKT' }, logoSvg()),
      h('nav', { class: 'nav', 'aria-label': 'Admin' }, VIEWS.map(function (v) {
        var n = v === 'orders' ? newOrders() : 0;
        return h('button', { type: 'button', class: view === v ? 'on' : '', onclick: function () { go(v); } }, h('span', { text: t('nav.' + v) }), n ? h('span', { class: 'pill', text: String(n) }) : null);
      })),
      h('div', { class: 'side__foot' },
        h('p', { class: 'muted mono', style: 'font-size:11px;word-break:break-all', text: CONN.owner + '/' + CONN.repo }),
        h('a', { class: 'link', href: 'index.html', text: t('nav.site') + ' ↗' }),
        h('button', { class: 'link', type: 'button', style: 'text-align:left', onclick: logout, text: t('nav.logout') }),
        langSwitch()));
    var top = h('div', { class: 'topbar' }, VIEWS.map(function (v) {
      var n = v === 'orders' ? newOrders() : 0;
      return h('button', { type: 'button', class: view === v ? 'on' : '', onclick: function () { go(v); } }, t('nav.' + v), n ? h('span', { class: 'pill', text: String(n) }) : null);
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
    ({ orders: viewOrders, products: viewProducts, categories: viewCategories, texts: viewTexts, settings: viewSettings })[view](main);
  }
  function head(title, actions) {
    return h('div', { class: 'head' }, h('h1', { text: title }), actions ? h('div', { class: 'head__actions' }, actions) : null);
  }
  function catName(id) { var c = S.categories.filter(function (x) { return x.id === id; })[0]; return c ? (lang === 'ru' ? c.ru : c.en) : id; }
  function reload() {
    return loadStore().then(function () { toast(t('common.reload') + ' ✓'); renderShell(); }).catch(fail);
  }

  /* ======================================================================
     ORDERS (kept by the order Worker in Cloudflare KV, never in the public repository)
     ====================================================================== */
  var ORDER_STATUSES = ['new', 'reserved', 'problem', 'paid', 'shipped', 'done', 'cancelled'];
  var OR = { list: null, cursor: null, filter: 'all', error: '', loading: false, seen: null };

  function workerBase() {
    var w = S && S.settings.orderWebhook;
    if (!w) return '';
    try { return new URL(w).origin; } catch (e) { return ''; }
  }
  function worker(path, body) {
    return fetch(workerBase() + path, {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + CONN.token },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !j.ok) { var e = new Error(j.error || 'HTTP ' + r.status); e.status = r.status; e.code = j.error; throw e; }
        return j;
      });
    }, function () { var e = new Error(t('ord.offline')); e.status = 0; throw e; });
  }
  function orderError(e) {
    if (!e) return t('common.error');
    if (e.status === 0) return t('ord.offline');
    if (e.code === 'not_found' || e.code === 'method') return t('ord.oldWorker');
    if (e.code === 'orders_not_configured') return t('ord.noKv');
    if (e.code === 'catalog_not_configured') return t('ord.noCatalog');
    if (e.code === 'forbidden') return t('ord.forbidden');
    if (e.code === 'unavailable') return t('ord.unavailable');
    return t('common.error') + ': ' + (e.message || '');
  }

  /* first page (or the next one) of orders; new ones since the last look are announced */
  function loadOrders(more, quiet) {
    if (!workerBase()) { OR.error = t('ord.noWorker'); return Promise.resolve(); }
    OR.loading = true;
    return worker('/orders/list', { cursor: more ? OR.cursor : null, limit: 50 }).then(function (r) {
      OR.error = '';
      var fresh = OR.seen ? r.orders.filter(function (o) { return !OR.seen[o.key]; }) : [];
      OR.list = more ? (OR.list || []).concat(r.orders) : r.orders;
      OR.cursor = r.cursor;
      OR.seen = OR.seen || {};
      OR.list.forEach(function (o) { OR.seen[o.key] = true; });
      if (fresh.length && !more) { toast(fresh.length + ' ' + t('ord.newCount')); loadStore().catch(function () { /* products refresh later */ }); }
    }, function (e) {
      if (quiet && OR.list) return;
      OR.error = orderError(e);
      // the old Worker refuses the admin request outright (no CORS for it); its /health tells the versions apart
      if (e.status !== 0) return;
      return fetch(workerBase() + '/health', { cache: 'no-store' }).then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.ok && j.orders === undefined) OR.error = t('ord.oldWorker'); }, function () { /* really offline */ });
    }).then(function () { OR.loading = false; });
  }
  function newOrders() { return (OR.list || []).filter(function (o) { return o.status === 'new' || o.status === 'reserved' || o.status === 'problem'; }).length; }

  function viewOrders(main) {
    main.appendChild(head(t('nav.orders'), h('button', { class: 'btn btn--sm', type: 'button', onclick: function () { loadOrders(false).then(route); } }, h('span', { text: t('common.reload') }))));
    if (OR.list === null && !OR.error) {
      main.appendChild(h('div', { class: 'empty' }, h('span', { class: 'spinner', style: 'display:inline-block' })));
      loadOrders(false).then(function () { if (view === 'orders') renderShell(); });
      return;
    }
    if (OR.error) { main.appendChild(h('div', { class: 'empty', text: OR.error })); return; }
    var counts = {}; OR.list.forEach(function (o) { counts[o.status] = (counts[o.status] || 0) + 1; });
    main.appendChild(h('div', { class: 'chips', style: 'margin-bottom:18px' },
      ordChip(t('common.all'), OR.list.length, OR.filter === 'all', function () { OR.filter = 'all'; route(); }),
      ORDER_STATUSES.map(function (s) { return ordChip(t('st.' + s), counts[s] || 0, OR.filter === s, function () { OR.filter = s; route(); }); })));
    var list = OR.list.filter(function (o) { return OR.filter === 'all' || o.status === OR.filter; });
    if (!list.length) main.appendChild(h('div', { class: 'empty', text: t('ord.empty') }));
    else main.appendChild(h('div', { class: 'orders' }, list.map(orderCard)));
    if (OR.cursor) main.appendChild(h('div', { style: 'margin-top:14px' }, h('button', { class: 'btn btn--sm', type: 'button', onclick: function () { loadOrders(true).then(route); } }, h('span', { text: t('ord.more') }))));
    main.appendChild(h('p', { class: 'field__hint', style: 'margin-top:16px', text: t('ord.hint') }));
  }
  function ordChip(label, n, on, fn) { return h('button', { class: 'chip' + (on ? ' on' : ''), type: 'button', onclick: fn }, label, h('i', { text: String(n) })); }

  function dt(iso) { try { return new Date(iso).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return iso; } }
  function chatLink(o) {
    var u = o.tg && o.tg.username ? o.tg.username : String(o.customer.contact || '').trim().replace(/^@/, '').replace(/^https?:\/\/t\.me\//i, '');
    return /^[A-Za-z0-9_]{4,32}$/.test(u) ? 'https://t.me/' + u : null;
  }
  function orderSummary(o) {
    var c = o.customer, L = ['Заказ ' + o.number + ' · ' + dt(o.createdAt), ''];
    o.items.forEach(function (it, i) { L.push((i + 1) + '. ' + it.name + (it.size ? ' (' + it.size + ')' : '') + (it.qty > 1 ? ' × ' + it.qty : '') + ' — ' + money(it.price * it.qty)); });
    L.push('', 'Итого: ' + money(o.total), o.payment === 'reserve' ? 'Задаток: ' + money(o.pay) : 'Оплачено: ' + money(o.pay), '');
    L.push('Имя: ' + c.name, 'Telegram: ' + c.contact, 'Телефон: ' + c.phone, 'Город: ' + c.city);
    if (c.delivery) L.push('Доставка: ' + c.delivery);
    L.push('Пункт выдачи: ' + c.address);
    if (c.comment) L.push('Комментарий: ' + c.comment);
    return L.join('\n');
  }

  function orderCard(o) {
    var c = o.customer || {}, link = chatLink(o);
    var statusSel = h('select', { 'aria-label': t('ord.status') }, ORDER_STATUSES.map(function (s) { var op = h('option', { value: s, text: t('st.' + s) }); if (s === o.status) op.selected = true; return op; }));
    statusSel.addEventListener('change', function () {
      var next = statusSel.value;
      var ask = next === 'cancelled' ? confirmBox(t('ord.cancelQ'), true) : Promise.resolve(true);
      ask.then(function (ok) {
        if (!ok) { statusSel.value = o.status; return; }
        statusSel.disabled = true; busy(true);
        worker('/orders/update', { key: o.key, status: next }).then(function (r) {
          Object.assign(o, r.order); busy(false);
          toast(t('common.saved'));
          if (r.order.skipped && r.order.skipped.length) toast(t('ord.skipped'), true);
          return loadStore().catch(function () { /* the products tab refreshes on reload */ });
        }).then(function () { route(); }, function (e) { busy(false); statusSel.disabled = false; statusSel.value = o.status; toast(orderError(e), true); });
      });
    });
    var note = h('textarea', { rows: '2', 'aria-label': t('ord.note') }); note.value = o.note || '';
    note.addEventListener('change', function () { worker('/orders/update', { key: o.key, note: note.value }).then(function () { o.note = note.value; toast(t('common.saved')); }, function (e) { toast(orderError(e), true); }); });
    var kv = function (k, v) { return v ? h('div', null, h('dt', { text: k }), h('dd', { text: v })) : null; };
    var marked = (o.claims || []).map(function (x) { return x.to === 'instock' ? '−' + x.qty : t('av.' + x.to); });
    return h('details', { class: 'order' + (o.status === 'new' || o.status === 'reserved' || o.status === 'problem' ? ' order--fresh' : '') },
      h('summary', null,
        h('span', { class: 'order__num', text: o.number }),
        h('span', { class: 'order__who' }, h('b', { text: c.name || '—' }), h('span', { class: 'muted', text: dt(o.createdAt) + ' · ' + (c.contact || '') })),
        h('span', { class: 'tag tag--' + o.status, text: t('st.' + o.status) }),
        h('span', { class: 'order__total', text: money(o.pay || o.total) })),
      h('div', { class: 'order__body' },
        h('div', { class: 'order__cols' },
          h('div', { class: 'stack' }, h('p', { class: 'eyebrow', text: t('ord.items') }), h('div', { class: 'items' }, o.items.map(function (it) {
            var p = S.products.filter(function (x) { return x.id === it.id; })[0];
            var cover = it.image || (p && p.images[0]) || '';
            return h('div', { class: 'item item--photo' },
              cover ? h('button', { class: 'item__ph', type: 'button', 'aria-label': t('ord.photos'), onclick: function () { showPhotos(it, p); } }, h('img', { src: img(cover), alt: '', loading: 'lazy' })) : h('span', { class: 'item__ph' }),
              h('div', null, h('span', { text: it.name }), h('small', { text: [it.size, it.qty > 1 ? '× ' + it.qty : '', it.order ? t('av.order') : '', p && p.tgPost ? t('ord.post') + ' ' + p.tgPost : '', p ? t('av.' + p.availability) + (p.availability === 'instock' ? ' · ' + p.stock : '') : t('ord.gone')].filter(Boolean).join(' · ') })),
              h('span', { class: 'mono', text: money(it.price * it.qty) }));
          })),
            h('dl', { class: 'kv' },
              kv(t('ord.subtotal'), money(o.subtotal)), o.cut ? kv(t('ord.discount'), '−' + money(o.cut) + [o.discounts.join(', '), o.promo].filter(Boolean).map(function (x) { return ' · ' + x; }).join('')) : null,
              kv(t('ord.total'), money(o.total)), kv(o.payment === 'reserve' ? t('ord.deposit') : t('ord.paid'), money(o.pay)))),
          h('dl', { class: 'kv' },
            kv(t('ord.contact'), c.contact), kv(t('ord.phone'), c.phone), kv(t('ord.city'), c.city), kv(t('ord.delivery'), c.delivery), kv(t('ord.address'), c.address), kv(t('ord.comment'), c.comment),
            kv(t('ord.bank'), o.bank), kv(t('ord.receipt'), o.receipt ? t('ord.receiptYes') : ''),
            kv(t('ord.source'), (o.source === 'site' ? t('ord.site') : t('ord.miniapp')) + (o.tg ? ' · ID ' + o.tg.id : '')),
            kv(t('ord.catalog'), o.catalogNote ? '⚠ ' + o.catalogNote : marked.length ? marked.join(', ') + (o.released ? ' · ' + t('ord.released') : '') : ''))),
        h('div', { class: 'order__actions' },
          h('label', { class: 'field' }, h('span', { text: t('ord.status') }), statusSel),
          h('label', { class: 'field', style: 'flex:1;min-width:220px' }, h('span', { text: t('ord.note') }), note),
          h('button', { class: 'btn btn--sm', type: 'button', onclick: function () { copyText(orderSummary(o)); } }, h('span', { text: t('ord.copy') })),
          link ? h('a', { class: 'btn btn--sm', href: link, target: '_blank', rel: 'noopener' }, h('span', { text: t('ord.chat') + ' ↗' })) : null,
          h('button', { class: 'btn btn--sm btn--danger', type: 'button', onclick: function () {
            confirmBox(t('ord.deleteQ'), true).then(function (ok) {
              if (!ok) return;
              worker('/orders/delete', { key: o.key }).then(function () { OR.list = OR.list.filter(function (x) { return x.key !== o.key; }); route(); }, function (e) { toast(orderError(e), true); });
            });
          } }, h('span', { text: t('common.delete') })))));
  }
  /* every photo of the ordered piece, large: tells apart pieces with the same name in different colours */
  function showPhotos(it, p) {
    var list = p && p.images.length ? p.images.slice() : [it.image];
    if (it.image && list.indexOf(it.image) < 0) list.unshift(it.image);
    var channel = S.settings.channel;
    modal(it.name + (it.size ? ' · ' + it.size : ''), h('div', { class: 'stack' },
      h('div', { class: 'ophotos' }, list.map(function (u) { return h('img', { src: img(u), alt: '' }); })),
      h('p', { class: 'muted', text: [p && p.brand, money(it.price), p && p.tgPost ? t('ord.post') + ' ' + p.tgPost : ''].filter(Boolean).join(' · ') }),
      p && p.tgPost && channel ? h('a', { class: 'link', href: 'https://t.me/' + channel + '/' + p.tgPost, target: '_blank', rel: 'noopener', text: t('ord.openPost') + ' ↗' }) : null));
  }
  function copyText(text) {
    var done = function () { toast(t('ord.copied')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { toast(t('common.error'), true); });
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
      if (['instock', 'order', 'reserved', 'sold'].indexOf(pf.status) >= 0 && p.availability !== pf.status) return false;
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
      var av = h('select', { 'aria-label': t('prod.stock') }, ['instock', 'order', 'reserved', 'sold'].map(function (a) { var op = h('option', { value: a, text: t('av.' + a) }); if (a === p.availability) op.selected = true; return op; }));
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

    var avSel = sel('availability', ['instock', 'order', 'reserved', 'sold'].map(function (a) { return [a, t('av.' + a)]; }), d.availability);
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
    function formPayload() {
      return {
        ru: f.ru.value.trim(), en: f.en.value.trim(), brand: f.brand.value.trim(), category: f.category.value,
        price: f.price.value === '' ? '' : Number(f.price.value), oldPrice: f.oldPrice.value === '' ? '' : Number(f.oldPrice.value),
        availability: f.availability.value, stock: Number(f.stock.value || 0), condition: f.condition.value,
        sizes: f.sizes.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean),
        descRu: f.descRu.value.trim(), descEn: f.descEn.value.trim(), images: photos.slice(),
        visible: f.visible.checked, featured: f.featured.checked, tgPost: f.tgPost.value === '' ? 0 : Number(f.tgPost.value)
      };
    }
    var initial = formPayload();

    var m;
    var saveBtn = h('button', { class: 'btn btn--solid', type: 'button' }, h('span', { text: t('common.save') }));
    drawPhotos();
    saveBtn.addEventListener('click', function () {
      var ru = f.ru.value.trim(), en = f.en.value.trim();
      if (!ru && !en) { toast(t('prod.nameReq'), true); f.ru.focus(); return; }
      var payload = formPayload();
      if (!isNew) {
        // only what was edited here: an order may have marked the piece sold while this window was open
        Object.keys(payload).forEach(function (k) { if (JSON.stringify(payload[k]) === JSON.stringify(initial[k])) delete payload[k]; });
        if (!Object.keys(payload).length) { m.close(); return; }
        payload.id = p.id;
      }
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
        orderWebhook: f.orderWebhook.value, orderSecret: f.orderSecret.value, adminIds: f.adminIds.value, miniAppUrl: f.miniAppUrl.value
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
        .then(function (j) {
          if (!j || !j.ok) { checkOut.textContent = t('set.checkFail'); return; }
          if (!j.telegram) { checkOut.textContent = t('set.checkNoTg'); return; }
          // the old Worker does not report orders / catalog at all
          if (j.orders === undefined) { checkOut.textContent = t('set.checkOld'); return; }
          var missing = [j.orders ? '' : 'KV ORDERS', j.catalog ? '' : 'GITHUB_TOKEN'].filter(Boolean);
          checkOut.textContent = missing.length ? t('set.checkMissing') + ' ' + missing.join(', ') : t('set.checkAll');
        })
        .catch(function () { checkOut.textContent = t('set.checkFail'); });
    } }, h('span', { text: t('set.check') }));

    main.appendChild(head(t('set.title'), saveBtn));
    main.appendChild(panel(t('set.telegram'), null,
      h('div', { class: 'row row--3' }, fld(t('set.channel'), inp('channel', s.channel)), fld(t('set.manager'), inp('manager', s.manager)), fld(t('set.reviews'), inp('reviews', s.reviews))),
      h('div', { class: 'row row--3' }, fld(t('set.currency'), inp('currency', s.currency, { maxlength: '6' })),
        h('div', { style: 'grid-column: span 2' }, fld(t('set.miniApp'), inp('miniAppUrl', s.miniAppUrl, { placeholder: 'https://t.me/your_bot', spellcheck: 'false' }), t('set.miniAppHint'))))));
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
    var botOut = h('span', { class: 'muted', style: 'font-size:13px' });
    var botBtn = h('button', { class: 'btn btn--sm', type: 'button', onclick: function () {
      if (!workerBase()) { botOut.textContent = t('ord.noWorker'); return; }
      botBtn.disabled = true; botOut.textContent = '…';
      worker('/bot/setup').then(function (r) {
        botBtn.disabled = false;
        botOut.textContent = t('set.botOk') + (r.menuSet ? ' ' + t('set.botMenu') : '') + (r.previous ? ' ' + t('set.botPrev') + ' ' + r.previous : '');
      }, function (e) { botBtn.disabled = false; botOut.textContent = e.code === 'telegram_not_configured' ? t('set.checkNoTg') : orderError(e); });
    } }, h('span', { text: t('set.bot') }));
    var pinOut = h('span', { class: 'muted', style: 'font-size:13px' });
    var pinBtn = h('button', { class: 'btn btn--sm', type: 'button', onclick: function () {
      if (!workerBase()) { pinOut.textContent = t('ord.noWorker'); return; }
      confirmBox(t('set.pinQ'), false).then(function (ok) {
        if (!ok) return;
        pinBtn.disabled = true; pinOut.textContent = '…';
        worker('/bot/pin').then(function (r) {
          pinBtn.disabled = false;
          pinOut.textContent = r.pinned ? t('set.pinOk') : t('set.pinNoPin') + (r.pinError ? ' (' + r.pinError + ')' : '');
        }, function (e) {
          pinBtn.disabled = false;
          pinOut.textContent = e.code === 'no_channel_or_link' ? t('set.pinNeed') : e.status === 502 ? t('set.pinRights') + ' (' + e.message + ')' : orderError(e);
        });
      });
    } }, h('span', { text: t('set.pin') }));
    main.appendChild(panel(t('set.orders'), t('set.ordersHint'),
      h('div', { class: 'row row--2' }, fld(t('set.webhook'), inp('orderWebhook', s.orderWebhook, { type: 'url', placeholder: 'https://…workers.dev', spellcheck: 'false' })),
        fld(t('set.secret'), inp('orderSecret', s.orderSecret, { spellcheck: 'false', autocomplete: 'off' }), t('set.secretHint'))),
      h('div', { class: 'head__actions', style: 'align-items:center' }, checkBtn, checkOut),
      h('p', { class: 'panel__hint', text: t('set.botHint') }),
      h('div', { class: 'head__actions', style: 'align-items:center' }, botBtn, botOut),
      h('p', { class: 'panel__hint', text: t('set.pinHint') }),
      h('div', { class: 'head__actions', style: 'align-items:center' }, pinBtn, pinOut)));
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

  var pollTimer = null;
  function refreshNav() { if ($('.shell') && !$('.modal')) { var y = window.scrollY; var open = Array.prototype.map.call(doc.querySelectorAll('details.order[open] .order__num'), function (x) { return x.textContent; }); renderShell(); Array.prototype.forEach.call(doc.querySelectorAll('details.order'), function (d) { if (open.indexOf(d.querySelector('.order__num').textContent) >= 0) d.open = true; }); window.scrollTo(0, y); } }
  function start() {
    doc.documentElement.lang = lang;
    loading();
    checkGate().then(function (ok) {
      if (!ok) { renderDenied(); return; }
      if (!connected()) { renderLogin(); return; }
      if (!CONN.branch) CONN.branch = 'main';
      return loadStore().then(function () {
        renderShell();
        clearInterval(pollTimer);
        pollTimer = setInterval(function () {
          if (doc.hidden || !workerBase()) return;
          // never redraw under an open window or a field being typed in
          loadOrders(false, true).then(function () { if (!$('.modal') && !(doc.activeElement && doc.activeElement.closest && doc.activeElement.closest('.main'))) refreshNav(); });
        }, 60000);
        if (view !== 'orders' && workerBase()) loadOrders(false, true).then(refreshNav);
      }, function (e) {
        // only a rejected token is forgotten; a missing file or a refusal keeps it so nothing has to be pasted again
        if (e.status === 401) { CONN.token = ''; saveConn(); renderLogin(); toast(t('err.auth'), true); }
        else if (e.status === 404) renderNoData();
        else { renderLogin(); toast(e.status === 403 ? t('err.forbidden') : t('login.net'), true); }
      });
    });
  }
  window.addEventListener('beforeunload', function (e) { if (pending) { e.preventDefault(); e.returnValue = ''; } });
  start();
})();
