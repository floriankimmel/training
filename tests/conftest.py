from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import duckdb
import pytest


@pytest.fixture
def seed_db():
    """In-memory DuckDB with the columns the domain modules read, plus a helper to add runs."""
    con = duckdb.connect(":memory:")
    con.execute("""CREATE TABLE activities (id BIGINT, sport VARCHAR, start_time TIMESTAMPTZ, distance_m DOUBLE,
                   timer_s DOUBLE, avg_hr INTEGER, total_ascent DOUBLE)""")
    con.execute("CREATE TABLE records (activity_id BIGINT, ts TIMESTAMPTZ, hr INTEGER, speed DOUBLE)")
    con.execute("""CREATE TABLE daily_metrics (day DATE, sleep_min INTEGER, hrv_night_avg DOUBLE, resting_hr INTEGER)""")

    def add_run(aid: int, start: str, secs: int, hr: int, speed: float, km: float = 8.0, ascent: float | None = 0):
        t0 = datetime.fromisoformat(start).replace(tzinfo=timezone.utc)
        con.execute("INSERT INTO activities VALUES (?, 'running', ?, ?, ?, ?, ?)",
                    [aid, t0, km * 1000, secs, hr, ascent])
        con.executemany("INSERT INTO records VALUES (?, ?, ?, ?)",
                        [[aid, t0 + timedelta(seconds=i), hr, speed] for i in range(secs)])

    return SimpleNamespace(con=con, add_run=add_run)
