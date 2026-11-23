# Readiness is the z-score gate, not 90-day terciles

Readiness is the GREEN/AMBER/RED gate: smoothed HRV (3 days, z-score against 30 days), resting heart rate (7 days vs. 30) and sleep debt (7 days vs. 30). Each raises at most one Recovery-Flag, and the verdict is the flag count. The webview had shown 90-day tercile tiers per metric, while the coach planned from this gate. The two could disagree on the same day, and only the gate changes the plan.

## Considered Options

- **90-day terciles per metric** (former `db/readiness.py`, webview recovery cards): rejected, because terciles rank a value against history without saying whether it is abnormal. They also showed three colours per metric that no planning rule used.

## Consequences

`daily_readiness` is recomputed for all past days as-of each day (`ALGO_VERSION` 2). The recovery cards show flag / no flag per signal, not three tiers.
