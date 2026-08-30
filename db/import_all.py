#!/usr/bin/env python3
"""One-shot importer: activities (.fit) + daily recovery metrics into DuckDB.

Runs the two importers back to back so a single command keeps the whole
training database fresh:

  1. import_fit.py     -> activities / laps / records  (HealthFit + others)
  2. import_metrics.py -> daily_metrics                (metrics/*.md)

Usage:
  # default: today's HealthFit files + all metrics/*.md
  db/.venv/bin/python db/import_all.py

  # explicit FIT targets (folders and/or files); metrics/*.md always refreshed
  db/.venv/bin/python db/import_all.py "$HF" /tmp/tp --source healthfit

  # only refresh metrics (skip FIT import)
  db/.venv/bin/python db/import_all.py --no-fit
"""
import argparse
import os
import sys
from datetime import date
from pathlib import Path

import import_fit
import import_metrics

REPO = Path(__file__).resolve().parent.parent
HEALTHFIT = Path(os.path.expanduser(
    "~/Library/Mobile Documents/iCloud~com~altifondo~HealthFit/Documents"))


def default_fit_targets():
    """Today's HealthFit files (matches the feedback skill's per-day import)."""
    today = date.today().isoformat()
    return [str(p) for p in sorted(HEALTHFIT.glob(f"{today}*.fit"))]


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("fit_targets", nargs="*",
                    help="FIT folders/files (default: today's HealthFit files)")
    ap.add_argument("--db", default=str(Path(__file__).with_name("training.duckdb")))
    ap.add_argument("--force", action="store_true", help="reimport/replace even if not richer")
    ap.add_argument("--source", default=None, help="override FIT provenance tag, e.g. tredict")
    ap.add_argument("--metrics", default=str(REPO / "metrics"),
                    help="metrics folder or .md file (default: metrics/)")
    ap.add_argument("--no-fit", action="store_true", help="skip the .fit import step")
    ap.add_argument("--no-metrics", action="store_true", help="skip the metrics import step")
    args = ap.parse_args()

    import duckdb
    con = duckdb.connect(args.db)
    import_fit.ensure_schema(con)  # also creates daily_metrics (same schema.sql)

    # 1) activities
    if not args.no_fit:
        targets = args.fit_targets or default_fit_targets()
        if not targets:
            print("[fit] no target files (no HealthFit files for today) \u2014 skipping")
        else:
            print("== activities ==")
            counts = {}
            for t in targets:
                for p in import_fit.iter_files(Path(t)):
                    status = import_fit.import_file(con, p, args.force, args.source)
                    counts[status] = counts.get(status, 0) + 1
                    if status != "skip":
                        print(f"[{status:8}] {p.name}")
            print("fit summary:", ", ".join(f"{k}={v}" for k, v in sorted(counts.items())) or "nothing")

    # 2) recovery metrics
    if not args.no_metrics:
        print("\n== daily metrics ==")
        n = 0
        for p in import_metrics.iter_files(Path(args.metrics)):
            for rec in import_metrics.parse_file(p):
                import_metrics.upsert(con, rec)
                n += 1
                print(f"[day] {rec['day']} {rec['weekday']}  "
                      f"sleep={rec['sleep_min']}min hrv_night={rec['hrv_night_avg']} "
                      f"rhr={rec['resting_hr']}")
        print(f"metrics summary: {n} day(s) upserted")

    con.close()


if __name__ == "__main__":
    main()
