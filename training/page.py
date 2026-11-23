"""`python -m training page [--year Y --week W] --json`: everything the webview page needs, one call.

Webview side: webview/src/lib/core.ts. Grows with the zones / pace / readiness modules (ADR 0001).
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from datetime import timedelta

from . import benchmarks, plan, readiness, zones
from .repo import ROOT


def page(year: int | None, week: int | None, root: Path = ROOT) -> dict:
    weeks = plan.list_weeks(root)
    current = (year, week) if year and week else (weeks[-1] if weeks else None)
    w = plan.load_week(*current, root) if current else None
    return {
        "weeks": [{"year": y, "week": k} for y, k in weeks],
        "current": {"year": current[0], "week": current[1]} if current else None,
        "plan": w.to_dict() if w else None,
        "trend": t.to_dict() if (t := benchmarks.load_trend(root)) else None,
        "zones": zones.to_dicts("run", root),
        "readiness": _readiness(current, root) if current else [],
    }


def _readiness(current: tuple[int, int], root: Path) -> list[dict]:
    """Readiness for the 7 days of the shown week; [] when the DB is missing or locked by a writer."""
    db = root / "db" / "training.duckdb"
    if not db.is_file():
        return []
    try:
        import duckdb
        con = duckdb.connect(str(db), read_only=True)
        mon = plan.week_monday(*current)
        return [r.to_dict() for r in readiness.for_days(con, [mon + timedelta(days=i) for i in range(7)])]
    except Exception:  # noqa: BLE001 — the page must render without readiness
        return []


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="python -m training page")
    ap.add_argument("--year", type=int)
    ap.add_argument("--week", type=int)
    ap.add_argument("--json", action="store_true", help="JSON output (the only format)")
    a = ap.parse_args(argv)
    print(json.dumps(page(a.year, a.week), ensure_ascii=False))
    return 0
