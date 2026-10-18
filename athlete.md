# Athlete Profile — Florian

> Single source for who the athlete is. HR zones live in `zones.md` (do not duplicate here).
> Current training state lives in `STATUS.md`. Injuries in `injuries.md`. PRs in `benchmarks.md`.

**Last updated**: 2026-10-18

## Basics

- **Name**: Florian
- **Sport**: Running (road + trail), bodyweight strength (Mark Lauren)
- **Experience**: **Advanced.** Long-time runner, many ultras finished. Deep body awareness.
  Current volume is lower than past peaks, but training age + endurance base are high —
  treat as advanced, not as a returning beginner.
- **hrMax**: 180 bpm (see `zones.md` for full zone table)
- **Life context**: Parent-athlete. Training must fit work + family. Consistency > volume.
- **Location**: Wolkersdorf — flat terrain. **Max local climb ~60 hm.** Vertical must be
  *accumulated* (hill repeats / stairs / treadmill incline) or sought out (Vienna Woods trips).

## Goals

- **Primary 2026**: Münichsthaler Crosslauf — 10.16 km / ~223 hm — 2026-10-26. **Bedingtes Stretch-Ziel mit Go/No-Go-Gate** (Zehenbruch #2 noch in Heilung, Laufen pausiert). Kein Zeitziel bis Comeback-Testlauf schmerzfrei. Full detail: `races/current-race-2026-muenichsthaler-crosslauf.md`.
  - *Vorher*: Vienna Trail Run 23.8 km — 2026-10-18 — ⛔ DNS (Zehenbruch #2).
- **Secondary**: build durable trail/hill fitness, stay injury-free, sustainable routine.

## Weekly Template (see coach skill for full logic)

- Mon: Quality (intervals/tempo) + evening strength
- Tue: Recovery run (strict Z1)
- Wed: Quality (intervals/tempo) + evening strength
- Thu: Recovery run
- Fri: Rest
- Sat: Unscheduled
- Sun: Long / easy endurance

## Equipment

- **Chest strap (Brustgurt)**: MANDATORY for every run (HR accuracy). Marked ⌚ in plans.
- Trail shoes with grip for Vienna Woods sessions.
- Data: HealthFit `.fit` exports only. **No Tredict / Strava / Runalyze / MCP.**

## Data & Tooling

- **Only data source**: HealthFit `.fit` files, parsed offline via `parse_fit.py` (feedback skill).
- **Schedule source of truth**: **Apple Reminders** list 🏅 Trainingsplan (tag `training`). Any change to a
  `trainings/week-*` plan must be mirrored to Apple Reminders in the same change (see `AGENTS.md` contract).
- Wellness (HRV/RHR/sleep) is NOT available offline → supply manually or via feedback file.
- Skills: `coach` (plan), `feedback` (analyze), `reschedule`, `race-prediction`, `findracepace`.

## Preferences / Rules

- HR-based targets use absolute bpm (padding), never relative %.
- Recovery runs stay strict Z1 — no ego.
- After injury: comeback before fitness. Test load flat before adding hills/intensity.

## Coaching style (how to talk to this athlete)

- **Be direct and critical when warranted.** Encouragement is fine, but do NOT sugarcoat.
  Call out under-training (e.g. too little vertical for the race), sloppy execution, or unrealistic goals plainly.
- **Aggressive ramp-ups are OK.** As an experienced ultra runner he tolerates bigger week-to-week
  jumps than a novice — don't cap progression out of excess caution.
- **Don't over-monitor healed issues.** A resolved injury (e.g. the toe, now healed) does not need
  weeks of tiptoeing. One sanity check, then move on unless symptoms actually return.
- Still respect: real illness/fever (no training), acute pain, and taper logic. Judgment over rules.

---
*Living document. Update goals/equipment as they change.*
