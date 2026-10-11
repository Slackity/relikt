#!/bin/sh
# Sets a new build number in every page and in version.json (see tools/bump-version.js).
#   ./bump-version.sh                 current date and time (UTC)
#   ./bump-version.sh 20261011-1200   a given value
set -e
cd "$(dirname "$0")"
node tools/bump-version.js "$@"
