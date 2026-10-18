/*
 * RELIKT — every piece of text on the site, in Russian and English.
 * This file is the DEFAULT copy. Anything you change in the admin panel (Texts tab) is stored on the
 * site data (data/store.json) and overrides these defaults, so you never have to edit this file.
 *
 *   k      key used in the HTML (data-i18n="key")
 *   g      group shown in the admin panel
 *   l      label shown in the admin panel
 *   html   value may contain <br> and <em>
 *   multi  long text (textarea in the admin panel)
 *   {name} placeholders such as {percent} are filled in by the site
 */
(function (root) {
  'use strict';

  var GROUPS = [
    ['home', 'Главная страница / Home page'],
    ['terms', 'Условия и FAQ / Terms & FAQ'],
    ['contact', 'Контакты и подвал / Contact & footer'],
    ['nav', 'Меню и кнопки / Menu & buttons'],
    ['catalog', 'Каталог / Catalog'],
    ['product', 'Страница товара / Product page'],
    ['cart', 'Корзина и заказ / Cart & checkout'],
    ['account', 'Мои заказы / My orders']
  ];

  var T = [];
  function add(k, g, l, ru, en, o) { T.push({ k: k, g: g, l: l, ru: ru, en: en, html: !!(o && o.html), multi: !!(o && o.multi) }); }

  /* ---- navigation & buttons ---- */
  add('meta.title', 'nav', 'Заголовок вкладки браузера', 'RELIKT — Твой личный импорт', 'RELIKT — Your personal import');
  add('nav.catalog', 'nav', 'Меню: каталог', 'Каталог', 'Catalog');
  add('nav.how', 'nav', 'Меню: как заказать', 'Как заказать', 'How to order');
  add('nav.about', 'nav', 'Меню: о нас', 'О нас', 'About');
  add('nav.contact', 'nav', 'Меню: контакты', 'Контакты', 'Contact');
  add('header.fav', 'nav', 'Иконка избранного (подпись)', 'Избранное', 'Favourites');
  add('header.cart', 'nav', 'Иконка корзины (подпись)', 'Корзина', 'Cart');
  add('header.menu', 'nav', 'Кнопка меню (подпись)', 'Меню', 'Menu');
  add('cta.channel', 'nav', 'Кнопка: открыть канал', 'Открыть канал', 'Open the channel');
  add('cta.catalog', 'nav', 'Кнопка: в каталог', 'Смотреть каталог', 'Browse the catalog');
  add('cta.how', 'nav', 'Кнопка: как заказать', 'Как заказать', 'How to order');

  /* ---- home ---- */
  add('hero.eyebrow', 'home', 'Главный экран: строка над логотипом', 'Винтаж · Стритвир · Личный импорт', 'Vintage · Streetwear · Personal import');
  add('hero.tag', 'home', 'Главный экран: слоган', 'Твой личный импорт', 'Your personal import');
  add('hero.sub', 'home', 'Главный экран: подзаголовок', 'Редкие вещи из-за рубежа: готовые из стока и под заказ в любую точку страны.', 'Rare pieces from abroad: ready stock and buy-to-order, delivered anywhere in the country.', { multi: true });
  add('hero.scroll', 'home', 'Главный экран: «Листай»', 'Листай', 'Scroll');
  add('marquee.1', 'home', 'Бегущая строка: слово 1', 'Личный импорт', 'Personal import');
  add('marquee.2', 'home', 'Бегущая строка: слово 2', 'Винтаж', 'Vintage');
  add('marquee.3', 'home', 'Бегущая строка: слово 3', 'Стритвир', 'Streetwear');
  add('marquee.4', 'home', 'Бегущая строка: слово 4', 'Под заказ', 'Made to order');
  add('marquee.5', 'home', 'Бегущая строка: слово 5', 'Relikt', 'Relikt');
  add('manifest.label', 'home', 'О нас: метка', 'О нас', 'About');
  add('manifest.text', 'home', 'О нас: крупный текст (*звёздочки* = курсив)', 'Здесь собирается *всё лучшее из мира моды*: от культового винтажа до актуального стритвира. Мы не просто магазин, мы ваши личные байеры за рубежом. *Редкую вещь, которую уже не купить в России, привезём под заказ.*', 'Here gathers *the best of the fashion world*, from cult vintage to current streetwear. We are more than a shop: we are your personal buyers abroad. *A rare piece you can no longer buy in Russia? We will bring it in to order.*', { multi: true });
  add('manifest.note', 'home', 'О нас: подпись', 'Ищешь готовое? Загляни в наш сток. Нужна конкретная вещь? Напиши, привезём.', 'Want something ready? Browse our stock. Need a specific piece? Write to us and we will bring it.', { multi: true });
  add('new.title', 'home', 'Новинки: заголовок', 'Новое в стоке', 'New in stock');
  add('new.lead', 'home', 'Новинки: подзаголовок', 'Свежие поступления. Всё, что есть в наличии, смотри в каталоге.', 'Fresh arrivals. Everything we have on hand is in the catalog.', { multi: true });
  add('new.all', 'home', 'Новинки: кнопка', 'Весь каталог', 'Whole catalog');
  add('archive.title', 'home', 'Категории: заголовок', 'Архив', 'Archive');
  add('archive.lead', 'home', 'Категории: подзаголовок', 'Выбирай по категориям или смотри всё сразу.', 'Browse by category or see everything at once.', { multi: true });
  add('archive.items', 'home', 'Категории: «поз.» после числа', 'поз.', 'items');
  add('archive.open', 'home', 'Категории: подпись при наведении', 'Открыть', 'Open');
  add('process.title', 'home', 'Как заказать: заголовок', 'Как заказать', 'How to order');
  add('process.lead', 'home', 'Как заказать: подзаголовок', 'Два пути: готовые вещи из стока или выкуп под заказ.', 'Two ways: ready stock or a buy-to-order from abroad.', { multi: true });
  add('step.1.t', 'home', 'Шаг 1: заголовок', 'Выбери', 'Choose');
  add('step.1.p', 'home', 'Шаг 1: текст', 'Добавь вещи из каталога в корзину. Нужной нет? Пришли ссылку на сайт или фото, выкупим под заказ.', 'Add pieces from the catalog to your cart. Not there? Send a website link or a photo and we will buy it for you.', { multi: true });
  add('step.2.t', 'home', 'Шаг 2: заголовок', 'Оформи', 'Order');
  add('step.2.p', 'home', 'Шаг 2: текст', 'Оставь контакт в Telegram. Менеджер подтвердит наличие, размер и итоговую цену.', 'Leave your Telegram contact. The manager confirms availability, size and the final price.', { multi: true });
  add('step.3.t', 'home', 'Шаг 3: заголовок', 'Оплати', 'Pay');
  add('step.3.p', 'home', 'Шаг 3: текст ({percent} и {days} берутся из настроек)', 'Доставка только по полной предоплате. Чтобы забронировать вещь, внеси {percent}% от цены: она будет за тобой {days} дн.', 'Shipping only on full prepayment. To reserve a piece, pay {percent}% of the price: it is held for you for {days} days.', { multi: true });
  add('step.4.t', 'home', 'Шаг 4: заголовок', 'Получи', 'Receive');
  add('step.4.p', 'home', 'Шаг 4: текст', 'Отправляем через Ozon, WB, СДЭК, 5post, Яндекс или Почту России. Можем и через Авито.', 'We ship with Ozon, WB, CDEK, 5post, Yandex or Russian Post. Avito is possible too.', { multi: true });

  /* ---- terms ---- */
  add('terms.title', 'terms', 'Условия: заголовок', 'Условия', 'Terms');
  add('terms.q1', 'terms', 'Вопрос 1', 'Бронь', 'Reservation');
  add('terms.a1', 'terms', 'Ответ 1 ({percent}, {days} из настроек)', 'Чтобы забронировать вещь, нужно внести {percent}% от её цены. Вещь остаётся за вами на {days} дн., задаток идёт в счёт оплаты. Если передумаете или не успеете рассчитаться, деньги не возвращаются.', 'To reserve a piece, pay {percent}% of its price. It is held for you for {days} days and the deposit counts towards the payment. If you change your mind or do not pay in time, the deposit is not refunded.', { multi: true });
  add('terms.q2', 'terms', 'Вопрос 2', 'Оплата и доставка', 'Payment and delivery');
  add('terms.a2', 'terms', 'Ответ 2', 'Доставка только по полной предоплате. Отправляем через Ozon, WB, СДЭК, 5post, а также можем через Яндекс или Почту России.', 'Shipping only on full prepayment. We send via Ozon, WB, CDEK, 5post, and can also use Yandex or Russian Post.', { multi: true });
  add('terms.q3', 'terms', 'Вопрос 3', 'Отправка через Авито', 'Shipping via Avito');
  add('terms.a3', 'terms', 'Ответ 3', 'Вы вносите предоплату, мы выставляем объявление с вашим товаром за 50 рублей, и вы оформляете заказ.', 'You make the prepayment, we publish a listing with your item for 50 rubles, and you place the order there.', { multi: true });
  add('terms.q4', 'terms', 'Вопрос 4', 'Выкуп под заказ', 'Buy to order');
  add('terms.a4', 'terms', 'Ответ 4', 'Выкупим для вас товар из-за рубежа по ссылке на сайт или по фото нужной вещи. Ограничений нет, пишите с любым запросом.', 'We buy items from abroad for you, from a website link or from a photo of the piece you want. There are no limits, write with any request.', { multi: true });
  add('terms.q5', 'terms', 'Вопрос 5', 'Возврат', 'Returns');
  add('terms.a5', 'terms', 'Ответ 5', 'Возврата нет. Если сомневаетесь перед покупкой, просите любые фото и замеры: всё покажем и расскажем.', 'There are no returns. If you are unsure before buying, ask for any photos and measurements: we will show and tell you everything.', { multi: true });
  add('terms.q6', 'terms', 'Вопрос 6', 'Скидки', 'Discounts');
  add('terms.a6', 'terms', 'Ответ 6', 'Буст канала: 5%. Приведи друга: 15% и тебе, и другу за покупку. Скидки суммируются. Размер скидки подтверждает менеджер.', 'Channel boost: 5%. Bring a friend: 15% for you and for your friend on a purchase. Discounts stack. The manager confirms the discount.', { multi: true });

  /* ---- contact & footer ---- */
  add('contact.label', 'contact', 'Контакты: метка', 'Контакты', 'Contact');
  add('contact.title', 'contact', 'Контакты: заголовок (можно <br> и <em>)', 'Всё происходит<br>в <em>Telegram</em>', 'It all happens<br>in <em>Telegram</em>', { html: true });
  add('contact.lead', 'contact', 'Контакты: текст', 'Новые поступления, заказы и отзывы в одном месте. Заходи и пиши.', 'New arrivals, orders and reviews in one place. Come in and write to us.', { multi: true });
  add('link.1.k', 'contact', 'Карточка 1: метка', 'Канал', 'Channel');
  add('link.1.d', 'contact', 'Карточка 1: описание', 'Поступления и сток', 'Arrivals and stock');
  add('link.2.k', 'contact', 'Карточка 2: метка', 'Отзывы', 'Reviews');
  add('link.2.d', 'contact', 'Карточка 2: описание', 'Что говорят покупатели', 'What buyers say');
  add('link.3.k', 'contact', 'Карточка 3: метка', 'Заказ', 'Order');
  add('link.3.d', 'contact', 'Карточка 3: описание', 'Купить или спросить', 'Buy or ask');
  add('footer.rights', 'contact', 'Подвал: права', 'Все права защищены', 'All rights reserved');

  /* ---- catalog ---- */
  add('catalog.title', 'catalog', 'Каталог: заголовок', 'Каталог', 'Catalog');
  add('catalog.lead', 'catalog', 'Каталог: подзаголовок', 'Сток в наличии и вещи под заказ. Нужной нет? Напиши, привезём.', 'Stock on hand and made-to-order pieces. Not here? Write to us and we will bring it.', { multi: true });
  add('catalog.all', 'catalog', 'Фильтр: «Все»', 'Все', 'All');
  add('catalog.search', 'catalog', 'Поиск: подсказка', 'Найти вещь или бренд', 'Search pieces or brands');
  add('catalog.found', 'catalog', 'Счётчик ({n})', 'Найдено: {n}', '{n} found');
  add('catalog.empty', 'catalog', 'Пустой результат', 'Ничего не найдено. Сбрось фильтры или напиши нам, привезём под заказ.', 'Nothing found. Reset the filters or write to us and we will bring it to order.', { multi: true });
  add('catalog.reset', 'catalog', 'Сбросить фильтры', 'Сбросить фильтры', 'Reset filters');
  add('catalog.more', 'catalog', 'Показать ещё', 'Показать ещё', 'Show more');
  add('catalog.fav.title', 'catalog', 'Избранное: заголовок', 'Избранное', 'Favourites');
  add('catalog.fav.lead', 'catalog', 'Избранное: подзаголовок', 'Вещи, которые ты отметил. Список хранится в этом браузере.', 'Pieces you saved. The list is stored in this browser.', { multi: true });
  add('catalog.fav.empty', 'catalog', 'Избранное: пусто', 'Пока пусто. Нажми на сердечко у вещи, и она появится здесь.', 'Nothing yet. Tap the heart on a piece and it will appear here.', { multi: true });
  add('filter.instock', 'catalog', 'Фильтр: в наличии', 'В наличии', 'In stock');
  add('filter.order', 'catalog', 'Фильтр: под заказ', 'Под заказ', 'Made to order');
  add('filter.reserved', 'catalog', 'Фильтр: бронь', 'Бронь', 'Reserved');
  add('filter.sold', 'catalog', 'Фильтр: продано', 'Продано', 'Sold');
  add('sort.new', 'catalog', 'Сортировка: новые', 'Сначала новые', 'Newest first');
  add('sort.asc', 'catalog', 'Сортировка: дешевле', 'Сначала дешевле', 'Cheapest first');
  add('sort.desc', 'catalog', 'Сортировка: дороже', 'Сначала дороже', 'Priciest first');
  add('badge.sold', 'catalog', 'Метка: продано', 'Продано', 'Sold');
  add('badge.order', 'catalog', 'Метка: под заказ', 'Под заказ', 'To order');
  add('badge.reserved', 'catalog', 'Метка: бронь', 'Бронь', 'Reserved');
  add('badge.held', 'catalog', 'Метка: оформляется', 'Оформляется', 'Being bought');
  add('cond.new', 'catalog', 'Состояние: новая', 'Новая', 'New');
  add('cond.vintage', 'catalog', 'Состояние: винтаж', 'Винтаж', 'Vintage');
  add('cond.used', 'catalog', 'Состояние: б/у', 'Б/у', 'Pre-owned');
  add('card.add', 'catalog', 'Карточка: в корзину', 'В корзину', 'Add to cart');
  add('card.fav', 'catalog', 'Карточка: в избранное', 'В избранное', 'Save to favourites');
  add('card.unfav', 'catalog', 'Карточка: убрать из избранного', 'Убрать из избранного', 'Remove from favourites');
  add('price.ask', 'catalog', 'Нет цены', 'Цена по запросу', 'Price on request');

  /* ---- product page ---- */
  add('product.back', 'product', 'Ссылка назад', 'Каталог', 'Catalog');
  add('product.size', 'product', 'Размер', 'Размер', 'Size');
  add('product.sizeNote', 'product', 'Поле размера: подсказка', 'Нужный размер или пожелания', 'Size or notes (optional)');
  add('product.sizeAsk', 'product', 'Пояснение про размер', 'Размер и замеры уточнит менеджер: просите любые фото и замеры.', 'The manager confirms size and measurements: ask for any photos and measurements.', { multi: true });
  add('product.pickSize', 'product', 'Подсказка: выбери размер', 'Выбери размер', 'Pick a size');
  add('product.qty', 'product', 'Количество', 'Количество', 'Quantity');
  add('product.add', 'product', 'Кнопка: в корзину', 'В корзину', 'Add to cart');
  add('product.inCart', 'product', 'Кнопка: уже в корзине', 'В корзине. Открыть', 'In cart. Open');
  add('product.inCartN', 'product', 'Уже в корзине ({n})', 'В корзине уже {n} шт.', '{n} already in your cart.');
  add('product.ask', 'product', 'Кнопка: спросить', 'Спросить в Telegram', 'Ask on Telegram');
  add('product.askText', 'product', 'Сообщение менеджеру ({name}, {url})', 'Здравствуйте! Интересует: {name} {url}', 'Hello! I am interested in: {name} {url}');
  add('product.soldNote', 'product', 'Продано: пояснение', 'Эта вещь продана. Включай уведомления в канале, чтобы не пропустить новые поступления.', 'This piece is sold. Turn on notifications in the channel so you do not miss new arrivals.', { multi: true });
  add('product.reservedNote', 'product', 'Бронь: пояснение', 'Вещь забронирована. Если бронь снимут, она вернётся в продажу.', 'This piece is reserved. If the reservation is released, it goes back on sale.', { multi: true });
  add('product.reservedUntil', 'product', 'Бронь до даты ({date})', 'Вещь забронирована до {date}. Если её не выкупят, она вернётся в продажу.', 'This piece is reserved until {date}. If it is not bought out, it goes back on sale.', { multi: true });
  add('product.heldNote', 'product', 'Оформляется: пояснение ({min})', 'Эту вещь сейчас оформляет другой покупатель. Если он не оплатит, она вернётся в продажу примерно через {min} мин.', 'Someone is checking out this piece right now. If they do not pay, it is back on sale in about {min} min.', { multi: true });
  add('product.orderNote', 'product', 'Под заказ: пояснение', 'Под заказ: выкупим и привезём для тебя.', 'Made to order: we will buy it and ship it to you.', { multi: true });
  add('product.stockNote', 'product', 'Метка: единственный экземпляр', 'Единственный экземпляр', 'One of a kind');
  add('product.stockMany', 'product', 'В наличии: несколько ({n})', 'В наличии: {n} шт.', 'In stock: {n} pcs.');
  add('product.brand', 'product', 'Бренд', 'Бренд', 'Brand');
  add('product.condition', 'product', 'Состояние', 'Состояние', 'Condition');
  add('product.more', 'product', 'Блок «Ещё»', 'Ещё из этой категории', 'More from this category');
  add('product.copy', 'product', 'Копировать ссылку', 'Скопировать ссылку', 'Copy link');
  add('product.copied', 'product', 'Ссылка скопирована', 'Ссылка скопирована', 'Link copied');
  add('product.notfound', 'product', 'Вещь не найдена', 'Вещь не найдена или уже скрыта.', 'Piece not found or no longer listed.');
  add('product.terms', 'product', 'Заголовок условий на странице вещи', 'Бронь, оплата, доставка', 'Reservation, payment, delivery');

  /* ---- cart & checkout ---- */
  add('cart.title', 'cart', 'Корзина: заголовок', 'Корзина', 'Cart');
  add('cart.empty', 'cart', 'Корзина пуста', 'В корзине пусто.', 'Your cart is empty.');
  add('cart.remove', 'cart', 'Убрать', 'Убрать', 'Remove');
  add('cart.subtotal', 'cart', 'Сумма', 'Сумма', 'Subtotal');
  add('cart.discounts', 'cart', 'Скидки', 'Скидки (подтвердит менеджер)', 'Discounts (confirmed by the manager)');
  add('cart.total', 'cart', 'Итого', 'Итого', 'Total');
  add('cart.discount', 'cart', 'Скидка', 'Скидка', 'Discount');
  add('cart.promo', 'cart', 'Промокод: заголовок', 'Промокод', 'Promo code');
  add('cart.promoPh', 'cart', 'Промокод: подсказка в поле', 'Введи код', 'Enter the code');
  add('cart.promoApply', 'cart', 'Промокод: кнопка', 'Применить', 'Apply');
  add('cart.promoBad', 'cart', 'Промокод: не найден', 'Такого промокода нет или он больше не действует.', 'This code does not exist or has expired.');
  add('cart.promoOk', 'cart', 'Промокод: применён', 'Промокод применён', 'Promo code applied');
  add('cart.promoRemove', 'cart', 'Промокод: убрать', 'Убрать промокод', 'Remove the code');
  add('cart.heldLine', 'cart', 'Корзина: вещь оформляет другой ({min})', 'Сейчас оформляет другой покупатель, освободится через ~{min} мин.', 'Someone else is checking it out, free again in ~{min} min.');
  add('cart.checkout', 'cart', 'Кнопка: оформить', 'Оформить заказ', 'Checkout');
  add('cart.note', 'cart', 'Примечание под корзиной', 'Оплата переводом по реквизитам на следующем шаге. Доставка только по предоплате.', 'You pay by bank transfer on the next step. Shipping on prepayment only.', { multi: true });
  add('checkout.title', 'cart', 'Оформление: заголовок', 'Оформление', 'Checkout');
  add('checkout.name', 'cart', 'Поле: имя', 'Имя', 'Name');
  add('checkout.contact', 'cart', 'Поле: контакт', 'Telegram', 'Telegram');
  add('checkout.contactHint', 'cart', 'Контакт: подсказка', '@username: сюда напишет менеджер.', '@username: the manager will message you here.');
  add('checkout.phone', 'cart', 'Поле: телефон', 'Телефон', 'Phone');
  add('checkout.phoneBad', 'cart', 'Телефон: неполный номер', 'Нужен номер целиком: +7 и 10 цифр', 'Enter the full number: +7 and 10 digits');
  add('checkout.city', 'cart', 'Поле: город', 'Город', 'City');
  add('checkout.delivery', 'cart', 'Поле: доставка', 'Служба доставки', 'Delivery service');
  add('checkout.deliveryAny', 'cart', 'Доставка: выберу с менеджером', 'Выберу вместе с менеджером', 'Decide with the manager');
  add('checkout.address', 'cart', 'Поле: адрес', 'Адрес пункта выдачи', 'Pickup point address');
  add('checkout.addressLater', 'cart', 'Поле адреса, когда доставка не выбрана', '(если уже знаешь)', '(if you already know it)');
  add('checkout.addressPh', 'cart', 'Адрес: пример', 'Например: Краснодар, ул. Красная, 25, ПВЗ Ozon', 'For example: Krasnodar, Krasnaya st. 25, Ozon pickup point');
  add('checkout.comment', 'cart', 'Поле: комментарий', 'Комментарий', 'Comment');
  add('checkout.payment', 'cart', 'Оплата: заголовок', 'Оплата', 'Payment');
  add('checkout.payFull', 'cart', 'Оплата: полная', 'Полная предоплата', 'Full prepayment');
  add('checkout.payReserve', 'cart', 'Оплата: бронь ({days},{percent},{amount})', 'Бронь на {days} дн.: задаток {percent}% ({amount})', 'Reserve for {days} days: {percent}% deposit ({amount})');
  add('checkout.submit', 'cart', 'Кнопка: отправить заказ', 'Отправить заказ', 'Place order');
  add('checkout.toPay', 'cart', 'Кнопка: к оплате', 'К оплате', 'To payment');
  add('checkout.sending', 'cart', 'Отправка…', 'Отправляем…', 'Sending…');
  add('checkout.back', 'cart', 'Назад в корзину', 'Назад в корзину', 'Back to cart');
  add('checkout.required', 'cart', 'Ошибка: обязательное поле', 'Заполни это поле', 'Please fill in this field');
  add('checkout.err.sold', 'cart', 'Ошибка: вещь продана', 'Одна из вещей уже недоступна. Мы обновили корзину.', 'One of the pieces is no longer available. We refreshed your cart.');
  add('checkout.err.rate', 'cart', 'Ошибка: слишком много заказов', 'Слишком много заказов подряд. Попробуй позже или напиши менеджеру.', 'Too many orders in a row. Try again later or message the manager.');
  add('checkout.err.generic', 'cart', 'Ошибка: общая', 'Не получилось отправить заказ автоматически.', 'We could not send the order automatically.');
  add('checkout.err.manual', 'cart', 'Ошибка: отправить вручную', 'Отправить менеджеру вручную', 'Send it to the manager manually');
  add('checkout.err.held', 'cart', 'Ошибка: вещь оформляет другой ({min})', 'Эту вещь сейчас оформляет другой покупатель. Если он не оплатит, она освободится примерно через {min} мин.', 'Someone else is checking out this piece. If they do not pay, it is free again in about {min} min.', { multi: true });
  add('checkout.err.offline', 'cart', 'Ошибка: нет связи', 'Не получилось связаться с магазином. Проверь интернет и попробуй ещё раз.', 'Could not reach the shop. Check the connection and try again.');
  add('pay.title', 'cart', 'Оплата: заголовок', 'Оплата', 'Payment');
  add('pay.back', 'cart', 'Оплата: назад', 'Назад к данным', 'Back to details');
  add('pay.holding', 'cart', 'Кнопка: закрепляем вещь', 'Закрепляем вещь…', 'Holding the piece…');
  add('pay.held', 'cart', 'Вещь закреплена ({time})', 'Вещь закреплена за тобой ещё {time}. Переведи деньги и отправь чек.', 'The piece is held for you for {time}. Transfer the money and send the receipt.');
  add('pay.heldMany', 'cart', 'Вещи закреплены ({time})', 'Вещи закреплены за тобой ещё {time}. Переведи деньги и отправь чек.', 'The pieces are held for you for {time}. Transfer the money and send the receipt.');
  add('pay.expired', 'cart', 'Закрепление закончилось', 'Время закрепления вышло. Если ещё не переводил(а) деньги, закрепи вещь снова.', 'The hold has ended. If you have not paid yet, hold the piece again.');
  add('pay.rehold', 'cart', 'Кнопка: закрепить снова', 'Закрепить снова', 'Hold again');
  add('pay.leadFull', 'cart', 'Оплата: полная', 'Переведи полную сумму', 'Transfer the full amount');
  add('pay.leadReserve', 'cart', 'Оплата: задаток', 'Переведи задаток за бронь', 'Transfer the reservation deposit');
  add('pay.bank', 'cart', 'Реквизиты: банк', 'Банк', 'Bank');
  add('pay.recipient', 'cart', 'Реквизиты: получатель', 'Получатель', 'Recipient');
  add('pay.details', 'cart', 'Реквизиты: номер', 'Номер для перевода', 'Transfer to');
  add('pay.sum', 'cart', 'Реквизиты: сумма', 'Сумма перевода', 'Amount');
  add('pay.copy', 'cart', 'Кнопка: копировать', 'Копировать', 'Copy');
  add('pay.copied', 'cart', 'Скопировано', 'Скопировано', 'Copied');
  add('pay.now', 'cart', 'Оплатить сейчас', 'Оплатить сейчас', 'Pay now');
  add('pay.fromBank', 'cart', 'Поле: банк плательщика', 'Банк, с которого перевод', 'Bank you paid from');
  add('pay.fromBankPh', 'cart', 'Банк плательщика: пример', 'Например, Сбер', 'For example, Sber');
  add('pay.receipt', 'cart', 'Поле: чек', 'Чек об оплате', 'Payment receipt');
  add('pay.receiptPick', 'cart', 'Чек: выбрать файл', 'Прикрепить фото или PDF', 'Attach a photo or PDF');
  add('pay.receiptBig', 'cart', 'Чек: слишком большой', 'Файл больше 6 МБ. Сделай скриншот поменьше.', 'The file is over 6 MB. Try a smaller screenshot.');
  add('pay.receiptNeed', 'cart', 'Чек: не прикреплён', 'Прикрепи чек', 'Attach the receipt');
  add('pay.submit', 'cart', 'Кнопка: отправить заказ и чек', 'Отправить заказ и чек', 'Send order and receipt');
  add('pay.manualHint', 'cart', 'Подсказка: заказ уйдёт сообщением', 'После перевода нажми кнопку: откроется чат с менеджером с готовым текстом заказа. Чек приложи туда же.', 'After the transfer press the button: a chat with the manager opens with the order text ready. Attach the receipt there.', { multi: true });
  add('done.title', 'cart', 'Заказ принят: заголовок', 'Заказ принят', 'Order received');
  add('done.number', 'cart', 'Номер заказа', 'Номер заказа', 'Order number');
  add('done.text', 'cart', 'Заказ принят: текст', 'Осталось отправить заказ менеджеру: нажми кнопку ниже, текст уже готов. Чек об оплате приложи в том же чате.', 'One last step: send the order to the manager with the button below, the text is ready. Attach the payment receipt in the same chat.', { multi: true });
  add('done.sent', 'cart', 'Заказ отправлен: текст', 'Заказ и чек у менеджера. Он проверит оплату и напишет тебе в Telegram.', 'The manager has your order and receipt. They will check the payment and message you on Telegram.', { multi: true });
  add('done.problem', 'cart', 'Заказ: вещь уже ушла', 'Эту вещь только что купил другой покупатель. Твой заказ и чек уже у менеджера: он свяжется с тобой, вернёт деньги или предложит замену.', 'Another buyer has just bought this piece. Your order and receipt are with the manager: they will contact you to refund or offer a replacement.', { multi: true });
  add('done.open', 'cart', 'Кнопка: написать менеджеру', 'Написать менеджеру', 'Message the manager');
  add('done.msg', 'cart', 'Сообщение менеджеру после заказа ({number}, {items}, {amount})', 'Здравствуйте! Пишу по заказу {number}: {items}. Оплачено: {amount}.', 'Hello! I am writing about order {number}: {items}. Paid: {amount}.', { multi: true });
  add('done.copy', 'cart', 'Кнопка: скопировать текст', 'Скопировать текст заказа', 'Copy order text');
  add('done.copied', 'cart', 'Скопировано', 'Скопировано', 'Copied');
  add('done.close', 'cart', 'Продолжить покупки', 'Продолжить покупки', 'Continue shopping');
  add('toast.cart', 'cart', 'Уведомление: добавлено в корзину', 'Добавлено в корзину', 'Added to cart');
  add('toast.fav', 'cart', 'Уведомление: в избранном', 'Добавлено в избранное', 'Saved to favourites');
  add('toast.unfav', 'cart', 'Уведомление: убрано из избранного', 'Убрано из избранного', 'Removed from favourites');

  /* ---- «Мои заказы» ---- */
  add('nav.account', 'nav', 'Меню: мои заказы', 'Мои заказы', 'My orders');
  add('acc.title', 'account', 'Заголовок', 'Мои заказы', 'My orders');
  add('acc.lead', 'account', 'Подзаголовок', 'Здесь видно, где твой заказ и когда его ждать.', 'See where your order is and when to expect it.');
  add('acc.hello', 'account', 'Подзаголовок в Telegram ({name})', 'Привет, {name}! Это твои заказы — их видишь только ты.', 'Hi, {name}! These are your orders, and only you can see them.');
  add('acc.outside', 'account', 'Открыто не в Telegram', 'Твои заказы живут в нашем Telegram-приложении. Регистрироваться не нужно — просто открой его, и мы сразу покажем все твои заказы.', 'Your orders live in our Telegram app. No sign-up needed: just open it and we will show you everything you ordered.');
  add('acc.openTg', 'account', 'Кнопка: открыть в Telegram', 'Открыть в Telegram', 'Open in Telegram');
  add('acc.loading', 'account', 'Загрузка', 'Загружаем твои заказы…', 'Loading your orders…');
  add('acc.empty', 'account', 'Заказов нет', 'Заказов пока нет. Загляни в каталог — вдруг там уже ждёт твоя вещь.', 'No orders yet. Take a look at the catalog: your piece may already be waiting.');
  add('acc.error', 'account', 'Ошибка загрузки', 'Не получилось загрузить заказы. Попробуй ещё раз чуть позже или напиши менеджеру — он всё подскажет.', 'Could not load your orders. Try again a bit later or message the manager, who will help.');
  add('acc.expired', 'account', 'Сессия устарела', 'Нужно обновить вход: закрой магазин и открой его снова.', 'Please sign in again: close the shop and open it once more.');
  add('acc.retry', 'account', 'Кнопка: ещё раз', 'Попробовать ещё раз', 'Try again');
  add('acc.progress', 'account', 'Шкала заказа (для экранного диктора)', 'Ход заказа', 'Order progress');
  add('acc.step.placed', 'account', 'Шаг: оформлен', 'Оформлен', 'Placed');
  add('acc.step.paid', 'account', 'Шаг: оплачен', 'Оплачен', 'Paid');
  add('acc.step.shipped', 'account', 'Шаг: отправлен', 'Отправлен', 'Shipped');
  add('acc.step.done', 'account', 'Шаг: получен', 'Получен', 'Received');
  add('acc.st.new', 'account', 'Статус: новый', 'Проверяем оплату', 'Checking payment');
  add('acc.st.reserved', 'account', 'Статус: бронь', 'Бронь', 'Reserved');
  add('acc.st.problem', 'account', 'Статус: возврат/замена', 'Нужна связь', 'Please get in touch');
  add('acc.st.paid', 'account', 'Статус: оплачен', 'Оплачен', 'Paid');
  add('acc.st.shipped', 'account', 'Статус: отправлен', 'Отправлен', 'Shipped');
  add('acc.st.done', 'account', 'Статус: выполнен', 'Получен', 'Received');
  add('acc.st.cancelled', 'account', 'Статус: отменён', 'Отменён', 'Cancelled');
  add('acc.note.new', 'account', 'Пояснение: новый', 'Оплату получили! Менеджер проверит чек и скоро напишет тебе.', 'We got your payment! The manager will check the receipt and message you soon.');
  add('acc.note.reserved', 'account', 'Пояснение: бронь ({date}, {left})', 'Задаток получили — вещь ждёт тебя до {date}. Осталось доплатить {left}.', 'Deposit received: the piece is waiting for you until {date}. {left} left to pay.');
  add('acc.note.problem', 'account', 'Пояснение: возврат/замена', 'Эту вещь, к сожалению, успели купить раньше. Менеджер напишет тебе: вернёт деньги или предложит замену.', 'Sadly, someone bought this piece first. The manager will message you to refund or offer another one.');
  add('acc.note.paid', 'account', 'Пояснение: оплачен', 'Оплата подтверждена — собираем заказ в дорогу.', 'Payment confirmed: we are getting your order ready to go.');
  add('acc.note.shipped', 'account', 'Пояснение: отправлен', 'Заказ уже в пути! Следить за ним можно по трек-номеру.', 'Your order is on its way! Follow it with the tracking number.');
  add('acc.note.shippedNoTrack', 'account', 'Пояснение: отправлен без трек-номера', 'Заказ уже в пути! Трек-номер появится здесь совсем скоро.', 'Your order is on its way! The tracking number will show up here very soon.');
  add('acc.note.done', 'account', 'Пояснение: выполнен', 'Заказ у тебя. Спасибо за покупку — носи с удовольствием!', 'Your order has arrived. Thanks for shopping with us, wear it well!');
  add('acc.note.cancelled', 'account', 'Пояснение: отменён', 'Этот заказ отменён. Если это ошибка — напиши менеджеру.', 'This order was cancelled. If that is a mistake, message the manager.');
  add('acc.fromShop', 'account', 'Сообщение менеджера: подпись', 'Сообщение от RELIKT', 'A note from RELIKT');
  add('acc.track', 'account', 'Трек-номер', 'Трек-номер', 'Tracking number');
  add('acc.trackOpen', 'account', 'Ссылка на отслеживание', 'Отследить посылку', 'Track the parcel');
  add('acc.copy', 'account', 'Кнопка: скопировать трек', 'Скопировать', 'Copy');
  add('acc.sent', 'account', 'Переведено (пока проверяем оплату)', 'Переведено', 'Sent');
  add('acc.paid', 'account', 'Оплачено', 'Оплачено', 'Paid');
  add('acc.deposit', 'account', 'Задаток', 'Задаток', 'Deposit');
  add('acc.left', 'account', 'Осталось доплатить', 'Осталось доплатить', 'Left to pay');
  add('acc.delivery', 'account', 'Доставка', 'Доставка', 'Delivery');
  add('acc.ask', 'account', 'Кнопка: вопрос по заказу', 'Вопрос по заказу', 'Ask about this order');
  add('acc.msg', 'account', 'Сообщение менеджеру ({number})', 'Привет! У меня вопрос по заказу {number}.', 'Hi! I have a question about order {number}.');
  add('done.sentTrack', 'cart', 'Заказ отправлен из Telegram: текст', 'Заказ и чек у менеджера: он проверит оплату и напишет тебе в Telegram. Статус заказа — всегда в «Мои заказы».', 'Your order and receipt are with the manager, who will check the payment and message you on Telegram. The status is always in “My orders”.');
  add('done.track', 'cart', 'Кнопка: мои заказы после заказа', 'Следить за заказом', 'Track this order');

  var I18N = { ru: {}, en: {} };
  T.forEach(function (t) { I18N.ru[t.k] = t.ru; I18N.en[t.k] = t.en; });

  root.RK_GROUPS = GROUPS;
  root.RK_TEXTS = T;
  root.RK_I18N = I18N;
})(typeof window !== 'undefined' ? window : this);
