#!/usr/bin/env python3
"""Load + readiness + outcome report from db/training.duckdb (read-only).

Usage:  db/.venv/bin/python -m training report [--weeks N] [--asof YYYY-MM-DD]

Sections:
  1. Weekly load  — HR-based TRIMP (Banister) per week/sport, ramp vs. 4-wk avg, ACWR
  2. Readiness    — training.readiness gate (GLOSSARY: Readiness, Recovery-Flag)
  3. Outcome      — run pace at fixed HR on flat runs (fitness signal, terrain-robust)

TRIMP assumes 1 Hz records (HealthFit). hrMax + zones from zones.md (training.zones);\noutcome uses training.pace (GLOSSARY: Pace in Zone). resting HR = 30d median from daily_metrics.
"""
import argparse
from datetime import date, timedelta

import duckdb

from . import pace, readiness, zones
from .repo import ROOT

DB = ROOT / "db" / "training.duckdb"


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="python -m training report")
    ap.add_argument("--weeks", type=int, default=8)
    ap.add_argument("--asof", default=date.today().isoformat())
    a = ap.parse_args(argv)
    asof = date.fromisoformat(a.asof)
    con = duckdb.connect(str(DB), read_only=True)
    hmax = float(zones.hr_max())

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
        g = readiness.gate(con, day)
        r = lambda v: None if v is None else round(v)  # noqa: E731
        print(f"latest metrics day {day} | HRV 3d {r(g.hrv_3d)} (base {r(g.hrv_base)}, "
              f"z={None if g.hrv_z is None else round(g.hrv_z, 1)}) | RHR 7d {r(g.rhr_7d)} (base {r(g.rhr_base)}) | "
              f"sleep 7d {r(g.sleep_7d)} vs 30d {r(g.sleep_30d)}")
        print(f"VERDICT: {g.verdict}" + (f" — {'; '.join(g.reasons)}" if g.reasons else "")
              + "   (AMBER: no new hard session, cap at aerobic · RED: easy/rest, no quality)")
        kg = con.execute("""
            SELECT avg(body_mass_kg) FILTER (WHERE day > ?::DATE - 7),
                   avg(body_mass_kg) FILTER (WHERE day > ?::DATE - 28 AND day <= ?::DATE - 7),
                   count(body_mass_kg) FILTER (WHERE day > ?::DATE - 7)
            FROM daily_metrics WHERE day <= ?""", [day, day, day, day, day]).fetchone()
        if kg[0] is not None:
            prev = "n/a" if kg[1] is None else f"{kg[1]:.1f}"
            print(f"weight 7d {kg[0]:.1f} kg ({kg[2]} days) vs prev 3 wk {prev} kg"
                  + (" ⚠ dropping >1 kg — check energy availability (fueling.md)"
                     if kg[1] is not None and kg[0] - kg[1] <= -1.0 else ""))
        if (asof - day).days > 2:
            print(f"⚠ metrics stale ({(asof - day).days}d old) — run db/import_metrics.py")

    # ---- 3. outcome -----------------------------------------------------
    lo, hi = zones.band("Z2")
    print(f"\n== 3. Outcome: Aerobe Effizienz = Pace in Zone Z2 ({lo}–{hi}), flat runs, 4-wk blocks ==")
    out = pace.pace_in_zone(con, "Z2", bucket="block28", asof=asof,
                            since=asof - timedelta(days=28 * 6), min_secs=300)
    if not out:
        print("no qualifying flat run data in last 6 blocks")
    for p in reversed(out):
        print(f"  {p.period.replace('..', ' → ')}: {pace.fmt(p.pace)} /km  ({p.secs} s, {p.runs} runs)")
    print("Faster pace at same HR = fitness up; slower = fatigue/detraining/illness. Compare blocks, not single runs.")
    return 0
