'use strict';
/*
 * Pulls products from the public Telegram channel into data/store.json, photos into uploads/.
 * Runs on GitHub (the "Import from Telegram" button in the admin panel starts .github/workflows/import.yml)
 * or on your computer:  node tools/import-channel.js [--publish] [--channel name]
 *  - posts already imported (or deleted by you in the admin panel) are skipped
 *  - posts later marked "Продано" flip the existing product to sold
 *  - new products are drafts (hidden) unless --publish is given
 * Writes data/import-report.json, which the admin panel shows when the run is over.
 */
const fs = require('fs');
const path = require('path');
const T = require('./telegram');
const Core = require('../js/core');

const ROOT = path.join(__dirname, '..');
const STORE = path.join(ROOT, 'data', 'store.json');
const REPORT = path.join(ROOT, 'data', 'import-report.json');
const UPLOADS = path.join(ROOT, 'uploads');

const args = process.argv.slice(2);
const publish = args.includes('--publish');
const ci = args.indexOf('--channel');

async function pool(items, limit, fn) {
  const queue = items.slice();
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift());
  }));
}

function writeJson(file, data) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

(async () => {
  const d = Core.normalize(JSON.parse(fs.readFileSync(STORE, 'utf8')));
  const channel = ci >= 0 ? args[ci + 1] : d.settings.channel;
  const posts = await T.fetchPosts(channel);
  console.log('Fetched ' + posts.length + ' posts from @' + channel);

  const known = new Map(d.products.filter(p => p.tgPost).map(p => [p.tgPost, p]));
  const deleted = new Set(d.deletedTgPosts);
  const report = { at: new Date().toISOString(), channel, posts: posts.length, added: [], markedSold: [], skipped: 0, imageErrors: 0, published: publish };

  const fresh = [];
  for (const post of posts) {
    const draft = T.postToProduct(post);
    if (!draft) { report.skipped++; continue; }
    const existing = known.get(post.id);
    if (existing) {
      if (draft.availability === 'sold' && existing.availability !== 'sold') {
        Core.upsertProduct(d, { id: existing.id, availability: 'sold' });
        report.markedSold.push(existing.ru);
      }
      continue;
    }
    if (!deleted.has(post.id)) fresh.push(draft);
  }

  await pool(fresh, 3, async (draft) => {
    const images = [];
    for (const [i, url] of draft.photos.slice(0, 6).entries()) {
      try { images.push(await T.downloadImage(url, UPLOADS, 'tg' + draft.tgPost + '-' + (i + 1))); }
      catch (e) { report.imageErrors++; console.log('  image failed for post ' + draft.tgPost + ': ' + e.message); }
    }
    if (!images.length) { report.skipped++; return; }
    const { photos, sizesMode, ...fields } = draft;
    const p = Core.upsertProduct(d, Object.assign(fields, { images, visible: publish }));
    report.added.push({ id: p.id, ru: p.ru, price: p.price, availability: p.availability });
    console.log('  + ' + p.ru + (p.price ? ' — ' + p.price : ' (sold)'));
  });

  // the channel order: newest first
  d.products.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  writeJson(STORE, d);
  writeJson(REPORT, report);
  console.log('\nDone. Added ' + report.added.length + ', marked sold ' + report.markedSold.length + ', skipped ' + report.skipped +
    (report.imageErrors ? ', image errors ' + report.imageErrors : '') + (publish ? '. New products are published.' : '. New products are drafts: publish them in the admin panel.'));
})().catch(e => { console.error('Import failed:', e.message); process.exit(1); });
