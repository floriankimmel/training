import sys
from pathlib import Path

import duckdb

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "db"))
import import_metrics as im  # noqa: E402

FIX = Path(__file__).with_name("fixtures") / "metrics-nutrition.md"


def test_nutrition_keyed_by_vortag_and_empty_skipped():
    recs = im.parse_nutrition(FIX.read_text(), FIX.name)
    assert [r["date"] for r in recs] == ["2026-11-25", "2026-11-26"]
    a, b = recs
    assert (a["kcal"], a["protein_g"], a["carbs_g"], a["fat_g"], a["fiber_g"], a["sugar_g"], a["water_ml"]) \
        == (2640, 142, 310.5, 88, 31, 64, 2500)
    assert b["kcal"] == 2410 and b["protein_g"] == 128.5 and b["water_ml"] is None
    assert a["source"] == "vitafit"


def test_nutrition_rows_do_not_leak_into_daily_metrics():
    days = im.parse_file(FIX)
    assert [d["day"] for d in days] == ["2026-11-26", "2026-11-27", "2026-11-28"]
    assert days[0]["body_mass_kg"] == 81.2 and days[0]["resting_hr"] == 57
    assert days[1]["resting_hr"] == 56


def test_nutri_num_formats():
    assert im.nutri_num("2.345 kcal") == 2345
    assert im.nutri_num("2,345 kcal") == 2345
    assert im.nutri_num("1 500 ml") == 1500
    assert im.nutri_num("85,5 g") == 85.5
    assert im.nutri_num("—") is None


def test_upsert_is_idempotent_per_date():
    con = duckdb.connect(":memory:")
    im.ensure_schema(con)
    for _ in range(2):
        for rec in im.parse_nutrition(FIX.read_text(), FIX.name):
            im.upsert_nutrition(con, rec)
    assert con.execute("SELECT count(*) FROM nutrition_daily").fetchone()[0] == 2
    corrected = {**im.parse_nutrition(FIX.read_text())[0], "kcal": 2700.0}
    im.upsert_nutrition(con, corrected)
    assert con.execute(
        "SELECT kcal, source FROM nutrition_daily WHERE date = '2026-11-25'").fetchone() == (2700.0, "vitafit")
