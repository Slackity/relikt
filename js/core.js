/*
 * RELIKT data rules, shared by the admin panel (browser) and tools/import-channel.js (Node).
 * The whole shop lives in data/store.json: products, categories, settings, text overrides.
 * Every change goes through these functions so the file always stays valid.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RKCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_SETTINGS = {
    channel: 'relikt_store',
    manager: 'bloodydisaster',
    reviews: 'relikt_feedback',
    currency: '₽',
    reservePercent: 20,
    reserveDays: 3,
    banner: { on: false, ru: '', en: '' },
    delivery: [
      { id: 'ozon', ru: 'Ozon', en: 'Ozon' },
      { id: 'wb', ru: 'Wildberries', en: 'Wildberries' },
      { id: 'cdek', ru: 'СДЭК', en: 'CDEK' },
      { id: '5post', ru: '5post', en: '5post' },
      { id: 'yandex', ru: 'Яндекс Доставка', en: 'Yandex Delivery' },
      { id: 'post', ru: 'Почта России', en: 'Russian Post' },
      { id: 'avito', ru: 'Авито', en: 'Avito' }
    ],
    discounts: [
      { id: 'boost', ru: 'Буст канала', en: 'Channel boost', percent: 5 },
      { id: 'friend', ru: 'Приведи друга', en: 'Referred a friend', percent: 15 }
    ],
    promos: [],
    payment: { bank: '', recipient: '', details: '', note: '' },
    orderWebhook: '',
    orderSecret: '',
    miniAppUrl: '',
    postButtons: false,   // the bot answers a new channel post with a piece by a message with an «Открыть в каталоге» button
    autoImport: '',       // a new channel post with a price starts the import: '' off, 'draft' or 'publish'
    sale: { on: false, percent: 10 },   // store-wide discount: every piece is that much cheaper while it is on
    adminIds: []
  };

  var DEFAULT_CATEGORIES = [
    { id: 'tops', ru: 'Футболки и майки', en: 'Tees & tanks', subRu: 'Футболки, лонгсливы, майки', subEn: 'Tees, long sleeves, tank tops' },
    { id: 'outerwear', ru: 'Куртки и худи', en: 'Jackets & hoodies', subRu: 'Бомберы, зипки, худи', subEn: 'Bombers, zip-ups, hoodies' },
    { id: 'bottoms', ru: 'Штаны и шорты', en: 'Pants & shorts', subRu: 'Штаны, шорты', subEn: 'Pants, shorts' },
    { id: 'sets', ru: 'Костюмы', en: 'Sets', subRu: 'Костюмы и комплекты', subEn: 'Suits and matching sets' },
    { id: 'dresses', ru: 'Платья и комбинезоны', en: 'Dresses & jumpsuits', subRu: 'Платья, комбинезоны', subEn: 'Dresses, jumpsuits' },
    { id: 'bags', ru: 'Сумки', en: 'Bags', subRu: 'Сумки и сумочки', subEn: 'Handbags and shoulder bags' }
  ];

  // reserved: a buyer paid the deposit (set by the order Worker, released from the Orders tab)
  var AVAILABILITY = ['instock', 'order', 'reserved', 'sold'];
  var CONDITIONS = ['', 'new', 'vintage', 'used'];
  var IMAGE_RE = /^\/uploads\/[A-Za-z0-9._-]+$/;

  /* ---------- small helpers ---------- */
  function str(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max); }
  function int(v, min, max, dflt) { var n = Math.round(Number(v)); return isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt; }
  function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }
  function handle(v) { return str(v, 40).replace(/^@/, '').replace(/^https?:\/\/t\.me\//i, '').replace(/[^A-Za-z0-9_]/g, ''); }
  function rid(n) {
    var bytes = [];
    var c = typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto : null;
    if (c) bytes = Array.prototype.slice.call(c.getRandomValues(new Uint8Array(n || 4)));
    else bytes = Array.prototype.slice.call(require('crypto').randomBytes(n || 4));
    return bytes.map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* The sale on a piece: its own discount or the store-wide one, whichever is bigger (the site has the same rule in js/app.js). */
  function discountOf(p, settings) {
    var sale = (settings && settings.sale) || {};
    if (!p || p.price == null) return 0;
    return Math.min(90, Math.max(0, Number(p.discount) || 0, sale.on ? Number(sale.percent) || 0 : 0));
  }
  // rounded down to whole tens of rubles: in the buyer's favour (3 490 ₽ −15% = 2 966.5 → 2 960 ₽)
  function salePrice(p, settings) { var d = discountOf(p, settings); return p.price == null ? null : d ? Math.floor(p.price * (100 - d) / 1000) * 10 : p.price; }
  function err(code, message) { var e = new Error(message || code); e.code = code; return e; }

  /* ---------- whole file ---------- */
  function normalize(data) {
    var d = data && typeof data === 'object' ? data : {};
    d.version = 2;
    d.settings = Object.assign(clone(DEFAULT_SETTINGS), d.settings || {});
    d.settings.payment = Object.assign(clone(DEFAULT_SETTINGS.payment), d.settings.payment || {});
    d.settings.sale = Object.assign(clone(DEFAULT_SETTINGS.sale), d.settings.sale || {});
    ['delivery', 'discounts', 'promos', 'adminIds'].forEach(function (k) { if (!Array.isArray(d.settings[k])) d.settings[k] = clone(DEFAULT_SETTINGS[k]); });
    delete d.settings.notifyChatId;
    d.categories = Array.isArray(d.categories) && d.categories.length ? d.categories : clone(DEFAULT_CATEGORIES);
    d.products = Array.isArray(d.products) ? d.products : [];
    d.content = d.content && typeof d.content === 'object' ? d.content : {};
    d.content.ru = d.content.ru || {}; d.content.en = d.content.en || {};
    d.deletedTgPosts = Array.isArray(d.deletedTgPosts) ? d.deletedTgPosts : [];
    return d;
  }

  /* what the shop pages use: drafts are left out */
  function publicView(data) {
    var d = normalize(clone(data));
    d.products = d.products.filter(function (p) { return p.visible; });
    delete d.deletedTgPosts;
    return d;
  }

  /* ---------- products ---------- */
  function uniqueSlug(d, base, selfId) {
    var slug = slugify(base) || 'item', n = 2, out = slug;
    while (d.products.some(function (p) { return p.slug === out && p.id !== selfId; })) out = slug + '-' + n++;
    return out;
  }

  function cleanProduct(d, input, prev) {
    prev = prev || {};
    var has = function (k) { return Object.prototype.hasOwnProperty.call(input, k); };
    var pick = function (k) { return input[k] != null ? input[k] : prev[k]; };
    var cats = d.categories.map(function (c) { return c.id; });
    var images = (Array.isArray(input.images) ? input.images : prev.images || [])
      .map(function (u) { return str(u, 200); }).filter(function (u) { return IMAGE_RE.test(u); }).slice(0, 12);
    var availability = AVAILABILITY.indexOf(input.availability) >= 0 ? input.availability : prev.availability || 'instock';
    var price = function (k) { return has(k) ? (input[k] === '' || input[k] == null ? null : int(input[k], 0, 10000000, null)) : (prev[k] == null ? null : prev[k]); };
    var now = new Date().toISOString();
    var p = {
      id: prev.id || input.id || 'p' + rid(4),
      ru: str(pick('ru'), 160),
      en: str(pick('en'), 160),
      brand: str(pick('brand'), 80),
      category: cats.indexOf(input.category) >= 0 ? input.category : (cats.indexOf(prev.category) >= 0 ? prev.category : cats[0]),
      price: price('price'),
      oldPrice: price('oldPrice'),
      discount: int(has('discount') ? input.discount : prev.discount || 0, 0, 90, 0),   // % off this piece
      availability: availability,
      reservedUntil: availability === 'reserved' ? str(input.reservedUntil != null ? input.reservedUntil : prev.reservedUntil, 40) : '',
      // back in stock from sold / made to order without a number: one piece
      stock: availability === 'instock' ? int(input.stock != null ? input.stock : prev.availability === 'instock' ? prev.stock : 1, 0, 999, 1) : 0,
      condition: CONDITIONS.indexOf(input.condition) >= 0 ? input.condition : prev.condition || '',
      sizes: (Array.isArray(input.sizes) ? input.sizes : prev.sizes || []).map(function (x) { return str(x, 12); }).filter(Boolean).slice(0, 14),
      descRu: str(pick('descRu'), 1200),
      descEn: str(pick('descEn'), 1200),
      images: images,
      visible: input.visible != null ? !!input.visible : prev.visible != null ? !!prev.visible : true,
      featured: input.featured != null ? !!input.featured : !!prev.featured,
      tgPost: input.tgPost != null ? int(input.tgPost, 0, 1e9, null) || null : prev.tgPost || null,
      createdAt: prev.createdAt || str(input.createdAt, 40) || now,
      updatedAt: now
    };
    // buyers' holds on the payment step belong to the order Worker: an edit here keeps the ones still running
    var holds = (Array.isArray(prev.holds) ? prev.holds : []).filter(function (x) { return x && typeof x.k === 'string' && Date.parse(x.u) > Date.now(); })
      .map(function (x) { return { k: str(x.k, 64), q: int(x.q, 1, 999, 1), u: str(x.u, 40) }; });
    if (holds.length && p.availability === 'instock') p.holds = holds;
    if (!p.ru && !p.en) throw err('NAME', 'Name is required');
    if (!p.ru) p.ru = p.en;
    if (!p.en) p.en = p.ru;
    if (p.availability === 'instock' && p.stock === 0) p.availability = 'sold';
    p.slug = uniqueSlug(d, prev.slug || input.slug || p.en + (p.tgPost ? '-' + p.tgPost : ''), p.id);
    return p;
  }

  function upsertProduct(d, input) {
    var prev = input.id ? d.products.filter(function (x) { return x.id === input.id; })[0] : null;
    var p = cleanProduct(d, input, prev);
    if (prev) d.products[d.products.indexOf(prev)] = p;
    else d.products.unshift(p);
    return p;
  }

  function deleteProduct(d, id) {
    var i = d.products.findIndex(function (p) { return p.id === id; });
    if (i < 0) throw err('NOT_FOUND', 'Not found');
    var p = d.products.splice(i, 1)[0];
    // remember the post so the next import does not bring the product back
    if (p.tgPost && d.deletedTgPosts.indexOf(p.tgPost) < 0) d.deletedTgPosts.push(p.tgPost);
    return p;
  }

  /* ---------- categories ---------- */
  function setCategories(d, list) {
    if (!Array.isArray(list) || !list.length || list.length > 24) throw err('CATS', 'Need 1–24 categories');
    var seen = {};
    var out = list.map(function (c) {
      var id = slugify(c.id || c.en || c.ru) || 'cat' + rid(2);
      while (seen[id]) id += '-' + rid(1);
      seen[id] = true;
      var ru = str(c.ru, 60), en = str(c.en, 60);
      if (!ru && !en) throw err('CAT_NAME', 'Category name is required');
      return { id: id, ru: ru || en, en: en || ru, subRu: str(c.subRu, 120), subEn: str(c.subEn, 120) };
    });
    // products of a removed category move to the first one
    d.products.forEach(function (p) { if (!seen[p.category]) p.category = out[0].id; });
    d.categories = out;
    return out;
  }

  /* ---------- settings ---------- */
  function setSettings(d, input) {
    var s = d.settings, next = Object.assign({}, s);
    if (input.channel != null) next.channel = handle(input.channel) || s.channel;
    if (input.manager != null) next.manager = handle(input.manager) || s.manager;
    if (input.reviews != null) next.reviews = handle(input.reviews) || s.reviews;
    if (input.currency != null) next.currency = str(input.currency, 6) || '₽';
    if (input.reservePercent != null) next.reservePercent = int(input.reservePercent, 0, 100, 20);
    if (input.reserveDays != null) next.reserveDays = int(input.reserveDays, 0, 60, 3);
    if (input.banner) next.banner = { on: !!input.banner.on, ru: str(input.banner.ru, 200), en: str(input.banner.en, 200) };
    if (Array.isArray(input.delivery)) {
      next.delivery = input.delivery.slice(0, 16).map(function (x) { return { id: slugify(x.id || x.en || x.ru) || 'd' + rid(2), ru: str(x.ru, 40), en: str(x.en || x.ru, 40) }; }).filter(function (x) { return x.ru; });
    }
    if (Array.isArray(input.discounts)) {
      next.discounts = input.discounts.slice(0, 8).map(function (x) { return { id: slugify(x.id || x.en || x.ru) || 'd' + rid(2), ru: str(x.ru, 60), en: str(x.en || x.ru, 60), percent: int(x.percent, 0, 90, 0) }; }).filter(function (x) { return x.ru; });
    }
    if (Array.isArray(input.promos)) {
      var codes = {};
      next.promos = input.promos.slice(0, 50).map(function (x) {
        var type = x.type === 'amount' ? 'amount' : 'percent';
        return { code: str(x.code, 24).toUpperCase().replace(/\s+/g, ''), type: type, value: type === 'percent' ? int(x.value, 0, 90, 0) : int(x.value, 0, 1000000, 0), active: x.active !== false };
      }).filter(function (x) { if (!x.code || !x.value || codes[x.code]) return false; codes[x.code] = true; return true; });
    }
    if (input.payment) {
      next.payment = { bank: str(input.payment.bank, 60), recipient: str(input.payment.recipient, 80), details: str(input.payment.details, 120), note: str(input.payment.note, 300) };
    }
    if (input.orderWebhook != null) {
      var w = str(input.orderWebhook, 200);
      if (w && !/^https?:\/\//i.test(w)) w = 'https://' + w;
      if (w && !/^https:\/\/[^\s/$.?#][^\s]*$/i.test(w)) throw err('WEBHOOK', 'The Worker address must start with https://');
      next.orderWebhook = w.replace(/\/+$/, '');
    }
    if (input.orderSecret != null) next.orderSecret = str(input.orderSecret, 120);
    if (input.miniAppUrl != null) {
      // t.me/<bot> (main Mini App) or t.me/<bot>/<app>; product links add ?startapp=p_<slug>
      var m = str(input.miniAppUrl, 200).replace(/^@/, '').replace(/^(https?:\/\/)?(t\.me|telegram\.me)\//i, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
      if (m && !/^[A-Za-z0-9_]{4,32}(\/[A-Za-z0-9_]{3,30})?$/.test(m)) throw err('MINIAPP', 'Mini App link must look like t.me/your_bot or t.me/your_bot/app');
      next.miniAppUrl = m ? 'https://t.me/' + m : '';
    }
    if (input.postButtons != null) next.postButtons = !!input.postButtons;
    if (input.sale) next.sale = { on: !!input.sale.on, percent: int(input.sale.percent, 1, 90, 10) };
    if (input.autoImport != null) next.autoImport = input.autoImport === 'draft' || input.autoImport === 'publish' ? input.autoImport : '';
    if (input.adminIds != null) {
      var ids = Array.isArray(input.adminIds) ? input.adminIds : String(input.adminIds).split(/[\s,;]+/);
      next.adminIds = ids.map(function (x) { return String(x).replace(/\D/g, ''); }).filter(Boolean).slice(0, 10);
    }
    d.settings = next;
    return next;
  }

  /* Text overrides are stored as typed. The site escapes them on output (textContent / RK.safeHtml). */
  function setContent(d, input) {
    var out = { ru: {}, en: {} };
    ['ru', 'en'].forEach(function (lang) {
      var src = (input && input[lang]) || {};
      Object.keys(src).slice(0, 600).forEach(function (k) {
        if (!/^[a-z0-9._-]{1,60}$/i.test(k)) return;
        var v = str(src[k], 2000);
        if (v) out[lang][k] = v;
      });
    });
    d.content = out;
    return out;
  }

  return {
    DEFAULT_SETTINGS: DEFAULT_SETTINGS, DEFAULT_CATEGORIES: DEFAULT_CATEGORIES, AVAILABILITY: AVAILABILITY, CONDITIONS: CONDITIONS,
    normalize: normalize, publicView: publicView, cleanProduct: cleanProduct, upsertProduct: upsertProduct, deleteProduct: deleteProduct,
    setCategories: setCategories, setSettings: setSettings, setContent: setContent, discountOf: discountOf, salePrice: salePrice, slugify: slugify, str: str, int: int, rid: rid, clone: clone
  };
});
