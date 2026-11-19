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

## Next targets (as of 2026-11-13, after round 4)
- **Agents stop early.** Round 4 agents quit after 4–8 searches until told "run at least 35 searches and report your count". Put that floor in every brief.
- **Watch list**: promoted Walk, Schultz, Rogers, Hong Ge, Horowitz, Guimarães. Still close: Tony Barth (Delta Dental: open the Business Wire release in a real browser), Gustavo Martinez (WPP: open the WSJ/Business Insider settlement story), Jim McCarthy (Visa: needs a second outlet beyond WSJ). Consider dropping Bill Weber (Firefly) under the "cleared" rule.
- **Latin America**: Mexico and Argentina searches found no qualifying corporate cases; Colombia/Brazil media (Caracol, Globo, Televisa) produced watch leads awaiting court outcomes (Vargas, Orrego charged in 2026). Re-check those trials.
- **Europe/Asia**: Japanese TDnet/JPX timely disclosures ("不適切な行為", "辞任") are a good source of `confirmed` cases; JPX PDFs return 403 to fetchers, so use search snippets plus a second outlet. Italy and Switzerland yielded nothing new.
- **Courts**: EEOC press releases naming the harasser plus appellate opinions (Cal. Ct. App., 5th Cir.) worked. Label opinions by citation, not the complainant's case name. FINRA, FRC/ICAEW and medical boards found nothing.
- **Pre-2000**: NYT/LA Times/AP/UPI archive pages could not be fetched; leads (Larry Michels/SCO 1993 settlement, Charles Campbell/Florsheim 1999) need a library database or court docket.
- **Data hygiene**: `archive_url` is still empty on most records.

## Fraud category (added 2026-11-17, round 1)
- 188 fraud records from five regional batches (US 2000s, US 2010–26, crypto/investment, Europe, Asia/Canada/Australia/LatAm); 159 published, 29 watch.
- **Fetching:** justice.gov blocks WebFetch/curl (bot check); open DOJ releases in the in-app browser. OSC, AMF, Japan Times and the Federal Court of Australia also returned 403/402.
- **Held on scope, needs a ruling:** records offences (Karpelès, Michael Rigas), obstructing a regulator (Tolstedt). Held on seniority: Bowe, Jelden, Schelbert, Oliver Schmidt, Jun Ying, Gene Levoff.
- **Pending verdicts to re-check:** Braun (Wirecard, Munich), Vincenz (Raiffeisen appeal, Jan 2027), Marsh (Patisserie Valerie, Jan 2028), Gutierrez (Americanas), Grobler (Steinhoff tribunal).
- **Data hygiene:** many `disclosed` months and some `lost_role` values came from background knowledge; each record's `note` says so. Spot-check before the next round. `archive_url` is empty on all fraud records.
- **Next leads:** co-defendants in existing cases (Sino-Forest, Sadia, Kangmei, Livedoor), Japan TDnet, SEC litigation releases naming officers, UK SFO convictions.

## Round 5 (2026-11-17): all types
- Added 126 records (recent exits, watch promotions, international, US misconduct, fraud round 2, universities). Universities now count as companies (president/chancellor, provost, VPs, trustees only).
- **Search budget:** WebSearch is capped at about 200 searches per turn, shared by all agents in that turn. Two agents ran dry mid-pass; keep rounds to 4–5 agents or split them across turns.
- **EDGAR fraud scan:** `scripts/fraud_scan.py` (search endpoint works with a generic User-Agent) then `SEC_CONTACT=... python3 scripts/fraud_snippets.py` (filing pages need a contact). Agreements' "Cause" definitions cause most false hits and are skipped.
- **Close to promotion:** #121 Steele (Vox memo, THR 402), #223 Williamson (Scotsman 403), #62 Kubasik (WSJ exclusive), Ted Carter (Ohio State: romantic nature single-sourced), Cagney (SoFi: needs an opened NYT/Bloomberg source).
- **Policy questions still open:** records offences / obstructing a regulator in fraud scope; rogue traders as prominent employees; China CCDI "improper sexual relations" findings.
