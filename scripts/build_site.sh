#!/bin/sh
# Build the static site into dist/ (used by Netlify; also works locally).
# Only published-facing files are copied: the app, the canonical JSON data,
# and the methodology page. Research candidates and scripts are left out.
set -e
cd "$(dirname "$0")/.."

python3 scripts/validate_data.py

rm -rf dist
mkdir -p dist/app dist/data dist/docs
cp app/index.html app/app.js app/styles.css app/og.png app/favicon.svg app/apple-touch-icon.png dist/app/
cp data/records.json data/companies.json data/evidence_tiers.json dist/data/
cp docs/METHODOLOGY.md dist/docs/

# Root page sends visitors to the app (Netlify also redirects "/" -> "/app/").
cat > dist/index.html <<'HTML'
<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Scandal Tracker</title>
<meta name="description" content="A searchable, sourced record of senior executives whose workplace relationships or sexual misconduct became public, each labelled by how well it is confirmed.">
<link rel="canonical" href="https://scandal-tracker.netlify.app/app/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Scandal Tracker">
<meta property="og:title" content="Scandal Tracker: executives brought down by workplace relationships and misconduct">
<meta property="og:description" content="A searchable, sourced record of senior executives whose workplace relationships or sexual misconduct became public, each labelled by how well it is confirmed.">
<meta property="og:url" content="https://scandal-tracker.netlify.app/">
<meta property="og:image" content="https://scandal-tracker.netlify.app/app/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Scandal Tracker: executives brought down by workplace relationships and misconduct, with a bar chart of cases by year.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Scandal Tracker: executives brought down by workplace relationships and misconduct">
<meta name="twitter:description" content="A searchable, sourced record of senior executives whose workplace relationships or sexual misconduct became public, each labelled by how well it is confirmed.">
<meta name="twitter:image" content="https://scandal-tracker.netlify.app/app/og.png">
<meta name="theme-color" content="#f5f4f1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#141312" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/app/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/app/apple-touch-icon.png">
<meta http-equiv="refresh" content="0; url=app/">
</head><body><a href="app/">Open Scandal Tracker</a></body></html>
HTML

echo "Built dist/: $(find dist -type f | wc -l | tr -d ' ') files"
