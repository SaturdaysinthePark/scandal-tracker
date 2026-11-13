# CLAUDE.md: working rules for this repo

## What this project is
This is a tracker of publicly documented workplace-relationship scandals involving senior executives. The data is the product. Accuracy and fairness matter more than volume.

## Data is the source of truth
- `data/records.json` and `data/companies.json` are canonical. The app reads them and never hard-codes records.
- Run `python3 scripts/validate_data.py` after every data edit, and fix every error before committing.
- `id` values are never reused. A new record gets `max(id) + 1`.

## Inclusion rules
Include a case only if **all** of these hold:
1. The person is a corporate officer or executive at VP level or above (including SVPs, EVPs and division heads) or a board member. For executives below C-suite / named-executive-officer / board level, the case must be `confirmed`, `acknowledged`, or corroborated by at least two independent outlets' own reporting (republications of one story count once); single-source cases stay `status: "watch"` and are re-checked each pass. Major nonprofits (e.g. the American Red Cross) count as companies; apply the same seniority, relationship and evidence rules.
2. It involves a romantic or sexual relationship that (a) broke company policy, (b) was with a subordinate, employee, contractor or vendor, (c) was undisclosed when it should have been disclosed, or (d) is an extramarital affair **publicly acknowledged by the executive**.
3. It meets an evidence tier (below).

Exclude from the relationship category:
- Harassment and assault allegations. They go in the misconduct category below, under its stricter standard.
- Rumors, tabloids, social media posts and anonymous forums on their own.
- Departures for vague "personal conduct" with no reporting that ties them to a relationship. Note these as `status: "watch"` candidates, not published records.

## Prominent employees (`role_level: "prominent"`)
Rule 1 normally limits the tracker to executives (`role_level: "executive"`, the default). A **prominent employee** is a non-executive employee of the company who was widely known in their own right: on-air anchors and hosts, star editors and producers, star portfolio managers or traders, and similar. They may be included in either category, but **only** at the `confirmed` or `adjudicated` tier (the company's own finding or statement, or a court/regulator finding). Exclude freelancers, contractors, contributors, actors and athletes. The app labels these records and lets readers hide them.

## Misconduct category (`type: "misconduct"`)
Sexual harassment, sexual assault or abuse, unwanted advances, sexually inappropriate conduct or comments toward colleagues, and retaliation tied to them. Not financial or other non-sexual misconduct.

Same seniority rule (rule 1). The evidence bar is **stricter**:
- Allowed tiers: `confirmed` (the company's own finding or statement names the misconduct or a policy breach tied to it), `acknowledged` (the executive admits the conduct), `adjudicated` (a court, tribunal, regulator or arbitrator finding, a conviction, or a settlement whose terms are public and name the conduct), or `reported` **only if** at least two independent major outlets did their own reporting **and** the company confirmed an investigation or the departure.
- `unconfirmed` is never published for misconduct. Single-source cases stay `watch`.
- Exclude cases where an investigation cleared the executive and nothing else confirms the conduct.
- If the executive denies the allegations, the summary must say so.
- **Never name complainants or alleged victims**, even if other outlets do, unless they have publicly identified themselves on the record.
- Describe conduct with the words the source uses ("alleged", "the company said"); no graphic detail.

## Evidence tiers (`evidence` field)
| value | meaning |
|---|---|
| `confirmed` | Company filing, press release, or board statement names the relationship / policy breach |
| `acknowledged` | The executive's own public statement |
| `reported` | Major outlets (Reuters, WSJ, NYT, Bloomberg, FT, CNBC, AP) report it **and** the company confirms the departure or investigation |
| `unconfirmed` | One major outlet with described sourcing, not confirmed by anyone involved (relationship category only) |
| `adjudicated` | A court, tribunal, regulator or arbitrator finding, a conviction, or a public settlement naming the conduct |

Upgrade or retract records as facts change. Never delete a published record silently. Set `status: "retracted"` and add a note.

## Naming policy
- **Never name the other person** in `summary` unless they're a public figure who has spoken on the record about it. Write "a subordinate", "an employee", "a vendor executive", etc.
- No family members, photos, addresses or contact details.

## Record schema (`data/records.json`)
```jsonc
{
  "id": 32,
  "type": "relationship",          // relationship | misconduct
  "role_level": "executive",       // executive | prominent (see "Prominent employees")
  "company_id": "acme",            // must exist in companies.json
  "executive": "Jane Doe",
  "role": "CFO",                   // role at the time
  "disclosed": "2024-04",          // YYYY-MM: when it became PUBLIC, not when it happened
  "category": "Relationship with subordinate",
  "outcome": "Terminated",
  "evidence": "confirmed",         // confirmed | acknowledged | reported | unconfirmed | adjudicated
  "summary": "2–4 neutral sentences. Facts and attributions only.",
  "sources": [{ "label": "Acme 8-K, April 2024", "url": "https://..." }],
  "primary_url": "https://www.sec.gov/...",   // the single most authoritative source
  "archive_url": "https://web.archive.org/...",
  "verified_on": "2026-11-13",
  "status": "published"            // published | watch | retracted
}
```
Prefer this order for `primary_url`: SEC filing or company press release, then the executive's statement, then a court filing, then the original news report.

## Company schema (`data/companies.json`)
`{ "id", "name", "ticker", "sector", "scope" }`, where `scope` is one of `Fortune 500`, `Global 500` or `Other notable`. Use `ticker: "Private"` for private companies, and `ticker: "Nonprofit"`, `sector: "Nonprofit"` for nonprofits. Add a company only when it has a record or is a major watched name, such as Apple, IBM or Meta, which currently have zero records.

## Triage workflow for `data/candidates/*.csv`
1. Start with rows where `item_5_02 = yes` (officer departures).
2. Open `filing_url`, and read the `snippet` if there is one. Most hits are boilerplate code-of-conduct text, so discard those.
3. For real cases, find corroborating reporting, decide the tier, and write the record using the schema above.
4. Log ambiguous ones as `status: "watch"` with a one-line reason.
5. Commit with a message like `data: add 4 records from EDGAR scan 2026-11-13`.

## Writing style for summaries
Neutral, past tense, attributed ("the company said", "Reuters reported"). No adjectives like "shocking". Keep summaries to four sentences or fewer.
