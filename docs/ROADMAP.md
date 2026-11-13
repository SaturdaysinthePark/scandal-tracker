# Roadmap

## 1. Grow the dataset (highest priority)
31 records is too thin to support patterns. The target is 150+ verified records before launch.

- [ ] Run `scripts/edgar_scan.py --snippets` for 2001 to today and triage the results (see CLAUDE.md).
- [ ] Widen the scan to `DEF 14A` (proxy) and `10-K` forms for clawback and forfeiture language.
- [ ] Check departures below the CEO: CFOs, COOs, presidents, general counsels and division heads.
- [ ] Add the Fortune Global 500 outside the US (UK RNS announcements, SEDAR in Canada, company press rooms).
- [ ] Cross-check exec-departure trackers (e.g. exechange) for misconduct exits.
- [ ] Search news archives (Reuters, WSJ, Bloomberg, FT, AP) by year for relationship-related exits.
- [ ] Look at court records: wrongful-dismissal suits and shareholder derivative suits.
- [ ] Add a Wayback snapshot (`archive_url`) and `verified_on` to every existing record.
- [ ] Fill in a `primary_url` for the 13 records that are missing one.

## 2. Data tooling
- [ ] `scripts/validate_data.py` in CI (GitHub Action on every PR).
- [ ] `scripts/import_candidates.py`: turn triaged CSV rows into `records.json` stubs.
- [ ] A monthly scheduled EDGAR scan (GitHub Action) that opens a PR with new candidates.
- [ ] A link checker for `primary_url` and `sources[].url`.

## 3. Build the app
The recommended stack is a static site (Astro or Vite + React) that reads `data/*.json` at build time and deploys to Vercel or Netlify. No backend is needed.

- [ ] Timeline view: the landing page, per `docs/DESIGN.md`.
- [ ] Records table with search.
- [ ] Detail drawer with the primary source link.
- [ ] About and methodology page.
- [ ] A permalink per record (`/records/:id`) and per company (`/companies/:id`).
- [ ] OG images per record for sharing.

## 4. Analysis features (once there are 150+ records)
- [ ] Outcome breakdown by sector, and the departure rate.
- [ ] Time from disclosure to exit.
- [ ] Stock move around the disclosure date (T-1 to T+5).
- [ ] Separate harassment and misconduct category, with its own evidence standard.

## 5. Before launch
- [ ] Legal review covering defamation exposure, jurisdictions, and the corrections and takedown policy.
- [ ] A public corrections log.
- [ ] Contact route for subjects to request corrections (email only, no public submissions).
