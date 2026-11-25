"""Körpergewicht-Trend (GLOSSARY.md): smoothed body weight from daily_metrics.body_mass_kg.

Per day d, using only weigh-ins up to d (days without a weigh-in are NULL and skipped):
  avg_7d        mean of d-6..d
  delta_7d      avg_7d minus the mean of the 7 days before (d-13..d-7)  -> kg/week
  delta_28d     avg_7d minus the mean of the 28 days before (d-34..d-7)
Weight warning: |delta_7d| >= WEEKLY_LIMIT_KG (default 1.5 kg/week). Each window needs >= MIN_SAMPLES
weigh-ins, else the delta is None (no warning). Single weigh-ins swing ±1 kg (water, glycogen), so only
the averages are judged. Direction vs. the goal (race weight, stable, unintended loss under high load)
is the coach's call, not this module's.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date

import duckdb

WEEKLY_LIMIT_KG = 1.5
MIN_SAMPLES = 2


@dataclass
class WeightTrend:
    day: str
    latest_kg: float | None
    latest_day: str | None
    avg_7d: float | None
    n_7d: int
    avg_prev_7d: float | None
    avg_prev_28d: float | None
    delta_7d: float | None
    delta_28d: float | None

    @property
    def warning(self) -> str | None:
        """'loss' / 'gain' when the 7d average moved >= WEEKLY_LIMIT_KG vs. the week before."""
        if self.delta_7d is None or abs(self.delta_7d) < WEEKLY_LIMIT_KG:
            return None
        return "loss" if self.delta_7d < 0 else "gain"

    def to_dict(self) -> dict:
        return {**asdict(self), "warning": self.warning, "limit_kg": WEEKLY_LIMIT_KG}


def trend(con: duckdb.DuckDBPyConnection, day: date) -> WeightTrend:
    a7, n7, ap7, np7, ap28, np28, latest, latest_day = con.execute("""
        WITH w AS (SELECT day, body_mass_kg kg FROM daily_metrics
                   WHERE body_mass_kg IS NOT NULL AND day <= ?)
        SELECT avg(kg) FILTER (WHERE day > ?::DATE - 7),  count(kg) FILTER (WHERE day > ?::DATE - 7),
               avg(kg) FILTER (WHERE day BETWEEN ?::DATE - 13 AND ?::DATE - 7),
               count(kg) FILTER (WHERE day BETWEEN ?::DATE - 13 AND ?::DATE - 7),
               avg(kg) FILTER (WHERE day BETWEEN ?::DATE - 34 AND ?::DATE - 7),
               count(kg) FILTER (WHERE day BETWEEN ?::DATE - 34 AND ?::DATE - 7),
               arg_max(kg, day), max(day)
        FROM w""", [day] * 11).fetchone()
    a7 = a7 if n7 >= MIN_SAMPLES else None
    ap7 = ap7 if np7 >= MIN_SAMPLES else None
    ap28 = ap28 if np28 >= MIN_SAMPLES else None
    d7 = round(a7 - ap7, 2) if None not in (a7, ap7) else None
    d28 = round(a7 - ap28, 2) if None not in (a7, ap28) else None
    return WeightTrend(day.isoformat(), latest, latest_day.isoformat() if latest_day else None,
                       a7, n7, ap7, ap28, d7, d28)


def series(con: duckdb.DuckDBPyConnection, start: date, end: date) -> list[dict]:
    """Weigh-ins between start and end (inclusive) for charts."""
    return [{"day": d.isoformat(), "kg": kg} for d, kg in con.execute(
        "SELECT day, body_mass_kg FROM daily_metrics WHERE body_mass_kg IS NOT NULL AND day BETWEEN ? AND ? "
        "ORDER BY day", [start, end]).fetchall()]


def describe(t: WeightTrend) -> str:
    """One report line."""
    f = lambda v, s="": "n/a" if v is None else f"{v:{s}.1f}"  # noqa: E731
    line = (f"weight latest {f(t.latest_kg)} kg ({t.latest_day}) | 7d {f(t.avg_7d)} kg ({t.n_7d} weigh-ins) | "
            f"vs prev 7d {f(t.delta_7d, '+')} kg | vs prev 28d {f(t.delta_28d, '+')} kg")
    if t.warning == "loss":
        line += f"\n⚠ weight −{abs(t.delta_7d):.1f} kg/wk (limit {WEEKLY_LIMIT_KG}) — unintended? check energy availability (fueling.md)"
    elif t.warning == "gain":
        line += f"\n⚠ weight +{t.delta_7d:.1f} kg/wk (limit {WEEKLY_LIMIT_KG}) — check intake / water retention / illness"
    return line
