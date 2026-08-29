# Heart Rate Zones — Single Source of Truth

> **This is the ONLY place HR zones are defined.** Everything else references this file.
> When a lactate test changes the zones, edit ONLY this file.

**Last updated**: 2026-05-27
**hrMax**: 180 bpm
**Basis**: per Test bestimmt (nicht HFMax-geschätzt). Nach neuem Laktat-/Feldtest hier ersetzen + Datum/Quelle updaten.

> ⚠️ **Daten-Flag (2026-08-29)**: DuckDB-Records zeigen echte Peaks bis **186 bpm** (Läufe seit 2025).
> Aktueller Test-Wert 180 wird im Feld überschritten → bei nächstem Test hrMax neu bestimmen.
> Zonen-Obergrenzen ggf. nach oben korrigieren. Quelle: `db/training.duckdb` records.max_hr.

## Zones

| Zone | Name | Bereich (bpm) |
|------|------|---------------|
| – | Aktive Erholung | bis 124 |
| Z1 | Extensive Ausdauer | 125–142 |
| Z2 | Intensive Ausdauer | 143–152 |
| Z3 | Laktatschwellwert | 153–160 |
| Z4 | Sauerstoffkapazität | 161–179 |
| Z5 | HFMax | 180+ |

## Workout Target Rules

- HF-basierte Targets: absolute Werte (targetMode "padding"), nicht relative Prozente.
- **Z4-Intervalle**: targetValueLow=161, targetValueHigh=174 (nicht ganz bis 179, Puffer nach oben).
- **Erholungspausen Z1**: targetValueLow=125, targetValueHigh=142.
- **Warmup/Cooldown**: ~119–129 bpm (Aktive Erholung / untere Z1).
- **Recovery-Läufe**: strikt Z1, nicht überdrehen.

---
*Referenced by: `AGENTS.md`, `athlete.md`, coach skill (`training-principles.md`), feedback skill (`analysis-guidelines.md`).*
