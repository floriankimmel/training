from pathlib import Path

import pytest

from training import plan

FIX = Path(__file__).parent / "fixtures"


@pytest.fixture
def canon() -> plan.Week:
    return plan.parse_week((FIX / "week-canonical.md").read_text(), 2026, 48)


@pytest.fixture
def legacy() -> plan.Week:
    return plan.parse_week((FIX / "week-legacy-weekend.md").read_text(), 2026, 5)


def test_canonical_is_not_legacy(canon):
    assert not canon.legacy
    assert canon.philosophy == "Philosophie: locker bleiben"
    assert [d.date for d in canon.days] == ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26",
                                            "2026-11-27", "2026-11-29"]


def test_multiple_einheiten_per_day(canon):
    wed = canon.day("2026-11-25")
    assert [(e.kind, e.title, e.minutes) for e in wed.einheiten] == [
        ("run", "Lauf Z1", 45),
        ("footwork", "Footwork — Fußkräftigung & Mobility", 10),
        ("strength", "Abends: Kraft Tag 1 — Drücken", 30),
    ]


def test_last_dash_splits_duration_and_strength_fields(canon):
    kraft = canon.day("2026-11-25").einheiten[2]
    assert kraft.duration == "30min"
    assert kraft.strength_tag == "1"
    assert kraft.page_refs == ["109", "128"]


@pytest.mark.parametrize("text,expected", [
    ("45min", 45), ("2×20min", 40), ("2x20min", 40), ("1h 5min", 65), ("1h", 60), ("Core", None),
])
def test_minutes(text, expected):
    assert plan.minutes(text) == expected


def test_kinds_from_emoji(canon):
    kinds = {d.date: [e.kind for e in d.einheiten] for d in canon.days}
    assert kinds["2026-11-24"] == ["bike"]
    assert kinds["2026-11-26"] == ["rest"]
    assert canon.day("2026-11-26").einheiten[0].title == "Ruhetag"
    assert canon.day("2026-11-24").einheiten[0].minutes == 40


def test_missing_emoji_is_a_problem_not_a_crash(canon):
    assert canon.day("2026-11-27").einheiten[0].kind is None
    assert canon.problems == ["2026-11-27: '### Mobility ohne Emoji' has no Einheit-Art emoji (🏃 🚴 🏋️ 🦶 🛌)"]


def test_wrong_weekday_header_is_a_problem():
    w = plan.parse_week("## Sunday, 2026-11-23\n\n### Lauf — 30min 🏃\n", 2026, 48)
    assert w.problems == ["2026-11-23: header says Sunday, date is Monday"]


def test_legacy_text_dates_bullets_and_weekend(legacy):
    assert legacy.legacy and legacy.problems == []
    got = [(d.date, d.einheiten[0].kind, d.einheiten[0].title, d.einheiten[0].duration) for d in legacy.days]
    assert got == [
        ("2026-01-26", "run", "Hill Repeats 5x3min Z4", "50min"),
        ("2026-01-27", "run", "Lunch", ""),
        ("2026-01-31", "strength", "Kraft Mark Lauren", "30min"),
        ("2026-02-01", "run", "Long Run Z1", "90min"),
    ]
    assert legacy.summary_table == "| a | b |"


def test_struck_header_keeps_markers():
    assert plan.split_header("~~Rad-Pendeln — 2×20min~~") == ("~~Rad-Pendeln~~", "2×20min")


def test_real_repo_latest_week_parses():
    latest = plan.latest_week()
    assert latest is not None
    w = plan.load_week(*latest)
    assert w is not None and w.days
