#!/usr/bin/env python3
"""
Scandal Tracker: EEOC press-release harvester
=============================================
Crawls the EEOC newsroom (eeoc.gov/newsroom), keeps sexual-harassment releases,
and flags the ones where a senior person (owner, president, CEO, vice president,
general manager, director...) is described as the harasser.

Run:
    python3 scripts/eeoc_scan.py --out data/candidates/eeoc.csv
    python3 scripts/eeoc_scan.py --max-pages 50          # quick, recent only

Every row still needs a human read: most companies are small, and CLAUDE.md's
seniority, notability and evidence rules still apply.
"""
import argparse, csv, html, re, sys, time, urllib.request, urllib.error

BASE = "https://www.eeoc.gov"
UA = "ScandalTracker research script (public-records research)"
TITLE_HIT = re.compile(r"sex(ual)?[- ]harass|sex harass|harass\w* .*sex", re.I)
SENIOR = r"(owner|co-owner|president|vice president|chief executive|ceo|chief operating|coo|chairman|founder|general manager|managing director|executive director|senior vice|executive vice|principal|partner)"
HARASSER = re.compile(
    rf"(?:by|from|that|when)\s+(?:the\s+|its\s+|a\s+|an\s+)?(?:company'?s?\s+)?{SENIOR}\b[^.]{{0,160}}|{SENIOR}\b[^.]{{0,120}}\b(sexually harass\w*|harass\w*|made sexual|touch\w*|propositi\w*|unwanted)",
    re.I,
)

def get(url, retries=4):
    for a in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read().decode("utf-8", "ignore")
        except (urllib.error.HTTPError, urllib.error.URLError) as e:
            if a == retries - 1:
                raise
            time.sleep(2 ** a * 2)

def text_of(h):
    h = re.sub(r"(?s)<(script|style)[^>]*>.*?</\1>", " ", h)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/candidates/eeoc.csv")
    ap.add_argument("--max-pages", type=int, default=600)
    ap.add_argument("--delay", type=float, default=0.7)
    a = ap.parse_args()

    seen, hits = set(), []
    for page in range(a.max_pages):
        try:
            h = get(f"{BASE}/newsroom/search?page={page}")
        except Exception as e:
            print(f"page {page}: {e}", file=sys.stderr); break
        # each listing item: link + title
        items = re.findall(r'href="(/newsroom/[^"?#]+)"[^>]*>\s*(?:<span[^>]*>)?\s*([^<]{10,300})<', h)
        items = [(u, html.unescape(t).strip()) for u, t in items if u != "/newsroom/search"]
        if not items:
            break
        for u, t in items:
            if u in seen:
                continue
            seen.add(u)
            if TITLE_HIT.search(t):
                hits.append((u, t))
        if page % 25 == 0:
            print(f"page {page}: {len(seen)} releases scanned, {len(hits)} harassment titles", flush=True)
        time.sleep(a.delay)

    rows = []
    for i, (u, t) in enumerate(hits, 1):
        try:
            body = text_of(get(BASE + u))
        except Exception as e:
            print(f"  ! {u}: {e}", file=sys.stderr); continue
        m = HARASSER.search(body)
        date = re.search(r"([A-Z][a-z]+ \d{1,2}, \d{4})", body)
        money = re.search(r"\$[\d,.]+(?: million)?", body)
        rows.append({
            "date": date.group(1) if date else "",
            "title": t,
            "senior_harasser": "yes" if m else "",
            "snippet": body[max(0, m.start() - 200): m.end() + 200] if m else "",
            "amount": money.group(0) if money else "",
            "url": BASE + u,
        })
        if i % 50 == 0:
            print(f"  fetched {i}/{len(hits)}", flush=True)
        time.sleep(a.delay)

    rows.sort(key=lambda r: r["senior_harasser"] != "yes")
    with open(a.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["date", "title", "senior_harasser", "amount", "url", "snippet"])
        w.writeheader(); w.writerows(rows)
    print(f"Wrote {len(rows)} harassment releases to {a.out}; {sum(r['senior_harasser'] == 'yes' for r in rows)} name a senior person.")

if __name__ == "__main__":
    main()
