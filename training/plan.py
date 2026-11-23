"""Weekly plan module: trainings/week-WW-YYYY.md -> Week -> Days -> Einheiten.

The one reader of the plan format (GLOSSARY.md: Einheit, Einheit-Art, Legacy-Plan).

Canonical layout (linted):
    ## Monday, 2026-11-23
    ### Title — 45min 🏃          <- one Einheit; Art from the header emoji, last " — " splits duration
    body lines ...

Legacy-Plans (text dates, "## Weekend (...)" blocks, bullet-only days) are still read so the
webview can show history, but they carry no `problems` and lint skips them.
"""
from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from datetime import date, timedelta
from pathlib import Path

from .repo import ROOT

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]
KINDS = ("run", "bike", "strength", "footwork", "rest")

# Einheit-Art from header emoji. Order matters: first hit wins (a ride header may also carry 🏃).
_EMOJI_KIND = [("🚴", "bike"), ("🦶", "footwork"), ("🏋", "strength"), ("💪", "strength"),
               ("🛌", "rest"), ("🏃", "run"), ("⚡", "run"), ("⛰", "run")]
_TRAILING_EMOJI = re.compile(r"[\s☀-➿️‍♀♂\U0001F300-\U0001FAFF]+$")
_FILE = re.compile(r"week-(\d+)-(\d{4})\.md$")
_DAY_ISO = re.compile(rf"^## ({'|'.join(WEEKDAYS)}),\s*(\d{{4}}-\d{{2}}-\d{{2}}).*$", re.M)
_DAY_ANY = re.compile(rf"^#{{2,3}} ({'|'.join(WEEKDAYS)}),\s*(.+?)\s*$", re.M)  # some old plans use ### days
_H2 = re.compile(r"^## ", re.M)
_H3 = re.compile(r"^### (.+)$", re.M)


@dataclass
class Einheit:
    kind: str | None          # one of KINDS; None only when a canonical header lacks an emoji
    title: str
    duration: str             # raw duration text after the last " — " ("45min", "2×20min"), "" if none
    minutes: int | None
    body: str
    strength_tag: str | None  # "1".."4" for "Kraft Tag N"
    page_refs: list[str]      # "S.109" -> "109", from the body


@dataclass
class Day:
    date: str
    weekday: str
    body: str                 # whole day section below the "## Day" header
    einheiten: list[Einheit] = field(default_factory=list)


@dataclass
class Week:
    year: int
    week: int
    title: str
    philosophy: str
    summary_table: str
    legacy: bool
    days: list[Day] = field(default_factory=list)
    problems: list[str] = field(default_factory=list)

    def day(self, iso: str) -> Day | None:
        return next((d for d in self.days if d.date == iso), None)

    def to_dict(self) -> dict:
        return asdict(self)


# ---------------------------------------------------------------- small parsers

def week_monday(year: int, week: int) -> date:
    return date.fromisocalendar(year, week, 1)


def minutes(text: str) -> int | None:
    """'45min' -> 45 · '2×20min' -> 40 · '1h 30min' -> 90 · '1h' -> 60 · no number -> None."""
    m = re.search(r"(\d+)\s*[×x]\s*(\d+)\s*min", text)
    if m:
        return int(m.group(1)) * int(m.group(2))
    m = re.search(r"(\d+)\s*h(?:\s*(\d+)\s*min)?", text)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2) or 0)
    m = re.search(r"(\d+)\s*min", text)
    return int(m.group(1)) if m else None


def kind_from_emoji(text: str) -> str | None:
    for emoji, kind in _EMOJI_KIND:
        if emoji in text:
            return kind
    return None


def _kind_from_words(title: str) -> str:
    t = title.lower()
    if re.search(r"\brest\b|\bruhetag\b|unscheduled", t):
        return "rest"
    if re.search(r"kraft|strength|mark lauren", t):
        return "strength"
    return "run"


def split_header(head: str) -> tuple[str, str]:
    """'Kraft Tag 4 — Core — 25min 🏋️' -> ('Kraft Tag 4 — Core', '25min').

    The last " — " splits only when the tail holds a digit; a bare "-" tail means no duration.
    A struck-through header (~~...~~, cancelled Einheit) keeps its ~~ around the title.
    """
    text = _TRAILING_EMOJI.sub("", head).strip()
    struck = text.startswith("~~") and text.endswith("~~") and len(text) > 4
    if struck:
        text = text[2:-2].strip()
    title, duration = text, ""
    if " — " in text or text.endswith(" —"):
        left, _, tail = text.rpartition(" —")
        tail = tail.strip()
        if re.search(r"\d", tail):
            title, duration = left.strip(), tail
        elif tail in ("", "-", "–"):
            title = left.strip()
    return (f"~~{title}~~" if struck else title), duration


def _einheit(head: str, body: str, legacy: bool) -> Einheit:
    title, duration = split_header(head)
    kind = kind_from_emoji(head)
    if kind is None and legacy:
        kind = _kind_from_words(title)
    tag = re.search(r"Kraft Tag (\d)", head + "\n" + body)
    return Einheit(
        kind=kind,
        title=title,
        duration=duration,
        minutes=minutes(duration) if duration else None,
        body=body.strip(),
        strength_tag=tag.group(1) if tag else None,
        page_refs=sorted(set(re.findall(r"S\.(\d+)", body)), key=int),
    )


def _h3_einheiten(body: str, legacy: bool) -> list[Einheit]:
    heads = list(_H3.finditer(body))
    out = []
    for i, m in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else len(body)
        out.append(_einheit(m.group(1), body[m.end():end], legacy))
    return out


def _sections(text: str, pattern: re.Pattern) -> list[tuple[re.Match, str]]:
    """Each header match with its body up to the next H2 header or the next match."""
    matches = list(pattern.finditer(text))
    out = []
    for i, m in enumerate(matches):
        nxt = _H2.search(text, m.end())
        end = min(nxt.start() if nxt else len(text), matches[i + 1].start() if i + 1 < len(matches) else len(text))
        out.append((m, text[m.end():end]))
    return out


# ---------------------------------------------------------------- canonical

def _is_legacy(text: str) -> bool:
    return not _DAY_ISO.search(text) or re.search(r"^## Weekend", text, re.M) is not None


def _parse_canonical(text: str, year: int, week: int) -> tuple[list[Day], list[str]]:
    mon = week_monday(year, week)
    days, problems = [], []
    for m, body in _sections(text, _DAY_ISO):
        weekday, iso = m.group(1), m.group(2)
        day = Day(date=iso, weekday=weekday, body=body.strip(), einheiten=_h3_einheiten(body, False))
        d = date.fromisoformat(iso)
        if not (mon <= d <= mon + timedelta(days=6)):
            problems.append(f"{iso}: date outside W{week:02d} {year}")
        elif WEEKDAYS[d.weekday()] != weekday:
            problems.append(f"{iso}: header says {weekday}, date is {WEEKDAYS[d.weekday()]}")
        for e in day.einheiten:
            if e.kind is None:
                problems.append(f"{iso}: '### {e.title}' has no Einheit-Art emoji (🏃 🚴 🏋️ 🦶 🛌)")
        days.append(day)
    return days, problems


# ---------------------------------------------------------------- legacy

def _legacy_date(weekday: str, raw: str, year: int, week: int) -> str:
    m = re.match(r"(\d{4}-\d{2}-\d{2})", raw)
    if m:
        return m.group(1)
    m = re.match(r"(\w+)\s+(\d+)", raw)
    if m and m.group(1) in MONTHS:
        return date(year, MONTHS.index(m.group(1)) + 1, int(m.group(2))).isoformat()
    return (week_monday(year, week) + timedelta(days=WEEKDAYS.index(weekday))).isoformat()


def _bullet_einheit(body: str, weekday: str) -> Einheit:
    m = (re.search(r"^-\s*\*\*(?:.*?\*\*:\s*)?\*\*(.+?)\*\*(?:\s*[-–—]\s*(.+?))?\s*$", body, re.M)
         or re.search(r"^-\s*\*\*(.+?)\*\*(?:\s*[-–—]\s*(.+))?", body, re.M))
    if m:
        title, duration = m.group(1).strip(), re.sub(r"\s*total\s*$", "", m.group(2) or "", flags=re.I).strip()
    else:
        first = next((ln for ln in body.strip().splitlines() if ln.strip()), "")
        title, duration = re.sub(r"^[-*#>\s]+", "", first).strip() or weekday, ""
    kind = kind_from_emoji(title) or _kind_from_words(title)
    return Einheit(kind=kind, title=title, duration=duration, minutes=minutes(duration) if duration else None,
                   body=body.strip(), strength_tag=None, page_refs=[])


def _parse_legacy(text: str, year: int, week: int) -> list[Day]:
    days = []
    for m, body in _sections(text, _DAY_ANY):
        weekday = m.group(1)
        iso = _legacy_date(weekday, re.sub(r"\s*[🔥🏁]\s*", "", m.group(2)).strip(), year, week)
        einheiten = (_h3_einheiten(body, True) if body.lstrip().startswith("### ")
                     else [_bullet_einheit(body, weekday)])
        days.append(Day(date=iso, weekday=weekday, body=body.strip(), einheiten=einheiten))
    # "## Weekend (April 18-19)" with "### Saturday: Title — 60min" sub-sections
    mon = week_monday(year, week)
    for _, body in _sections(text, re.compile(r"^## Weekend\s*\(.+?\)\s*$", re.M)):
        subs = list(re.finditer(r"^### (Saturday|Sunday):\s*(.+)$", body, re.M))
        for i, s in enumerate(subs):
            end = subs[i + 1].start() if i + 1 < len(subs) else len(body)
            sub_body = body[s.end():end]
            iso = (mon + timedelta(days=WEEKDAYS.index(s.group(1)))).isoformat()
            days.append(Day(date=iso, weekday=s.group(1), body=sub_body.strip(),
                            einheiten=[_einheit(s.group(2), sub_body, True)]))
    return days


# ---------------------------------------------------------------- interface

def parse_week(text: str, year: int, week: int) -> Week:
    title = re.search(r"^# (.+)$", text, re.M)
    phil = re.search(r"> \*\*(.+?)\*\*", text)
    summary = re.search(r"^## Weekly Summary\s*\n([\s\S]*?)(?=\n---|\n## |\Z)", text, re.M)
    legacy = _is_legacy(text)
    if legacy:
        days, problems = _parse_legacy(text, year, week), []
    else:
        days, problems = _parse_canonical(text, year, week)
    return Week(
        year=year, week=week,
        title=title.group(1) if title else f"Week {week}, {year}",
        philosophy=phil.group(1) if phil else "",
        summary_table=summary.group(1).strip() if summary else "",
        legacy=legacy, days=days, problems=problems,
    )


def week_path(year: int, week: int, root: Path = ROOT) -> Path:
    return root / "trainings" / f"week-{week:02d}-{year}.md"


def load_week(year: int, week: int, root: Path = ROOT) -> Week | None:
    p = week_path(year, week, root)
    return parse_week(p.read_text(encoding="utf-8"), year, week) if p.is_file() else None


def list_weeks(root: Path = ROOT) -> list[tuple[int, int]]:
    """All (year, week) with a plan file, oldest first."""
    out = []
    for p in (root / "trainings").glob("week-*.md"):
        m = _FILE.search(p.name)
        if m:
            out.append((int(m.group(2)), int(m.group(1))))
    return sorted(out)


def latest_week(root: Path = ROOT) -> tuple[int, int] | None:
    weeks = list_weeks(root)
    return weeks[-1] if weeks else None
