'use strict';
/*
 * Telegram helpers (zero dependencies, Node >= 18).
 *  - fetchPosts():      reads the PUBLIC web view of a channel (https://t.me/s/<channel>)
 *  - postToProduct():   turns one channel post into a catalog product
 *  - downloadImage():   saves a post photo into uploads/ (resized to WebP if `sharp` is installed)
 *
 * Post format understood (taken from the real channel):
 *   "Новая футболка Ed Hardy"            first line = title ("Новый/Новая/Новое/Новые" => condition: new)
 *   "(доступна под заказ xs-xl)"         => made to order, sizes XS..XL
 *   "3️⃣7️⃣🕖🕖"                          price written with keycap digits; 🕖 stands for a zero => 3700
 *   "#relikt_instock"                    => in stock
 *   "Продано"                            => sold
 */
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (compatible; ReliktStore/1.0)';
let sharp = null;
try { sharp = require('sharp'); } catch (e) { /* optional */ }

/* ---------- html helpers ---------- */
const ENT = { '&quot;': '"', '&#39;': "'", '&amp;': '&', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' };
function decode(s) {
  return s.replace(/&(?:quot|#39|amp|lt|gt|nbsp);/g, m => ENT[m])
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)));
}
function htmlToText(raw) {
  return decode(raw.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')).replace(/⠀/g, ' ').trim();
}

/* ---------- reading the public feed ---------- */
function parseFeed(html) {
  const out = [];
  const parts = html.split('<div class="tgme_widget_message_wrap');
  parts.shift();
  for (const p of parts) {
    const id = (p.match(/data-post="[^/"]+\/(\d+)"/) || [])[1];
    if (!id) continue;
    const rawText = (p.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/) || [])[1] || '';
    const photos = [...p.matchAll(/tgme_widget_message_photo_wrap[^>]*style="[^"]*background-image:url\('([^']+)'\)/g)].map(m => m[1]);
    out.push({
      id: +id,
      date: (p.match(/<time[^>]*datetime="([^"]+)"/) || [])[1] || null,
      text: htmlToText(rawText),
      photos
    });
  }
  return out;
}

async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru,en;q=0.8' } });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
  return res.text();
}

async function fetchPosts(channel, opts) {
  opts = opts || {};
  const maxPages = opts.maxPages || 40;
  const all = new Map();
  let before = null;
  for (let page = 0; page < maxPages; page++) {
    const html = await getText('https://t.me/s/' + encodeURIComponent(channel) + (before ? '?before=' + before : ''));
    const posts = parseFeed(html);
    if (!posts.length) break;
    posts.forEach(p => all.set(p.id, p));
    const min = Math.min.apply(null, posts.map(p => p.id));
    if (before && min >= before) break;
    before = min;
    if (min <= 1) break;
  }
  return [...all.values()].sort((a, b) => a.id - b.id);
}

/* ---------- parsing a post ---------- */
const KEYCAP = '(?:\\d\\uFE0F?\\u20E3)';
const PRICE_RE = new RegExp('((?:' + KEYCAP + '|\\u{1F556})+)', 'gu');

function parsePrice(text) {
  const matches = text.match(PRICE_RE) || [];
  for (const m of matches) {
    let digits = '';
    for (const ch of Array.from(m)) {
      if (ch === '\u{1F556}') digits += '0';
      else if (/\d/.test(ch)) digits += ch;
    }
    const v = parseInt(digits, 10);
    if (v >= 100) return v; // ignore stray "3️⃣" bullets in info posts
  }
  const plain = text.match(/(\d[\d\s]{2,7})\s*(?:₽|руб|р\.|р\b)/i);
  if (plain) { const v = parseInt(plain[1].replace(/\s/g, ''), 10); if (v >= 100) return v; }
  return null;
}

const SIZE_ORDER = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl'];
function expandSizes(a, b) {
  const i = SIZE_ORDER.indexOf(a.toLowerCase()), j = b ? SIZE_ORDER.indexOf(b.toLowerCase()) : i;
  if (i < 0 || j < 0) return [];
  return SIZE_ORDER.slice(Math.min(i, j), Math.max(i, j) + 1).map(s => s.toUpperCase());
}
const SIZE_TOKEN = '(xxs|xs|s|m|l|xl|xxl)';
const SIZE_RANGE_RE = new RegExp('(?:^|[\\s(])' + SIZE_TOKEN + '(?:\\s*[-–]\\s*' + SIZE_TOKEN + ')?(?=$|[\\s).,])', 'i');

const BRANDS = ['Ed Hardy', 'Juicy Couture', 'Dolls Kill', 'Roberto Cavalli', 'Paul Frank', 'True Religion', 'Playboy',
  'Melanie Martinez', 'TCH', 'Christian Audigier', 'Urban Outfitters', 'Polo Ralph Lauren', 'Balenciaga',
  'Adidas', 'Superdry', 'Hollister', 'Abercrombie & Fitch'];

function detectBrand(title) {
  const found = [];
  for (const b of BRANDS) {
    const re = new RegExp('(^|[^a-z])' + b.replace(/ /g, '\\s+') + '(\\s+type)?(?![a-z])', 'i');
    const m = title.match(re);
    if (m) found.push({ at: m.index, name: b + (m[2] ? ' type' : '') });
  }
  found.sort((a, b) => a.at - b.at);
  return found.map(f => f.name).join(' × ');
}

/* "ed hardy" -> "Ed Hardy", "polo ralph lauren type" -> "Polo Ralph Lauren type" */
function canonBrands(t) {
  for (const b of BRANDS) {
    const re = new RegExp('(^|[^A-Za-zА-Яа-я])' + b.replace(/ /g, '\\s+') + '(?![A-Za-z])', 'gi');
    t = t.replace(re, (m, pre) => pre + b);
  }
  return t;
}

/* category keywords -> category id (first match wins, order matters) */
const CATEGORY_RULES = [
  ['bags', /сумк|сумоч|рюкзак/i],
  ['sets', /костюм|комплект|платье|комбинезон|юбк/i],
  ['bottoms', /штаны|брюки|джинсы|шорты|лосины/i],
  ['jackets', /олимпийк|ветровк|бомбер|куртк|пальто|жилет/i],
  ['outerwear', /зипк|худи|кофт|толстовк|свитшот/i],
  ['tops', /футболк|майк|лонгслив|топ\b|рубашк/i]
];
function detectCategory(title) {
  for (const [id, re] of CATEGORY_RULES) if (re.test(title)) return id;
  return 'tops';
}

/* Russian garment words -> English, longest phrases first. Anything left in Cyrillic is
   returned as-is and can be fixed in the admin panel. */
const EN_RULES = [
  [/дутая куртка-бомбер с мраморным камо/i, 'Puffer bomber jacket, marble camo'],
  [/куртка-бомбер/i, 'Bomber jacket'],
  [/редкий винтажный костюм/i, 'Rare vintage suit'],
  [/редкая винтажная футболка/i, 'Rare vintage T-shirt'],
  [/лонгслив с флагом великобритании/i, 'Union Jack long sleeve'],
  [/кофта с капюшоном/i, 'Hoodie'], [/кропнутая зипка/i, 'Cropped zip jacket'], [/олимпийка/i, 'Track jacket'], [/ветровка/i, 'Windbreaker'], [/бомбер/i, 'Bomber jacket'],
  [/штаны/i, 'Pants'], [/шорты/i, 'Shorts'], [/сумочка/i, 'Handbag'], [/сумка/i, 'Bag'],
  [/костюм/i, 'Suit'], [/платье/i, 'Dress'], [/комбинезон/i, 'Jumpsuit'], [/футболка/i, 'T-shirt'],
  [/лонгслив/i, 'Long sleeve'], [/майка/i, 'Tank top'], [/зипка/i, 'Zip hoodie'], [/худи/i, 'Hoodie'], [/кофта/i, 'Top'],
  [/мерч/i, 'merch'], [/редкая/i, 'Rare'], [/редкий/i, 'Rare'], [/винтажная/i, 'vintage'], [/винтажный/i, 'vintage']
];
function toEnglish(ru) {
  let s = ru;
  for (const [re, en] of EN_RULES) s = s.replace(re, en);
  return s.replace(/\s+/g, ' ').trim();
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
}

/* Returns a product draft (without images) or null when the post is not a product. */
function postToProduct(post) {
  const text = post.text || '';
  if (!post.photos || !post.photos.length) return null;
  const sold = /продано/i.test(text);
  const price = sold ? null : parsePrice(text);
  if (!sold && price == null) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let title = lines[0] || '';
  let availability = sold ? 'sold' : 'instock';
  let condition = '';
  let sizes = [];
  let sizesMode = 'none';
  const extra = [];
  let morePhotos = false;

  if (/^нов(ый|ая|ое|ые)\s/i.test(title)) { condition = 'new'; title = title.replace(/^нов(ый|ая|ое|ые)\s+/i, ''); }
  if (/винтаж/i.test(title)) condition = condition || 'vintage';

  // sizes written inside the title, e.g. "Платье Dolls Kill s-m"
  const tm = title.match(SIZE_RANGE_RE);
  if (tm && /\s(xxs|xs|s|m|l|xl|xxl)(\s*[-–]\s*(xxs|xs|s|m|l|xl|xxl))?\s*$/i.test(title)) {
    sizes = [tm[2] ? (tm[1] + '–' + tm[2]).toUpperCase() : tm[1].toUpperCase()];
    sizesMode = 'label';
    title = title.replace(/\s+(xxs|xs|s|m|l|xl|xxl)(\s*[-–]\s*(xxs|xs|s|m|l|xl|xxl))?\s*$/i, '');
  }

  for (const line of lines.slice(1)) {
    if (/^#/.test(line) || /купить\s*\/\s*спросить/i.test(line) || /продано/i.test(line) || /открыть в каталоге/i.test(line) || /^[\p{Extended_Pictographic}\s️⃣\d]+$/u.test(line)) continue;
    if (/доп\.?\s*фото/i.test(line)) { morePhotos = true; continue; }
    const paren = line.match(/^\((.*)\)$/);
    if (paren) {
      const inner = paren[1];
      if (/под\s+заказ/i.test(inner)) {
        if (!sold) availability = 'order';
        const sm = inner.match(SIZE_RANGE_RE);
        if (sm) { sizes = expandSizes(sm[1], sm[2]); sizesMode = 'list'; }
        continue;
      }
    }
    if (PRICE_RE.test(line)) { PRICE_RE.lastIndex = 0; continue; }
    PRICE_RE.lastIndex = 0;
    extra.push(line);
  }

  title = cap(canonBrands(title.replace(/\s+/g, ' ').trim()).replace(/\s[xх]\s/gi, ' × '));
  const brand = detectBrand(title);
  const en = cap(toEnglish(title));
  const descRu = [extra.join(' '), morePhotos ? 'Дополнительные фото в комментариях к посту в Telegram.' : ''].filter(Boolean).join(' ');
  const descEn = [extra.length && extra.join(' ') === 'Лонгслив и yoga pant' ? 'Long sleeve and yoga pants.' : '', morePhotos ? 'More photos are in the comments of the Telegram post.' : ''].filter(Boolean).join(' ');

  return {
    ru: title,
    en,
    brand,
    category: detectCategory(title),
    price,
    availability,
    stock: availability === 'instock' ? 1 : 0,
    condition,
    sizes,
    sizesMode,
    descRu,
    descEn,
    tgPost: post.id,
    createdAt: post.date || new Date().toISOString(),
    photos: post.photos
  };
}

/* ---------- images ---------- */
async function downloadImage(url, destDir, baseName) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('image HTTP ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  const type = (res.headers.get('content-type') || '').toLowerCase();
  if (!/^image\/(jpeg|png|webp)/.test(type)) throw new Error('not an image: ' + type);
  fs.mkdirSync(destDir, { recursive: true });
  if (sharp) {
    const file = baseName + '.webp';
    await sharp(buf).rotate().resize({ width: 1200, height: 1500, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(destDir, file));
    return '/uploads/' + file;
  }
  const ext = type.includes('png') ? '.png' : type.includes('webp') ? '.webp' : '.jpg';
  fs.writeFileSync(path.join(destDir, baseName + ext), buf);
  return '/uploads/' + baseName + ext;
}

module.exports = { fetchPosts, postToProduct, downloadImage, slugify, parsePrice, detectCategory, hasSharp: () => !!sharp };
