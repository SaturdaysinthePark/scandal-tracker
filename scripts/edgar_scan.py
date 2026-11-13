#!/usr/bin/env python3
"""
Scandal Tracker: SEC EDGAR full-text scan
==========================================
Finds SEC filings (2001-today) that mention an executive leaving over a
personal/romantic relationship or a code-of-conduct breach of that kind.

Requirements: Python 3.8+ (no extra packages needed)

Run:
    python3 edgar_scan.py --email you@example.com
    python3 edgar_scan.py --email you@example.com --snippets   # also grabs the matching sentence (slower)
    python3 edgar_scan.py --email you@example.com --since 2015-01-01

Output:
    candidates.csv: one row per filing, newest first. Send this file back to add records.

Notes:
- The SEC requires a User-Agent with a contact email, and allows at most 10 requests/sec.
  This script stays well under that.
- Every hit still needs a human read. Many are boilerplate policy text, not real cases.
  Rows flagged item_5_02=yes (officer departure) are the strongest leads.
"""
import argparse, csv, json, re, sys, time, urllib.parse, urllib.request, urllib.error, html

SEARCH = "https://efts.sec.gov/LATEST/search-index"
QUERIES = [
    '"consensual relationship"',
    '"consensual personal relationship"',
    '"consensual romantic relationship"',
    '"undisclosed relationship"',
    '"undisclosed personal relationship"',
    '"undisclosed romantic relationship"',
    '"inappropriate personal relationship"',
    '"inappropriate relationship"',
    '"close personal relationship" "code of conduct"',
    '"romantic relationship" "code of conduct"',
    '"personal relationship" "resign" "code of conduct"',
    '"non-fraternization"',
    '"fraternization policy"',
]
FORMS = "8-K,8-K/A"
KEYWORDS = re.compile(
    r"(consensual|romantic|intimate|undisclosed|inappropriate)[^.]{0,80}relationship|fraterniz|personal relationship",
    re.I,
)

def get(url, ua, retries=4):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": ua, "Accept-Encoding": "identity"})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < retries - 1:
                time.sleep(2 ** attempt * 2); continue
            raise
        except urllib.error.URLError:
            if attempt < retries - 1:
                time.sleep(2 ** attempt * 2); continue
            raise

def search(q, start, end, ua):
    frm, out = 0, []
    while True:
        params = {"q": q, "forms": FORMS, "dateRange": "custom", "startdt": start, "enddt": end, "from": frm}
        data = json.loads(get(SEARCH + "?" + urllib.parse.urlencode(params), ua))
        hits = data.get("hits", {}).get("hits", [])
        if not hits:
            break
        out.extend(hits)
        frm += len(hits)
        total = data["hits"]["total"]["value"]
        if frm >= min(total, 10000):
            break
        time.sleep(0.25)
    return out

def snippet(url, ua):
    try:
        raw = get(url, ua).decode("utf-8", "ignore")
    except Exception as e:
        return f"(could not fetch: {e})"
    text = html.unescape(re.sub(r"<[^>]+>", " ", raw))
    text = re.sub(r"\s+", " ", text)
    m = KEYWORDS.search(text)
    if not m:
        return ""
    a, b = max(0, m.start() - 300), min(len(text), m.end() + 300)
    return text[a:b].strip()

def main():
    ap = argparse.ArgumentParser(description="Scan SEC EDGAR for executive relationship departures.")
    ap.add_argument("--email", required=True, help="Your contact email (required by the SEC)")
    ap.add_argument("--since", default="2001-01-01", help="Start date YYYY-MM-DD (default 2001-01-01)")
    ap.add_argument("--until", default=time.strftime("%Y-%m-%d"), help="End date YYYY-MM-DD (default today)")
    ap.add_argument("--snippets", action="store_true", help="Fetch each filing and extract the matching passage")
    ap.add_argument("--out", default="candidates.csv")
    args = ap.parse_args()
    ua = f"ScandalTracker research script {args.email}"

    rows = {}
    for q in QUERIES:
        try:
            hits = search(q, args.since, args.until, ua)
        except Exception as e:
            print(f"  ! {q}: {e}", file=sys.stderr); continue
        new = 0
        for h in hits:
            s = h["_source"]
            adsh, fname = h["_id"].split(":", 1)
            if adsh in rows:
                rows[adsh]["matched_queries"] += " | " + q
                continue
            cik = (s.get("ciks") or [""])[0].lstrip("0")
            items = s.get("items") or []
            rows[adsh] = {
                "filed": s.get("file_date", ""),
                "company": "; ".join(s.get("display_names", [])),
                "form": s.get("form") or s.get("root_form", ""),
                "items": ",".join(items),
                "item_5_02": "yes" if "5.02" in items else "",
                "matched_queries": q,
                "filing_url": f"https://www.sec.gov/Archives/edgar/data/{cik}/{adsh.replace('-', '')}/{fname}",
                "index_url": f"https://www.sec.gov/Archives/edgar/data/{cik}/{adsh.replace('-', '')}/",
                "snippet": "",
            }
            new += 1
        print(f"{q:55s} {len(hits):5d} hits  ({new} new)")

    out = sorted(rows.values(), key=lambda r: (r["item_5_02"] != "yes", r["filed"]), reverse=False)
    out.sort(key=lambda r: r["filed"], reverse=True)
    out.sort(key=lambda r: r["item_5_02"] != "yes")

    if args.snippets:
        print(f"\nFetching passages for {len(out)} filings (≈{len(out)//4 + 1}s)…")
        for i, r in enumerate(out, 1):
            r["snippet"] = snippet(r["filing_url"], ua)
            if i % 25 == 0:
                print(f"  {i}/{len(out)}")
            time.sleep(0.25)

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(out[0].keys()) if out else ["filed"])
        w.writeheader()
        w.writerows(out)
    leads = sum(1 for r in out if r["item_5_02"])
    print(f"\nWrote {len(out)} unique filings to {args.out}  ({leads} are officer-departure 8-Ks: start with those)")

if __name__ == "__main__":
    main()
