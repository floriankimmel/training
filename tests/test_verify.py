from datetime import date

from training import verify

SINCE, UNTIL = date(2026, 11, 16), date(2026, 11, 22)


def r(title: str, due: str, done: str | None = None) -> dict:
    return {"title": title, "dueDate": f"{due}T00:00:00", "completed": done is not None,
            "completionDate": done, "tags": ["training"]}


def test_ticked_bike_without_fit_is_a_gap():
    rem = [r("🏃 Lauf flach Z1 — 35min", "2026-11-16", "2026-11-16T13:26:26"),
           r("🚴 Radtraining aerob — 60min", "2026-11-17", "2026-11-17T14:48:59")]
    checked, out = verify.gaps(rem, [("2026-11-16", "running")], SINCE, UNTIL)
    assert checked == 2
    assert out == ["2026-11-17 🚴 Radtraining aerob — 60min (completed 2026-11-17, no cycling activity)"]


def test_late_activity_matches_completion_day_and_strength_is_generic():
    rem = [r("🏃🏃 Langer Lauf — 40min", "2026-11-15", "2026-11-16T07:00:00"),
           r("💪 Kraft Tag 3: Ziehen", "2026-11-20", "2026-11-20T21:58:25")]
    acts = [("2026-11-16", "running"), ("2026-11-20", "generic")]
    assert verify.gaps(rem, acts, date(2026, 11, 15), UNTIL) == (2, [])


def test_one_activity_backs_one_reminder_and_open_or_footwork_ignored():
    rem = [r("🏃 Lauf A — 30min", "2026-11-18", "2026-11-18T12:00:00"),
           r("⚡ Strides — 35min", "2026-11-18", "2026-11-18T13:00:00"),
           r("🦶 Footwork — Fußkräftigung", "2026-11-18", "2026-11-18T20:00:00"),
           r("🏃 Recovery — 25min", "2026-11-19")]
    checked, out = verify.gaps(rem, [("2026-11-18", "running")], SINCE, UNTIL)
    assert checked == 2 and len(out) == 1
