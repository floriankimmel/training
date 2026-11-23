from datetime import date

import pytest

from training import pace, zones

MD = """**hrMax**: 180 bpm

## Zones — Laufen

| Zone | Name | Bereich (bpm) |
|------|------|---------------|
| – | Aktive Erholung | bis 124 |
| Z1 | Extensive Ausdauer | 125–142 |
| Z3 | Laktatschwellwert | 153–160 |
| Z5 | HFMax | 180+ |

## Zones — Rad (provisorisch)

| Zone | Name | Bereich (bpm) |
|------|------|---------------|
| Z1 | Extensive Ausdauer | 117–134 |
"""


def test_parse_zones_run_and_bike():
    run = zones.parse_zones(MD, "run")
    assert [(z.name, z.lo, z.hi) for z in run] == [("Z0", 0, 124), ("Z1", 125, 142), ("Z3", 153, 160), ("Z5", 180, 250)]
    assert zones.parse_zones(MD, "bike")[0].lo == 117


def test_real_zones_md_is_readable():
    assert zones.band("Z3") == (153, 160)
    assert zones.hr_max() > 150


def test_pace_in_zone_rules(seed_db):
    v = 1000 / (5 * 60)  # 5:00 /km
    seed_db.add_run(1, "2026-07-08 06:00", 600, 156, v)                         # counts
    seed_db.add_run(2, "2026-07-15 06:00", 200, 156, v * 2)                     # <300 s in zone: dropped
    seed_db.add_run(3, "2026-07-20 06:00", 600, 156, v * 2, km=8, ascent=400)   # 50 hm/km: not flat
    seed_db.add_run(4, "2026-07-22 06:00", 600, 170, v * 2)                     # Z4, not Z3
    seed_db.add_run(5, "2026-08-02 06:00", 600, 156, 1000 / (4.5 * 60), ascent=None)  # missing ascent = flat
    got = pace.pace_in_zone(seed_db.con, "Z3")
    assert [(p.period, p.runs, pace.fmt(p.pace)) for p in got] == [("2026-07", 1, "5:00"), ("2026-08", 1, "4:30")]


def test_pace_in_zone_uses_local_month(seed_db):
    # 23:30 UTC on Jul 31 = Aug 1 in Vienna
    seed_db.add_run(1, "2026-07-31 23:30", 600, 156, 1000 / 300)
    assert [p.period for p in pace.pace_in_zone(seed_db.con, "Z3")] == ["2026-08"]


def test_block28_needs_asof_and_orders_oldest_first(seed_db):
    with pytest.raises(ValueError):
        pace.pace_in_zone(seed_db.con, "Z3", bucket="block28")
    seed_db.add_run(1, "2026-11-20 06:00", 600, 156, 1000 / 300)
    seed_db.add_run(2, "2026-10-01 06:00", 600, 156, 1000 / 330)
    got = pace.pace_in_zone(seed_db.con, "Z3", bucket="block28", asof=date(2026, 11, 23))
    assert [p.period for p in got] == ["2026-09-29..2026-10-26", "2026-10-27..2026-11-23"]


@pytest.mark.parametrize("p,s", [(5.0, "5:00"), (5.1167, "5:07"), (4.999, "5:00")])
def test_fmt(p, s):
    assert pace.fmt(p) == s
