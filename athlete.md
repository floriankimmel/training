# Athlete Profile — Florian

> Single source for who the athlete is. HR zones live in `zones.md` (do not duplicate here).
> Current training state lives in `STATUS.md`. Injuries in `injuries.md`. PRs in `benchmarks.md`.

**Last updated**: 2026-08-20

## Basics

- **Name**: Florian
- **Sport**: Running (road + trail), bodyweight strength (Mark Lauren)
- **hrMax**: 180 bpm (see `zones.md` for full zone table)
- **Life context**: Parent-athlete. Training must fit work + family. Consistency > volume.
- **Location**: Wolkersdorf — flat terrain. **Max local climb ~60 hm.** Vertical must be
  *accumulated* (hill repeats / stairs / treadmill incline) or sought out (Vienna Woods trips).

## Goals

- **Primary 2026**: Vienna Trail Run — 23.8 km / ~1000 hm — 2026-10-18. Target 2:30–2:45.
  Full detail: `races/current-race-2026-vienna-trail.md`.
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
- **Schedule source of truth**: **Todoist** project 🏅 Trainingsplan (label `training`). Any change to a
  `trainings/week-*` plan must be mirrored to Todoist in the same change (see `AGENTS.md` contract).
- Wellness (HRV/RHR/sleep) is NOT available offline → supply manually or via feedback file.
- Skills: `coach` (plan), `feedback` (analyze), `reschedule`, `race-prediction`, `findracepace`.

## Preferences / Rules

- HR-based targets use absolute bpm (padding), never relative %.
- Recovery runs stay strict Z1 — no ego.
- After injury: comeback before fitness. Test load flat before adding hills/intensity.

---
*Living document. Update goals/equipment as they change.*
