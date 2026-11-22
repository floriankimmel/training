# Strength Plan Reference

> Mark Lauren bodyweight strength. The full program is digitized in
> [`plans/strength-program-mark-lauren.md`](plans/strength-program-mark-lauren.md) —
> the coach plans strength from there. Apple Reminders stays the schedule source of truth.

**Last updated**: 2026-11-22 (W48 — First Class W6 Powerblock, Tag 1 Mo · Tag 4 Di · Tag 3 Do · Tag 2 Sa)

<!-- strength-pointer: program=first-class week=6 calendar=48 -->
<!-- Bei jedem Wochenplan mitziehen: program (first-class|master-class), week = aktuelle Programmwoche (5 deckt 5/6), calendar = KW des Plans. scripts/lint.sh prüft das. -->

## System

- **Method**: Mark Lauren (bodyweight), from the book.
- **Programs digitized**: First Class für Trainingserfahrene (W1–W10, complete) + Master Class für Fortgeschrittene (W1–W10, complete).
- **Current program week (calendar W48)**: **First Class für Trainingserfahrene (NICHT Master Class — war zu viel, Restart W39) — Woche 6/6 (Powerblock / Supersätze, 3 Runden, 2. Durchgang).** Tag 1 Drücken Mo · Tag 4 Core Di · Tag 3 Ziehen Do · Tag 2 Beine Sa (24h vor langem So-Lauf). Zeh überwunden → Sprünge voll erlaubt.
- **W46 Ist**: First Class W4, Tag 1–4 absolviert (Mo/Mi/Fr/Sa).
- **Advance rule**: one program-week per calendar week. Nach W48 (First Class W6) → W49 = First Class **Woche 7 (Wechselblock, S.245)**.

## How strength gets planned

1. Coach reads `plans/strength-program-mark-lauren.md` at the current program week.
2. Creates one Apple Reminders task per strength day: `💪 Kraft Tag X: <Bezeichnung>` + exercises with page refs
   (list 🏅 Trainingsplan, tag `training`).
3. Skips days that collide with an intensive run (see `kraft-plan` skill logic), keeps Tag order.
4. During illness/injury: skip entirely (no high-intensity strength with fever; no foot push-off post-toe).

## When to use the `kraft-plan` skill

- Only to **extend** the digitized program (after Master Class W10) or if the book program changes:
  photograph the page → `kraft-plan` transcribes into Apple Reminders / this repo.
- Day-to-day planning no longer needs a photo — the grid is already here.

---
*Living document. Update the current-week pointer each week; add new programs when the book phase changes.*
