# Recovery Baseline Metrics

Last Updated: 2025-10-21

## Overview

These baseline values are calculated from your historical Runalyze data and are used by the coach to assess your recovery status and training readiness.

## Heart Rate Variability (HRV - SDNN)

| Category | Range (ms) | Description |
|----------|-----------|-------------|
| Good | 47-53 | Optimal recovery, ready for hard training |
| Moderate | 41-47 | Adequate recovery, proceed with caution |
| Low | <41 | Poor recovery, consider rest or easy training |

**Data Points Used:** 9 measurements (Oct 12-20, 2025)
- Highest: 53.1 ms (Oct 17)
- Lowest: 36.18 ms (Oct 12)
- Average: 44.5 ms

## Resting Heart Rate (RHR)

| Category | Range (bpm) | Description |
|----------|------------|-------------|
| Good | 54-57 | Normal baseline, good recovery |
| Elevated | 58-59 | Slightly elevated, monitor closely |
| High | >59 | Elevated, potential overtraining or illness |

**Data Points Used:** 9 measurements (Oct 12-20, 2025)
- Lowest: 54 bpm (Oct 13)
- Highest: 59 bpm (Oct 15, 18, 19)
- Average: 57 bpm

## Sleep Duration

| Category | Range (hours) | Range (minutes) | Description |
|----------|--------------|----------------|-------------|
| Good | 7-8h | 420-480 min | Optimal sleep for recovery |
| Moderate | 6-7h | 360-420 min | Adequate but could improve |
| Short | <6h | <360 min | Insufficient for proper recovery |

**Data Points Used:** 8 measurements (Oct 13-20, 2025)
- Longest: 475 min / 7.9h (Oct 18)
- Shortest: 364 min / 6.1h (Oct 15)
- Average: 419 min / 7.0h

## Deep Sleep Duration

| Category | Range (minutes) | Description |
|----------|----------------|-------------|
| Good | 65-78 | Optimal deep sleep for recovery |
| Moderate | 50-65 | Adequate but could improve |
| Low | <50 | Insufficient deep sleep |

**Data Points Used:** 8 measurements (Oct 13-20, 2025)
- Most: 78 min (Oct 15)
- Least: 50 min (Oct 14)
- Average: 65 min

## REM Sleep Duration

| Category | Range (minutes) | Description |
|----------|----------------|-------------|
| Good | 100-119 | Optimal REM sleep |
| Moderate | 71-100 | Adequate REM sleep |
| Low | <71 | Insufficient REM sleep |

**Data Points Used:** 8 measurements (Oct 13-20, 2025)
- Most: 119 min (Oct 13)
- Least: 71 min (Oct 14, 17)
- Average: 104 min

## Notes

- **Next-day indicator principle**: Metrics from day N+1 indicate recovery from training on day N
- **Single-day anomalies**: One day of poor metrics may be due to stress, poor sleep environment, or other factors - ask for context
- **Multi-day trends**: 2+ consecutive days of compromised metrics suggest training load adjustment needed
- **Individual variation**: These ranges are specific to you and will be updated as more data becomes available

## Calculation Method

Baselines are calculated using the following approach:
1. Collect recent data (typically 2-4 weeks)
2. Calculate mean and standard deviation
3. Define ranges:
   - Good: Within ~0.5 SD of the best values
   - Moderate: Between mean and good range
   - Low/High: Below/above moderate threshold
4. Adjust for practical applicability and physiological significance
