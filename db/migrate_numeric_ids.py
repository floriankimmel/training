#!/usr/bin/env python3
"""One-shot migration: VARCHAR (timestamp) activity ids -> surrogate BIGINT.

Rewrites only the key columns (activities.id, laps.activity_id,
records.activity_id). All parsed data is preserved — no FIT re-parsing.

New ids are assigned chronologically by start_time (id 1 = earliest activity),
so the numbering is stable and human-friendly. Dedup already keys on start_time,
so nothing about idempotent re-import changes.

Idempotent guard: if activities.id is already BIGINT, it exits without changes.

Usage:
  db/.venv/bin/python db/migrate_numeric_ids.py [--db db/training.duckdb]
"""
import argparse
from pathlib import Path

import duckdb


def column_type(con, table, col):
    row = con.execute(
        "SELECT data_type FROM information_schema.columns "
        "WHERE table_name=? AND column_name=?",
        [table, col],
    ).fetchone()
    return row[0] if row else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=str(Path(__file__).with_name("training.duckdb")))
    args = ap.parse_args()

    con = duckdb.connect(args.db)

    idtype = column_type(con, "activities", "id")
    if idtype is None:
        print("No activities table — nothing to migrate.")
        return
    if idtype.upper() in ("BIGINT", "INTEGER", "HUGEINT"):
        print(f"activities.id already numeric ({idtype}). Nothing to do.")
        return

    n = con.execute("SELECT count(*) FROM activities").fetchone()[0]
    print(f"Migrating {n} activities (id {idtype} -> BIGINT) ...")

    con.execute("BEGIN TRANSACTION")
    try:
        # 1. old string id -> new numeric id, chronological by start_time
        con.execute(
            """CREATE TEMP TABLE id_map AS
               SELECT id AS old_id,
                      row_number() OVER (ORDER BY start_time, id) AS new_id
               FROM activities"""
        )
        maxid = con.execute("SELECT max(new_id) FROM id_map").fetchone()[0] or 0

        # 2. sequence for future inserts, starting past the highest assigned id
        con.execute("DROP SEQUENCE IF EXISTS seq_activities")
        con.execute(f"CREATE SEQUENCE seq_activities START {maxid + 1}")

        # 3. rebuild activities with numeric id (drop-in column swap)
        con.execute(
            """CREATE TABLE activities_new AS
               SELECT m.new_id AS id,
                      a.* EXCLUDE (id)
               FROM activities a JOIN id_map m ON a.id = m.old_id"""
        )
        # 4. rewrite child FKs
        con.execute(
            """CREATE TABLE laps_new AS
               SELECT m.new_id AS activity_id, l.* EXCLUDE (activity_id)
               FROM laps l JOIN id_map m ON l.activity_id = m.old_id"""
        )
        con.execute(
            """CREATE TABLE records_new AS
               SELECT m.new_id AS activity_id, r.* EXCLUDE (activity_id)
               FROM records r JOIN id_map m ON r.activity_id = m.old_id"""
        )

        # 5. swap tables
        for t in ("activities", "laps", "records"):
            con.execute(f"DROP TABLE {t}")
            con.execute(f"ALTER TABLE {t}_new RENAME TO {t}")

        # 6. constraints + default + indexes (mirror schema.sql)
        con.execute("ALTER TABLE activities ADD PRIMARY KEY (id)")
        con.execute(
            "ALTER TABLE activities ALTER COLUMN id SET DEFAULT nextval('seq_activities')"
        )
        con.execute("ALTER TABLE laps ADD PRIMARY KEY (activity_id, lap_index)")
        con.execute("CREATE INDEX idx_records_act ON records(activity_id)")
        con.execute("CREATE INDEX idx_records_ts  ON records(ts)")
        con.execute("CREATE INDEX idx_laps_act    ON laps(activity_id)")
        con.execute("CREATE INDEX idx_act_start   ON activities(start_time)")

        con.execute("COMMIT")
    except Exception:
        con.execute("ROLLBACK")
        raise

    # verify
    a = con.execute("SELECT count(*) FROM activities").fetchone()[0]
    orphan_l = con.execute(
        "SELECT count(*) FROM laps l LEFT JOIN activities a ON l.activity_id=a.id "
        "WHERE a.id IS NULL"
    ).fetchone()[0]
    orphan_r = con.execute(
        "SELECT count(*) FROM records r LEFT JOIN activities a ON r.activity_id=a.id "
        "WHERE a.id IS NULL"
    ).fetchone()[0]
    con.close()

    print(f"Done. activities={a}, orphan laps={orphan_l}, orphan records={orphan_r}")
    print(f"Next id will be {maxid + 1}.")
    if orphan_l or orphan_r:
        print("WARNING: orphans found — investigate before trusting the DB.")


if __name__ == "__main__":
    main()
