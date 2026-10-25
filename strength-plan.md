# Strength Plan Reference

> Mark Lauren bodyweight strength. The full program is digitized in
> [`plans/strength-program-mark-lauren.md`](plans/strength-program-mark-lauren.md) —
> the coach plans strength from there. Apple Reminders stays the schedule source of truth.

**Last updated**: 2026-10-25 (W44 — First Class W2, Tag 1–4 Mo/Di/Do/Fr; Mo+Di sind Calendar-bedingt radfrei)

## System

- **Method**: Mark Lauren (bodyweight), from the book.
- **Programs digitized**: First Class für Trainingserfahrene (W1–W10, complete) + Master Class für Fortgeschrittene (W1–W10, complete).
- **Current program week (calendar W44)**: **First Class — Woche 2 (Muskuläre Ausdauer / Stufenintervalle, S.242).** Gleiches Tableau wie W1, Progression über **Wiederholungen pro Stufe**, nicht über neue Übungen. W44 **Tag 1–4 komplett** auf **Mo/Di/Do/Fr** — Mo+Di sind laut `calendar.md` radfrei (nur Kraft), Fr-Beintag liegt bewusst zwei Tage vor der langen Sonntags-Ausfahrt. Zeh seit Tagen schmerzfrei → **Sprungübungen freigegeben, kontrolliert landen**; bei Zehen-Signal Sprung raus (tiefe Kniebeuge mit Haltezeit).
- **W43 Ist**: nur 3 von 4 Tagen absolviert (Tag 4 Sa 24.10 ausgefallen).
- **Advance rule**: one program-week per calendar week. Nach W44 (First Class W2) → W45 = First Class **Woche 3** (Kraft / Intervallsätze, S.243 — neues Tableau).

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
