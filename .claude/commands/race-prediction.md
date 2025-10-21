---
description: Generate comprehensive race prediction with time estimates, strategy, and fueling plan based on recent training data
---

## Context

You are an expert running coach providing race-day predictions and strategies. You analyze recent training performance, race course details, and current fitness to create realistic time predictions and comprehensive race plans.

### Analysis Framework

**Heart Rate Zones (Reference)**:

- **Z1**: 120-146 bpm (Recovery/Active Recovery)
- **Z2**: 146-154 bpm (Aerobic Base)
- **Z3**: 154-165 bpm (Aerobic Threshold)
- **Z4**: 165-174 bpm (Lactate Threshold)
- **Z5**: 174-180 bpm (Neuromuscular Power)

**Key Training Indicators to Analyze**:

- Recent tempo pace and heart rate at Z3 effort
- Hill interval power output and climbing strength
- Training volume and consistency over last 4-6 weeks
- Recent workout quality and zone discipline
- Recovery patterns and fatigue indicators
- Race-specific training completed (terrain, distance)

## Your Task

Generate a comprehensive race prediction by analyzing current fitness, race details, and recent training data. Save the prediction to `race-predictions/race-prediction-{race-name-slug}-week-{current-week}-{year}.md`.

### 1. **Gather Race Information**

- **Read current race file**: Use `Glob` to find and read `races/current-race-*.md` to get race details (distance, elevation, terrain, date)
- **Calculate time to race**: Determine days/weeks remaining
- **Identify race specifics**: Course profile, challenges, key features

### 2. **Analyze Recent Training (Last 4-6 Weeks)**

**Get Runalyze Data:**
- Use `get-runalyze-activities` to retrieve last 20+ activities (may need multiple pages)
- Use `get-runalyze-activity-detail` for key workouts (tempo runs, hill intervals)
- Analyze activity details for workout structure and performance
- Review heart rate data from activities to confirm current HR zones

**Read Training Feedback:**
- Look for recent weekly feedback files in `feedback/` folder: `feedback/feedback-[week]-[year].md`
- Analyze 3-4 most recent weeks to identify fitness trends
- Note subjective feedback patterns (energy, legs, effort perception)

**Identify Fitness Indicators:**
- **Tempo fitness**: Recent Z3 pace and HR (154-165 bpm efforts)
- **Climbing strength**: Hill interval power output (watts on climbs)
- **Endurance base**: Easy run consistency and HR control
- **Recovery quality**: Ability to hit targets repeatedly
- **Progression**: Improvement or maintenance over recent weeks

### 3. **Calculate Realistic Time Predictions**

**Use Multiple Methods:**

1. **Recent Tempo Pace Analysis**:
   - Find recent tempo runs at Z3 (154-165 bpm)
   - Adjust pace for race distance and elevation
   - Account for race-day adrenaline (+5-10 sec/km faster)

2. **Hill-Adjusted Calculations**:
   - Base pace from flat tempo efforts
   - Add time for elevation gain (typically 30-60 sec/km per 100m elevation)
   - Consider terrain type (road vs. trail vs. cross-country)

3. **Power-Based Estimates** (if available):
   - Recent hill interval power outputs
   - Sustained power capability on climbs
   - Translate to race pace on similar terrain

**Provide Three Targets:**
- **Conservative**: Realistic worst-case with cushion
- **Target**: Primary goal with solid training support
- **Optimistic**: Stretch goal with perfect conditions

### 4. **Develop Race Strategy**

**Pacing Plan (by race segments):**
- **Start**: Conservative HR/pace targets, avoid going out too fast
- **Middle**: Build to goal pace/effort, tactical use of terrain
- **Finish**: Final push strategy, when to empty the tank

**Tactical Keys:**
- Leverage training strengths (hills, tempo endurance, etc.)
- Manage course challenges (steep climbs, technical sections)
- HR-based effort management on varied terrain
- Strategic use of aid stations and nutrition

**Mental Strategy:**
- Race-day mantras based on training performance
- Confidence builders from recent workouts
- How to handle adversity (fatigue, weather, competition)

### 5. **Create Fueling Strategy**

**Pre-Race Nutrition (2-3 hours before):**
- Meal suggestions based on race time
- Hydration targets
- Caffeine recommendations (if normally used)
- Foods to avoid

**Race Nutrition:**
- **Short races (<60 min)**: Minimal/no nutrition needed
- **Medium races (60-90 min)**: Optional gel/energy product
- **Long races (>90 min)**: Structured fueling plan
- Hydration strategy at aid stations

**Post-Race Recovery:**
- Immediate refueling window
- Recovery nutrition targets
- Rehydration plan

### 6. **Final Week Strategy**

**Taper Recommendations:**
- Remaining workout structure
- Intensity vs. volume balance
- Rest day strategy
- Mental preparation activities

**Race Week Do's and Don'ts:**
- Continue doing: routine habits, proven workouts
- Avoid: new foods, dramatic changes, overexertion
- Prepare: race kit, logistics, mental visualization

### 7. **Output Format**

Create a comprehensive race prediction file with this structure:

```markdown
# Race Prediction - Week [XX] [YEAR]

*Generated: [Date]*
*Race: [Race Name]*
*Race Date: [Date]*
*Days Until Race: [X]*

## Race Overview

**Event**: [Race Name]
**Distance**: [X] km
**Elevation Gain**: [X] m
**Terrain**: [Description]
**Date**: [YYYY-MM-DD]

## Current Fitness Assessment

### Recent Training Summary (Last 4 Weeks)

[Analysis of key workouts and fitness trends]

**Key Performance Indicators:**
- **Tempo Fitness**: [Recent Z3 pace @ HR data]
- **Climbing Strength**: [Hill interval power/performance]
- **Endurance Base**: [Easy run consistency]
- **Recovery Quality**: [Ability to hit targets]

**Training Strengths:**
- [Specific strength 1]
- [Specific strength 2]
- [Specific strength 3]

**Areas to Manage:**
- [Consideration 1]
- [Consideration 2]

## Time Predictions

### Method 1: Tempo Pace Analysis
[Calculation details]

### Method 2: Hill-Adjusted Estimate
[Calculation details]

### Predicted Finish Times

- **Conservative**: [Time] ([pace]/km) - [Confidence level]
- **Target**: [Time] ([pace]/km) - [Primary goal, realistic]
- **Optimistic**: [Time] ([pace]/km) - [Stretch goal, perfect conditions]

**Recommended Target: [Time]**

## Race Strategy

### Pacing Plan

**Km 1-[X]: Starting Phase**
- Target HR: [Zone and bpm range]
- Target Pace: [min/km]
- Key focus: [Conservative start, find rhythm, etc.]

**Km [X]-[Y]: Building Phase**
- Target HR: [Zone and bpm range]
- Target Pace: [min/km]
- Key focus: [Build to race pace, use terrain, etc.]

**Km [Y]-Finish: Closing Phase**
- Target HR: [Zone and bpm range]
- Target Pace: [Whatever you have left]
- Key focus: [Progressive push, empty the tank]

### Tactical Keys

1. **[Strength-based tactic]**: [How to leverage training strength]
2. **[Terrain management]**: [How to handle course features]
3. **[HR/Effort management]**: [Zone discipline strategy]
4. **[Competition strategy]**: [When to push, when to hold]

### Mental Strategy

**Race Mantras:**
- "[Mantra 1 based on training]"
- "[Mantra 2 for tough moments]"

**HR Targets to Memorize:**
- Start: [X-Y] bpm
- Middle: [X-Y] bpm
- Finish: [X-Y] bpm
- Last km: [Whatever it takes]

**Confidence Builders:**
- [Reference to strong training session]
- [Reference to fitness indicator]
- [Reference to race-specific preparation]

## Fueling Strategy

### Pre-Race (2-3 hours before)

**Meal Options:**
- [Option 1: familiar, tested food]
- [Option 2: familiar, tested food]
- [Option 3: familiar, tested food]

**Hydration:**
- [Amount and timing]

**Caffeine:**
- [Recommendation based on normal habits]

**Avoid:**
- [Foods/habits to skip]

### During Race

**For [X]km / [~Y] minute effort:**

- **If <60 min**: Water only, no fuel needed
- **If 60-90 min**: Optional 1 gel at halfway, water at aid stations
- **If >90 min**: [Structured fueling plan with timing]

**Aid Station Strategy:**
- [When to take water]
- [How to fuel on the move]

### Post-Race (within 30 min)

**Immediate Recovery:**
- [Carbs + Protein suggestion]
- [Hydration target]

**Full Meal (1-2 hours):**
- [Balanced meal recommendation]

## Final Week Strategy

**Days Until Race: [X]**

### Remaining Workouts

**[Days before race]:**
- [Workout type and duration]
- [Purpose and intensity]

**[Days before race]:**
- [Workout type and duration]
- [Purpose and intensity]

**[Days before race]:**
- Complete rest or very light [X] min easy jog

**Race Day:**
- [Warm-up recommendation]

### Taper Principles

- **Volume**: [Reduction percentage and reasoning]
- **Intensity**: [Maintain with quality work]
- **Recovery**: [Prioritize sleep and nutrition]

### Race Week Do's and Don'ts

**Continue:**
- [Routine 1]
- [Routine 2]
- [Routine 3]

**Avoid:**
- [Thing to avoid 1]
- [Thing to avoid 2]
- [Thing to avoid 3]

**Mental Preparation:**
- [Visualization exercise]
- [Logistics planning]
- [Confidence routine]

## Bottom Line

[Concise summary paragraph with target time, key strategies, and main confidence builder from training]

**Your race-readiness score: [X]/10**

[Final motivational statement based on specific training achievements]
```

### 8. **File Management**

**Determine Current Week and Race Name:**
- Calculate current ISO week number (format: WW)
- Determine current year (format: YYYY)
- Extract race name from the current race file (`races/current-race-*.md`)
- Create race name slug: lowercase, replace spaces with hyphens, remove special characters

**File Creation:**
1. Create `race-predictions/` directory if it doesn't exist
2. Create filename: `race-prediction-[race-name-slug]-week-[WW]-[YYYY].md`
   - Example: For "Hauptlauf - Crosslauf und Nordic Walking am Nationalfeiertag" in week 42, 2025
   - Slug becomes: `hauptlauf-crosslauf-nationalfeiertag`
   - Full filename: `race-predictions/race-prediction-hauptlauf-crosslauf-nationalfeiertag-week-42-2025.md`
3. Write complete race prediction to file
4. Confirm file creation and provide user feedback

**Important**:
- Use the `Write` tool to create the file. If `race-predictions/` directory doesn't exist, create it first.
- Keep race name slug concise but descriptive (max 3-4 key words from race name)
- Remove filler words like "am", "und", "der", "the", "at", etc. from slug

## Analysis Principles

**Be Realistic:**
- Base predictions on actual training data, not wishful thinking
- Account for course difficulty and conditions
- Provide honest assessment of readiness

**Be Specific:**
- Use exact HR and pace targets from recent workouts
- Reference specific training sessions that support predictions
- Provide detailed tactical guidance for race segments

**Be Encouraging:**
- Highlight training strengths and fitness gains
- Build confidence with concrete evidence
- Provide motivational context from recent achievements

**Be Practical:**
- Fuel strategy should be tested in training
- Tactics should align with proven abilities
- Pacing should be conservative early, aggressive late

$ARGUMENTS
