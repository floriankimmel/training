"""Schwelle trend table in benchmarks.md ("**Schwelle (Z3, ...)**"): read it, check it against the DB.

Feeds the webview trend card (via `page`) and the lint threshold-trend check.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from datetime import date
from pathlib import Path

from .pace import PacePoint, fmt
from .repo import ROOT

MONTHS_DE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
_ALIAS = {"Mar": "Mär", "May": "Mai", "Oct": "Okt", "Dec": "Dez"}
SECTION = "**Schwelle (Z3"
ZONE = "Z3"


@dataclass
class Trend:
    label: str
    rows: list[dict] = field(default_factory=list)   # {"period": "Jul 2026", "value": "5:07 /km", "month": "2026-07"}
    note: str = ""
    staleMonths: int = 0                              # camelCase: consumed as-is by the webview

    def to_dict(self) -> dict:
        return asdict(self)


def _month_key(period: str) -> str | None:
    m, _, y = period.partition(" ")
    m = _ALIAS.get(m, m)
    return f"{y}-{MONTHS_DE.index(m) + 1:02d}" if m in MONTHS_DE and y.isdigit() else None


def parse_trend(md: str, today: date | None = None) -> Trend | None:
    i = md.find(SECTION)
    if i < 0:
        return None
    nxt = md.find("\n**", i + 2)
    block = md[i: nxt if nxt > 0 else i + 800]
    rows = [{"period": f"{m} {y}", "value": f"{v} /km", "month": _month_key(f"{m} {y}")}
            for m, y, v in re.findall(r"\|\s*([A-Za-zä]+) (\d{4})\s*\|\s*\*{0,2}(\d+:\d{2}) /km", block)]
    if not rows:
        return None
    note = re.search(r"→ \*\*(.+?)\*\*", block)
    today = today or date.today()
    last = rows[-1]["month"]
    stale = (today.year - int(last[:4])) * 12 + today.month - int(last[5:]) if last else 0
    return Trend(label=f"Schwellen-Pace ({ZONE}) @ HF " + _band_label(), rows=rows,
                 note=note.group(1).replace("*", "") if note else "", staleMonths=stale)


def _band_label() -> str:
    from .zones import band
    lo, hi = band(ZONE)
    return f"{lo}–{hi}"


def load_trend(root: Path = ROOT) -> Trend | None:
    p = root / "benchmarks.md"
    return parse_trend(p.read_text(encoding="utf-8")) if p.is_file() else None


def check_trend(trend: Trend | None, db_months: list[PacePoint], tolerance_s: int = 10) -> list[str]:
    """WARN lines: DB has a newer qualifying month than the table, or the last row drifted from the DB."""
    if trend is None:
        return [f'benchmarks.md: "{SECTION}" trend section missing or empty']
    last = trend.rows[-1]
    if not last["month"]:
        return [f'benchmarks.md: unknown month "{last["period"]}" in trend table']
    mm, ss = last["value"].split(" ")[0].split(":")
    table_pace = int(mm) + int(ss) / 60
    db = {p.period: p.pace for p in db_months}
    out = []
    if last["month"] in db and abs(db[last["month"]] - table_pace) * 60 > tolerance_s:
        out.append(f'benchmarks.md trend {last["period"]} = {last["value"]}, DB says {fmt(db[last["month"]])} /km')
    for month in sorted(k for k in db if k > last["month"]):
        y, m = month.split("-")
        out.append(f"benchmarks.md trend missing {MONTHS_DE[int(m) - 1]} {y}: {fmt(db[month])} /km "
                   f"(DB, Pace in Zone {ZONE}) — add row")
    return out
