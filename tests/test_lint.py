from pathlib import Path

from training import lint, plan

FIX = Path(__file__).parent / "fixtures"
WEEK = plan.parse_week((FIX / "week-canonical.md").read_text(), 2026, 48)

CAL = """| Dates | Event | Running | Bike | Strength | Notes |
|---|---|---|---|---|---|
| 2026-11-24..2026-11-27 | Göteborg | limited | no | not possible | return flight 27th |
"""


def test_travel_range_drops_flyout_and_return_day():
    assert lint.travel_ranges(CAL) == [("2026-11-25", "2026-11-26")]


def test_kraft_on_travel_day_flagged_and_override_respected():
    assert lint.check_kraft_travel([WEEK], CAL) == ["week-48-2026.md: Kraft on 2026-11-25 (travel 2026-11-25..2026-11-26)"]
    text = (FIX / "week-canonical.md").read_text().replace(
        "### Abends: Kraft Tag 1", "<!-- lint-allow: kraft-travel — test -->\n\n### Abends: Kraft Tag 1")
    assert lint.check_kraft_travel([plan.parse_week(text, 2026, 48)], CAL) == []


SP = "<!-- strength-pointer: program=first-class week=6 calendar=48 -->"
PROG = "# First Class\n\n## Woche 5 und 6\n\nS.109 S.128 S.131\n\n# Master Class\n\n## Woche 1\n\nS.300\n"


def test_strength_pointer_ok_ignores_focus_bullet():
    # "W47" sits in the Fokus bullet, not the 💪 bullet -> no week mismatch
    assert lint.check_strength_pointer(WEEK, SP, PROG) == []


def test_strength_pointer_flags_stale_marker_and_unknown_page():
    prog = PROG.replace("S.128 ", "")
    out = lint.check_strength_pointer(WEEK, SP.replace("calendar=48", "calendar=47"), prog)
    assert any("pointer is for calendar W47" in o for o in out)
    assert any("page refs not in First Class Woche 6 table: S.128" in o for o in out)


def rem(due, title, notes=""):
    return {"dueDate": due + "T08:00:00", "title": title, "notes": notes}


GOOD = [
    rem("2026-11-23", "🏃 Tempo Z3 — 45min", "x\n@workout run 1x(time:45min)"),
    rem("2026-11-24", "🚴 Rad-Pendeln — 40min", "@workout bike time:20min time:20min"),
    rem("2026-11-25", "🏃 Lauf Z1 — 45min", "@workout run time:45min"),
    rem("2026-11-25", "🦶 Footwork — 10min", "Zehen"),
    rem("2026-11-25", "🏋️ Kraft Tag 1 — Drücken", "S.109 S.128"),
    rem("2026-11-29", "🏃 Langer Lauf — 65min", "@workout run time:65min"),
]


def test_reminders_match():
    assert lint.check_reminders(WEEK, GOOD) == []


def test_reminders_mismatches():
    bad = [r for r in GOOD if "Footwork" not in r["title"]]
    bad[0] = rem("2026-11-23", "🏃 Tempo Z3 — 50min", "@workout run time:50min")
    bad[4] = rem("2026-11-25", "🏋️ Kraft Tag 1 — Drücken", "S.109")
    out = lint.check_reminders(WEEK, bad)
    assert "2026-11-23: run duration plan 45min vs reminder title 50min" in out
    assert "2026-11-25: 1 footwork Einheit(en) in plan, 0 reminder(s)" in out
    assert "2026-11-25: Kraft Tag 1 page refs differ plan vs reminder (S.128)" in out
