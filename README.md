# Training

Personal running + strength training system for **Florian** — a set of living markdown docs plus AI "skills" (agents) that plan, analyze, and adjust training. This README introduces the runner and how the AI trainer works.

## Who I am as a runner

- **Advanced endurance athlete.** Long-time runner, many ultras finished. High training age + deep body awareness. Current volume is below past peaks, but treat as advanced — not a returning beginner.
- **Parent-athlete.** Training must fit work + family. Consistency > volume.
- **Terrain**: based in Wolkersdorf — flat (max ~60 hm local). Vertical must be *accumulated* (hill repeats / stairs / treadmill) or sought out (Vienna Woods).
- **Current goal**: Vienna Trail Run — 23.8 km / ~1000 hm — 2026-10-18. See `races/current-race-*.md`.
- **hrMax 180 bpm.** HR targets in absolute bpm, never %. Chest strap mandatory every run. Recovery runs stay strict Z1.
- **Coaching style I want**: direct and critical, no sugarcoating. Flag under-training (esp. too little vertical), unrealistic goals, sloppy execution. Aggressive ramp-ups OK; don't over-monitor healed injuries.

## How the AI trainer works

The AI reads the living docs, plans/analyzes via **skills**, and keeps the docs + Todoist in sync.

**Core loop:**
1. **Plan** — `coach` skill reads race context, macro plan, current status + subjective feedback → writes a weekly plan to `trainings/week-XX-YYYY.md` and mirrors it to Todoist.
2. **Execute** — sessions run offline; HealthFit exports a `.fit` file (only data source).
3. **Analyze** — `feedback` skill parses the `.fit`, compares to plan → writes `feedback/feedback-XX-YYYY.md`, updates `STATUS.md` / `injuries.md` / `benchmarks.md`.
4. **Adjust** — `reschedule` skill moves/swaps/cancels days across the plan + Todoist when life interferes.

**Rules of the system:**
- **Data source**: HealthFit `.fit` files only, parsed offline. No Tredict / Strava / Runalyze / MCP.
- **Schedule truth**: Todoist project 🏅 Trainingsplan (label `training`). Any plan change mirrors to Todoist in the same change.
- **Single sources of truth**: HR zones live only in `zones.md`; current state only in `STATUS.md`.
- Living docs must stay fresh — see `AGENTS.md` for the maintenance contract. Run `scripts/lint.sh` before committing.

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
| `plans/build-plan-vienna-2026.md` | 8-week macro plan (long-run + vert progression) |
| `trainings/week-XX-YYYY.md` | Weekly plans |
| `feedback/feedback-XX-YYYY.md` | Session feedback |
| `AGENTS.md` | Agent maintenance contract |
