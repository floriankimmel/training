# 🏃‍♂️ Personal Training Coach

A personalized training system that integrates with Runalyze to analyze performance, track recovery metrics, and generate structured weekly training plans.

## 🛠️ Available Commands

This repository provides four Claude Code commands:

- **`/coach`** 📋 - Creates personalized weekly training plans based on your Runalyze data, fitness level, schedule, and recovery metrics
- **`/feedback`** 📊 - Provides detailed analysis and feedback on your completed training sessions using Runalyze lap data
- **`/race-prediction`** 🏁 - Generates comprehensive race predictions with time estimates, pacing strategy, and fueling plans
- **`/recalculate-baselines`** 🔄 - Recalculates recovery baseline metrics (HRV, RHR, sleep) from your Runalyze data

## 📥 Installation Guide

To use this training system, you need to set up Claude Code with the Runalyze MCP server:

### ✅ Prerequisites

1. **Claude Code** 💻 - Follow the [Claude Code setup guide](https://docs.anthropic.com/en/docs/claude-code/getting-started)
2. **Runalyze MCP Server** 🔌 - Set up the [Runalyze MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/runalyze) to connect your Runalyze account
3. **Runalyze Account** 📱 - Create a free account at [Runalyze](https://runalyze.com/) and sync your activities

### 🚀 Quick Setup

1. Install Claude Code following the official documentation
2. Configure the Runalyze MCP server with your Runalyze API credentials
3. Clone this repository to your local machine
4. Run `/recalculate-baselines` to establish your recovery baseline metrics
5. Run `/coach` to generate your first training plan
6. Use `/feedback` after completing workouts for detailed analysis
7. Use `/race-prediction` when preparing for a race

## 📖 Overview

This repository contains weekly training plans designed around:

- ❤️ **Heart rate zones**: Structured training using Z1-Z5 intensity zones
- 📊 **Runalyze integration**: Comprehensive analysis of activities, lap data, and performance metrics
- 💤 **Recovery tracking**: HRV, resting heart rate, and sleep quality monitoring
- 📈 **Progressive development**: Weekly progression building aerobic base and lactate threshold
- 🎯 **Race preparation**: Race-specific training adaptations and race prediction tools

## ✨ Features

- 🏃‍♂️ **Weekly Training Plans**: Structured plans with specific heart rate targets and race-specific adaptations
- 📊 **Runalyze Analysis**: Deep integration with Runalyze for comprehensive performance tracking
- 💤 **Recovery Monitoring**: HRV, RHR, and sleep tracking with personalized baseline ranges
- ⏰ **Time-Efficient**: Designed for busy schedules with lunch break runs (40-55 minutes)
- 💪 **Strength Training**: Complementary functional strength sessions (20-30 minutes)
- 📈 **Progressive Loading**: Systematic progression from aerobic base to race-specific intervals
- 🎯 **Race Predictions**: Data-driven race time predictions with pacing and fueling strategies
- 🔄 **Weekly Feedback**: Detailed post-workout analysis comparing planned vs. actual execution
- 📁 **Structured Organization**: Separate folders for training plans, feedback, races, and predictions

## 🎓 Training Philosophy

### ❤️ Heart Rate Zones

- **Z1 (120-146 bpm)** 🟢 - Recovery and warm-up
- **Z2 (146-154 bpm)** 🔵 - Aerobic base building
- **Z3 (154-165 bpm)** 🟡 - Tempo/threshold work
- **Z4 (165-174 bpm)** 🟠 - Lactate threshold intervals
- **Z5 (174+ bpm)** 🔴 - VO2max intervals

### 📅 Weekly Structure

- 🏃 **3 lunch runs**: 40-50 minutes each
- 💪 **3 strength sessions**: 20-25 minutes functional training
- ⚡ **1-2 quality sessions**: Tempo runs or intervals
- 👨‍👩‍👧‍👦 **Weekend flexibility**: Family time priority

## 📂 Repository Structure

```
trainings/              # Weekly training plans
├── week-35-2025.md    # Foundation week with tempo introduction
├── week-36-2025.md    # Structured intervals + dual quality sessions
└── week-43-2025.md    # Most recent training plan

feedback/               # Weekly feedback files tracking subjective experiences
├── feedback-38-2025.md
├── feedback-39-2025.md
└── feedback-43-2025.md

races/                  # Current race information
└── current-race-*.md  # Active race details (distance, elevation, date)

race-predictions/       # Race prediction files
└── race-prediction-*-week-*-*.md

metrics/                # Recovery baseline metrics
└── baseline-metrics.md  # HRV, RHR, and sleep baseline ranges
```

## 🚦 Getting Started

1. 📱 **Set Up Runalyze**: Create account and sync your running activities
2. 🔌 **Configure MCP Server**: Connect Claude Code to Runalyze API
3. 📊 **Establish Baselines**: Run `/recalculate-baselines` to set recovery metrics
4. 📋 **Review Current Plans**: Check the latest week in `trainings/`
5. ⌚ **Heart Rate Monitor**: Required for zone-based training
6. ⏰ **Schedule Assessment**: Plans assume 60-minute lunch breaks available

## 🔄 Command Workflow

### 📆 Weekly Training Cycle

1. **Monday Morning** 🌅 - Run `/coach` to generate the week's training plan
   - Analyzes last 6 weeks of training plans
   - Reviews recent feedback and subjective experiences
   - Assesses recovery metrics (HRV, RHR, sleep) from Runalyze
   - Creates `trainings/week-XX-YYYY.md` with structured daily workouts

2. **After Each Workout** 🏃‍♂️ - Run `/feedback` with optional personal notes
   - Analyzes detailed lap data from Runalyze
   - Compares actual vs. planned workout execution
   - Stores subjective feedback in `feedback/feedback-XX-YYYY.md`
   - Provides constructive analysis and recommendations

3. **Race Preparation** 🏁 - Run `/race-prediction` 1-2 weeks before race
   - Creates race details in `races/current-race-*.md`
   - Analyzes recent training performance
   - Generates time predictions and pacing strategy
   - Saves prediction to `race-predictions/race-prediction-*-week-*-*.md`

4. **Monthly Maintenance** 🔧 - Run `/recalculate-baselines`
   - Fetches latest HRV, RHR, and sleep data
   - Recalculates personalized baseline ranges
   - Updates `metrics/baseline-metrics.md`

### 💬 Example Feedback Usage

```bash
# With personal feedback
/feedback "Felt sluggish today, legs heavy, effort harder than expected"

# Without feedback (system infers from objective data)
/feedback
```

## 🔗 Runalyze Integration

The system analyzes Runalyze data to provide comprehensive insights:

### 📊 Activity Analysis
- 🔢 Detailed lap-by-lap performance breakdown
- ❤️ Heart rate zone adherence for each workout segment
- ⚡ Pace consistency and power output tracking
- ✅ Training structure execution quality

### 💤 Recovery Monitoring
- **HRV (Heart Rate Variability)** 📈 - SDNN measurements to assess recovery status
- **Resting Heart Rate** ❤️ - Daily RHR tracking with personalized baselines
- **Sleep Quality** 😴 - Duration, deep sleep, and REM sleep monitoring
- **Next-day indicators** ⏭️ - Recovery metrics show adaptation to previous day's training

### 📈 Training Progression
- 📋 Compare planned vs. actual workout execution
- 🎯 Track fitness improvements over time
- ⚠️ Identify concerning patterns or trends
- 🔧 Adjust training load based on recovery data

## 🔄 Backup Plans

Each weekly plan includes alternatives for:

- 🌧️ **Weather**: Indoor stair climbing options
- ⏱️ **Time constraints**: Minimum effective dose sessions
- ✈️ **Travel**: Hotel room workouts
- 😴 **Fatigue**: Modified intensity options

## 🚦 Recovery Signals

The system uses both objective metrics and subjective feedback to assess recovery:

### 🟢 Green Lights (Continue as Planned)

**Objective Metrics:**
- ✅ HRV in "Good" baseline range
- ✅ RHR in "Good" baseline range
- ✅ Sleep duration 7+ hours with adequate deep/REM sleep
- ✅ Heart rate recovers to target zones within 60-90 seconds

**Subjective Feedback:**
- 💪 Can hit target paces without excessive strain
- ⚡ Energy levels stable
- 🦵 Legs feel fresh or good

### 🟡 Yellow Lights (Modify but Continue)

**Objective Metrics:**
- ⚠️ HRV in "Moderate" range for 1-2 days
- ⚠️ RHR slightly elevated but stable
- ⚠️ Sleep 6-7 hours or disrupted sleep architecture

**Subjective Feedback:**
- 😓 Intervals feel harder than prescribed effort
- 🥵 Tempo work feels labored
- 😮‍💨 Building fatigue but manageable

### 🔴 Red Lights (Rest/Easy Week)

**Objective Metrics:**
- ❌ HRV in "Low" range for 2+ consecutive days
- ❌ RHR elevated above normal baseline for multiple days
- ❌ Sleep consistently <6 hours or significantly disrupted

**Subjective Feedback:**
- 🚫 Cannot hit zone targets with full effort
- 🥱 Persistent heavy legs or low energy
- ⛔ Multiple missed sessions due to fatigue

## 🔧 Technical Notes

### 🏃‍♂️ Workout Execution
- ⚡ **Interval Execution**: "Comfortably hard" effort sustainable for full duration
- 🎯 **Tempo Pacing**: Controlled effort allowing short phrase conversation
- 🟢 **Recovery Runs**: Truly conversational pace in Z1-Z2
- 💪 **Strength Focus**: Running-specific functional movements

### 📊 Data Analysis
- ⏱️ **Moving Time vs Elapsed Time**: All pace calculations use moving time for accuracy
- 🔢 **Lap Analysis**: Detailed breakdown of workout structure vs. planned execution
- 📉 **Heart Rate Drift**: Track HR changes throughout efforts to assess fatigue
- ⚡ **Power Output**: Analyze running power on climbs and varied terrain (when available)

### 💤 Recovery Metrics Interpretation
- ⏭️ **Next-day principle**: Wednesday metrics reflect Tuesday's workout recovery
- ⚠️ **Single anomalies**: One poor metric day may be environmental/stress-related
- 📈 **Multi-day trends**: 2+ consecutive days of poor metrics warrant training adjustment
- 🔄 **Baseline updates**: Recalculate baselines every 2-4 weeks as fitness changes

## 🆕 Recent Improvements

### 🚀 October 2025 - Major Runalyze Migration
- 🔄 **Migrated from Strava to Runalyze API**: Complete integration with Runalyze for richer data access
- 💤 **Recovery metrics tracking**: Added HRV, RHR, and sleep quality monitoring
- 📊 **Baseline metrics system**: Personalized recovery baselines with automatic recalculation
- 🤖 **Enhanced feedback analysis**: Automatic inference of subjective feedback from objective data
- 🏁 **Race prediction tool**: New `/race-prediction` command for comprehensive race planning
- 📂 **Folder reorganization**: Moved from hidden `.trainings/` to visible folder structure

### ✨ Key Features Added
- ⏭️ **Next-day recovery principle**: Metrics indicate adaptation to previous day's training
- 🔢 **Lap-by-lap analysis**: Detailed workout structure comparison vs. planned execution
- ⏱️ **Moving time accuracy**: All pace calculations use moving time, not elapsed time
- 📝 **Weekly feedback tracking**: Persistent storage of subjective training experiences
- 🎯 **Race-specific training**: Training plans adapt based on current race goals

## 💻 System Requirements

- 📱 **Runalyze Account**: Free account with activity sync enabled
- ⌚ **Heart Rate Monitor**: Required for zone-based training
- 😴 **Sleep Tracking**: Optional but recommended for recovery monitoring (via Garmin, Fitbit, etc.)
- 💻 **Claude Code**: Latest version with MCP server support

## 🤝 Contributing

This is a personal training repository. The structure and methodology can serve as a template for similar personalized training systems.

## 📄 License

Personal use repository - training plans are specific to individual fitness level and schedule constraints.

---

**Made with ❤️ for sustainable, data-driven training**
