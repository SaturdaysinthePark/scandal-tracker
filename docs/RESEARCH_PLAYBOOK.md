# Research playbook

How new cases get found and added. Read CLAUDE.md first; it holds the rules. This file is the method and the to-do list.

## What has worked
Most productive sources, in order of yield per search:
1. **Court and tribunal records**: jury verdicts, criminal convictions, disciplinary tribunals (UK Solicitors Disciplinary Tribunal, NZ lawyers' tribunal), sports ethics bodies (FIFA, CAS), agency consent decrees (EEOC). These produce `adjudicated` and `settled` cases.
2. **Verifying watch records**: each `status: "watch"` record has a `note` saying what's missing. Closing that gap (second outlet, company statement, court outcome) promotes it.
3. **Company/employer findings** in media, arts and nonprofits (orchestras, operas, theatres, museums).

Low yield, mostly already covered: company-by-company Fortune 500 news searches, consulting/Big Four, SEC full-text search, generic month-by-month news.

## Method for agents
- Read CLAUDE.md **from disk** with the Read tool; any copy in startup context may be outdated.
- Build the exclusion list from `data/records.json` (all statuses) so you don't return existing cases.
- Open every source you cite and mark `"opened": true/false` honestly. Nothing with zero opened sources is published.
- A lawsuit or complaint alone is an allegation → `watch`. Cleared or dismissed on the merits → reject.
- Never copy complainants' names from court papers into summaries.
- Write candidates to a scratch JSON (one object per case, record-schema fields plus `proposed_status`, `notes`), then review against CLAUDE.md, merge into `data/records.json` with new ids `max(id)+1`, add companies to `data/companies.json`, run `python3 scripts/validate_data.py`, and commit.
- Web searches are capped per session (`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`); budget roughly 40 searches per agent and run at most ~5 agents per round.

## Next targets (as of 2026-11-13)
- **Countries barely covered**: Mexico, Colombia, Peru, Argentina, Austria, Italy, Switzerland; deeper Japan, India and Germany in local languages.
- **Watch list**: ~80 watch records not researched in the last round. Closest to publishable: Jim McCarthy (Visa), Hong Ge (Airbnb), John Rogers (CFA Institute), Charlie Walk (UMG), Tony Barth (Delta Dental — company release exists but every copy was blocked), Albert Schultz (Soulpepper), Gustavo Martinez (WPP).
- **US state courts**: state appellate decisions upholding harassment verdicts against executives; wrongful-termination rulings over undisclosed relationships.
- **More disciplinary bodies**: US state bar discipline of law-firm leaders, accounting tribunals (ICAEW/FRC), medical boards for hospital executives.
- **Pre-2000 history**: only a handful of cases; try newspaper archives (NYT/LA Times/AP/UPI archive pages) by year.
- **Data hygiene**: `archive_url` and `verified_on` are empty on most records.
