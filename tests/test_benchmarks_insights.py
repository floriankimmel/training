from datetime import date

from training import benchmarks, insights
from training.pace import PacePoint

MD = """## Fitness Trend

**Schwelle (Z3, HF 153–160)** — speist Webview-Karte.

| Monat | Pace @ HF 153–160 |
|-------|-------------------|
| Aug 2025 | 5:45 /km |
| Jul 2026 | **5:07 /km** |

→ **~0:40 min/km schneller**; Rest.

**Z4 (HF 160–170):**

| Monat | Pace |
|---|---|
| Aug 2026 | 4:29 /km |
"""


def test_parse_trend_stops_at_next_section_and_counts_staleness():
    t = benchmarks.parse_trend(MD, today=date(2026, 11, 23))
    assert [r["period"] for r in t.rows] == ["Aug 2025", "Jul 2026"]
    assert t.rows[-1]["month"] == "2026-07"
    assert t.note == "~0:40 min/km schneller"
    assert t.staleMonths == 4
    assert t.label == "Schwellen-Pace (Z3) @ HF 153–160"


def test_check_trend():
    t = benchmarks.parse_trend(MD, today=date(2026, 11, 23))
    assert benchmarks.check_trend(t, [PacePoint("2026-07", 800, 1, 5.12)]) == []
    out = benchmarks.check_trend(t, [PacePoint("2026-07", 800, 1, 5.5), PacePoint("2026-11", 400, 1, 5.0)])
    assert out == ["benchmarks.md trend Jul 2026 = 5:07 /km, DB says 5:30 /km",
                   "benchmarks.md trend missing Nov 2026: 5:00 /km (DB, Pace in Zone Z3) — add row"]
    assert "missing" in benchmarks.check_trend(None, [])[0]


def test_verdict_levels():
    assert insights.verdict([10, 10])["effDeltaPct"] is None
    assert insights.verdict([10, 10, 10.3])["level"] == "up"
    assert insights.verdict([10, 10, 9.7])["level"] == "down"
    assert insights.verdict([10, 10, 10.1])["level"] == "flat"
