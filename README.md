# Training

Personal running + strength training repo for **Florian**. Offline, HealthFit `.fit`-only. Todoist = schedule truth.

## Current State (2026-08-27)

- **Target race**: Vienna Trail Run — 23.8 km / ~1000 hm — **2026-10-18** (~8 weeks out). Goal 2:30–2:45.
- **Phase**: Build 1 (softened) — reboot after GI illness (since 08-19).
- **Health**: GI illness recovery **complete**. Toe fracture healed, no longer a limiter.
- **Key limiter**: Wolkersdorf is flat (max ~60 hm). Vertical must be accumulated (repeats/stairs/Woods trips). For trail race, **weekly hm > flat minutes**.

## Repo Map

| File | Purpose |
|------|---------|
| `STATUS.md` | Current training state snapshot (start here) |
| `athlete.md` | Athlete profile, goals, equipment, rules |
| `zones.md` | HR zones — single source of truth |
| `calendar.md` | Future events affecting weekly planning |
| `injuries.md` | Injury/illness log + return protocols |
| `benchmarks.md` | PRs, test runs, reference paces |
| `strength-plan.md` | Strength reference (Mark Lauren) |
| `fueling.md` | Carb-intake strategy |
| `races/current-race-*.md` | Current target race |
| `plans/build-plan-vienna-2026.md` | 8-week macro plan |
| `trainings/week-XX-YYYY.md` | Weekly plans |
| `feedback/feedback-XX-YYYY.md` | Session feedback |
| `AGENTS.md` | Agent maintenance contract |

## Data & Tooling

- **Data source**: HealthFit `.fit` files only, parsed offline. No Tredict / Strava / Runalyze / MCP.
- **Schedule truth**: Todoist project 🏅 Trainingsplan (label `training`).
- **hrMax**: 180 bpm.
- Chest strap mandatory every run.
- Run `scripts/lint.sh` before committing training-doc changes.
