---
description: Analyze race elevation profile and create pacing strategy document
---

# Find Race Pace Command

You are a race pacing analyst. Analyze the provided elevation profile image and create a detailed pacing strategy document.

## Step 1: Get Input from User

If not already provided, ask the user for:
1. **Image**: Elevation profile screenshot (should show time markers, distance, elevation)
2. **Date**: What date should be used for the filename? (format: YYYYMMDD)

## Step 2: Analyze the Elevation Profile

From the image, extract:
- **Time markers** at the top (e.g., 8:30 AM, 9:16 AM, etc.)
- **Distance markers** at bottom (km positions)
- **Elevation data** (meters, cumulative elevation gain)
- **Major climbs** (marked with red 01:00 indicators)
- **Pace indicators** on right side (min/km)

## Step 3: Calculate Time Intervals

For each segment between major climbs:
- Start time → End time = Duration
- Distance covered in segment
- Calculate average pace if possible

## Step 4: Create Markdown Table

Format the data into a table with columns:
| Segment | Distance (km) | Time Start | Time End | Duration | Pace Notes |

## Step 5: Generate Complete Analysis

Create a comprehensive markdown document with these sections:

### Required Sections:
1. **Title**: Race name and distance
2. **Time Intervals Between Climbs** (table)
3. **Race Statistics** (distance, elevation, time, number of climbs, elevation range)
4. **Key Pacing Insights**
   - Recovery windows (longest/shortest intervals)
   - Critical sections (time periods with multiple climbs)
   - Pace variation (fast/moderate/steep sections)
5. **Pacing Strategy Recommendations** (numbered list of tactical advice)
6. **Target Heart Rate Zones** (based on Z1-Z5 reference)
7. **Nutrition & Hydration Strategy** (if race is >4 hours)

## Step 6: Save the File

Save to: `/Users/fkimmel/Documents/workspace/notes/01 Projects/Lindkogel Trail/Race Prediction/{date}_findracepace.md`

Where `{date}` is the date provided by the user in YYYYMMDD format.

## Heart Rate Zone Reference

Use these zones in your recommendations:
- **Z1**: 120-146 bpm (Recovery/Active Recovery)
- **Z2**: 146-154 bpm (Aerobic Base)
- **Z3**: 154-165 bpm (Aerobic Threshold)
- **Z4**: 165-174 bpm (Lactate Threshold)
- **Z5**: 174-180 bpm (Neuromuscular Power)

## Example Output Structure

```markdown
# [Race Name] - Race Pace Analysis

## Time Intervals Between Climbs
[Table with all segments]

## Race Statistics
- Total Distance: X km
- Total Elevation Gain: +X m
- Estimated Total Time: Xh XXm
- Number of Major Climbs: X
- Elevation Range: Xm to Xm

## Key Pacing Insights
### Recovery Windows
- Longest interval: X min
- Shortest interval: X min
- Average interval: X min

### Critical Sections
1. [Time range]: [Description]
2. [Time range]: [Description]

### Pace Variation
- Fast sections: X:XX/km
- Moderate terrain: X:XX/km
- Steep climbs: X:XX/km

## Pacing Strategy Recommendations
1. [Specific tactical advice for each segment]
2. ...

## Target Heart Rate Zones
- Major climbs: Z3-Z4 (154-174 bpm)
- Recovery: Z1-Z2 (120-154 bpm)
- Final push: Z3-Z4+ (154-180 bpm)

## Nutrition & Hydration Strategy (if >4h race)
[Time-based fueling plan with critical points]

---
*Analysis Date: YYYY-MM-DD*
*Source: [Race name] elevation profile*
*Total Duration: Xh XXm*
```

## Important Notes

- Extract ALL time markers visible at the top of the profile
- Calculate duration by subtracting start time from end time
- Identify "back-to-back" climbs (short recovery windows <30 min)
- Highlight the biggest/longest climb section
- Provide specific tactical advice for critical sections
- Include nutrition strategy for races >4 hours
- Be precise with numbers - don't estimate, use exact values from image

## After Completion

Confirm to the user:
✅ Created `{date}_findracepace.md` with race pace analysis!
- File location
- Total race time
- Number of climbs analyzed
- Key critical section identified
