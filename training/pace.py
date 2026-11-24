"""Pace in Zone (GLOSSARY.md): median flat-run pace while HR sits in one named zone.

One rule set for every caller (lint, report, webview insights):
  flat run      = total_ascent / km < FLAT_HM_PER_KM (missing ascent counts as flat)
  counted run   = at least MIN_SECS_PER_RUN seconds inside the zone (filters HR spikes)
  bucket        = local (Europe/Vienna) month, or 28-day block back from `asof`
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

import duckdb

from . import zones

FLAT_HM_PER_KM = 15
MIN_SECS_PER_RUN = 300
MIN_SPEED = 1.5          # m/s; below = walking/standing
AEROBIC_ZONE = "Z1"      # Aerobe Effizienz (GLOSSARY.md): easy runs reach it every week, Z2 only 1–2×/block
TZ = "Europe/Vienna"


@dataclass(frozen=True)
class PacePoint:
    period: str     # "2026-07" (month) or "2026-10-27..2026-11-23" (block)
    secs: int
    runs: int
    pace: float     # min/km


def fmt(pace: float) -> str:
    m, s = int(pace), round((pace % 1) * 60)
    return f"{m + s // 60}:{s % 60:02d}"


def pace_in_zone(con: duckdb.DuckDBPyConnection, zone: str, *, since: date | None = None,
                 bucket: str = "month", asof: date | None = None, min_secs: int = 180,
                 sport: str = "run") -> list[PacePoint]:
    """Pace in `zone` per bucket ('month' | 'block28'), oldest first. Buckets under `min_secs` are dropped."""
    lo, hi = zones.band(zone, sport)
    local = f"(r.ts AT TIME ZONE '{TZ}')"
    if bucket == "month":
        key = f"strftime(date_trunc('month', {local}), '%Y-%m')"
    elif bucket == "block28":
        if asof is None:
            raise ValueError("bucket='block28' needs asof")
        key = f"CAST(floor(datediff('day', {local}::date, DATE '{asof.isoformat()}') / 28) AS INTEGER)"
    else:
        raise ValueError(f"unknown bucket {bucket}")
    rows = con.execute(f"""
        WITH z AS (
          SELECT r.activity_id, {key} AS k, r.speed
          FROM records r JOIN activities a ON a.id = r.activity_id
          WHERE a.sport = 'running' AND r.hr BETWEEN ? AND ? AND r.speed > ?
            AND coalesce(a.total_ascent, 0) / nullif(a.distance_m / 1000, 0) < ?
            AND ({local})::date >= ? AND ({local})::date <= ?)
        SELECT k, count(*) AS secs, count(DISTINCT activity_id) AS runs, median(1000 / speed) / 60 AS pace
        FROM z WHERE activity_id IN (SELECT activity_id FROM z GROUP BY 1 HAVING count(*) >= ?)
        GROUP BY k HAVING count(*) >= ? ORDER BY k""",
        [lo, hi, MIN_SPEED, FLAT_HM_PER_KM, since or date(2000, 1, 1), asof or date(2100, 1, 1),
         MIN_SECS_PER_RUN, min_secs]).fetchall()
    out = []
    for k, secs, runs, pace in rows:
        if bucket == "block28":
            end = asof - timedelta(days=int(k) * 28)
            k = f"{(end - timedelta(days=27)).isoformat()}..{end.isoformat()}"
        out.append(PacePoint(str(k), int(secs), int(runs), float(pace)))
    if bucket == "block28":
        out.reverse()  # block 0 = most recent; return oldest first
    return out
