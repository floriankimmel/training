#!/usr/bin/env python3
"""Load + readiness + outcome report from db/training.duckdb (read-only).

Usage:  db/.venv/bin/python scripts/load_report.py [--weeks N] [--asof YYYY-MM-DD]

Sections:
  1. Weekly load  — HR-based TRIMP (Banister) per week/sport, ramp vs. 4-wk avg, ACWR
  2. Readiness    — HRV z-score / RHR delta / sleep debt -> GREEN | AMBER | RED gate
  3. Outcome      — run pace at fixed HR on flat runs (fitness signal, terrain-robust)

TRIMP assumes 1 Hz records (HealthFit). hrMax = zones.md; resting HR = 30d median from daily_metrics.
"""
import argparse
import re
from datetime import date, timedelta
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "db" / "training.duckdb"


def hr_max() -> float:
    m = re.search(r"\*\*hrMax\*\*:\s*(\d+)", (ROOT / "zones.md").read_text())
    return float(m.group(1)) if m else 180.0


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--weeks", type=int, default=8)
    ap.add_argument("--asof", default=date.today().isoformat())
    a = ap.parse_args()
    asof = date.fromisoformat(a.asof)
    con = duckdb.connect(str(DB), read_only=True)
    hmax = hr_max()

    rest = con.execute(
        "SELECT median(resting_hr) FROM daily_metrics WHERE day BETWEEN ? AND ? AND resting_hr IS NOT NULL",
        [asof - timedelta(days=30), asof],
    ).fetchone()[0] or 55.0

    # ---- 1. weekly load -------------------------------------------------
    start = asof - timedelta(days=asof.weekday()) - timedelta(weeks=a.weeks - 1)
    rows = con.execute(
        f"""
        WITH r AS (
          SELECT a.start_time::date d, a.sport,
                 greatest(0, least(1, (r.hr - {rest}) / ({hmax} - {rest}))) x
          FROM records r JOIN activities a ON a.id = r.activity_id
          WHERE r.hr > 60 AND a.start_time::date BETWEEN DATE '{start - timedelta(days=28)}' AND DATE '{asof}'
        )
        SELECT d, sport, sum(x * 0.64 * exp(1.92 * x)) / 60.0 AS trimp, count(*) / 60.0 AS minutes
        FROM r GROUP BY 1, 2
        """
    ).fetchall()
    daily: dict[date, float] = {}
    weekly: dict[date, dict[str, list[float]]] = {}
    for d, sport, trimp, mins in rows:
        daily[d] = daily.get(d, 0.0) + trimp
        wk = d - timedelta(days=d.weekday())
        s = "run" if sport == "running" else "bike" if sport == "cycling" else "other"
        w = weekly.setdefault(wk, {}).setdefault(s, [0.0, 0.0])
        w[0] += trimp
        w[1] += mins

    print(f"== 1. Load (TRIMP, hrMax {hmax:.0f}, rest {rest:.0f}) — week of Mon ==")
    print(f"{'week':<11}{'TRIMP':>7}{'run':>7}{'bike':>7}{'other':>7}{'min':>6}")
    totals = []
    wk = start
    while wk <= asof:
        ws = weekly.get(wk, {})
        t = sum(v[0] for v in ws.values())
        totals.append(t)
        mins = sum(v[1] for v in ws.values())
        g = lambda k: ws.get(k, [0, 0])[0]  # noqa: E731
        print(f"{wk.isoformat():<11}{t:7.0f}{g('run'):7.0f}{g('bike'):7.0f}{g('other'):7.0f}{mins:6.0f}")
        wk += timedelta(weeks=1)

    acute = sum(v for d, v in daily.items() if asof - timedelta(days=6) <= d <= asof)
    chronic = sum(v for d, v in daily.items() if asof - timedelta(days=27) <= d <= asof) / 4.0
    acwr = acute / chronic if chronic > 5 else None
    prev4 = totals[-5:-1]
    ramp = (totals[-1] / (sum(prev4) / len(prev4)) - 1) * 100 if prev4 and sum(prev4) > 5 else None
    print(f"\nAcute 7d {acute:.0f} | chronic 28d/wk {chronic:.0f} | ACWR "
          f"{'n/a' if acwr is None else f'{acwr:.2f}'} | this wk vs prev-4 avg "
          f"{'n/a' if ramp is None else f'{ramp:+.0f}%'}  (sweet spot ACWR 0.8–1.3; >1.5 = spike)")
    if chronic < 100:
        print("⚠ chronic load low (rebuild after break) → ACWR inflated; judge ramp by absolute weekly TRIMP, cap +30%/wk.")

    # ---- 2. readiness ---------------------------------------------------
    print("\n== 2. Readiness gate ==")
    day = con.execute("SELECT max(day) FROM daily_metrics WHERE day <= ?", [asof]).fetchone()[0]
    if day is None:
        print("no daily_metrics -> ask athlete / use subjective feedback")
    else:
        h, hb, hsd, r_, rb, s7, s30 = con.execute(
            """
            WITH d AS (SELECT * FROM daily_metrics WHERE day <= ?),
            base AS (SELECT avg(hrv_night_avg) hb, stddev(hrv_night_avg) hsd, avg(resting_hr) rb, avg(sleep_min) sb
                     FROM d WHERE day BETWEEN ?::DATE - 30 AND ?::DATE - 1)
            SELECT (SELECT avg(hrv_night_avg) FROM d WHERE day > ?::DATE - 3), base.hb, base.hsd,
                   (SELECT avg(resting_hr) FROM d WHERE day > ?::DATE - 7), base.rb,
                   (SELECT avg(sleep_min) FROM d WHERE day > ?::DATE - 7), base.sb FROM base
            """,
            [day, day, day, day, day, day],
        ).fetchone()
        z = (h - hb) / hsd if h and hb and hsd else None
        dr = r_ - rb if r_ and rb else None
        debt = s7 - s30 if s7 and s30 else None
        flags = []
        if z is not None and z <= -1.0:
            flags.append(f"HRV 3d z={z:.1f}")
        if dr is not None and dr >= 4:
            flags.append(f"RHR 7d +{dr:.0f}")
        if debt is not None and debt <= -45:
            flags.append(f"sleep debt {debt:.0f} min/night")
        sev = len(flags)
        verdict = "GREEN" if sev == 0 else "AMBER" if sev == 1 else "RED"
        print(f"latest metrics day {day} | HRV 3d {h and round(h)} (base {hb and round(hb)}, z={z and round(z, 1)}) | "
              f"RHR 7d {r_ and round(r_)} (base {rb and round(rb)}) | sleep 7d {s7 and round(s7)} vs 30d {s30 and round(s30)}")
        print(f"VERDICT: {verdict}" + (f" — {'; '.join(flags)}" if flags else "")
              + "   (AMBER: no new hard session, cap at aerobic · RED: easy/rest, no quality)")
        if (asof - day).days > 2:
            print(f"⚠ metrics stale ({(asof - day).days}d old) — run db/import_metrics.py")

    # ---- 3. outcome -----------------------------------------------------
    print("\n== 3. Outcome: run pace @ HR 140–150, flat runs (<15 hm/km), 4-wk blocks ==")
    out = con.execute(
        f"""
        SELECT floor(datediff('day', a.start_time::date, DATE '{asof}') / 28) blk,
               count(*) secs, round(1000.0 / 60.0 / median(r.speed), 2) pace
        FROM records r JOIN activities a ON a.id = r.activity_id
        WHERE a.sport = 'running' AND r.hr BETWEEN 140 AND 150 AND r.speed BETWEEN 1.5 AND 5
          AND coalesce(a.total_ascent, 0) / (a.distance_m / 1000.0) < 15
          AND a.start_time::date > DATE '{asof - timedelta(days=28 * 6)}'
        GROUP BY 1 HAVING count(*) > 300 ORDER BY 1 DESC
        """
    ).fetchall()
    if not out:
        print("no qualifying flat run data in last 6 blocks")
    for blk, secs, pace in out:
        e = asof - timedelta(days=int(blk) * 28)
        print(f"  {e - timedelta(days=27)} → {e}: {int(pace)}:{round((pace % 1) * 60):02d} /km  ({secs} s)")
    print("Faster pace at same HR = fitness up; slower = fatigue/detraining/illness. Compare blocks, not single runs.")


if __name__ == "__main__":
    main()
