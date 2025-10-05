# n8n Agent - Bash Tool Usage Guide for Training Data Analysis

## Critical Understanding

When working with training plans and feedback files, you MUST use the **Bash tool** to query and manipulate file data. The file system operations require bash commands for listing, searching, and extracting specific information.

## Working Directory

All commands assume you're in the project root directory:
```bash
/Users/fkimmel/Documents/workspace/training
```

## Essential Bash Commands for Training Analysis

### 1. Get Current Date and Week Information

```bash
# Get current week number (1-53)
date +%V
# Example output: 41

# Get current year
date +%Y
# Example output: 2025

# Get today's date (YYYY-MM-DD format)
date +%Y-%m-%d
# Example output: 2025-10-07

# Get day of week (Monday, Tuesday, etc.)
date +%A
# Example output: Monday

# Get abbreviated day (Mon, Tue, etc.)
date +%a
# Example output: Mon
```

**Why you need this**: To determine which training plan file to read (e.g., `week-41-2025.md`) and which feedback file to update (e.g., `feedback-41-2025.md`).

### 2. List Training Plans

```bash
# List all training plan files (sorted by modification time, newest first)
ls -lt .trainings/*.md

# List only filenames
ls .trainings/*.md

# Count how many training plans exist
ls .trainings/*.md | wc -l

# Get the 6 most recent training plans
ls -t .trainings/*.md | head -6
```

**Example output**:
```
.trainings/week-41-2025.md
.trainings/week-40-2025.md
.trainings/week-39-2025.md
.trainings/week-38-2025.md
.trainings/week-37-2025.md
.trainings/week-36-2025.md
```

**Interpretation**: These are your training plan files ordered by week. The most recent is Week 41.

### 3. Find Current Week's Training Plan

```bash
# Get current week and year, then construct filename
WEEK=$(date +%V)
YEAR=$(date +%Y)
echo ".trainings/week-${WEEK}-${YEAR}.md"

# Check if current week's plan exists
WEEK=$(date +%V)
YEAR=$(date +%Y)
if [ -f ".trainings/week-${WEEK}-${YEAR}.md" ]; then
  echo "Current week's plan exists"
else
  echo "Current week's plan NOT found"
fi

# Find and read current week's plan
cat ".trainings/week-$(date +%V)-$(date +%Y).md"
```

**What this tells you**: Whether a training plan exists for the current week, and allows you to read its contents.

### 4. Extract Today's Planned Workout from Training Plan

```bash
# Get today's day of week
DAY=$(date +%A)
echo "Today is: $DAY"

# Extract today's section from training plan
# This finds the section starting with "## Monday" (or Tuesday, etc.)
# and prints until the next ## heading
WEEK=$(date +%V)
YEAR=$(date +%Y)
DAY=$(date +%A)

awk "/## $DAY/,/^## /" ".trainings/week-${WEEK}-${YEAR}.md" | head -n -1

# More robust version that handles the last day of week:
sed -n "/^## $DAY/,/^## /p" ".trainings/week-${WEEK}-${YEAR}.md" | sed '$d'
```

**Example output**:
```markdown
## Monday

- **Lunch**: **Easy/Endurance Run** - 45 minutes (Z1-Z2: 120-154 bpm)
  - **Critical Focus**: Target 140-150 bpm average, NOT 151+ bpm like Week 40
  - **Purpose**: True aerobic recovery between weekend and Tuesday's peak intervals
  - **Route**: Primarily flat terrain, minimal rolling hills this week
  - **Zone Strategy**: If HR approaches 150 bpm, slow down - recovery is the goal
  - **Apple Watch Reminder**: Ensure snug fit for accurate HR tracking
- **Evening**: Free (no planned activities)
```

**Interpretation**:
- Today is Monday
- Planned workout: Easy run for 45 minutes
- Target heart rate: Z1-Z2 (120-154 bpm), ideally 140-150 bpm average
- Focus: Recovery, not intensity
- Evening: No planned activities

### 5. List Feedback Files

```bash
# List all feedback files
ls -lt feedback-*.md

# Get current week's feedback file
WEEK=$(date +%V)
YEAR=$(date +%Y)
echo "feedback-${WEEK}-${YEAR}.md"

# Check if current week's feedback exists
if [ -f "feedback-$(date +%V)-$(date +%Y).md" ]; then
  echo "Feedback file exists"
  cat "feedback-$(date +%V)-$(date +%Y).md"
else
  echo "No feedback file for current week yet"
fi
```

**Example output**:
```
feedback-41-2025.md
feedback-40-2025.md
feedback-39-2025.md
```

**Interpretation**: Weekly feedback files exist for weeks 39, 40, and 41.

### 6. Read Feedback File Contents

```bash
# Read current week's feedback
cat "feedback-$(date +%V)-$(date +%Y).md"

# Read last 3 weeks of feedback
for week in 39 40 41; do
  echo "=== Week $week ==="
  cat "feedback-${week}-2025.md"
  echo ""
done

# Extract just session summaries (looking for ## headers with dates)
grep "^## 2025-" "feedback-$(date +%V)-$(date +%Y).md"
```

**Example output**:
```markdown
# Week 40 2025 - Personal Training Feedback

*Subjective training experiences for Week 40 to complement objective Strava data*

## Session Feedback

## 2025-09-29 - 🏃 Wien • Endurance Run 45 min
**Feel**: 7/10 (good execution with minor zone drift)
**Energy**: Good (consistent pace with slight fade in middle section)
**Legs**: Good (solid cadence at 88.1 rpm, responsive throughout)
**Effort**: Moderate (higher than planned Z1-Z2, drifted into Z2-Z3)
**Notes**: Monday Progression Easy Run - 45:00 moving time, 8.32km, 151.4 bpm avg HR, 5:24 min/km pace.
```

**Interpretation**:
- Week 40 has recorded feedback
- On 2025-09-29, athlete did an endurance run
- Subjective: Felt 7/10, good energy and legs
- Objective: HR was 151.4 bpm (slightly high for easy run)
- Key insight: Zone drift - ran harder than planned

### 7. Search for Specific Workout Types

```bash
# Find all interval sessions in training plans
grep -n "Interval" .trainings/week-*.md

# Find all tempo sessions
grep -n "Tempo" .trainings/week-*.md

# Find mentions of specific heart rate zones
grep -n "Z4" .trainings/week-*.md

# Search for hill workouts
grep -i "hill" .trainings/week-*.md
```

**Example output**:
```
.trainings/week-41-2025.md:62:- **Lunch**: **Peak Hill Intervals** - 55 minutes total
.trainings/week-41-2025.md:64:  - **Main set**: 6 x 3 minutes **uphill** @ Z3-Z4 effort (160-172 bpm)
.trainings/week-40-2025.md:43:  - **Main set**: 5 x 3 minutes **uphill** @ Z3-Z4 effort (160-172 bpm)
```

**Interpretation**: Week 41 progressed from 5x3min to 6x3min hill intervals (volume increase).

### 8. Calculate Previous Week Numbers

```bash
# Get previous week's training plan
CURRENT_WEEK=$(date +%V)
PREVIOUS_WEEK=$((CURRENT_WEEK - 1))
YEAR=$(date +%Y)

echo "Previous week's plan: .trainings/week-${PREVIOUS_WEEK}-${YEAR}.md"

# Get last 6 weeks of training plans
CURRENT_WEEK=$(date +%V)
YEAR=$(date +%Y)

for i in {6..1}; do
  WEEK=$((CURRENT_WEEK - i))
  if [ $WEEK -gt 0 ]; then
    echo ".trainings/week-${WEEK}-${YEAR}.md"
  fi
done
```

**Example output**:
```
.trainings/week-35-2025.md
.trainings/week-36-2025.md
.trainings/week-37-2025.md
.trainings/week-38-2025.md
.trainings/week-39-2025.md
.trainings/week-40-2025.md
```

**Interpretation**: These are the 6 weeks of training history leading up to current week (41).

### 9. Extract Specific Data from Training Plans

```bash
# Extract all planned workout durations from current week
WEEK=$(date +%V)
YEAR=$(date +%Y)
grep -E "minutes|min" ".trainings/week-${WEEK}-${YEAR}.md" | grep -E "Lunch|Evening"

# Extract target heart rate zones
grep -oE "Z[1-5].*bpm" ".trainings/week-${WEEK}-${YEAR}.md" | head -10

# Extract weekly focus/summary
sed -n '/## Weekly Focus/,/^## /p' ".trainings/week-${WEEK}-${YEAR}.md" | head -n -1
```

**Example output**:
```
Z1-Z2: 120-154 bpm
Z3-Z4 effort (160-172 bpm)
Z1: 120-146 bpm
```

**Interpretation**: Training plan uses primarily Z1-Z2 for easy runs, Z3-Z4 for intervals.

### 10. Compare Planned vs. Actual Execution

```bash
# Extract Monday's planned workout from training plan
WEEK=$(date +%V)
YEAR=$(date +%Y)
echo "=== PLANNED (Week ${WEEK}) ==="
sed -n '/^## Monday/,/^## /p' ".trainings/week-${WEEK}-${YEAR}.md" | head -n -1

echo ""
echo "=== ACTUAL (from feedback) ==="
# Look for Monday's date in feedback file (calculate Monday's date)
# Get the most recent Monday's feedback entry
grep -A 15 "## 2025-09-30" "feedback-${WEEK}-${YEAR}.md" | head -16
```

**Interpretation**: Compare the planned workout structure and zones with the actual execution recorded in feedback.

### 11. Check Race Information

```bash
# Read race goals and details
cat race.md

# Extract race date
grep -i "date:" race.md

# Extract race distance
grep -i "distance:" race.md

# Calculate weeks until race
RACE_DATE="2025-10-26"
TODAY=$(date +%Y-%m-%d)
DAYS_UNTIL=$(($(date -jf "%Y-%m-%d" "$RACE_DATE" +%s) - $(date -jf "%Y-%m-%d" "$TODAY" +%s)))
WEEKS_UNTIL=$((DAYS_UNTIL / 7))
echo "Weeks until race: $WEEKS_UNTIL"
```

**Example output**:
```
**Date**: October 26, 2025 (National Holiday)
**Distance**: 10.16 km
Weeks until race: 3
```

**Interpretation**: Race is in 3 weeks, 10.16km distance - should be in taper/peak phase.

## Complete Workflow Example

Here's a complete bash workflow for analyzing training data:

```bash
#!/bin/bash

# 1. Get current date information
echo "=== CURRENT DATE INFO ==="
WEEK=$(date +%V)
YEAR=$(date +%Y)
TODAY=$(date +%Y-%m-%d)
DAY=$(date +%A)

echo "Week: $WEEK"
echo "Year: $YEAR"
echo "Date: $TODAY"
echo "Day: $DAY"
echo ""

# 2. Check if training plan exists
echo "=== TRAINING PLAN CHECK ==="
PLAN_FILE=".trainings/week-${WEEK}-${YEAR}.md"
if [ -f "$PLAN_FILE" ]; then
  echo "✅ Training plan exists: $PLAN_FILE"
else
  echo "❌ Training plan NOT found: $PLAN_FILE"
  exit 1
fi
echo ""

# 3. Extract today's planned workout
echo "=== TODAY'S PLANNED WORKOUT ($DAY) ==="
sed -n "/^## $DAY/,/^## /p" "$PLAN_FILE" | sed '$d'
echo ""

# 4. Check if feedback file exists
echo "=== FEEDBACK FILE CHECK ==="
FEEDBACK_FILE="feedback-${WEEK}-${YEAR}.md"
if [ -f "$FEEDBACK_FILE" ]; then
  echo "✅ Feedback file exists: $FEEDBACK_FILE"
  echo ""
  echo "=== SESSIONS THIS WEEK ==="
  grep "^## 2025-" "$FEEDBACK_FILE"
else
  echo "⚠️  No feedback file yet for week $WEEK"
fi
echo ""

# 5. List recent training history
echo "=== RECENT TRAINING PLANS (last 6 weeks) ==="
ls -t .trainings/*.md | head -6
echo ""

# 6. Check race information
echo "=== RACE INFORMATION ==="
if [ -f "race.md" ]; then
  grep -E "Date:|Distance:|Elevation" race.md
else
  echo "⚠️  No race.md file found"
fi
```

## How to Interpret Training Plans

When you read a training plan file, look for these key sections:

### 1. Header Section
```markdown
# Week 41, 2025 Training Plan

## Race-Specific Training Integration
**Target Race**: Hauptlauf - Crosslauf (October 26, 2025)
**Race Context**: 3 weeks until race day - **Peak Race Preparation Phase**
```

**Interpretation**:
- This is Week 41 of 2025
- Race is October 26 (3 weeks away)
- Current training phase: Peak preparation (high volume before taper)

### 2. Previous Week Analysis
```markdown
## Week 40 Detailed Workout Analysis

**Monday Progression Easy Run Analysis**:
- **Execution**: 45:00 @ 151.4 bpm avg, 5:24/km pace
- **Assessment**: B+ session - proper duration but intensity at Z2 ceiling
```

**Interpretation**:
- Coach analyzed previous week's performance
- Monday run was graded B+ (very good with minor issues)
- Issue identified: HR too high (151.4 bpm at Z2 ceiling instead of 140-150 target)

### 3. Daily Workouts
```markdown
## Tuesday

- **Lunch**: **Peak Hill Intervals** - 55 minutes total
  - 12 min warm-up (Z1: 120-146 bpm)
  - **Main set**: 6 x 3 minutes **uphill** @ Z3-Z4 effort (160-172 bpm)
    - Recovery: 2 minutes active recovery
  - 15 min cool-down
```

**Interpretation**:
- Tuesday workout: Interval session
- Structure: 12min warm-up + 6x3min intervals + 15min cool-down = 55min total
- Intervals: 3 minutes uphill at Z3-Z4 (160-172 bpm)
- Recovery: 2 minutes between each interval
- Focus: Hill-specific preparation

### 4. Detailed Execution Guides
```markdown
**Tuesday Peak Hill Intervals (6x3min uphill @ Z3-Z4):**
- **Execution Strategy**:
  - Rep 1-2: 160-165 bpm (controlled start)
  - Rep 3-4: 165-170 bpm (race-pace simulation)
  - Rep 5-6: 165-172 bpm (finish strong)
```

**Interpretation**:
- First 2 intervals should be conservative (160-165 bpm)
- Middle 2 intervals at race pace (165-170 bpm)
- Final 2 intervals push to upper zone (165-172 bpm)
- Progressive intensity across the workout

### 5. Recovery Signals
```markdown
**Green Lights** (proceed as planned):
- Tuesday intervals completed with consistent power
- Thursday tempo sustained at 158-162 bpm
- Monday easy run at 145-150 bpm

**Red Lights** (reduce volume):
- Cannot complete more than 4x3min intervals
- Resting HR elevated >10 bpm
- Sleep disrupted
```

**Interpretation**:
- "Green lights" = signs that training is working well
- "Red lights" = warning signs to back off and recover
- Use these to assess if athlete should proceed with planned training or modify

## How to Interpret Feedback Files

When you read a feedback file, look for these patterns:

### 1. Individual Session Entries
```markdown
## 2025-09-30 - 🏃 Wolkersdorf im Weinviertel • Hill Interval Session 5 x 3 min
**Feel**: 8/10 (eine gute Session, konstant gute Energie)
**Energy**: High (konstant gut Energie gehabt)
**Legs**: Limited (Beine haben limitiert)
**Effort**: Hard (Z3-Z4 Hügel-Intervalle)
**Notes**: "Ich hab das Gefühl gehabt es war eine gute Session..."

**Detailed Metrics**:
- HR Range: 85-166 bpm (Intervall-Spitzen bis Z4)
- Intervall-Ausführung: 5x3min @ 147-154 bpm avg
- Power Progression: 342W → 329W → 311W → 330W → 325W
```

**Interpretation**:
- Subjective: Felt good (8/10), high energy, but legs were limiting factor
- Objective: HR was slightly low (147-154 vs target 160-172 bpm)
- Power was excellent (311-342W shows strong climbing strength)
- Correlation: "Legs limiting" explains why HR stayed lower - mechanical limitation, not cardiovascular

### 2. Weekly Patterns Section
```markdown
## Weekly Summary & Patterns

**Emerging Concerns**:
- **Zone Discipline**: Easy runs consistently at 151-153 bpm (too high)
- **Tempo Undershoot**: 152.8 bpm vs 154-165 target

**Positive Indicators**:
- Excellent interval structure execution
- Strong power outputs (311-342W)
- Consistent session completion
```

**Interpretation**:
- Problem pattern: Easy runs too hard, tempo runs too easy
- Strength pattern: Good at following workout structure, strong hill power
- Action needed: Fix zone discipline on easy days, more confident tempo starts

## Summary: Why Bash Tools Matter

The bash tool allows you to:

1. **Query file system**: Find which files exist, when they were modified
2. **Extract specific data**: Pull out just today's workout or last week's feedback
3. **Calculate dates**: Determine which week/year, how many weeks until race
4. **Compare data**: Put planned vs. actual side-by-side
5. **Search patterns**: Find all mentions of intervals, tempo runs, specific zones
6. **Automate analysis**: Chain commands together for comprehensive reports

**Without bash tools**, you would need to manually read entire files and search through them. **With bash tools**, you can precisely extract exactly what you need for efficient analysis.

## Remember

- Always use bash to determine current week/year first
- Use bash to check if files exist before trying to read them
- Use bash to extract specific sections rather than reading entire files
- Use bash to calculate date-based information (weeks until race, previous weeks)
- Interpret training plans as progressive, interconnected programs
- Interpret feedback as correlation between subjective feeling and objective data

The bash tool is your primary interface for navigating and querying the training data ecosystem.
