#!/usr/bin/env python3
"""
SEC EDGAR full-text scan for officer departures tied to fraud.

Finds 8-K filings with Item 5.02 (officer departure) that also mention
indictments, guilty pleas, misappropriation, accounting irregularities and
similar. Every hit is a lead only: the fraud category publishes a case only
after a conviction, guilty plea, or court/regulator finding (see CLAUDE.md).

Run:
    python3 scripts/fraud_scan.py --contact "you@example.com" --snippets
    python3 scripts/fraud_scan.py --since 2015-01-01 --out data/candidates/fraud_8k.csv

The SEC asks for a User-Agent that identifies you; pass --contact.
"""
import argparse, csv, re, sys, time
sys.path.insert(0, __file__.rsplit("/", 1)[0])
import edgar_scan as E

QUERIES = [
    '"pleaded guilty" "former Chief Executive Officer"',
    '"pleaded guilty" "former Chief Financial Officer"',
    '"indicted" "Chief Executive Officer" resigned',
    '"indictment" "Chief Financial Officer" terminated',
    '"criminal complaint" "Chief Executive Officer"',
    '"arrested" "Chief Executive Officer" resigned',
    '"misappropriation" "Chief Executive Officer" terminated',
    '"misappropriated" "Chief Financial Officer"',
    '"embezzlement" officer terminated',
    '"embezzled" "Chief Financial Officer"',
    '"accounting irregularities" resigned "Chief Financial Officer"',
    '"accounting irregularities" "Chief Executive Officer" terminated',
    '"Wells notice" resigned "Chief Executive Officer"',
    '"Wells notice" "Chief Financial Officer" resigned',
    '"falsified" "Chief Financial Officer" terminated',
    '"unauthorized transactions" "Chief Financial Officer" terminated',
    '"insider trading" "Chief Executive Officer" resigned',
    '"securities fraud" charged "Chief Executive Officer" resigned',
]
KEYWORDS = re.compile(
    r"pleaded guilty|indict\w*|criminal complaint|arrest\w*|misappropriat\w*|embezzl\w*|accounting irregularit\w*|Wells notice|falsif\w*|unauthorized transactions|insider trading|securities fraud",
    re.I,
)

def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--contact", default="ScandalTracker research script", help="Identifies you in the User-Agent the SEC requires")
    ap.add_argument("--since", default="2001-01-01")
    ap.add_argument("--until", default=time.strftime("%Y-%m-%d"))
    ap.add_argument("--snippets", action="store_true")
    ap.add_argument("--out", default="data/candidates/fraud_8k.csv")
    args = ap.parse_args()
    ua = f"ScandalTracker research script {args.contact}".strip()
    E.KEYWORDS = KEYWORDS  # E.snippet() extracts the passage around these terms

    rows = {}
    for q in QUERIES:
        try:
            hits = E.search(q, args.since, args.until, ua)
        except Exception as e:
            print(f"  ! {q}: {e}", file=sys.stderr); continue
        new = 0
        for h in hits:
            s = h["_source"]
            items = s.get("items") or []
            if "5.02" not in items:
                continue
            adsh, fname = h["_id"].split(":", 1)
            if adsh in rows:
                rows[adsh]["matched_queries"] += " | " + q; continue
            cik = (s.get("ciks") or [""])[0].lstrip("0")
            rows[adsh] = {
                "filed": s.get("file_date", ""),
                "company": "; ".join(s.get("display_names", [])),
                "form": s.get("form") or s.get("root_form", ""),
                "items": ",".join(items),
                "matched_queries": q,
                "filing_url": f"https://www.sec.gov/Archives/edgar/data/{cik}/{adsh.replace('-', '')}/{fname}",
                "snippet": "",
            }
            new += 1
        print(f"{q:60s} {len(hits):5d} hits  ({new} new 5.02)", flush=True)

    out = sorted(rows.values(), key=lambda r: r["filed"], reverse=True)
    if args.snippets:
        print(f"Fetching passages for {len(out)} filings…", flush=True)
        for i, r in enumerate(out, 1):
            r["snippet"] = E.snippet(r["filing_url"], ua)
            if i % 50 == 0:
                print(f"  {i}/{len(out)}", flush=True)
            time.sleep(0.25)
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["filed", "company", "form", "items", "matched_queries", "filing_url", "snippet"])
        w.writeheader(); w.writerows(out)
    print(f"Wrote {len(out)} officer-departure 8-Ks to {args.out}")

if __name__ == "__main__":
    main()
