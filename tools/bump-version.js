'use strict';
/*
 * Sets a new build number everywhere: <meta name="relikt-build">, the ?v= of every local css/js file in the pages,
 * and version.json. Telegram keeps the start page in its cache; open copies compare their build with version.json
 * and reload themselves when a newer one is published.
 *   node tools/bump-version.js                 current UTC date and time
 *   node tools/bump-version.js 20261011-1200   a given value
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const pad = n => String(n).padStart(2, '0');
const d = new Date();
const BUILD = process.argv[2] || d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + '-' + pad(d.getUTCHours()) + pad(d.getUTCMinutes());
if (!/^[\w.-]{1,40}$/.test(BUILD)) { console.error('Bad build value'); process.exit(1); }

for (const f of fs.readdirSync(ROOT).filter(f => f.endsWith('.html'))) {
  const file = path.join(ROOT, f);
  const before = fs.readFileSync(file, 'utf8');
  const after = before
    .replace(/(<meta name="relikt-build" content=")[^"]*(">)/, '$1' + BUILD + '$2')
    .replace(/((?:href|src)="(?:css|js)\/[^"?]+\.(?:css|js))(?:\?v=[^"]*)?"/g, '$1?v=' + BUILD + '"');
  if (after !== before) fs.writeFileSync(file, after);
}
fs.writeFileSync(path.join(ROOT, 'version.json'), JSON.stringify({ build: BUILD }, null, 2) + '\n');
console.log('Build: ' + BUILD);
