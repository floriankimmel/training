#!/usr/bin/env python3
"""Import .fit(.gz) activity files into a DuckDB training database.

Multi-source aware (HealthFit + TrainingPeaks). Timestamps are normalized to
UTC. Deduplication is source-independent:

  * activity id = surrogate BIGINT from seq_activities
  * an incoming file matches an existing activity when their start_time is
    within START_TOLERANCE_S and the sport matches (id is not used for dedup)
  * on a match, the higher-fidelity file (more record rows) wins and reuses the
    existing numeric id; ties keep the existing row unless --force

So the same workout exported from both HealthFit and TrainingPeaks lands as a
single row.

Usage:
  db/.venv/bin/python db/import_fit.py <folder-or-file> [<more> ...] \
      [--db db/training.duckdb] [--force]
"""
import argparse
import gzip
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import duckdb
from garmin_fit_sdk import Decoder, Stream

SCHEMA = Path(__file__).with_name("schema.sql")
START_TOLERANCE_S = 90  # same activity from two sources may differ a bit


def read_fit_bytes(path: Path) -> bytes:
    raw = path.read_bytes()
    if path.suffix == ".gz" or raw[:2] == b"\x1f\x8b":
        return gzip.decompress(raw)
    return raw


def detect_source(path: Path, manufacturer) -> str:
    # normalize separators (nbsp, hyphens) so 'Apple-Watch'/'Apple\xa0Watch' match
    name = path.name.lower().replace("\xa0", " ").replace("-", " ")
    if "tpapplehealth" in name or "trainingpeaks" in name or manufacturer == "peaksware":
        return "trainingpeaks"
    if "healthfit" in name or "apple watch" in name or "workoutdoors" in name or "komoot" in name:
        return "healthfit"
    return manufacturer or "unknown"


def to_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def g(d: dict, *keys):
    for k in keys:
        v = d.get(k)
        if v is None:
            continue
        if isinstance(v, (list, tuple)):  # some FIT fields are arrays; take first scalar
            v = next((x for x in v if x is not None), None)
        if v is not None:
            return v
    return None


def decode(path: Path):
    data = read_fit_bytes(path)
    stream = Stream.from_byte_array(bytearray(data))
    return Decoder(stream).read()


def next_activity_id(con) -> int:
    return con.execute("SELECT nextval('seq_activities')").fetchone()[0]


def parse_activity(msgs, path, source, aid, start_utc, rec_count):
    sess = (msgs.get("session_mesgs") or [{}])[0]
    sport = (msgs.get("sport_mesgs") or [{}])[0]
    fid = (msgs.get("file_id_mesgs") or [{}])[0]
    return {
        "id": aid,
        "start_time": start_utc,
        "timestamp": to_utc(g(sess, "timestamp")),
        "sport": g(sess, "sport") or g(sport, "sport"),
        "sub_sport": g(sess, "sub_sport") or g(sport, "sub_sport"),
        "distance_m": g(sess, "total_distance"),
        "elapsed_s": g(sess, "total_elapsed_time"),
        "timer_s": g(sess, "total_timer_time"),
        "avg_hr": g(sess, "avg_heart_rate"),
        "max_hr": g(sess, "max_heart_rate"),
        "avg_power": g(sess, "avg_power"),
        "max_power": g(sess, "max_power"),
        "avg_speed": g(sess, "enhanced_avg_speed", "avg_speed"),
        "max_speed": g(sess, "enhanced_max_speed", "max_speed"),
        "avg_cadence": g(sess, "avg_cadence", "avg_running_cadence"),
        "total_ascent": g(sess, "total_ascent"),
        "total_descent": g(sess, "total_descent"),
        "calories": g(sess, "total_calories"),
        "num_laps": g(sess, "num_laps"),
        "manufacturer": g(fid, "manufacturer"),
        "source": source,
        "record_count": rec_count,
        "source_file": path.name,
        "imported_at": datetime.now(timezone.utc),
    }


def parse_laps(msgs, aid):
    out = []
    for i, lap in enumerate(msgs.get("lap_mesgs") or []):
        idx = g(lap, "message_index")
        out.append({
            "activity_id": aid,
            "lap_index": idx if idx is not None else i,
            "start_time": to_utc(g(lap, "start_time")),
            "timestamp": to_utc(g(lap, "timestamp")),
            "distance_m": g(lap, "total_distance"),
            "timer_s": g(lap, "total_timer_time"),
            "elapsed_s": g(lap, "total_elapsed_time"),
            "avg_hr": g(lap, "avg_heart_rate"),
            "max_hr": g(lap, "max_heart_rate"),
            "avg_speed": g(lap, "enhanced_avg_speed", "avg_speed"),
            "max_speed": g(lap, "enhanced_max_speed", "max_speed"),
            "avg_cadence": g(lap, "avg_cadence", "avg_running_cadence"),
            "avg_power": g(lap, "avg_power"),
            "max_power": g(lap, "max_power"),
            "calories": g(lap, "total_calories"),
        })
    # collapse duplicate lap_index (keep first) to satisfy PK
    seen = set()
    uniq = []
    for r in out:
        if r["lap_index"] in seen:
            continue
        seen.add(r["lap_index"])
        uniq.append(r)
    return uniq


def parse_records(msgs, aid):
    out = []
    for r in msgs.get("record_mesgs") or []:
        out.append({
            "activity_id": aid,
            "ts": to_utc(g(r, "timestamp")),
            "distance_m": g(r, "distance"),
            "hr": g(r, "heart_rate"),
            "cadence": g(r, "cadence"),
            "power": g(r, "power"),
            "speed": g(r, "enhanced_speed", "speed"),
            "altitude": g(r, "enhanced_altitude", "altitude"),
        })
    return out


def ensure_schema(con):
    con.execute(SCHEMA.read_text())


def find_match(con, start_utc, sport):
    """Return (id, record_count) of an existing activity for the same workout."""
    lo = start_utc - timedelta(seconds=START_TOLERANCE_S)
    hi = start_utc + timedelta(seconds=START_TOLERANCE_S)
    row = con.execute(
        """SELECT id, record_count FROM activities
           WHERE start_time BETWEEN ? AND ?
             AND (sport IS NOT DISTINCT FROM ?)
           ORDER BY abs(epoch(start_time) - epoch(?::TIMESTAMPTZ)) LIMIT 1""",
        [lo, hi, sport, start_utc],
    ).fetchone()
    return row  # None or (id, record_count)


def delete_activity(con, aid):
    con.execute("DELETE FROM records WHERE activity_id=?", [aid])
    con.execute("DELETE FROM laps WHERE activity_id=?", [aid])
    con.execute("DELETE FROM activities WHERE id=?", [aid])


def insert_rows(con, table, rows):
    if not rows:
        return
    cols = list(rows[0].keys())
    con.executemany(
        f"INSERT INTO {table} ({','.join(cols)}) VALUES ({','.join(['?']*len(cols))})",
        [[r[c] for c in cols] for r in rows],
    )


def import_file(con, path: Path, force: bool, force_source=None):
    try:
        msgs, _ = decode(path)
    except Exception as e:  # noqa: BLE001
        print(f"  ! decode failed {path.name}: {e}", file=sys.stderr)
        return "error"

    sess = (msgs.get("session_mesgs") or [{}])[0]
    start_utc = to_utc(g(sess, "start_time"))
    if start_utc is None:
        return "no-session"

    fid = (msgs.get("file_id_mesgs") or [{}])[0]
    source = detect_source(path, g(fid, "manufacturer"))
    if force_source:
        source = force_source
    rec_count = len(msgs.get("record_mesgs") or [])
    sport = g(sess, "sport") or g((msgs.get("sport_mesgs") or [{}])[0], "sport")

    match = find_match(con, start_utc, sport)
    if match is not None:
        existing_id, existing_recs = match
        if not force and rec_count <= (existing_recs or 0):
            return "skip"          # existing is equal/better fidelity
        delete_activity(con, existing_id)  # replace with richer file
        aid = existing_id                  # keep the stable numeric id
        status = "replace"
    else:
        aid = next_activity_id(con)
        status = "ok"

    insert_rows(con, "activities", [parse_activity(msgs, path, source, aid, start_utc, rec_count)])
    insert_rows(con, "laps", parse_laps(msgs, aid))
    insert_rows(con, "records", parse_records(msgs, aid))
    return status


def iter_files(target: Path):
    if target.is_file():
        yield target
        return
    for p in sorted(target.iterdir()):
        if p.name.endswith(".fit") or p.name.endswith(".fit.gz"):
            yield p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("targets", nargs="+", help="folders and/or .fit/.fit.gz files")
    ap.add_argument("--db", default=str(Path(__file__).with_name("training.duckdb")))
    ap.add_argument("--force", action="store_true", help="reimport/replace even if not richer")
    ap.add_argument("--source", default=None, help="override provenance tag, e.g. tredict")
    args = ap.parse_args()

    con = duckdb.connect(args.db)
    ensure_schema(con)

    counts = {}
    for t in args.targets:
        for p in iter_files(Path(t)):
            status = import_file(con, p, args.force, args.source)
            counts[status] = counts.get(status, 0) + 1
            if status not in ("skip",):
                print(f"[{status:8}] {p.name}")
    con.close()
    print("\nSummary:", ", ".join(f"{k}={v}" for k, v in sorted(counts.items())))


if __name__ == "__main__":
    main()
