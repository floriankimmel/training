# Training Project Context

## Repo Map (read these first)

- `zones.md` — **HR zones (single source of truth)** — all zone values live here
- `athlete.md` — athlete profile, goals, equipment, data rules
- `STATUS.md` — current training state snapshot (where am I now)
- `calendar.md` — known future events (travel/work/family) that affect weekly planning
- `injuries.md` — injury/illness log + return protocols
- `benchmarks.md` — PRs, test runs, reference paces
- `db/` — **DuckDB (`db/training.duckdb`) — 1469+ runs, 6M+ per-second records** from HealthFit `.fit`. Query for objective pace/HF/vert trends. See `db/README.md`. Trend-Fragen → **`training-db` skill**.
- `strength-plan.md` — strength reference (Mark Lauren; digitized program in `plans/strength-program-mark-lauren.md`; coach plans it, advancing 1 week/week; Apple Reminders = schedule truth)
- `fueling.md` — carb-intake strategy (No Carbs No Glory, g/h per session type)
- `races/current-race-*.md` — current target race (Vienna Trail Run 2026)
- `plans/build-plan-vienna-2026.md` — 8-week macro plan: long-run + weekly vertical (hm) progression
- `trainings/week-XX-YYYY.md` — weekly plans · `feedback/feedback-XX-YYYY.md` — session feedback
- **Data source**: HealthFit `.fit` only (offline). No Tredict / Strava / Runalyze / MCP.
- **Objective analysis**: query `db/training.duckdb` (DuckDB) for real pace/HF/vert trends instead of guessing. Terrain-robust metric = median per-second pace within an HR band (see `benchmarks.md` method note).

## Maintenance Contract (keep living docs fresh)

These files rot if not updated. Every agent touching training MUST keep them current.
Each carries a `Last updated` line — treat >30 days stale as a flag.

| File | Update trigger | Who/when |
|------|----------------|----------|
| `STATUS.md` | Every plan or feedback run | coach skill step 14 · feedback skill step 7 |
| `injuries.md` | Any pain/illness/injury reported, or comeback/deload week | feedback (on report) · coach (on reaction) |
| `benchmarks.md` | After a race, time trial, or notable test/PR run | feedback (race/test session) |
| `benchmarks.md` reference paces | After a training block — refresh from DuckDB (median-per-second pace in HR bands) | manual/coach |
| `athlete.md` | Goal / equipment / target-race change | manual or coach when race changes |
| `zones.md` | New lactate test / zone change | manual — edit ONLY this file |
| **Apple Reminders** — list **🏅 Trainingsplan** (tag `training`) | **ANY change to a `trainings/week-*` plan** (new plan, reschedule, cancel, illness/injury edit) | coach/reschedule skill via `remctl` CLI |

**Apple Reminders is the source of truth for the active training schedule.** Whenever a training-plan
day is added, changed, moved, or cancelled in `trainings/`, mirror it in Apple Reminders in the SAME change:
create/update/complete/delete the matching task (list 🏅 Trainingsplan, tag `training`,
`@workout` spec line on running/cycling tasks). Rest days = no task.

Rule: update the relevant file in the SAME change as the plan/feedback, and commit together.
When unsure if something changed, re-read `STATUS.md` first and reconcile.

**Consistency check**: run `scripts/lint.sh` before committing training-doc changes.
It verifies the current-race symlink, single zone source, HealthFit-only rule, and staleness.

**Bewusste Kraft-am-Reisetag-Ausnahme merken**: Lint sperrt Kraft an Kalender-Reisetagen.
Abflug- und Rückflugtag (letzterer, wenn die Kalender-Notes departure/return/Rückflug nennen)
sind automatisch erlaubt. Für jeden anderen bewussten Ausnahme-Tag den Marker
`<!-- lint-allow: kraft-travel — Grund -->` irgendwo in den Tagesabschnitt der
`trainings/week-*.md` schreiben. Lint überspringt diesen Tag dann dauerhaft & still.

## Athlete Capacity & Zones (Running)

**hrMax: 180 bpm**

### Herzfrequenz-Zonen

> **Single source of truth: [`zones.md`](zones.md).** Do NOT duplicate values here.
> Read `zones.md` for the zone table and workout target rules. After a lactate test,
> edit ONLY `zones.md`.
