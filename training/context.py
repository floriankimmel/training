"""Season context for the webview header: target race, macro-plan phase, active injuries.

The one reader of STATUS.md "Current Target", the build-plan macro table and injuries.md.
Domain rules do not live in TypeScript (ADR 0001); the webview gets this through `page --json`.

Parse functions take markdown text so they are testable without the repo; `context()` reads
the files and shapes the payload. Wire keys are camelCase: the webview consumes them as-is.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from .repo import ROOT

BUILD_PLAN = "plans/build-plan-vienna-2026.md"

# "- **Race**: Vienna Trail Run — 23.8 km / ~1000 hm — 2026-10-18"
_RACE = re.compile(r"\*\*Race\*\*:\s*(.+?)\s*[—-]\s*([\d.]+)\s*km\s*/\s*~?(\d+)\s*hm\s*[—-]\s*(\d{4}-\d{2}-\d{2})")
_GOAL = re.compile(r"\*\*Goal time\*\*:\s*(.+?)\s*$", re.M)
# "| W36 | 08-31 | Build 2 | 85min | ~450 | 250–350 | more vert, sustained climbs |"
_PROGRESSION = re.compile(r"\|\s*W(\d+)\s*\|[^|]*\|([^|]*)\|([^|]*)\|([^|]*)\|")
_STATUS = re.compile(r"\*\*Status\*\*:\s*(.+?)\s*$", re.M)
_ACTIVE = re.compile(r"^active", re.I)
_CLOSED = re.compile(r"resolved|healed|abgeschlossen", re.I)


@dataclass(frozen=True)
class Race:
    name: str
    distance_km: float
    vert_hm: int
    day: str            # ISO
    days_to_go: int
    goal: str | None

    def to_dict(self) -> dict:
        return {"name": self.name, "distanceKm": self.distance_km, "vertHm": self.vert_hm,
                "date": self.day, "daysToGo": self.days_to_go, "goal": self.goal}


@dataclass(frozen=True)
class Phase:
    week: int
    phase: str          # "Build 2"
    long_run: str       # "85min"
    vert_target: int | None
    focus: str

    def to_dict(self) -> dict:
        return {"week": self.week, "phase": self.phase, "longRun": self.long_run,
                "vertTarget": self.vert_target, "focus": self.focus}


@dataclass(frozen=True)
class Injury:
    title: str
    status: str

    def to_dict(self) -> dict:
        return {"title": self.title, "status": self.status}


@dataclass(frozen=True)
class LongRunPoint:
    week: int
    phase: str
    lr_min: int | None
    vert: int | None

    def to_dict(self) -> dict:
        return {"week": self.week, "phase": self.phase, "lrMin": self.lr_min, "vert": self.vert}


def _first_int(text: str) -> int | None:
    m = re.search(r"(\d+)", text)
    return int(m.group(1)) if m else None


def parse_race(md: str, today: date | None = None) -> Race | None:
    """Target race from the STATUS.md "Current Target" block. None when no race line is present."""
    m = _RACE.search(md)
    if not m:
        return None
    goal = _GOAL.search(md)
    day = m.group(4)
    return Race(name=m.group(1).strip(), distance_km=float(m.group(2)), vert_hm=int(m.group(3)),
                day=day, days_to_go=(date.fromisoformat(day) - (today or date.today())).days,
                goal=goal.group(1).strip() if goal else None)


def parse_phase(md: str, week: int) -> Phase | None:
    """The build-plan macro row for one ISO week."""
    m = re.search(rf"\|\s*W{week}\s*\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|([^|]*)\|", md)
    if not m:
        return None
    return Phase(week=week, phase=m.group(2).strip(), long_run=m.group(3).strip(),
                 vert_target=_first_int(m.group(4)), focus=m.group(6).strip())


def parse_progression(md: str) -> list[LongRunPoint]:
    """Long-run and vert progression over every macro-table week."""
    out = []
    for m in _PROGRESSION.finditer(md):
        lr = re.search(r"(\d+)\s*min", m.group(3))
        out.append(LongRunPoint(week=int(m.group(1)), phase=m.group(2).strip(),
                                lr_min=int(lr.group(1)) if lr else None, vert=_first_int(m.group(4))))
    return out


def parse_active_injuries(md: str) -> list[Injury]:
    """Sections of injuries.md whose **Status** still starts with "active" and is not closed."""
    out = []
    for section in re.split(r"\n## ", md)[1:]:
        m = _STATUS.search(section)
        if not m:
            continue
        status = m.group(1).strip()
        if _ACTIVE.search(status) and not _CLOSED.search(status):
            out.append(Injury(title=section.split("\n")[0].strip(), status=status))
    return out


def _read(root: Path, rel: str) -> str:
    p = root / rel
    return p.read_text(encoding="utf-8") if p.is_file() else ""


def context(week: int | None, root: Path = ROOT, today: date | None = None) -> dict:
    """Everything the season header needs; missing files degrade to null / []."""
    build = _read(root, BUILD_PLAN)
    race = parse_race(_read(root, "STATUS.md"), today)
    phase = parse_phase(build, week) if week else None
    return {
        "race": race.to_dict() if race else None,
        "phase": phase.to_dict() if phase else None,
        "injuries": [i.to_dict() for i in parse_active_injuries(_read(root, "injuries.md"))],
        "progression": [p.to_dict() for p in parse_progression(build)],
    }
