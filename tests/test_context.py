from datetime import date

from training import context

STATUS = """# Training Status

## Current Target

- **Race**: Vienna Trail Run — 23.8 km / ~1000 hm — 2026-10-18
- **Goal time**: sub 2:45
"""

BUILD = """## Macro plan

| Week | Dates (Mon) | Phase | Long Run | Weekly Vert (hm) | Long-run Vert | Focus |
|------|-------------|-------|----------|------------------|---------------|-------|
| W34 | 08-17 | Reboot (flat) | 60min | ~100 (flat) | 0–100 | toe-safe, flat |
| W36 | 08-31 | Build 2 | 85min | ~450 | 250–350 | more vert, sustained climbs |
| W42 | 10-12 | Race week | shakeout + RACE | race ~1000 | race | Sun 10-18 RACE |
"""

INJURIES = """# Injuries

## 2026 — Toe fracture

- **Status**: active, flat runs only

## 2026 — Cold

- **Status**: active — resolved 2026-09-20

## 2026 — Ear pain

- **Status**: healed
"""


def test_race_parses_distance_vert_and_countdown():
    race = context.parse_race(STATUS, today=date(2026, 10, 1))
    assert race.to_dict() == {"name": "Vienna Trail Run", "distanceKm": 23.8, "vertHm": 1000,
                              "date": "2026-10-18", "daysToGo": 17, "goal": "sub 2:45"}


def test_race_is_none_without_a_race_line():
    assert context.parse_race("# Status\n\n- **Kein aktives Zielrennen.**\n") is None


def test_phase_reads_the_macro_row_for_one_week():
    assert context.parse_phase(BUILD, 36).to_dict() == {
        "week": 36, "phase": "Build 2", "longRun": "85min", "vertTarget": 450,
        "focus": "more vert, sustained climbs"}


def test_phase_is_none_for_a_week_outside_the_plan():
    assert context.parse_phase(BUILD, 48) is None


def test_progression_covers_every_week_and_tolerates_text_cells():
    assert [p.to_dict() for p in context.parse_progression(BUILD)] == [
        {"week": 34, "phase": "Reboot (flat)", "lrMin": 60, "vert": 100},
        {"week": 36, "phase": "Build 2", "lrMin": 85, "vert": 450},
        {"week": 42, "phase": "Race week", "lrMin": None, "vert": 1000},
    ]


def test_only_open_injuries_count_as_active():
    assert [i.to_dict() for i in context.parse_active_injuries(INJURIES)] == [
        {"title": "2026 — Toe fracture", "status": "active, flat runs only"}]


def test_context_degrades_to_empty_without_the_files(tmp_path):
    assert context.context(36, tmp_path) == {"race": None, "phase": None, "injuries": [], "progression": []}


def test_context_assembles_the_page_payload(tmp_path):
    (tmp_path / "STATUS.md").write_text(STATUS)
    (tmp_path / "injuries.md").write_text(INJURIES)
    (tmp_path / "plans").mkdir()
    (tmp_path / context.BUILD_PLAN).write_text(BUILD)
    out = context.context(36, tmp_path, today=date(2026, 10, 1))
    assert out["race"]["name"] == "Vienna Trail Run"
    assert out["phase"]["phase"] == "Build 2"
    assert [i["title"] for i in out["injuries"]] == ["2026 — Toe fracture"]
    assert len(out["progression"]) == 3


def test_context_without_a_week_has_no_phase(tmp_path):
    (tmp_path / "plans").mkdir()
    (tmp_path / context.BUILD_PLAN).write_text(BUILD)
    assert context.context(None, tmp_path)["phase"] is None
