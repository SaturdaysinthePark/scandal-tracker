#!/bin/sh
# Build the static site into dist/ (used by Netlify; also works locally).
# Only published-facing files are copied: the app, the canonical JSON data,
# and the methodology page. Research candidates and scripts are left out.
set -e
cd "$(dirname "$0")/.."

python3 scripts/validate_data.py

rm -rf dist
mkdir -p dist/app dist/data dist/docs
cp app/index.html app/app.js app/styles.css dist/app/
cp data/records.json data/companies.json data/evidence_tiers.json dist/data/
cp docs/METHODOLOGY.md dist/docs/

# Root page sends visitors to the app (Netlify also redirects "/" -> "/app/").
cat > dist/index.html <<'HTML'
<!doctype html><meta charset="utf-8"><title>Scandal Tracker</title>
<meta http-equiv="refresh" content="0; url=app/"><a href="app/">Open Scandal Tracker</a>
HTML

echo "Built dist/: $(find dist -type f | wc -l | tr -d ' ') files"
