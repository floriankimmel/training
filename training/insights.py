"""Fitness insights for the webview Insights modal: `python -m training insights --json`.

Aerobe Effizienz = Pace in Zone Z2 (GLOSSARY.md), shown as km/h per month; the verdict compares
the last month with the mean of the earlier ones.
"""
from __future__ import annotations

import argparse
import json
from datetime import date

import duckdb

from . import pace, zones
from .repo import ROOT

DB = ROOT / "db" / "training.duckdb"
VERDICT_BAND_PCT = 1.5   # |Δ| below this = "flat"


def _months_back(today: date, months: int) -> date:
    y, m = divmod(today.year * 12 + today.month - 1 - months, 12)
    return date(y, m + 1, 1)


def verdict(values: list[float]) -> dict:
    if len(values) < 3:
        return {"level": "flat", "effDeltaPct": None, "text": "Zu wenig Daten für ein Urteil."}
    last, prior = values[-1], values[:-1]
    avg = sum(prior) / len(prior)
    d = (last - avg) / avg * 100
    if d > VERDICT_BAND_PCT:
        return {"level": "up", "effDeltaPct": d, "text": "Aerobe Effizienz steigt — du wirst fitter."}
    if d < -VERDICT_BAND_PCT:
        return {"level": "down", "effDeltaPct": d, "text": "Effizienz aktuell unter Schnitt — Reboot/Ermüdung?"}
    return {"level": "flat", "effDeltaPct": d, "text": "Effizienz stabil — Form gehalten."}


def insights(con: duckdb.DuckDBPyConnection, months: int = 8, today: date | None = None) -> dict:
    today = today or date.today()
    since = _months_back(today, months)
    eff = [{"month": f"{p.period}-01", "value": round(60 / p.pace, 2), "n": p.secs}
           for p in pace.pace_in_zone(con, "Z2", since=since)]

    z1_lo, _ = zones.band("Z1")
    _, z2_hi = zones.band("Z2")
    ef = con.execute(f"""
        SELECT strftime(date_trunc('month', start_time AT TIME ZONE '{pace.TZ}'), '%Y-%m-01') AS month,
               round(avg((distance_m / timer_s) / avg_hr * 1000), 2)
        FROM activities
        WHERE sport = 'running' AND avg_hr BETWEEN ? AND ? AND distance_m > 3000
          AND coalesce(total_ascent, 0) / (distance_m / 1000) < ?
          AND (start_time AT TIME ZONE '{pace.TZ}')::date >= ?
        GROUP BY 1 ORDER BY 1""", [z1_lo, z2_hi, pace.FLAT_HM_PER_KM, since]).fetchall()

    wellness = con.execute("""
        SELECT strftime(date_trunc('month', day), '%Y-%m-01'), round(avg(resting_hr), 1),
               round(avg(hrv_night_avg), 1), count(*)
        FROM daily_metrics WHERE day >= ? GROUP BY 1 ORDER BY 1""", [since]).fetchall()

    load = con.execute(f"""
        SELECT CAST(week(d) AS INTEGER), CAST(year(d) AS INTEGER), round(sum(distance_m) / 1000, 1),
               coalesce(sum(total_ascent), 0)
        FROM (SELECT (start_time AT TIME ZONE '{pace.TZ}')::date AS d, distance_m, total_ascent
              FROM activities WHERE sport = 'running' AND distance_m >= 500 AND timer_s >= 180
                AND (start_time AT TIME ZONE '{pace.TZ}')::date >= ?)
        GROUP BY 1, 2 ORDER BY 2, 1""", [today.fromordinal(today.toordinal() - 84)]).fetchall()

    return {
        "efficiency": eff,
        "ef": [{"month": m, "value": v} for m, v in ef],
        "rhr": [{"month": m, "value": r, "n": n} for m, r, _, n in wellness],
        "hrv": [{"month": m, "value": h, "n": n} for m, _, h, n in wellness],
        "load": [{"week": w, "year": y, "km": km or 0, "vert": v or 0} for w, y, km, v in load],
        "verdict": verdict([e["value"] for e in eff]),
    }


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="python -m training insights")
    ap.add_argument("--months", type=int, default=8)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)
    if not DB.is_file():
        print(json.dumps(None))
        return 0
    con = duckdb.connect(str(DB), read_only=True)
    print(json.dumps(insights(con, a.months), ensure_ascii=False, default=float))
    return 0
