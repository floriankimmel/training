"""HR zones read from zones.md, the single source of truth. Nothing else may hardcode bpm."""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path

from .repo import ROOT

SECTIONS = {"run": "## Zones — Laufen", "bike": "## Zones — Rad"}


@dataclass(frozen=True)
class Zone:
    name: str   # "Z0" (Aktive Erholung, written "–" in zones.md) .. "Z5"
    label: str  # "Extensive Ausdauer"
    lo: int
    hi: int     # inclusive; open-ended top zone gets 250


def parse_zones(md: str, sport: str = "run") -> list[Zone]:
    i = md.find(SECTIONS[sport])
    if i < 0:
        raise ValueError(f"zones.md: section '{SECTIONS[sport]}' missing")
    nxt = md.find("\n## ", i + 3)
    out: list[Zone] = []
    for name, label, rng in re.findall(r"^\|\s*(Z\d|–|-)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|", md[i: nxt if nxt > 0 else None], re.M):
        name = "Z0" if name in ("–", "-") else name
        if m := re.fullmatch(r"bis (\d+)", rng):
            lo, hi = 0, int(m.group(1))
        elif m := re.fullmatch(r"(\d+)\s*[–-]\s*(\d+)", rng):
            lo, hi = int(m.group(1)), int(m.group(2))
        elif m := re.fullmatch(r"(\d+)\+", rng):
            lo, hi = int(m.group(1)), 250
        else:
            raise ValueError(f"zones.md: cannot read range '{rng}' for {name}")
        out.append(Zone(name, label, lo, hi))
    return out


@lru_cache
def _md(root: Path) -> str:
    return (root / "zones.md").read_text(encoding="utf-8")


def zones(sport: str = "run", root: Path = ROOT) -> list[Zone]:
    return parse_zones(_md(root), sport)


def band(name: str, sport: str = "run", root: Path = ROOT) -> tuple[int, int]:
    """(lo, hi) bpm of a named zone, e.g. band('Z3') -> (153, 160)."""
    for z in zones(sport, root):
        if z.name == name:
            return z.lo, z.hi
    raise KeyError(f"zone {name} not in zones.md ({sport})")


def hr_max(root: Path = ROOT) -> int:
    m = re.search(r"\*\*hrMax\*\*:\s*(\d+)", _md(root))
    if not m:
        raise ValueError("zones.md: **hrMax** line missing")
    return int(m.group(1))


def to_dicts(sport: str = "run", root: Path = ROOT) -> list[dict]:
    return [asdict(z) for z in zones(sport, root)]


def main(argv: list[str]) -> int:
    import json
    sport = argv[argv.index("--sport") + 1] if "--sport" in argv else "run"
    print(json.dumps(to_dicts(sport), ensure_ascii=False))
    return 0
