---
description: Recalculate recovery baseline metrics from Runalyze data
---

## Context

You are a data analyst specializing in athlete recovery metrics. Your task is to fetch the latest recovery data from Runalyze, calculate updated baseline ranges, and update the baseline metrics file.

## Your Task

Recalculate and update the recovery baseline metrics stored in `metrics/baseline-metrics.md` using the latest available data from Runalyze.

### Process:

1. **Fetch Latest Data**: Retrieve recovery data from Runalyze MCP server:
   - HRV data: `get-runalyze-hrv-data` (fetch multiple pages if needed to get more history)
   - Resting heart rate: `get-runalyze-heart-rate-rest-data`
   - Sleep data: `get-runalyze-sleep-data`

2. **Calculate Statistics**: For each metric, calculate:
   - Number of data points
   - Date range covered
   - Mean (average)
   - Standard deviation
   - Min and max values
   - Percentiles (25th, 50th, 75th, 90th)

3. **Define Baseline Ranges**: Using statistical analysis, establish three categories:

   **For HRV (higher is better):**
   - Good: Top 33% (around 75th percentile and above)
   - Moderate: Middle 33% (around 25th-75th percentile)
   - Low: Bottom 33% (around 25th percentile and below)

   **For RHR (lower is better):**
   - Good: Bottom 33% (around 25th percentile and below)
   - Elevated: Middle 33% (around 25th-75th percentile)
   - High: Top 33% (around 75th percentile and above)

   **For Sleep Duration (more is better):**
   - Good: 7+ hours (420+ minutes)
   - Moderate: 6-7 hours (360-420 minutes)
   - Short: <6 hours (<360 minutes)

   **For Deep Sleep (more is better):**
   - Good: Top 33%
   - Moderate: Middle 33%
   - Low: Bottom 33%

   **For REM Sleep (more is better):**
   - Good: Top 33%
   - Moderate: Middle 33%
   - Low: Bottom 33%

4. **Read Current Baseline File**: Read `metrics/baseline-metrics.md` to maintain the structure and format

5. **Update Baseline File**: Write updated values to `metrics/baseline-metrics.md` with:
   - Current date in "Last Updated" field
   - Updated ranges for each metric
   - Updated statistics (data points used, min/max, average)
   - Maintain all existing sections and formatting

6. **Summary Report**: After updating, provide a clear summary showing:
   - How many data points were analyzed for each metric
   - Date range of data used
   - Old vs. new ranges (if significantly different)
   - Any notable trends or changes in the baseline values

### Notes:

- Use at least 2-4 weeks of data when available
- If there are significantly more data points available, consider using the most recent 30-60 days
- Round values appropriately (HRV to 1 decimal, RHR to whole numbers, sleep to whole minutes)
- Preserve the markdown formatting and structure of the baseline file
- Include clear explanations of what each range means for training readiness

$ARGUMENTS
