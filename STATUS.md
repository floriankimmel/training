# Training Status — Snapshot

> Kurzer "Wo stehe ich jetzt"-Snapshot (Ziel <60 Zeilen). **Verlauf/Details → [`STATUS-log.md`](STATUS-log.md)**.
> Pro coach/feedback-Lauf: Snapshot überschreiben, Log-Eintrag oben in `STATUS-log.md` ergänzen.

**Last updated**: 2026-11-02 (W45 Mo: Comeback-Lauf #1 gelaufen — 20min flach Z1, Ø131/max141, 0% über Deckel 142, A+. Zeh-Check morgen früh entscheidet über Mi)

## Current Target

- **Kein aktives Zielrennen.** Münichsthaler Crosslauf 26.10 = kein Start. Vienna Trail Run 18.10 = DNS.
- Modus: **Base/Comeback — Umfang vor Intensität**, keine Build-Plan-Targets.
- Quelle für Ziele/Rennen: `athlete.md` → Goals, `races/` (kein `current-race-*`-Symlink = nichts aktiv).

## Current Phase

- **Block**: 🏃 **Lauf-Comeback** nach Zehenbruch #2 (30.09.), Rad trägt den aeroben Umfang.
- **Diese Woche (W45, 02.–08.11.)**: Lauf Mo 20 · Mi 25 · Sa 30min, **flach, weich, Z1 ≤142, Pace ≥6:40**.
  Rad Di 70 aerob (≤144) · Do Pendeln 2×20 (≤125) · So 90 lang (≤140). Fr Ruhetag. Fallback je Lauf: 45min Rad.
- **Readiness 01.11.**: **GREEN, aber weicher** (HRV 3d 39 z=−0.0, RHF 63 vs. 60, Schlaf 388 vs. 398).
  Chronik niedrig (28d/Wo 116) → ACWR 1.84 wertlos, Ziel W45 ~280–300 TRIMP absolut.
- **Kraft**: First Class **W3** (S.243, neues Tableau): Tag 1 Mo · Tag 3 Mi · Tag 2 Do · Tag 4 Sa.
- **Letzter Lauf**: **2026-11-02 (Comeback #1, 20min flach Z1, A+, 0% über 142).** Zeh-Check morgen
  früh entscheidet über Mi-Lauf. **W44 belegt nur 2 Ausdauertage** (Mi C+, Do B-); Sa+So abgehakt,
  aber **ohne Aufzeichnung** → zählen nicht. Kraft 3/4 (Tag 4 offen).
- **Next**: (1) 🔴 `.fit`-Import reparieren, (2) 3 schmerzfreie Läufe → W46 4 Läufe, längster ~45min,
  (3) Arzt-Abklärung Zehenbrüche, (4) Footwork ab W46, (5) Feldtest Lauf + Rad wenn fit.

## Open Watch-Items

- **🔴 Daten-Blindflug: `.fit`-Import tot seit 2026-10-29.** Alle 297 Dateien → `OSError [Errno 11]
  Resource deadlock avoided` beim Lesen aus iCloud/HealthFit (listbar, nicht lesbar; TCC/Full Disk
  Access, kein Code-Bug). DB endet Do 29.10 → **kein belastbares Feedback bis zum Fix**. Priorität 1.
- **🔴 Umfangsleck, 2. Woche in Folge.** W43 2/4 Radeinheiten, W44 2 belegte Ausdauertage (Sa+So
  abgehakt, aber ohne `.fit`). Gefahrene Einheiten über dem aeroben Deckel. Auftrag W45:
  **alle Einheiten fahren UND aufzeichnen** — ohne Uhr/Brustgurt existiert die Einheit nicht.
- **⛔ Zehenbruch #2 / Muster**: 2 Frakturen in ~2 Monaten → ärztlich abklären (Vit D, Ferritin, ggf. DXA).
  Siehe `injuries.md`. **Vor** dem Lauf-Comeback, nicht danach.
- **Rad-HF**: eigene Rad-Zonen in `zones.md` (provisorisch). **Aerober Rad-Deckel 144 bpm**, keine
  Rad-Intervalle bis stabiles Fundament.
- **Zonen/hrMax**: DB zeigt Lauf-Peaks bis 184–186 vs. hrMax 180 → bei Feldtest neu bestimmen (`zones.md`).
- **Recovery-Lauf-Pace** (sobald Laufen): Pace-Alarm 6:40/km, nicht nach Gefühl/HF steuern.
- **Vertical gap**: Wolkersdorf flach (max ~60 hm) — hm müssen akkumuliert werden (Repeats/Treppen/Wienerwald).
- **Fuel-Praxis**: ~40–60 g/h ab 75min, gilt ab der langen Ausfahrt So 01.11.
- **Spontan-Umfang**: Zusatzzeit ok, aber dann Deckel 135 — nicht in 145–152 hängen bleiben.
- **Daten**: DB aktuell bis 2026-10-29 — **eingefroren**, siehe Import-Watch-Item oben.

## Recent Progression

| Week | Focus | Note |
|------|-------|------|
| W41 | ⛔ Laufpause | 0 Lauf, Knochenheilung |
| W43 | 🚴 Rad-Comeback | Ist: 2/4 Rad (Mo C, Mi B+), Kraft 3/4. Umfang verfehlt |
| W44 | 🚴 Rad only | Ist: 2 belegte Rad-Tage (Mi C+, Do B-); Sa+So ohne Aufzeichnung. Kraft 3/4 |
| W45 | 🏃 Lauf-Comeback | Mo Lauf #1 ✅ 20min flach Z1 A+ (0% über 142). Rad + Kraft FC W3 folgen |

Ältere Wochen: `STATUS-log.md`.

---
*Snapshot überschreiben nach jedem Plan/Feedback; Detail an `STATUS-log.md` anhängen.*
