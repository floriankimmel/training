#!/usr/bin/env python3
"""Freeze daily readiness judgments (sleep / HRV / RHR tiers) into `daily_readiness`.

Each past day is judged once against the terciles of the 90 days before it and
stored. Later rule or baseline changes never touch frozen days. A frozen day is
re-judged only when its inputs changed (data correction, late RHR); it then
keeps its stored thresholds. Today stays unfrozen (webview judges it live).

Mirror of the live logic in webview/src/components/WeekGrid.tsx — keep in sync
and bump ALGO_VERSION on rule changes.

Usage:
  db/.venv/bin/python db/readiness.py [--db db/training.duckdb]
"""
import argparse
from datetime import date, datetime, timezone
from pathlib import Path

import duckdb

ALGO_VERSION = 1
WINDOW_DAYS = 90
MIN_BASELINE_DAYS = 30
# Static 12-month terciles, used when the window has too little history.
FALLBACK = {"sleep": (393, 429), "hrv": (39.6, 49.5), "rhr": (56, 59)}
SCORE = {"good": 2, "ok": 1, "bad": 0}


def higher_tier(v, cuts):
    if v is None:
        return None
    return "good" if v >= cuts[1] else "ok" if v >= cuts[0] else "bad"


def lower_tier(v, cuts):
    if v is None:
        return None
    return "good" if v <= cuts[0] else "ok" if v <= cuts[1] else "bad"


def overall_tier(tiers):
    present = [t for t in tiers if t]
    if not present:
        return None
    bad = present.count("bad")
    if bad >= 2 or bad == len(present):
        return "bad"
    return "good" if sum(SCORE[t] for t in present) / len(present) >= 1.5 else "ok"


def baseline(con, day):
    r = con.execute(f"""
        SELECT count(*),
               quantile_cont(sleep_min, 0.33) FILTER (WHERE sleep_min > 60),
               quantile_cont(sleep_min, 0.67) FILTER (WHERE sleep_min > 60),
               quantile_cont(hrv_night_avg, 0.33), quantile_cont(hrv_night_avg, 0.67),
               quantile_cont(resting_hr, 0.33), quantile_cont(resting_hr, 0.67)
        FROM daily_metrics
        WHERE day >= ?::DATE - INTERVAL '{WINDOW_DAYS}' DAY AND day < ?""", [day, day]).fetchone()
    n = r[0]
    if n < MIN_BASELINE_DAYS or any(v is None for v in r[1:]):
        return dict(FALLBACK), n
    return {"sleep": (r[1], r[2]), "hrv": (r[3], r[4]), "rhr": (r[5], r[6])}, n


def judge(sleep, hrv, rhr, b):
    s = None if sleep is None or sleep <= 60 else higher_tier(sleep, b["sleep"])
    h = higher_tier(hrv, b["hrv"])
    r = lower_tier(rhr, b["rhr"])
    return s, h, r, overall_tier([s, h, r])


def write(con, day, inputs, b, n, tiers):
    con.execute("DELETE FROM daily_readiness WHERE day = ?", [day])
    con.execute(
        "INSERT INTO daily_readiness VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [day, *tiers, *inputs, *b["sleep"], *b["hrv"], *b["rhr"], n,
         ALGO_VERSION, datetime.now(timezone.utc)],
    )


def freeze(con, today=None):
    """Judge unfrozen past days; re-judge frozen days whose inputs changed."""
    today = today or date.today()
    rows = con.execute("""
        SELECT m.day, m.sleep_min, m.hrv_night_avg, m.resting_hr,
               r.day IS NOT NULL AS frozen, r.sleep_min, r.hrv_night_avg, r.resting_hr,
               r.sleep_p33, r.sleep_p67, r.hrv_p33, r.hrv_p67, r.rhr_p33, r.rhr_p67, r.baseline_n
        FROM daily_metrics m LEFT JOIN daily_readiness r USING (day)
        WHERE m.day < ? ORDER BY m.day""", [today]).fetchall()
    new = rejudged = 0
    for day, s, h, rh, frozen, fs, fh, frh, *cuts, n in rows:
        inputs = (s, h, rh)
        if not frozen:
            b, n = baseline(con, day)
            new += 1
        elif inputs != (fs, fh, frh):
            b = {"sleep": cuts[0:2], "hrv": cuts[2:4], "rhr": cuts[4:6]}
            rejudged += 1
            print(f"[rejudge] {day} inputs {(fs, fh, frh)} -> {inputs}")
        else:
            continue
        write(con, day, inputs, b, n, judge(*inputs, b))
    return new, rejudged


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(Path(__file__).with_name("training.duckdb")))
    args = ap.parse_args()
    con = duckdb.connect(args.db)
    con.execute(Path(__file__).with_name("schema.sql").read_text())
    new, rejudged = freeze(con)
    con.close()
    print(f"Readiness: {new} day(s) frozen, {rejudged} re-judged")


if __name__ == "__main__":
    main()
