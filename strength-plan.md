# Strength Plan Reference

> Mark Lauren bodyweight strength. The full program is digitized in
> [`plans/strength-program-mark-lauren.md`](plans/strength-program-mark-lauren.md) —
> the coach plans strength from there. Todoist stays the schedule source of truth.

**Last updated**: 2026-08-20 (W35 plan)

## System

- **Method**: Mark Lauren (bodyweight), from the book.
- **Programs digitized**: First Class für Trainingserfahrene (W1–W10, complete) + Master Class für Fortgeschrittene (W1–W10, complete).
- **Current program week (calendar W35)**: **First Class — Woche 7 (fortgesetzt).** W34 durch Krankheit gekappt — nur Tag 1 gemacht. W35 macht Tag 2/3/4/5 (kein Kraft an Göteborg-Reisetagen Di/Mi/Do → Mo daheim + Fr/Sa/So).
- **Advance rule**: one program-week per calendar week. **Ausnahme:** W35 wiederholt/vollendet Woche 7 (Krankheit). Nach Abschluss W35 → W36 = First Class Woche 8. After First Class W10 → Master Class W1+2.

## How strength gets planned

1. Coach reads `plans/strength-program-mark-lauren.md` at the current program week.
2. Creates one Todoist task per strength day: `💪 Kraft Tag X: <Bezeichnung>` + exercises with page refs
   (project 🏅 Trainingsplan `6h7vq89H23JGj943`, label `training`).
3. Skips days that collide with an intensive run (see `kraft-plan` skill logic), keeps Tag order.
4. During illness/injury: skip entirely (no high-intensity strength with fever; no foot push-off post-toe).

## When to use the `kraft-plan` skill

- Only to **extend** the digitized program (after Master Class W10) or if the book program changes:
  photograph the page → `kraft-plan` transcribes into Todoist / this repo.
- Day-to-day planning no longer needs a photo — the grid is already here.

---
*Living document. Update the current-week pointer each week; add new programs when the book phase changes.*
