# Personal Training Coach

A personalized training system that integrates with Strava to analyze performance and generate structured weekly training plans.

## Overview

This repository contains weekly training plans designed around:

- **Heart rate zones**: Structured training using Z1-Z5 intensity zones
- **Strava integration**: Analysis of previous activities to inform planning
- **Progressive development**: Weekly progression building aerobic base and lactate threshold

## Features

- 🏃‍♂️ **Weekly Training Plans**: Structured plans with specific heart rate targets
- 📊 **Strava Analysis**: Integration with Strava for performance tracking
- ⏰ **Time-Efficient**: Designed for busy schedules with lunch break runs
- 💪 **Strength Training**: Complementary functional strength sessions
- 📈 **Progressive Loading**: Systematic progression from aerobic base to intervals

## Training Philosophy

### Heart Rate Zones

- **Z1 (120-146 bpm)**: Recovery and warm-up
- **Z2 (146-154 bpm)**: Aerobic base building
- **Z3 (154-165 bpm)**: Tempo/threshold work
- **Z4 (165-174 bpm)**: Lactate threshold intervals
- **Z5 (174+ bpm)**: VO2max intervals

### Weekly Structure

- **3 lunch runs**: 40-50 minutes each
- **3 strength sessions**: 20-25 minutes functional training
- **1-2 quality sessions**: Tempo runs or intervals
- **Weekend flexibility**: Family time priority

## Repository Structure

```
.trainings/
├── week-35-2025.md    # Foundation week with tempo introduction
├── week-36-2025.md    # Structured intervals + dual quality sessions
└── ...                # Progressive weekly plans
```

## Getting Started

1. **Review Current Plans**: Check the latest week in `.trainings/`
2. **Strava Integration**: Ensure Strava permissions are configured
3. **Heart Rate Monitor**: Required for zone-based training
4. **Schedule Assessment**: Plans assume 60-minute lunch breaks available

## Strava Integration

The system analyzes recent Strava activities to:

- Assess current fitness level
- Validate heart rate zone accuracy
- Track progression metrics
- Inform weekly plan adjustments

Required Strava permissions:

- Activity read access
- Profile information
- Heart rate data

## Backup Plans

Each weekly plan includes alternatives for:

- **Weather**: Indoor stair climbing options
- **Time constraints**: Minimum effective dose sessions
- **Travel**: Hotel room workouts
- **Fatigue**: Modified intensity options

## Recovery Signals

### Green Lights (Continue as Planned)

- Heart rate recovers to target zones within 60-90 seconds
- Can hit target paces without excessive strain
- Sleep quality remains good
- Energy levels stable

### Yellow Lights (Modify but Continue)

- Intervals feel harder than prescribed effort
- Tempo work feels labored
- Building fatigue but manageable

### Red Lights (Rest/Easy Week)

- Cannot hit zone targets with full effort
- Elevated resting heart rate
- Sleep significantly disrupted
- Multiple missed sessions due to fatigue

## Technical Notes

- **Interval Execution**: "Comfortably hard" effort sustainable for full duration
- **Tempo Pacing**: Controlled effort allowing short phrase conversation
- **Recovery Runs**: Truly conversational pace in Z1-Z2
- **Strength Focus**: Running-specific functional movements

## Contributing

This is a personal training repository. The structure and methodology can serve as a template for similar personalized training systems.

## License

Personal use repository - training plans are specific to individual fitness level and schedule constraints.

