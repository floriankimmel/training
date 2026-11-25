from datetime import date, timedelta

import duckdb

from training import weight

D0 = date(2026, 11, 24)


def con_with(kgs: dict[int, float | None]):
    """kgs: days-before-D0 -> kg (None = no weigh-in)."""
    con = duckdb.connect(":memory:")
    con.execute("CREATE TABLE daily_metrics (day DATE, body_mass_kg DOUBLE)")
    con.executemany("INSERT INTO daily_metrics VALUES (?, ?)",
                    [[D0 - timedelta(days=i), kg] for i, kg in kgs.items()])
    return con


def test_stable_weight_no_warning():
    t = weight.trend(con_with({i: 80.0 for i in range(35)}), D0)
    assert (t.avg_7d, t.delta_7d, t.delta_28d, t.warning) == (80.0, 0.0, 0.0, None)
    assert t.latest_kg == 80.0 and t.latest_day == D0.isoformat()


def test_loss_and_gain_beyond_limit_warn():
    loss = {**{i: 82.0 for i in range(7, 35)}, **{i: 80.0 for i in range(7)}}
    assert weight.trend(con_with(loss), D0).warning == "loss"
    gain = {**{i: 80.0 for i in range(7, 35)}, **{i: 81.6 for i in range(7)}}
    assert weight.trend(con_with(gain), D0).warning == "gain"
    small = {**{i: 80.0 for i in range(7, 35)}, **{i: 81.0 for i in range(7)}}
    assert weight.trend(con_with(small), D0).warning is None


def test_sparse_weigh_ins_give_no_delta():
    t = weight.trend(con_with({0: 80.0, 1: None, 9: 83.0, 30: None}), D0)
    assert t.avg_7d is None and t.delta_7d is None and t.warning is None
    assert t.latest_kg == 80.0


def test_series_skips_missing_days():
    s = weight.series(con_with({0: 80.0, 1: None, 2: 80.4}), D0 - timedelta(days=5), D0)
    assert [p["kg"] for p in s] == [80.4, 80.0]
