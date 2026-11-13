#!/usr/bin/env python3
"""Validate data/companies.json and data/records.json. Exit 1 on any error."""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "data"
SCOPES = {"Fortune 500", "Global 500", "Other notable"}
TIERS = {"confirmed", "acknowledged", "reported", "unconfirmed", "adjudicated", "settled"}
TYPES = {"relationship", "misconduct"}
LEVELS = {"executive", "prominent"}
STATUSES = {"published", "watch", "retracted"}
REQ = ["id", "type", "role_level", "company_id", "executive", "role", "disclosed", "category", "outcome", "evidence", "summary", "sources", "status"]

errors, warnings = [], []
companies = json.loads((ROOT / "companies.json").read_text())
records = json.loads((ROOT / "records.json").read_text())

ids = set()
for c in companies:
    for k in ("id", "name", "ticker", "sector", "scope"):
        if not c.get(k): errors.append(f"company {c.get('id')}: missing {k}")
    if c.get("scope") not in SCOPES: errors.append(f"company {c['id']}: bad scope {c.get('scope')!r}")
    if c["id"] in ids: errors.append(f"duplicate company id {c['id']}")
    ids.add(c["id"])

seen = set()
for r in records:
    rid = r.get("id")
    for k in REQ:
        if r.get(k) in (None, "", []): errors.append(f"record {rid}: missing {k}")
    if rid in seen: errors.append(f"duplicate record id {rid}")
    seen.add(rid)
    if r.get("company_id") not in ids: errors.append(f"record {rid}: unknown company_id {r.get('company_id')!r}")
    if not re.fullmatch(r"(19|20)\d\d-(0[1-9]|1[0-2])", r.get("disclosed", "")): errors.append(f"record {rid}: disclosed must be YYYY-MM")
    if r.get("evidence") not in TIERS: errors.append(f"record {rid}: bad evidence {r.get('evidence')!r}")
    if r.get("type") not in TYPES: errors.append(f"record {rid}: bad type {r.get('type')!r}")
    if r.get("type") == "misconduct" and r.get("status") == "published" and r.get("evidence") == "unconfirmed":
        errors.append(f"record {rid}: misconduct records cannot be published as unconfirmed")
    if r.get("type") == "relationship" and r.get("evidence") == "adjudicated":
        warnings.append(f"record {rid}: adjudicated tier on a relationship record")
    if not isinstance(r.get("lost_role"), bool): errors.append(f"record {rid}: lost_role must be true or false")
    if r.get("role_level") not in LEVELS: errors.append(f"record {rid}: bad role_level {r.get('role_level')!r}")
    if r.get("role_level") == "prominent" and r.get("status") == "published" and r.get("evidence") not in ("confirmed", "adjudicated", "settled"):
        errors.append(f"record {rid}: prominent-employee records must be confirmed, adjudicated or settled to publish")
    if r.get("status") not in STATUSES: errors.append(f"record {rid}: bad status {r.get('status')!r}")
    for u in [r.get("primary_url"), r.get("archive_url")] + [s.get("url") for s in r.get("sources", [])]:
        if u and not u.startswith("https://"): errors.append(f"record {rid}: non-https url {u}")
    if r.get("status") == "published" and not r.get("primary_url"): warnings.append(f"record {rid}: no primary_url")
    if r.get("status") == "published" and not r.get("archive_url"): warnings.append(f"record {rid}: no archive_url")

pub = sum(1 for r in records if r.get("status") == "published")
print(f"{len(companies)} companies, {len(records)} records ({pub} published)")
for w in warnings: print("  warn:", w)
for e in errors: print("  ERROR:", e)
if errors:
    sys.exit(1)
print("OK")
