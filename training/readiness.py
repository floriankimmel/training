"""Readiness (GLOSSARY.md, ADR 0002): the daily GREEN / AMBER / RED gate from Recovery-Flags.

Per day d, using only data up to d:
  HRV flag    3-day mean HRV, z-score vs. the 30 days before d      <= HRV_Z
  RHR flag    7-day mean resting HR minus the 30-day mean           >= RHR_DELTA bpm
  sleep flag  7-day mean sleep minus the 30-day mean                <= SLEEP_DEBT min
Verdict = number of flags: 0 GREEN, 1 AMBER, 2+ RED. Sleep entries <= 60 min are missing data.

Past days are frozen into `daily_readiness` (`python -m training readiness --freeze`, run by the
import pipeline); today is judged live. A frozen day is re-judged only when its own inputs changed.
"""
from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
from datetime import date, datetime, timezone

import duckdb

from .repo import ROOT

ALGO_VERSION = 2
HRV_Z = -1.0
RHR_DELTA = 4
SLEEP_DEBT = -45
BASE_DAYS = 30
VERDICTS = ("GREEN", "AMBER", "RED")
DB = ROOT / "db" / "training.duckdb"

SCHEMA = """
CREATE TABLE IF NOT EXISTS daily_readiness (
  day           DATE PRIMARY KEY,
  verdict       VARCHAR,          -- GREEN | AMBER | RED | NULL (no data)
  hrv_flag      BOOLEAN,          -- NULL = not enough data for this signal
  rhr_flag      BOOLEAN,
  sleep_flag    BOOLEAN,
  hrv_3d        DOUBLE, hrv_base DOUBLE, hrv_z DOUBLE,
  rhr_7d        DOUBLE, rhr_base DOUBLE,
  sleep_7d      DOUBLE, sleep_30d DOUBLE,
  sleep_min     INTEGER,          -- the day's own inputs, to detect late corrections
  hrv_night_avg DOUBLE,
  resting_hr    INTEGER,
  algo_version  INTEGER,
  judged_at     TIMESTAMPTZ
)"""


@dataclass
class Readiness:
    day: str
    verdict: str | None
    hrv_flag: bool | None
    rhr_flag: bool | None
    sleep_flag: bool | None
    hrv_3d: float | None
    hrv_base: float | None
    hrv_z: float | None
    rhr_7d: float | None
    rhr_base: float | None
    sleep_7d: float | None
    sleep_30d: float | None
    frozen: bool = False

    @property
    def reasons(self) -> list[str]:
        out = []
        if self.hrv_flag:
            out.append(f"HRV 3d z={self.hrv_z:.1f}")
        if self.rhr_flag:
            out.append(f"RHR 7d +{self.rhr_7d - self.rhr_base:.0f}")
        if self.sleep_flag:
            out.append(f"sleep debt {self.sleep_7d - self.sleep_30d:.0f} min/night")
        return out

    def to_dict(self) -> dict:
        return {**asdict(self), "reasons": self.reasons}


def gate(con: duckdb.DuckDBPyConnection, day: date) -> Readiness:
    """Judge `day` from daily_metrics rows on or before it."""
    hb, hsd, rb, sb, h, r, s = con.execute("""
        WITH m AS (SELECT day, hrv_night_avg AS hrv, resting_hr AS rhr,
                          CASE WHEN sleep_min > 60 THEN sleep_min END AS sleep
                   FROM daily_metrics WHERE day <= ?),
             base AS (SELECT avg(hrv) hb, stddev(hrv) hsd, avg(rhr) rb, avg(sleep) sb
                      FROM m WHERE day BETWEEN ?::DATE - ? AND ?::DATE - 1)
        SELECT base.*, (SELECT avg(hrv) FROM m WHERE day > ?::DATE - 3),
               (SELECT avg(rhr) FROM m WHERE day > ?::DATE - 7),
               (SELECT avg(sleep) FROM m WHERE day > ?::DATE - 7)
        FROM base""", [day, day, BASE_DAYS, day, day, day, day]).fetchone()
    z = (h - hb) / hsd if None not in (h, hb, hsd) and hsd else None
    hrv_flag = None if z is None else z <= HRV_Z
    rhr_flag = None if None in (r, rb) else (r - rb) >= RHR_DELTA
    sleep_flag = None if None in (s, sb) else (s - sb) <= SLEEP_DEBT
    flags = [f for f in (hrv_flag, rhr_flag, sleep_flag) if f is not None]
    verdict = VERDICTS[min(sum(flags), 2)] if flags else None
    return Readiness(day.isoformat(), verdict, hrv_flag, rhr_flag, sleep_flag,
                     h, hb, z, r, rb, s, sb)


def ensure_schema(con: duckdb.DuckDBPyConnection) -> None:
    """Create the v2 table; a v1 (tercile) table is dropped so the backfill re-judges every day."""
    cols = {c[0] for c in con.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_readiness'").fetchall()}
    if cols and "verdict" not in cols:
        con.execute("DROP TABLE daily_readiness")
    con.execute(SCHEMA)


def freeze(con: duckdb.DuckDBPyConnection, today: date | None = None) -> tuple[int, int]:
    """Judge every past day not yet frozen (or frozen by an older algorithm); re-judge changed inputs."""
    ensure_schema(con)
    today = today or date.today()
    rows = con.execute("""
        SELECT m.day, m.sleep_min, m.hrv_night_avg, m.resting_hr,
               r.day IS NOT NULL AND r.algo_version = ?, r.sleep_min, r.hrv_night_avg, r.resting_hr
        FROM daily_metrics m LEFT JOIN daily_readiness r USING (day)
        WHERE m.day < ? ORDER BY m.day""", [ALGO_VERSION, today]).fetchall()
    new = rejudged = 0
    now = datetime.now(timezone.utc)
    for day, s, h, rh, frozen, fs, fh, frh in rows:
        if frozen and (s, h, rh) == (fs, fh, frh):
            continue
        if frozen:
            rejudged += 1
        else:
            new += 1
        g = gate(con, day)
        con.execute("DELETE FROM daily_readiness WHERE day = ?", [day])
        con.execute("INSERT INTO daily_readiness VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    [day, g.verdict, g.hrv_flag, g.rhr_flag, g.sleep_flag, g.hrv_3d, g.hrv_base, g.hrv_z,
                     g.rhr_7d, g.rhr_base, g.sleep_7d, g.sleep_30d, s, h, rh, ALGO_VERSION, now])
    return new, rejudged


def for_days(con: duckdb.DuckDBPyConnection, days: list[date]) -> list[Readiness]:
    """Frozen row when present, else judged live (today, or not yet frozen)."""
    have = {c[0] for c in con.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_readiness'").fetchall()}
    frozen: dict[date, Readiness] = {}
    if "verdict" in have:
        for row in con.execute("""
                SELECT day, verdict, hrv_flag, rhr_flag, sleep_flag, hrv_3d, hrv_base, hrv_z,
                       rhr_7d, rhr_base, sleep_7d, sleep_30d
                FROM daily_readiness WHERE algo_version = ? AND day BETWEEN ? AND ?""",
                [ALGO_VERSION, min(days), max(days)]).fetchall():
            frozen[row[0]] = Readiness(row[0].isoformat(), *row[1:], frozen=True)
    has_metrics = {r[0] for r in con.execute(
        "SELECT day FROM daily_metrics WHERE day BETWEEN ? AND ?", [min(days), max(days)]).fetchall()}
    return [frozen.get(d) or gate(con, d) for d in days if d in frozen or d in has_metrics]


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="python -m training readiness")
    ap.add_argument("--freeze", action="store_true", help="freeze all unfrozen past days (writes the DB)")
    ap.add_argument("--day", help="judge one day live (YYYY-MM-DD), default today")
    a = ap.parse_args(argv)
    if a.freeze:
        con = duckdb.connect(str(DB))
        new, rejudged = freeze(con)
        con.close()
        print(f"Readiness: {new} day(s) frozen, {rejudged} re-judged (algo v{ALGO_VERSION})")
        return 0
    con = duckdb.connect(str(DB), read_only=True)
    g = gate(con, date.fromisoformat(a.day) if a.day else date.today())
    print(f"{g.day}: {g.verdict}" + (f" — {'; '.join(g.reasons)}" if g.reasons else ""))
    return 0

