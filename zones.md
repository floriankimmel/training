# Heart Rate Zones — Single Source of Truth

> **This is the ONLY place HR zones are defined.** Everything else references this file.
> When a lactate test changes the zones, edit ONLY this file.

**Last updated**: 2026-10-25 (Rad-Zonen ergänzt, provisorisch)
**hrMax**: 180 bpm
**Basis**: per Test bestimmt (nicht HFMax-geschätzt). Nach neuem Laktat-/Feldtest hier ersetzen + Datum/Quelle updaten.

> ⚠️ **Daten-Flag (2026-08-29)**: DuckDB-Records zeigen echte Peaks bis **186 bpm** (Läufe seit 2025).
> Aktueller Test-Wert 180 wird im Feld überschritten → bei nächstem Test hrMax neu bestimmen.
> Zonen-Obergrenzen ggf. nach oben korrigieren. Quelle: `db/training.duckdb` records.max_hr.

## Zones — Laufen

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

## Zones — Rad (provisorisch)

> ⚠️ **Nicht getestet.** Abgeleitet aus Lauf-Zonen **−8 bpm** (Coach-Faustregel −5…−10) und DB-Check:
> Rad-Peaks p95 = 166 bpm vs. Lauf 179 (seit 2025-06). **Beim nächsten Feldtest (Lauf + Rad) ersetzen**,
> wenn fit. Lauf-Zonen oben bleiben unverändert.

| Zone | Name | Bereich (bpm) |
|------|------|---------------|
| – | Aktive Erholung | bis 116 |
| Z1 | Extensive Ausdauer | 117–134 |
| Z2 | Intensive Ausdauer | 135–144 |
| Z3 | Laktatschwellwert | 145–152 |
| Z4 | Sauerstoffkapazität | 153–171 |
| Z5 | HFMax | 172+ |

- **Aerober Rad-Tag (Z1–Z2)**: Deckel **144**. (Mo 19.10: Ø 146 / max 176 = zu hart für „aerob“.)
- **Rad-Erholung/Pendeln**: bis 125.
- **Z4-Rad-Intervalle** (erst nach stabilem Fundament): 153–166.
- `@workout bike` HR-Alerts aus dieser Tabelle ziehen, nicht „Lauf minus x“ im Kopf rechnen.

---
*Referenced by: `AGENTS.md`, `athlete.md`, coach skill (`training-principles.md`), feedback skill (`analysis-guidelines.md`).*
