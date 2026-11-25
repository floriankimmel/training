# Training Status — Snapshot

> Kurzer "Wo stehe ich jetzt"-Snapshot (Ziel <60 Zeilen). **Verlauf/Details → [`STATUS-log.md`](STATUS-log.md)**.
> Pro coach/feedback-Lauf: Snapshot überschreiben, Log-Eintrag oben in `STATUS-log.md` ergänzen.

**Last updated: 2026-11-25 (Mi Bergsprints A — erster Berg seit Bruch ohne Zeh-Signal, W48 3/5 Läufe ✅)**

## Current Target

- **Kein aktives Zielrennen.** Modus: **Base/Aufbau — Umfang vor Intensität**, keine Build-Plan-Targets.
- Quelle für Ziele/Rennen: `athlete.md` → Goals, `races/` (kein `current-race-*`-Symlink = nichts aktiv).

## Current Phase

- **Block**: 🏃 **Aufbau Woche 4** nach Zehenbruch #2 (30.09.). Comeback-Protokoll **beendet** — Zeh resolved (22.11.),
  flach/weich-Regel endet mit W47.
- **Diese Woche (W48, 23.–29.11.)** (`trainings/week-48-2026.md`): Läufe **Mo 48 (3×8min Z2 143–152) · Di 25 Z1 ·
  Mi 45 (6×20s Bergsprints, bergab gehen) · Do 25 Z1 · So 65 Z1 = 208min** (+19 % vs. W47 ≈175). Fr Ruhetag, Sa lauffrei.
  Kein Rad. Ziel ~290 TRIMP. So-55er (22.11.) ✅ gelaufen (55,1min, A−) → So 29.11 wie geplant 65min.
- **Readiness 22.11. (Metriken bis 20.11.)**: **GREEN** — HRV 3d 40 (Basis 42, z=−0,2), RHF 7d 55 (Basis 60), Schlaf 400 vs. 409.
- **Outcome (Aerobe Effizienz = Pace in Zone Z1)**: **6:32/km** (Block bis 24.11., 10 Läufe) vs. 6:06–6:15 Jun–Sep vor Bruch #2.
- **Kraft**: First Class **W6** (Powerblock, 2. Durchgang): Tag 1 Mo · Tag 4 Di · Tag 3 Do · Tag 2 Sa. W49 → W7 Wechselblock.
- **W47 Ist**: Mo 35,4 Ø137 (Pace 6:11, B) · Mi 46 3×5 Z2 (5,9 % Z3, B+) · Do 38,8 Strides max166 (A−) · So 55 geplant ·
  Rad Di **ohne `.fit`** · Kraft Tag 1/4/3 ✅, Tag 2 Sa→So.
- **Next**: (1) W49-Gate siehe Wochendoc (erster Z3-Reiz oder Hügel-Repeats, LR 75min, erstes Bergab),
  (2) **Feldtest W50** (30min-TT → LTHR + hrMax, Protokoll `zones.md`), (3) Zielrennen 2027 festlegen.
- **Planung**: ab W49 **Montag früh** (Reminder „👟 Training Planen" Mo 06:30), nicht mehr So-Abend.

## Open Watch-Items

- **🔴 Easy zu schnell**: Mo W47 6:11 statt ≥6:40, 16 % >142. Ab 24.11. Recovery-`@workout`-Alert **hr:125-138** (Puffer unter Deckel 142).
- **🔴 Abgehakt ≠ trainiert**: nur `.fit` zählt. Jetzt automatisch: `python -m training verify` (täglich im Sync). W47 Rad Di = GAP.
- **DB-Import**: iCloud-`Resource deadlock` blockt `import_fit.py` aus Agent-Shell → Import via `!` im User-Kontext (22.11. gelöst, ok=4).
- **Körpergewicht**: `daily_metrics.body_mass_kg` (seit Aug 2026, Lücke 22.08.–07.11.). Report/Webview: 7d-Ø vs. Vorwoche/28d, Warnung ab ±1.5 kg/Wo (`training/weight.py`). Aktuell 7d 82.2 kg, −0.2 kg/Wo.
- **Zonen/hrMax**: DB-Peaks 184–186 vs. hrMax 180 → Feldtest W50 (`zones.md`).
- **Vertical gap**: W48 erste Bergsprints, ab W49 Bergab + hm akkumulieren.

## Recent Progression

| Week | Focus | Note |
|------|-------|------|
| W44 | 🚴 Rad only | Ist: 2 belegte Rad-Tage (Mi C+, Do B-); Sa+So ohne Aufzeichnung. Kraft 3/4 |
| W45 | 🏃 Lauf-Comeback | Ist: 2 Läufe/47min (Mo A+, Mi B+), #3 nicht gelaufen. Rad 0/3. Kraft 4/4 ✅ |
| W46 | 🏃 Comeback W2 | Ist: 4 Läufe / ~139min (Strides Zeh stumm). Rad 1/2. Kraft 4/4 ✅. TRIMP 276 |
| W47 | 🏃 Comeback W3 | Ist: 4 Läufe ≈175min (inkl. So), erster Z2-Block + Strides max166, Zeh resolved. Rad 0/1. Kraft 3/4 (+So) |
| W48 | 🏃 Aufbau W4 | Plan 5 Läufe 208min, 3×8 Z2, 6×20s Bergsprints, LR 65. Kein Rad. Kraft FC W6 |

Ältere Wochen: `STATUS-log.md`.

---
*Snapshot überschreiben nach jedem Plan/Feedback; Detail an `STATUS-log.md` anhängen.*
