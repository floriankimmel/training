from datetime import date, timedelta

from training import readiness

D0 = date(2026, 11, 1)


def seed(con, days=40, hrv=50.0, rhr=55, sleep=420, last=None):
    """`days` normal days ending the day before D0 + optional overrides for the last 7 days."""
    for i in range(days):
        d = D0 - timedelta(days=days - i)
        h = hrv + (1 if i % 2 else -1) * 3   # stddev ~3
        con.execute("INSERT INTO daily_metrics VALUES (?, ?, ?, ?)", [d, sleep, h, rhr])
    for d, s, h, r in last or []:
        con.execute("DELETE FROM daily_metrics WHERE day = ?", [d])
        con.execute("INSERT INTO daily_metrics VALUES (?, ?, ?, ?)", [d, s, h, r])


def test_green_when_nothing_off(seed_db):
    seed(seed_db.con)
    g = readiness.gate(seed_db.con, D0 - timedelta(days=1))
    assert (g.verdict, g.hrv_flag, g.rhr_flag, g.sleep_flag) == ("GREEN", False, False, False)


def test_amber_one_flag_red_two(seed_db):
    last = [(D0 - timedelta(days=i), 420, 40.0, 55) for i in range(1, 4)]  # HRV crash 3 days
    seed(seed_db.con, last=last)
    g = readiness.gate(seed_db.con, D0 - timedelta(days=1))
    assert g.verdict == "AMBER" and g.hrv_flag and g.reasons[0].startswith("HRV 3d z=")

    con = seed_db.con
    for i in range(1, 8):  # RHR +8 for a week on top
        con.execute("UPDATE daily_metrics SET resting_hr = 63 WHERE day = ?", [D0 - timedelta(days=i)])
    assert readiness.gate(con, D0 - timedelta(days=1)).verdict == "RED"


def test_no_metrics_gives_no_verdict(seed_db):
    g = readiness.gate(seed_db.con, D0)
    assert g.verdict is None and g.hrv_flag is None


def test_freeze_is_idempotent_and_replaces_v1_table(seed_db):
    con = seed_db.con
    con.execute("CREATE TABLE daily_readiness (day DATE PRIMARY KEY, overall VARCHAR)")  # v1 shape
    seed(con)
    new, rejudged = readiness.freeze(con, today=D0)
    assert (new, rejudged) == (40, 0)
    assert readiness.freeze(con, today=D0) == (0, 0)
    con.execute("UPDATE daily_metrics SET resting_hr = 70 WHERE day = ?", [D0 - timedelta(days=1)])
    assert readiness.freeze(con, today=D0) == (0, 1)


def test_for_days_mixes_frozen_and_live(seed_db):
    con = seed_db.con
    seed(con)
    con.execute("INSERT INTO daily_metrics VALUES (?, 420, 50, 55)", [D0])
    readiness.freeze(con, today=D0)
    got = readiness.for_days(con, [D0 - timedelta(days=1), D0, D0 + timedelta(days=1)])
    assert [(r.day, r.frozen) for r in got] == [((D0 - timedelta(days=1)).isoformat(), True), (D0.isoformat(), False)]
