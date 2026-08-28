#!/usr/bin/env python3
"""Fetch new activities from Tredict and import them into the training DB.

Lists all Tredict activities, diffs against the DB by start_time (UTC, +/-90s),
downloads only the missing ones as .fit, then imports them tagged source=tredict.

Requires $TREDICT_API_KEY. Idempotent: re-running only pulls what's missing.

Usage:
  db/.venv/bin/python db/import_tredict.py [--db db/training.duckdb] [--tmp /tmp/tredict]
"""
import argparse
import json
import os
import time
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

import duckdb

import import_fit  # sibling module

BASE = "https://www.tredict.com/api/oauth/v2"
TOL = 90  # seconds


def api(url, key):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})
    return urllib.request.urlopen(req)


def list_activities(key):
    acts, seen = [], set()
    url = f"{BASE}/activityList?pageSize=50"
    while url:
        d = json.load(api(url, key))
        batch = d["_embedded"]["activityList"]
        for a in batch:
            if a["id"] in seen:
                continue
            seen.add(a["id"])
            acts.append((a["id"], a["date"], a.get("sportType"), a.get("subSportType")))
        nxt = d.get("_links", {}).get("next", {}).get("href")
        url = nxt if (nxt and len(batch) == 50) else None
    return acts


def parse(dstr):
    return datetime.fromisoformat(dstr.replace("Z", "+00:00")).astimezone(timezone.utc)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(Path(__file__).with_name("training.duckdb")))
    ap.add_argument("--tmp", default="/tmp/tredict")
    args = ap.parse_args()
    key = os.environ["TREDICT_API_KEY"]

    acts = list_activities(key)
    print(f"Tredict activities: {len(acts)}")

    con = duckdb.connect(args.db)
    con.execute(import_fit.SCHEMA.read_text())
    new = []
    for aid, dstr, sp, ssp in acts:
        st = parse(dstr)
        row = con.execute(
            "SELECT id FROM activities WHERE start_time BETWEEN ? AND ? LIMIT 1",
            [st - timedelta(seconds=TOL), st + timedelta(seconds=TOL)],
        ).fetchone()
        if not row:
            new.append((aid, dstr, sp, ssp))
    print(f"Missing from DB: {len(new)}")
    if not new:
        return

    tmp = Path(args.tmp)
    tmp.mkdir(parents=True, exist_ok=True)
    for i, (aid, dstr, sp, ssp) in enumerate(new):
        out = tmp / f"{dstr[:19].replace(':','-')}_{sp}_{aid}.fit"
        out.write_bytes(api(f"{BASE}/activity/file/{aid}", key).read())
        if i % 10 == 9:
            time.sleep(0.5)  # under 10 req/s
    print(f"Downloaded {len(new)} files -> {tmp}")

    counts = {}
    for p in import_fit.iter_files(tmp):
        s = import_fit.import_file(con, p, force=False, force_source="tredict")
        counts[s] = counts.get(s, 0) + 1
    con.close()
    print("Import:", ", ".join(f"{k}={v}" for k, v in sorted(counts.items())))


if __name__ == "__main__":
    main()
