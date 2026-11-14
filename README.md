# Scandal Tracker

A public tracker of senior executives at Fortune 500 (and other major) companies whose departures or controversies came from workplace relationships: affairs with subordinates, undisclosed relationships, conflicts of interest with partners, and publicly acknowledged extramarital affairs.

The landing view is a **timeline**. Each company is a row, each year is a column, each case is a dot, and totals sit on the right.

## Repo layout

```
scandal-tracker/
├── CLAUDE.md                 # Working rules for Claude Code (read first)
├── README.md
├── data/
│   ├── companies.json        # Company list (id, name, ticker, sector, scope)
│   ├── records.json          # One object per disclosed case: the source of truth
│   ├── evidence_tiers.json   # Evidence tier labels
│   └── candidates/           # Raw scan output to triage (gitignored or committed, your call)
├── scripts/
│   ├── edgar_scan.py         # SEC EDGAR full-text scan → candidates.csv
│   └── validate_data.py      # Schema + integrity checks for data/*.json
├── app/                      # The web app (index.html, app.js, styles.css)
├── design/
│   ├── Scandal Tracker.dc.html   # Hi-fi interactive design reference (open in a browser)
│   └── support.js                # Runtime the design file needs (keep alongside it)
└── docs/
    ├── DESIGN.md             # Visual spec: layout, tokens, interactions
    ├── METHODOLOGY.md        # What counts, evidence tiers, naming policy
    └── ROADMAP.md            # Next steps
```

## Quick start

```bash
# 1. Validate the dataset
python3 scripts/validate_data.py

# 2. Find new candidate cases in SEC filings (takes a few minutes)
python3 scripts/edgar_scan.py --email you@example.com --snippets --out data/candidates/edgar_$(date +%F).csv

# 3. Open the design reference
open "design/Scandal Tracker.dc.html"
```

Then ask Claude Code something like:

> Triage `data/candidates/edgar_2026-11-13.csv` following CLAUDE.md, and add verified cases to `data/records.json`.

> Build the web app from `docs/DESIGN.md` and `design/Scandal Tracker.dc.html`, reading from `data/`.

## Current state

- 273 records across 235 companies (147 published, 127 companies: 67 relationship, 80 misconduct; earliest case 1993), through November 2026.
- The app in `app/` (plain HTML/CSS/JS, no build step) implements the timeline, records table, about page and detail drawer, reading `data/*.json` and `docs/METHODOLOGY.md`. Only `status: "published"` records are shown.

## Deploy (Netlify)

The repo includes `netlify.toml`. Netlify runs `sh scripts/build_site.sh`, which validates the data and copies the app, `data/*.json` and the methodology into `dist/`. Research scripts and `data/candidates/` are not published. `/` redirects to `/app/`.

To build locally: `sh scripts/build_site.sh`, then serve `dist/`.

## Run the app

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/app/.
