# Benchmarks & Personal Records

> Tracks fitness markers over time so race predictions and pacing have a real basis.
> Update after races, time trials, or notable test runs. Newest first.
> **Data source**: HealthFit `.fit` → DuckDB (`db/training.duckdb`, 1469 runs). Paces are
> median-per-second within HR bands (terrain-robust), not raw session averages.

**Last updated**: 2026-08-29 (rebuilt from DuckDB records)

## Race Results

| Date | Race | Distance | Time | Notes |
|------|------|----------|------|-------|
| _tbd_ | Vienna Trail Run | 23.8 km / 1000 hm | — | target 2:30–2:45 |
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

## Reference Paces (aus DuckDB, letzte 3 Monate)

| Zone / effort | Pace (min/km) | Source |
|---------------|---------------|--------|
| Easy Z1 (<131) | 6:31 | median records Jun–Aug 2026 |
| Long Z2 (131–145) | 6:04 | median records Jun–Aug 2026 |
| Tempo/Schwelle Z4 (160–170) | 4:37 | median records Jun–Aug 2026 |

> Z3/Z5-Paces hier bewusst weggelassen — im Trainingszeitraum von Bergintervallen
> verschmutzt (hohe HF bergauf bei niedriger Pace). Für flache Tempo-Referenz Z4 nutzen.

_These feed the `findracepace` and `race-prediction` skills. Refresh from DuckDB after new blocks._

---
*Living document. Objective anchors > memory. Rebuild query: see `db/` + this file's method note.*
