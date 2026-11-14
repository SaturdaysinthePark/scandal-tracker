#!/usr/bin/env python3
"""
Scandal Tracker: vague conduct-exit harvester (SEC 8-K Item 5.02)
=================================================================
Finds officer departures that companies attributed to "personal conduct",
code-of-conduct breaches or similar, without saying what happened. These are
leads to cross-check against news (scripts/news_crosscheck.py), never records
on their own.

Run:
    python3 scripts/vague_exits_scan.py --email you@example.com
Output: data/candidates/vague_exits.json
"""
import argparse, json, re, sys, time
sys.path.insert(0, __file__.rsplit("/", 1)[0])
import edgar_scan as E

QUERIES = [
    '"personal conduct" resigned',
    '"matters regarding personal conduct"',
    '"personal conduct" "unrelated to the"',
    '"personal conduct" "Code of Conduct"',
    '"inconsistent with" "Code of Conduct" resigned "Chief Executive"',
    '"not consistent with the Company\'s Code of Conduct"',
    '"violated the Company\'s Code of Conduct"',
    '"violation of the Company\'s Code of Conduct" resigned',
    '"inappropriate conduct" resigned officer',
    '"inappropriate behavior" resigned officer',
    '"conduct unbecoming"',
    '"personal behavior" resigned',
    '"workplace conduct" resigned',
    '"terminated for cause" "Chief Executive Officer" investigation',
    '"placed on administrative leave" "Chief Executive Officer" investigation',
]
DEP = r"(resign\w*|terminat\w*|separat\w*|step(?:ped)? down|depart\w*|removed|placed on (?:administrative )?leave)"
CON = r"(personal conduct|personal behavior|Code of (?:Business )?Conduct|inappropriate (?:conduct|behavior)|conduct unbecoming|workplace conduct|for cause|polic(?:y|ies))"
NEAR = re.compile(rf"{DEP}[^.]{{0,220}}{CON}|{CON}[^.]{{0,220}}{DEP}", re.I)
BAD = re.compile(r"(shall mean|“Cause”|\"Cause\"|this Agreement|Executive shall|for purposes of|Participant|Grantee|hereby|release of claims|including, without limitation|in the event (?:that|of))", re.I)
NAME = re.compile(r"\b(?:Mr\.|Ms\.|Mrs\.|Dr\.)\s+([A-Z][A-Za-z'\-]+)|\b([A-Z][a-z]+(?: [A-Z]\.)? [A-Z][A-Za-z'\-]+)(?:,? (?:who )?(?:has )?(?:resigned|was terminated|stepped down|departed|notified))")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--email", required=True)
    ap.add_argument("--since", default="2001-01-01")
    ap.add_argument("--out", default="data/candidates/vague_exits.json")
    a = ap.parse_args()
    ua = f"ScandalTracker research script {a.email}"
    filings = {}
    for q in QUERIES:
        try:
            hits = E.search(q, a.since, time.strftime("%Y-%m-%d"), ua)
        except Exception as e:
            print("!", q, e, file=sys.stderr); continue
        n = 0
        for h in hits:
            s = h["_source"]
            if "5.02" not in (s.get("items") or []):
                continue
            adsh, fname = h["_id"].split(":", 1)
            cik = (s.get("ciks") or [""])[0].lstrip("0")
            filings.setdefault(adsh, {"company": re.sub(r"\s*\(.*", "", (s.get("display_names") or [""])[0]).strip(),
                                      "filed": s.get("file_date", ""),
                                      "url": f"https://www.sec.gov/Archives/edgar/data/{cik}/{adsh.replace('-', '')}/{fname}"}); n += 1
        print(f"{q:70s} {len(hits):5d} hits, {n} Item 5.02", flush=True)
    out = {}
    for i, f in enumerate(filings.values(), 1):
        try:
            raw = E.get(f["url"], ua).decode("utf-8", "ignore")
        except Exception:
            continue
        t = re.sub(r"\s+", " ", E.html.unescape(re.sub(r"<[^>]+>", " ", raw)))
        for m in NEAR.finditer(t):
            ctx = t[max(0, m.start() - 300): m.end() + 200]
            if BAD.search(ctx):
                continue
            nm = NAME.search(ctx)
            f.update(context=ctx, name=(nm.group(1) or nm.group(2)) if nm else "")
            out.setdefault((f["company"], f["filed"][:7]), f)
            break
        if i % 25 == 0:
            print(f"  read {i}/{len(filings)}", flush=True)
        time.sleep(0.25)
    res = sorted(out.values(), key=lambda r: r["filed"], reverse=True)
    json.dump(res, open(a.out, "w"), indent=1)
    print(f"Wrote {len(res)} vague-exit leads to {a.out}")

if __name__ == "__main__":
    main()
