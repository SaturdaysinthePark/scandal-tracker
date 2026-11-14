#!/usr/bin/env python3
"""
Scandal Tracker: news cross-check for vague exits
=================================================
For each lead in data/candidates/vague_exits.json (company, filing date, name),
searches Google News RSS for coverage in a window around the exit that mentions
a relationship, affair, harassment or misconduct. Flags hits from major outlets.

Run:
    python3 scripts/news_crosscheck.py
Output: data/candidates/vague_exits_news.json

A hit is only a lead: open the article, check it ties the exit to a relationship
or misconduct, and apply CLAUDE.md's evidence tiers before writing a record.
"""
import argparse, datetime as dt, html, json, re, time, urllib.parse, urllib.request

MAJOR = re.compile(r"Reuters|Wall Street Journal|WSJ|New York Times|Bloomberg|Financial Times|CNBC|Associated Press|AP News|Washington Post|BBC|Guardian", re.I)
TOPIC = '(affair OR relationship OR "romantic" OR harassment OR "sexual misconduct" OR "inappropriate relationship" OR "misconduct")'
HIT = re.compile(r"affair|relationship|romantic|harass|sexual|misconduct|inappropriate", re.I)
UA = "Mozilla/5.0 (research script)"

def rss(q, after, before):
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": f"{q} after:{after} before:{before}", "hl": "en-US", "gl": "US", "ceid": "US:en"})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    x = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "ignore")
    items = []
    for it in re.findall(r"<item>(.*?)</item>", x, re.S):
        g = lambda t: html.unescape((re.search(rf"<{t}[^>]*>(.*?)</{t}>", it, re.S) or [None, ""])[1])
        items.append({"title": g("title"), "source": g("source"), "date": g("pubDate"), "link": g("link")})
    return items

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--inp", default="data/candidates/vague_exits.json")
    ap.add_argument("--out", default="data/candidates/vague_exits_news.json")
    ap.add_argument("--delay", type=float, default=2.0)
    a = ap.parse_args()
    leads = json.load(open(a.inp))
    for i, L in enumerate(leads, 1):
        d = dt.date.fromisoformat(L["filed"][:10])
        after, before = (d - dt.timedelta(days=60)).isoformat(), (d + dt.timedelta(days=400)).isoformat()
        who = f'"{L["name"]}"' if L.get("name") and " " in L["name"] else f'"{L["company"].split(",")[0].title()}"'
        q = f"{who} {TOPIC}" + ("" if " " in (L.get("name") or "") else " (CEO OR executive OR president OR resigned)")
        try:
            items = rss(q, after, before)
        except Exception as e:
            items, L["error"] = [], str(e)
        hits = [it for it in items if HIT.search(it["title"])]
        L["query"] = q
        L["news_hits"] = hits[:12]
        L["major_hits"] = [h for h in hits if MAJOR.search(h["source"] or "")][:6]
        print(f"[{i}/{len(leads)}] {L['filed'][:10]} {L['company'][:40]:40s} {len(hits):3d} hits, {len(L['major_hits'])} major", flush=True)
        time.sleep(a.delay)
    leads.sort(key=lambda L: (-len(L.get("major_hits", [])), -len(L.get("news_hits", []))))
    json.dump(leads, open(a.out, "w"), indent=1)
    print(f"Wrote {a.out}: {sum(1 for L in leads if L['news_hits'])} leads with topical coverage, "
          f"{sum(1 for L in leads if L['major_hits'])} with major-outlet coverage.")

if __name__ == "__main__":
    main()
