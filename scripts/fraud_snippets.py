#!/usr/bin/env python3
"""
Fetch passages for the hits in data/candidates/fraud_8k.csv (from fraud_scan.py).

sec.gov filing pages need a User-Agent with a real contact, so this script reads
it from the SEC_CONTACT environment variable:
    SEC_CONTACT="you@example.com" python3 scripts/fraud_snippets.py

Skips employment/consulting/separation agreements (their "Cause" definitions are
the main source of false hits) and keeps only passages that are not boilerplate.
Writes data/candidates/fraud_8k_snippets.csv.
"""
import csv, html, os, re, sys, time
sys.path.insert(0, __file__.rsplit("/", 1)[0])
import edgar_scan as E

contact = os.environ.get("SEC_CONTACT")
if not contact:
    sys.exit("Set SEC_CONTACT to your contact email first (the SEC requires it).")
UA = f"ScandalTracker research script {contact}"
SRC, OUT = "data/candidates/fraud_8k.csv", "data/candidates/fraud_8k_snippets.csv"
AGR = re.compile(r"ex-?10|agreem|consult|separation|employ|release|letter|offer", re.I)
STRONG = re.compile(r"pleaded guilty|plead guilty|indicted|indictment|criminal complaint|arrested|misappropriat\w*|embezzl\w*|accounting irregularit\w*|unauthorized transactions|Wells notice|securities fraud|wire fraud|insider trading", re.I)
BOIL = re.compile(r"401\(f\)|Item 401|family relationship|has not been (convicted|involved)|not been the subject|criminal proceeding|named subject of a pending|shall mean|for purposes of|[“\"]Cause[”\"]|in the event (that|of)|conviction of, or plea|plea of guilty or nolo", re.I)

rows = list(csv.DictReader(open(SRC)))
todo = [r for r in rows if not AGR.search(r["filing_url"].rsplit("/", 1)[1])]
print(f"Fetching {len(todo)} of {len(rows)} filings (agreements skipped)…", flush=True)
for i, r in enumerate(todo, 1):
    try:
        raw = E.get(r["filing_url"], UA).decode("utf-8", "ignore")
    except Exception as e:
        r["snippet"] = f"(could not fetch: {e})"; continue
    text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", raw)))
    hits = []
    for m in STRONG.finditer(text):
        s = text[max(0, m.start() - 300): m.end() + 300]
        if not BOIL.search(s):
            hits.append(s)
        if len(hits) >= 2:
            break
    r["snippet"] = " ... ".join(hits)
    if i % 200 == 0:
        print(f"  {i}/{len(todo)}", flush=True)
    time.sleep(0.15)
keep = [r for r in todo if r["snippet"] and not r["snippet"].startswith("(could")]
with open(OUT, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(keep)
print(f"Wrote {len(keep)} filings with non-boilerplate passages to {OUT}")
