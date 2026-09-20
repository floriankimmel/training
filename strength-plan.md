# Strength Plan Reference

> Mark Lauren bodyweight strength. The full program is digitized in
> [`plans/strength-program-mark-lauren.md`](plans/strength-program-mark-lauren.md) —
> the coach plans strength from there. Apple Reminders stays the schedule source of truth.

**Last updated**: 2026-09-20 (W39 plan)

## System

- **Method**: Mark Lauren (bodyweight), from the book.
- **Programs digitized**: First Class für Trainingserfahrene (W1–W10, complete) + Master Class für Fortgeschrittene (W1–W10, complete).
- **Current program week (calendar W39)**: **Master Class — Woche 1 (Muskuläre Ausdauer / Stufenintervalle, S.249) — Start Master Class.** W38 hat First Class Woche 10 (Abschluss) absolviert. W39 = Tag 1-4 auf Di/Do/Fr/Sa (kein Kraft Mo → Intervalle).
- **Advance rule**: one program-week per calendar week. Nach W39 (Master Class W1) → W40 = Master Class Woche 2 (gleiches Tableau S.249).

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
