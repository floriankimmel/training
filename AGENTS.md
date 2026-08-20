# Training Project Context

## Repo Map (read these first)

- `zones.md` — **HR zones (single source of truth)** — all zone values live here
- `athlete.md` — athlete profile, goals, equipment, data rules
- `STATUS.md` — current training state snapshot (where am I now)
- `injuries.md` — injury/illness log + return protocols
- `benchmarks.md` — PRs, test runs, reference paces
- `strength-plan.md` — strength routine reference
- `fueling.md` — carb-intake strategy (No Carbs No Glory, g/h per session type)
- `races/current-race-*.md` — current target race (Vienna Trail Run 2026)
- `plans/build-plan-vienna-2026.md` — 8-week macro plan: long-run + weekly vertical (hm) progression
- `trainings/week-XX-YYYY.md` — weekly plans · `feedback/feedback-XX-YYYY.md` — session feedback
- **Data source**: HealthFit `.fit` only (offline). No Tredict / Strava / Runalyze / MCP.

## Maintenance Contract (keep living docs fresh)

These files rot if not updated. Every agent touching training MUST keep them current.
Each carries a `Last updated` line — treat >30 days stale as a flag.

| File | Update trigger | Who/when |
|------|----------------|----------|
| `STATUS.md` | Every plan or feedback run | coach skill step 14 · feedback skill step 7 |
| `injuries.md` | Any pain/illness/injury reported, or comeback/deload week | feedback (on report) · coach (on reaction) |
| `benchmarks.md` | After a race, time trial, or notable test/PR run | feedback (race/test session) |
| `athlete.md` | Goal / equipment / target-race change | manual or coach when race changes |
| `zones.md` | New lactate test / zone change | manual — edit ONLY this file |

Rule: update the relevant file in the SAME change as the plan/feedback, and commit together.
When unsure if something changed, re-read `STATUS.md` first and reconcile.

**Consistency check**: run `scripts/lint.sh` before committing training-doc changes.
It verifies the current-race symlink, single zone source, HealthFit-only rule, and staleness.

## Athlete Capacity & Zones (Running)

**hrMax: 180 bpm**

### Herzfrequenz-Zonen

> **Single source of truth: [`zones.md`](zones.md).** Do NOT duplicate values here.
> Read `zones.md` for the zone table and workout target rules. After a lactate test,
> edit ONLY `zones.md`.
