# Strength Plan Reference

> Mark Lauren bodyweight strength. The full program is digitized in
> [`plans/strength-program-mark-lauren.md`](plans/strength-program-mark-lauren.md) —
> the coach plans strength from there. Todoist stays the schedule source of truth.

**Last updated**: 2026-08-20

## System

- **Method**: Mark Lauren (bodyweight), from the book.
- **Programs digitized**: First Class für Trainingserfahrene (W1–W10, complete) + Master Class für Fortgeschrittene (W1–W10, complete).
- **Current program week (calendar W34, 2026-08-20)**: **First Class — Woche 7.**
- **Advance rule**: one program-week per calendar week (W35 → First Class W8, …). After First Class W10 → Master Class W1+2.
  If illness/injury skipped a week, confirm whether to repeat or advance.

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
