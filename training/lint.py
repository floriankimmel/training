"""Plan lint checks on top of training.plan (called by scripts/lint.sh).

`python -m training lint` prints one line per finding, prefixed for scripts/lint.sh:
    SECTION:<title>   OK:<msg>   ERR:<msg>   WARN:<msg>
Checks are pure functions over parsed data so tests can feed fixtures.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from datetime import date, timedelta
from pathlib import Path

from . import benchmarks, pace, plan, zones
from .repo import ROOT

REMINDER_LIST = "🏅 Trainingsplan"
ALLOW_KRAFT_TRAVEL = "lint-allow: kraft-travel"
RETURN_KW = ("departure", "back ", "return", "rückflug", "rückkehr", "heimflug")


# ------------------------------------------------------------------ check: plan problems

def check_plan_problems(week: plan.Week) -> list[str]:
    return [f"W{week.week:02d} {p}" for p in week.problems]


# ------------------------------------------------------------------ check: Kraft on travel days

def travel_ranges(calendar_md: str) -> list[tuple[str, str]]:
    """Full away days from calendar.md rows whose strength column says 'not possible'.

    Fly-out day (range start) allows Kraft; return day (range end) too when Notes mention it.
    """
    ranges = []
    for line in calendar_md.splitlines():
        if not line.strip().startswith("|"):
            continue
        cols = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cols) < 5 or "not possible" not in cols[4].lower():
            continue
        ds = re.findall(r"\d{4}-\d{2}-\d{2}", cols[0])
        if not ds:
            continue
        start, end = ds[0], ds[-1]
        notes = cols[5].lower() if len(cols) > 5 else ""
        if start != end:
            start = (date.fromisoformat(start) + timedelta(days=1)).isoformat()
            if any(k in notes for k in RETURN_KW):
                end = (date.fromisoformat(end) - timedelta(days=1)).isoformat()
        if start <= end:
            ranges.append((start, end))
    return ranges


def check_kraft_travel(weeks: list[plan.Week], calendar_md: str) -> list[str]:
    ranges = travel_ranges(calendar_md)
    out = []
    for w in weeks:
        if w.legacy:
            continue
        for d in w.days:
            if ALLOW_KRAFT_TRAVEL in d.body or not any(e.kind == "strength" for e in d.einheiten):
                continue
            hit = next(((a, b) for a, b in ranges if a <= d.date <= b), None)
            if hit:
                out.append(f"week-{w.week:02d}-{w.year}.md: Kraft on {d.date} (travel {hit[0]}..{hit[1]})")
    return sorted(set(out))


# ------------------------------------------------------------------ check: strength pointer

def _strength_bullet(body: str) -> str:
    """The '- 💪 ...' bullet with its indented continuation lines (program, week, page refs)."""
    lines, out, on = body.split("\n"), [], False
    for ln in lines:
        if ln.startswith("- 💪"):
            on = True
            out.append(ln)
        elif on and ln.startswith("  "):
            out.append(ln)
        elif on:
            break
    return "\n".join(out)


def check_strength_pointer(week: plan.Week, strength_plan_md: str, program_md: str) -> list[str]:
    m = re.search(r"<!--\s*strength-pointer:\s*program=(\S+)\s+week=(\d+)\s+calendar=(\d+)\s*-->", strength_plan_md)
    if not m:
        return ['strength-plan.md: marker "<!-- strength-pointer: program=first-class week=N calendar=KW -->" missing']
    prog, wk, cal = m.group(1), int(m.group(2)), int(m.group(3))
    if prog not in ("first-class", "master-class"):
        return [f'strength-plan.md: unknown program "{prog}" (first-class|master-class)']
    pname = "First Class" if prog == "first-class" else "Master Class"
    other = "Master Class" if prog == "first-class" else "First Class"
    fname = f"trainings/week-{week.week:02d}-{week.year}.md"
    out = []
    if cal != week.week:
        out.append(f'strength-plan.md pointer is for calendar W{cal}, latest plan is W{week.week} ({fname}) '
                   f'— update "Current program week" + marker')

    body = next((p for p in re.split(r"(?m)^# (?=First Class|Master Class)", program_md) if p.startswith(pname)), "")
    refs, lo_hi = None, None
    for sec in re.split(r"(?m)^## ", body)[1:]:
        hm = re.match(r"Woche (\d+)(?:\s*(?:und|/)\s*(\d+))?", sec.split("\n", 1)[0])
        if hm and int(hm.group(1)) <= wk <= int(hm.group(2) or hm.group(1)):
            refs = set(re.findall(r"S\.(\d+)", sec.split("\n", 1)[1]))
            lo_hi = (int(hm.group(1)), int(hm.group(2) or hm.group(1)))
            break
    if refs is None:
        return out + [f'plans/strength-program-mark-lauren.md: no "{pname}" section for Woche {wk}']

    for d in week.days:
        for e in d.einheiten:
            if e.kind != "strength":
                continue
            block = _strength_bullet(e.body)
            if not block:
                continue
            tag = f"Kraft Tag {e.strength_tag}" if e.strength_tag else d.date
            if other in block:
                out.append(f'{fname}: {tag} mentions "{other}" but pointer says {pname}')
            for a, b in re.findall(r"(?:Woche|\bW)\s*\**\s*(\d+)(?:/(\d+))?", block):
                a, b = int(a), int(b or a)
                if (a, b) != lo_hi and not (lo_hi[0] <= a <= lo_hi[1]):
                    out.append(f"{fname}: {tag} says week {a}, pointer says {pname} Woche {lo_hi[0]}..{lo_hi[1]}")
            bad = sorted(set(re.findall(r"S\.(\d+)", block)) - refs, key=int)
            if bad:
                out.append(f"{fname}: {tag} page refs not in {pname} Woche {wk} table: S." + ", S.".join(bad))
    return out


# ------------------------------------------------------------------ check: Apple Reminders mirror

def _workout_minutes(spec: str) -> float:
    def tsec(x: str) -> int:
        m = re.fullmatch(r"(\d+)(min|s)", x)
        if m:
            return int(m.group(1)) * (60 if m.group(2) == "min" else 1)
        m = re.fullmatch(r"(\d+):(\d+)", x)
        return int(m.group(1)) * 60 + int(m.group(2)) if m else 0

    total = 0
    for tok in re.findall(r"\d+x\([^)]*\)|\S+", spec):
        m = re.fullmatch(r"(\d+)x\((.*)\)", tok)
        if m:
            total += int(m.group(1)) * sum(tsec(t) for t in re.findall(r"time:([0-9:]+(?:min|s)?)", m.group(2)))
        else:
            t = re.search(r"time:([0-9:]+(?:min|s)?)", tok)
            if t:
                total += tsec(t.group(1))
    return total / 60


def check_workout_hr(title: str, spec: str, sport: str, root: Path = ROOT) -> list[str]:
    """HR targets in an @workout spec must fit the highest zone named in the title (zones.md).

    Upper bound of every hr:a-b <= ceiling of that zone; a pure Z1 session needs an hr alert.
    Titles without a zone (e.g. "Rad-Pendeln") are skipped.
    """
    named = re.findall(r"\bZ([1-5])\b", title)
    if not named:
        return []
    top = f"Z{max(int(n) for n in named)}"
    try:
        _, ceiling = zones.band(top, sport, root)
    except (KeyError, ValueError, OSError):
        return []
    # steps < 60s (strides, Bergsprints) may go above the ceiling
    ranges = [(int(a), int(b)) for d, a, b in re.findall(r"(?:time:([0-9:]+(?:min|s)?))?@hr:(\d+)-(\d+)", spec)
              if not (d and d.endswith("s") and not d.endswith("min") and int(d[:-1]) < 60)]
    out = []
    if top == "Z1" and not ranges:
        out.append(f'"{title}": Z1 @workout has no hr alert (zones.md: Recovery hr:125-138)')
    for a, b in ranges:
        if b > ceiling:
            out.append(f'"{title}": @workout hr:{a}-{b} exceeds {top} ceiling {ceiling} (zones.md)')
        if a > b:
            out.append(f'"{title}": @workout hr:{a}-{b} inverted')
    return out


def check_reminders(week: plan.Week, reminders: list[dict]) -> list[str]:
    """Every non-rest Einheit has a reminder of the same Art on the same day, and vice versa."""
    mon = plan.week_monday(week.year, week.week)
    lo, hi = mon.isoformat(), (mon + timedelta(days=6)).isoformat()
    P: dict[str, list[plan.Einheit]] = {}
    for d in week.days:
        for e in d.einheiten:
            if e.kind and e.kind != "rest":
                P.setdefault(d.date, []).append(e)
    R: dict[str, list[dict]] = {}
    for t in reminders:
        due = (t.get("dueDate") or "")[:10]
        k = plan.kind_from_emoji(t.get("title", ""))
        if due and lo <= due <= hi and k and k != "rest":
            R.setdefault(due, []).append({"kind": k, "title": t["title"], "notes": t.get("notes") or ""})

    out = []
    for day in sorted(set(P) | set(R)):
        p_all, r_all = P.get(day, []), R.get(day, [])
        for k in ("run", "bike", "strength", "footwork"):
            pk = [e for e in p_all if e.kind == k]
            rk = [r for r in r_all if r["kind"] == k]
            if k == "strength":
                pm = {e.strength_tag or e.title: e for e in pk}
                rm = {}
                for r in rk:
                    t = re.search(r"Kraft Tag (\d)", r["title"])
                    rm[t.group(1) if t else r["title"]] = r
                for tag in sorted(set(pm) | set(rm), key=str):
                    if tag not in rm:
                        out.append(f"{day}: plan has Kraft Tag {tag}, no reminder")
                    elif tag not in pm:
                        out.append(f'{day}: reminder "{rm[tag]["title"]}" not in plan')
                    else:
                        pr, nr = set(pm[tag].page_refs), set(re.findall(r"S\.(\d+)", rm[tag]["notes"]))
                        if pr != nr:
                            out.append(f"{day}: Kraft Tag {tag} page refs differ plan vs reminder (S."
                                       + ", S.".join(sorted(pr ^ nr, key=int)) + ")")
                        if "@workout" in rm[tag]["notes"]:
                            out.append(f"{day}: Kraft Tag {tag} reminder must not have @workout")
                continue
            if len(pk) != len(rk):
                out.append(f"{day}: {len(pk)} {k} Einheit(en) in plan, {len(rk)} reminder(s)")
                continue
            for e, r in zip(pk, rk):
                notes = r["notes"]
                if k == "footwork":
                    if "@workout" in notes:
                        out.append(f"{day}: footwork reminder must not have @workout")
                    continue
                td = plan.minutes(r["title"].rsplit(" — ", 1)[-1])
                if e.minutes is not None and td is not None and e.minutes != td:
                    out.append(f"{day}: {k} duration plan {e.minutes}min vs reminder title {td}min")
                lines = [ln for ln in notes.strip().split("\n") if ln.strip()]
                last = lines[-1] if lines else ""
                if not last.startswith(f"@workout {k} "):
                    out.append(f'{day}: {k} reminder "{r["title"]}" does not end with "@workout {k} ..."')
                    continue
                sm = _workout_minutes(last)
                if e.minutes and abs(sm - e.minutes) > max(3, 0.1 * e.minutes):
                    out.append(f"{day}: {k} @workout spec ~{sm:.0f}min vs plan {e.minutes}min")
                out.extend(f"{day}: {k} {h}" for h in check_workout_hr(r["title"], last, k))
    return out


def fetch_reminders() -> tuple[list[dict] | None, str]:
    if not shutil.which("remctl"):
        return None, "remctl not installed"
    try:
        r = subprocess.run(["remctl", "show", REMINDER_LIST, "--completed", "--json"],
                           capture_output=True, text=True, timeout=60)
        return json.loads(r.stdout), ""
    except Exception as e:  # noqa: BLE001 — any failure means "skip", never crash lint
        return None, f"remctl failed ({type(e).__name__})"


# ------------------------------------------------------------------ CLI

def _read(p: Path) -> str:
    return p.read_text(encoding="utf-8") if p.is_file() else ""


def main(argv: list[str], root: Path = ROOT) -> int:
    latest = plan.latest_week(root)
    if latest is None:
        print("WARN:no trainings/week-*.md found")
        return 0
    weeks = [w for w in (plan.load_week(y, k, root) for y, k in plan.list_weeks(root)) if w]
    week = weeks[-1]

    def section(title: str, hits: list[str], ok: str, prefix: str = "ERR") -> None:
        print(f"SECTION:{title}")
        if hits:
            for h in hits:
                print(f"{prefix}:{h}")
        else:
            print(f"OK:{ok}")

    if week.legacy:
        print("SECTION:latest week plan format")
        print(f"WARN:week-{week.week:02d}-{week.year}.md is a Legacy-Plan — plan checks skipped")
        return 0
    section("latest week plan format", check_plan_problems(week), f"W{week.week:02d} parses cleanly")
    section("strength vs. calendar travel days", check_kraft_travel(weeks, _read(root / "calendar.md")),
            "no Kraft scheduled on calendar travel days")
    section("strength pointer vs. latest week plan",
            check_strength_pointer(week, _read(root / "strength-plan.md"),
                                   _read(root / "plans" / "strength-program-mark-lauren.md")),
            "strength pointer, latest plan and digitized program agree")
    db = root / "db" / "training.duckdb"
    print("SECTION:threshold trend (benchmarks.md) vs. DuckDB")
    try:
        import duckdb
        con = duckdb.connect(str(db), read_only=True)
        trend = benchmarks.load_trend(root)
        since = date.fromisoformat(trend.rows[-1]["month"] + "-01") if trend and trend.rows[-1]["month"] else None
        hits = benchmarks.check_trend(trend, pace.pace_in_zone(con, benchmarks.ZONE, since=since))
        for h in hits:
            print(f"WARN:{h}")
        if not hits:
            print("OK:threshold trend table up to date with DB")
    except Exception as e:  # noqa: BLE001 — missing/locked DB means skip, not fail
        print(f"WARN:trend check skipped — {type(e).__name__}: {e}")

    reminders, why = fetch_reminders()
    if reminders is None:
        print("SECTION:Apple Reminders vs. latest week plan")
        print(f"WARN:reminders check skipped — {why}")
    else:
        section("Apple Reminders vs. latest week plan", check_reminders(week, reminders),
                "reminders match latest week plan")
    return 0
