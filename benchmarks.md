# Benchmarks & Personal Records

> Tracks fitness markers over time so race predictions and pacing have a real basis.
> Update after races, time trials, or notable test runs. Newest first.
> **Data source**: HealthFit `.fit` → DuckDB (`db/training.duckdb`, 1469 runs). Paces are
> median-per-second within HR bands (terrain-robust), not raw session averages.

**Last updated**: 2026-10-25 (Reference Paces refreshed from DuckDB; letzter Lauf in DB 2026-09-23, seitdem Laufpause)

## Race Results

| Date | Race | Distance | Time | Notes |
|------|------|----------|------|-------|
| 2026-10-18 | Vienna Trail Run | 23.8 km / 1000 hm | DNS | Zehenbruch #2 (30.09.), nicht angetreten |
| 2026-10-26 | Münichsthaler Crosslauf | 10.2 km / ~223 hm | kein Start | entschieden 2026-10-25 |
| 2025-10-26 | Nationalfeiertag-Crosslauf | 10.2 km | ~50:00 | Ø-HF 173 (96% hrMax), max 180, Pace 4:54 /km — Race-Effort aus DuckDB |

_Add past race results here (date, race, official time, place)._
_Münichsthaler Crosslauf: kein sicherer .fit-Match in DB — offizielle Zeit manuell ergänzen._

## Fitness Trend — 12-Monats-Analyse (Aug 2025 → Aug 2026)

Methode: DuckDB `records` (sekundengenau), Pace bei fixer HF (Gelände-neutral).

**Schwelle/Tempo (HF 160–170) — der klarste Fortschritt:**

| Monat | Pace @ HF 160–170 |
|-------|-------------------|
| Aug 2025 | 5:36 /km |
| Nov 2025 | 4:41 /km |
| Jul 2026 | **4:16 /km** |
| Aug 2026 | 4:29 /km |

→ **~1:00–1:20 min/km schneller bei gleicher HF** über 12 Monate = echter Fitnessgewinn.

**Aerobe Basis:** Ø-HF auf lockeren Läufen sank ~149 → 131 bpm (stärkerer Motor).
Flat-Easy-Pace optisch verwässert durch Trail-/Vert-Fokus in der Vienna-Prep.

**Störfaktoren im Zeitraum:** Zehbruch W31–32, GI-Krankheit W34 → Aug'26 künstlich schwach (Reboot).

## Test / Benchmark Runs

| Date | Type | Result | Context |
|------|------|--------|---------|
| 2026-03-22 | Longest run (12 mo) | 35.3 km / 1486 hm / Ø152 bpm / 7:44 /km | größter Vert-Umfang, starke Ausdauer-Anchor |
| 2026-07 | Tempo @ HF 160–170 | 4:16 /km (median) | Saison-Bestwert Schwelle |
| 2026-08-26 | Long Run (post-illness reboot) | 15.1 km / 475 hm / Ø138 bpm | GI-Recovery vollständig, kein Drift |

## Reference Paces (aus DuckDB, flache Läufe ab 2026-07-25, vor Zehenbruch #2)

| Zone / effort | Pace (min/km) | Source |
|---------------|---------------|--------|
| Easy Z1 (<131) | 6:20 | median records 25.07.–23.09.2026, nur flache Läufe (<15 hm/km) |
| Long Z2 (131–145) | 6:06 | median records 25.07.–23.09.2026, nur flache Läufe (<15 hm/km) |
| Tempo/Schwelle Z4 (160–170) | 4:07–4:30 | flache Läufe 08.07.–17.08.2026 (4:07 / 4:16 / 4:30) |

> **Z4 nach 17.08. nicht verwertbar**: Z4-Sekunden stammen ab September fast nur aus Bergintervallen
> (Hügel/Anstieg → 5:45–7:00 /km). Letzter sauberer flacher Z4-Wert = Aug 17 (4:30).
> Mit allen Läufen (inkl. Trail/Vert) wären Z1 6:47 / Z2 6:08 — terrainverschmutzt, daher nur flach.
> Z3/Z5 bewusst weggelassen (Bergintervalle). **Daten enden 23.09.** — nach Zehenbruch #2 kein Lauf;
> Referenz nach Lauf-Comeback neu ziehen (Zehen-Reboot ≠ Fitness-Verlust-Beweis).

_These feed the `findracepace` and `race-prediction` skills. Refresh from DuckDB after new blocks._

---
*Living document. Objective anchors > memory. Rebuild query: see `db/` + this file's method note.*
