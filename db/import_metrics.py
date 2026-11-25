#!/usr/bin/env python3
"""Import daily wellness/recovery metrics into the DuckDB training database.

Source: metrics/metrics-WW-YYYY.md files (generated daily ~10:00 from Apple
HealthKit). Each day is a `### YYYY-MM-DD (Weekday)` block with Schlaf / HRV /
Ruhe-HF / Körper (Gewicht) tables. This parser is idempotent: it upserts one row per calendar day
into the `daily_metrics` table (re-running always refreshes existing days).

Nutrition (Vita Fit via Apple Health): a `#### 🍽️ Ernährung (Vortag YYYY-MM-DD)`
section inside a day block upserts one row into `nutrition_daily` keyed by the
heading's date (the day eaten, not the entry day). `_Keine Ernährungsdaten erfasst._`
sections are skipped.

Usage:
  db/.venv/bin/python db/import_metrics.py <folder-or-file> [<more> ...] \
      [--db db/training.duckdb]

  # default: import every metrics/metrics-*.md in the repo
  db/.venv/bin/python db/import_metrics.py
"""
import argparse
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import duckdb

from training.readiness import freeze

SCHEMA = Path(__file__).with_name("schema.sql")
REPO = Path(__file__).resolve().parent.parent
DAY_RE = re.compile(r"^###\s+(\d{4}-\d{2}-\d{2})\s*\(([^)]*)\)")
ROW_RE = re.compile(r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|")
SECTION_RE = re.compile(r"^#{1,4}\s")
NUTRITION_RE = re.compile(r"^####\s.*Ernährung\s*\(Vortag\s+(\d{4}-\d{2}-\d{2})\)")
NUTRITION_COLS = {
    "Kalorien": "kcal", "Protein": "protein_g", "Kohlenhydrate": "carbs_g",
    "Fett": "fat_g", "Ballaststoffe": "fiber_g", "Zucker": "sugar_g", "Wasser": "water_ml",
}


def dur_to_min(s):
    """'7h 41min' / '1h 10min' / '0h 02min' / '41min' -> minutes int."""
    if s is None:
        return None
    h = re.search(r"(\d+)\s*h", s)
    m = re.search(r"(\d+)\s*min", s)
    if not h and not m:
        return None
    return (int(h.group(1)) * 60 if h else 0) + (int(m.group(1)) if m else 0)


def num(s):
    if s is None:
        return None
    m = re.search(r"-?\d+(?:\.\d+)?", s)
    return float(m.group(0)) if m else None


def pct(s):
    m = re.search(r"\((\d+)\s*%\)", s or "")
    return int(m.group(1)) if m else None


def parse_day_block(day, weekday, rows, source_file):
    """rows: dict of 'Metrik' -> 'Wert' merged across the day's tables."""
    bt = rows.get("Bettzeit", "")
    bt_parts = re.findall(r"(\d{1,2}:\d{2})", bt)
    rec = {
        "day": day,
        "weekday": weekday,
        "bedtime_start": bt_parts[0] if len(bt_parts) > 0 else None,
        "bedtime_end": bt_parts[1] if len(bt_parts) > 1 else None,
        "time_in_bed_min": dur_to_min(rows.get("Im Bett")),
        "sleep_min": dur_to_min(rows.get("Schlafzeit")),
        "efficiency_pct": int(num(rows["Effizienz"])) if rows.get("Effizienz") else None,
        "deep_min": dur_to_min(rows.get("Tiefschlaf")),
        "deep_pct": pct(rows.get("Tiefschlaf")),
        "rem_min": dur_to_min(rows.get("REM")),
        "rem_pct": pct(rows.get("REM")),
        "core_min": dur_to_min(rows.get("Core/Leicht")),
        "core_pct": pct(rows.get("Core/Leicht")),
        "awake_min": dur_to_min(rows.get("Wach")),
        "hrv_night_avg": num(rows.get("Nacht-Ø")),
        "hrv_day_avg": num(rows.get("Tages-Ø")),
        "hrv_min": num(rows.get("Min")),
        "hrv_max": num(rows.get("Max")),
        "hrv_samples": int(num(rows["Samples"])) if rows.get("Samples") else None,
        "resting_hr": int(num(rows["Resting HR"])) if rows.get("Resting HR") else None,
        "body_mass_kg": num(rows.get("Gewicht")),
        "source_file": source_file,
        "imported_at": datetime.now(timezone.utc),
    }
    return rec


def nutri_num(s):
    """'2345 kcal' / '2.345 kcal' / '1 500 ml' / '85,5 g' / '85.5 g' -> float."""
    if not s:
        return None
    s = re.sub(r"(?<=\d)[\s'](?=\d{3}\b)", "", s)  # '1 500' -> '1500'
    m = re.search(r"\d+(?:[.,]\d+)*", s)
    if not m:
        return None
    n = m.group(0)
    if re.fullmatch(r"\d{1,3}([.,]\d{3})+", n):  # '2.345' / '2,345' = thousands
        return float(re.sub(r"[.,]", "", n))
    return float(n.replace(",", "."))


def parse_nutrition(text, source_file=None):
    """'#### 🍽️ Ernährung (Vortag YYYY-MM-DD)' sections -> one record per eating day.

    The date comes from the heading (the day eaten), not the enclosing entry day.
    Sections without values ('_Keine Ernährungsdaten erfasst._') are skipped.
    """
    recs, cur = [], None

    def flush():
        if cur and any(cur[c] is not None for c in NUTRITION_COLS.values()):
            recs.append(cur)

    for line in text.splitlines():
        if SECTION_RE.match(line):
            flush()
            m = NUTRITION_RE.match(line)
            cur = None
            if m:
                cur = {"date": m.group(1), **{c: None for c in NUTRITION_COLS.values()},
                       "source": "vitafit", "source_file": source_file,
                       "imported_at": datetime.now(timezone.utc)}
            continue
        rm = ROW_RE.match(line) if cur else None
        if rm and rm.group(1).strip() in NUTRITION_COLS:
            cur[NUTRITION_COLS[rm.group(1).strip()]] = nutri_num(rm.group(2))
    flush()
    return recs


def upsert_nutrition(con, rec):
    cols = list(rec.keys())
    con.execute(
        f"INSERT OR REPLACE INTO nutrition_daily ({','.join(cols)}) "
        f"VALUES ({','.join(['?']*len(cols))})",
        [rec[c] for c in cols],
    )


def parse_file(path: Path):
    days = []
    cur_day = cur_weekday = None
    cur_rows = {}
    in_nutrition = False

    def flush():
        if cur_day is not None:
            days.append(parse_day_block(cur_day, cur_weekday, cur_rows, path.name))

    for line in path.read_text().splitlines():
        m = DAY_RE.match(line)
        if m:
            flush()
            cur_day, cur_weekday = m.group(1), m.group(2).strip()
            cur_rows = {}
            in_nutrition = False
            continue
        if SECTION_RE.match(line):
            in_nutrition = bool(NUTRITION_RE.match(line))  # nutrition rows belong to the Vortag
            continue
        if cur_day is None or in_nutrition:
            continue
        rm = ROW_RE.match(line)
        if rm:
            key, val = rm.group(1).strip(), rm.group(2).strip()
            if key in ("Metrik", "") or set(key) <= set("-"):
                continue
            cur_rows[key] = val
    flush()
    return days


def ensure_schema(con):
    con.execute(SCHEMA.read_text())


def upsert(con, rec):
    # reuse the existing id for this day, else draw a fresh one from the sequence
    row = con.execute("SELECT id FROM daily_metrics WHERE day = ?", [rec["day"]]).fetchone()
    rec = dict(rec)
    rec["id"] = row[0] if row else con.execute(
        "SELECT nextval('seq_daily_metrics')").fetchone()[0]
    con.execute("DELETE FROM daily_metrics WHERE day = ?", [rec["day"]])
    cols = list(rec.keys())
    con.execute(
        f"INSERT INTO daily_metrics ({','.join(cols)}) VALUES ({','.join(['?']*len(cols))})",
        [rec[c] for c in cols],
    )


def iter_files(target: Path):
    if target.is_file():
        yield target
        return
    for p in sorted(target.glob("metrics-*.md")):
        yield p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("targets", nargs="*", default=[str(REPO / "metrics")],
                    help="metrics folders and/or .md files (default: metrics/)")
    ap.add_argument("--db", default=str(Path(__file__).with_name("training.duckdb")))
    args = ap.parse_args()

    con = duckdb.connect(args.db)
    ensure_schema(con)

    n = nn = 0
    for t in args.targets:
        for p in iter_files(Path(t)):
            for rec in parse_file(p):
                upsert(con, rec)
                n += 1
                print(f"[day] {rec['day']} {rec['weekday']}  "
                      f"sleep={rec['sleep_min']}min hrv_night={rec['hrv_night_avg']} "
                      f"rhr={rec['resting_hr']} kg={rec['body_mass_kg']}")
            for rec in parse_nutrition(p.read_text(), p.name):
                upsert_nutrition(con, rec)
                nn += 1
                print(f"[food] {rec['date']}  kcal={rec['kcal']} protein={rec['protein_g']}g "
                      f"carbs={rec['carbs_g']}g")
    new, rejudged = freeze(con)
    con.close()
    print(f"\nSummary: {n} day(s) upserted, {nn} nutrition day(s), "
          f"readiness: {new} frozen, {rejudged} re-judged")


if __name__ == "__main__":
    main()
