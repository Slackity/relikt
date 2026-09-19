#!/bin/sh
# Поднимает номер сборки сразу везде: в обеих страницах и в version.json.
# Именно version.json заставляет уже открытые копии подтянуть свежий код.
#
#   ./bump-version.sh                 — поставить текущие дату и время (UTC)
#   ./bump-version.sh 20260920-1200   — поставить конкретное значение
set -e
cd "$(dirname "$0")"
BUILD="${1:-$(date -u +%Y%m%d-%H%M)}"
for f in index.html admin.html; do
  sed -i.bak -E "s|(<meta name=\"relikt-build\" content=\")[^\"]*(\">)|\1$BUILD\2|" "$f"
  rm -f "$f.bak"
done
printf '{\n  "build": "%s"\n}\n' "$BUILD" > version.json
echo "Версия сборки: $BUILD"
grep -h '<meta name="relikt-build"' index.html admin.html
