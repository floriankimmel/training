"""Abgehakt ≠ trainiert: completed training reminders without a matching recorded activity.

`python -m training verify [--days N] [--asof YYYY-MM-DD]` lists every run, bike or Kraft reminder in
🏅 Trainingsplan that was ticked off in the last N days but has no activity of that sport in
db/training.duckdb on its due day or its completion day. Footwork is never recorded, so it is skipped.

Output lines (scripts/auto-import.sh logs them, the Paperclip sync reports them):
    GAP:<due date> <title> (completed <date>, no <sport> activity)
    OK:<n> completed Einheiten checked, all recorded
    WARN:<reason the check was skipped>
"""
from __future__ import annotations

import argparse
from datetime import date, timedelta

from . import plan
from .lint import fetch_reminders
from .pace import TZ
from .repo import ROOT

DB = ROOT / "db" / "training.duckdb"
CARDIO = {"run": "running", "bike": "cycling"}
NOT_STRENGTH = {"running", "cycling", "walking", "hiking"}


def _matches(kind: str, sport: str) -> bool:
    return sport == CARDIO[kind] if kind in CARDIO else sport not in NOT_STRENGTH


def gaps(reminders: list[dict], activities: list[tuple[str, str]], since: date, until: date) -> tuple[int, list[str]]:
    """(checked, gap lines). `activities` = (local ISO date, sport); each activity backs one reminder only."""
    pool = list(activities)
    checked, out = 0, []
    done = [t for t in reminders if t.get("completed") and "training" in (t.get("tags") or ["training"])]
    for t in sorted(done, key=lambda t: t.get("dueDate") or ""):
        kind = plan.kind_from_emoji(t.get("title", ""))
        due = (t.get("dueDate") or "")[:10]
        if kind not in ("run", "bike", "strength") or not due or not since.isoformat() <= due <= until.isoformat():
            continue
        checked += 1
        days = {due, (t.get("completionDate") or "")[:10]}
        hit = next((a for a in pool if a[0] in days and _matches(kind, a[1])), None)
        if hit:
            pool.remove(hit)
            continue
        what = CARDIO.get(kind, "strength")
        out.append(f"{due} {t['title']} (completed {(t.get('completionDate') or '?')[:10]}, no {what} activity)")
    return checked, out


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="python -m training verify")
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--asof", default=date.today().isoformat())
    a = ap.parse_args(argv)
    until = date.fromisoformat(a.asof)
    since = until - timedelta(days=a.days - 1)

    reminders, why = fetch_reminders()
    if reminders is None:
        print(f"WARN:verify skipped — {why}")
        return 0
    try:
        import duckdb
        con = duckdb.connect(str(DB), read_only=True)
        acts = [(d.isoformat(), s) for d, s in con.execute(
            f"SELECT (start_time AT TIME ZONE '{TZ}')::date, sport FROM activities "
            f"WHERE (start_time AT TIME ZONE '{TZ}')::date BETWEEN ? AND ?",
            [since - timedelta(days=1), until + timedelta(days=1)]).fetchall()]
    except Exception as e:  # noqa: BLE001 — locked/missing DB means skip, never crash the sync
        print(f"WARN:verify skipped — {type(e).__name__}: {e}")
        return 0

    checked, found = gaps(reminders, acts, since, until)
    for g in found:
        print(f"GAP:{g}")
    if not found:
        print(f"OK:{checked} completed Einheiten checked, all recorded")
    return 0
