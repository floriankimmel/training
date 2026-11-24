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

## Nächster Feldtest (geplant: W50, 07.–13.12.2026)

> Grund: hrMax 180 ist überholt (DB-Peaks 184–186), alle Z1-Deckel/Pace-in-Zone hängen daran. Coach plant ihn als
> Quality-Einheit der Woche ein — **Voraussetzungen**: Tag nach Ruhetag, Readiness GREEN, W49 mit erstem Z3-Reiz gelaufen.
> Fällt eine Voraussetzung → nächste Woche, nicht ausfallen lassen.

- **Protokoll (Lauf, flach, Brustgurt, solo)**: 15min Warmup Z1 + 3×20s Steigerungen · **30min Zeitlauf**, so schnell wie
  gleichmäßig haltbar (nicht zu schnell anlaufen) · **Lap-Taste bei Minute 10** · **letzte 60s alles raus** (hrMax-Probe) · 15min Cooldown.
- **Auswertung**: **LTHR** = Ø-HF Minute 10–30 · **Schwellen-Pace** = Ø-Pace derselben 20min · **hrMax** = höchster Wert
  (Plausibilität gegen DB-Peaks). Lap-Split per `parse_fit.py --step 1`.
- **Zonen neu**: Z3 um die LTHR legen (≈ LTHR −4 … +3), übrige Grenzen um denselben Versatz schieben, Bandbreiten wie oben.
  hrMax/Z5 aus dem Test. Dann: diese Datei + `benchmarks.md` (Testergebnis) updaten, `Last updated` + Quelle setzen.
- `@workout`: `@workout run warmup=time:15min@hr:119-142 time:30min cooldown=time:15min@hr:119-129` (kein HR-Alert im Test).

## Workout Target Rules

- HF-basierte Targets: absolute Werte (targetMode "padding"), nicht relative Prozente.
- **Z4-Intervalle**: targetValueLow=161, targetValueHigh=174 (nicht ganz bis 179, Puffer nach oben).
- **Erholungspausen Z1**: targetValueLow=125, targetValueHigh=142.
- **Warmup/Cooldown**: ~119–129 bpm (Aktive Erholung / untere Z1).
- **Recovery-Läufe**: strikt Z1, nicht überdrehen. `@workout`-Alert **hr:125-138** (4 bpm Puffer unter Deckel 142, Uhr piept bevor der Deckel reißt — wie Z4 174 statt 179).

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
