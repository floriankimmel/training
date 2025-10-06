# n8n Agent - Git Workflow Instructions

## Critical Rule: Always Use Git Version Control

**Every time you create or modify training files, you MUST commit and push the changes to git using the bash tool.**

This is non-negotiable. No exceptions.

## Standard Git Workflow

After creating or modifying any file (training plans, feedback files, etc.), execute these bash commands:

### 1. Stage the Files

```bash
# Stage specific files
git add .trainings/week-XX-YYYY.md

# Or stage multiple files
git add feedback-XX-YYYY.md .trainings/week-XX-YYYY.md

# Or stage all changes (use cautiously)
git add .
```

### 2. Create a Commit with Descriptive Message

```bash
git commit -m "type(scope): Brief description

Detailed explanation of what changed and why.

- Key point 1
- Key point 2

🤖 Generated with AI Coach/Feedback Agent
"
```

**Use proper conventional commit format:**
- `feat(training):` - New training plan
- `docs(feedback):` - Feedback analysis
- `fix(training):` - Correction to training plan
- `refactor(training):` - Restructure without changing content

### 3. Push to Remote Repository

```bash
git push
```

## Complete Workflow Examples

### Example 1: Creating Training Plan

```bash
# After writing .trainings/week-41-2025.md

# Stage the file
git add .trainings/week-41-2025.md

# Commit with descriptive message
git commit -m "feat(training): Add Week 41 peak race preparation plan

Peak training week with maximum hill-specific volume before taper:
- 6x3min uphill intervals (peak volume)
- 20min rolling tempo with zone accuracy focus
- 3 weeks until October 26 cross-country race

Key adaptations based on Week 40 analysis:
- Easy run zone targeting 145-150 bpm
- Tempo zone targeting 158-162 bpm
- Maintain excellent 311-342W hill power outputs

🤖 Generated with AI Training Coach
"

# Push to remote
git push
```

### Example 2: Adding Feedback Analysis

```bash
# After adding feedback to feedback-41-2025.md

# Stage the file
git add feedback-41-2025.md

# Commit with descriptive message
git commit -m "docs(feedback): Add Monday easy run analysis

Week 41 Monday: Easy/Endurance Run 45 min
- Planned: 45min Z1-Z2 (target 145-150 bpm)
- Executed: 45min @ 151 bpm (at Z2 ceiling)
- Grade: B+
- Key insight: Zone discipline needs improvement, ran at upper limit

🤖 Generated with AI Feedback Coach
"

# Push to remote
git push
```

### Example 3: Multiple Files (Training + Feedback)

```bash
# After creating both training plan and updating feedback

# Stage both files
git add .trainings/week-42-2025.md feedback-42-2025.md

# Commit with combined message
git commit -m "feat(training): Add Week 42 taper plan and Week 41 feedback

Training Plan:
- Week 42 taper begins (2 weeks to race)
- Reduced volume: 4x2.5min intervals, 15min tempo
- Maintain intensity, focus on freshness

Feedback:
- Week 41 complete with all sessions analyzed
- Outstanding hill power (320-350W sustained)
- Zone discipline improved on easy runs

🤖 Generated with AI Coach
"

# Push to remote
git push
```

## Single-Command Workflow (Recommended)

You can chain all commands together for efficiency:

```bash
git add [files] && git commit -m "message" && git push
```

**Example:**
```bash
git add .trainings/week-41-2025.md && \
git commit -m "feat(training): Add Week 41 peak preparation plan

Peak volume week with 6x3min hill intervals and 20min rolling tempo.
3 weeks until October 26 race.

🤖 Generated with AI Training Coach
" && \
git push
```

## Error Handling

### If Git Push Fails (Conflicts)

```bash
# Pull latest changes first
git pull --rebase

# Resolve any conflicts if needed
# Then push again
git push
```

### If Commit Message Needs Correction

```bash
# Amend the last commit message (before pushing)
git commit --amend -m "corrected message"
git push
```

### Check Git Status

```bash
# See what files are modified/staged
git status

# See what changes are in staging area
git diff --cached

# See recent commits
git log --oneline -5
```

## Commit Message Templates

### Training Plan
```bash
git commit -m "feat(training): Add Week [XX] [training phase]

[Brief description of weekly focus]
- [Key workout 1]
- [Key workout 2]
- [Weeks until race / training phase info]

Key adaptations:
- [Adaptation 1]
- [Adaptation 2]

🤖 Generated with AI Training Coach
"
```

### Feedback Analysis
```bash
git commit -m "docs(feedback): Add [Day] [session type] analysis

Week [XX] [Day]: [Session name]
- Planned: [Brief planned workout]
- Executed: [Brief execution]
- Grade: [A+/A/B+/B/C]
- Key insight: [Most important finding]

🤖 Generated with AI Feedback Coach
"
```

### Multiple Sessions
```bash
git commit -m "docs(feedback): Add Week [XX] training sessions

Analyzed [X] sessions:
- [Day 1]: [Session type] - Grade: [X]
- [Day 2]: [Session type] - Grade: [X]
- [Day 3]: [Session type] - Grade: [X]

Weekly patterns:
- [Pattern 1]
- [Pattern 2]

🤖 Generated with AI Feedback Coach
"
```

## Workflow Checklist

Every time you complete a task, verify:

- [ ] File written/modified successfully
- [ ] File staged with `git add`
- [ ] Commit created with descriptive message
- [ ] Changes pushed to remote with `git push`
- [ ] Confirm success (no errors in bash output)

## Why This Matters

1. **Version Control**: Every training plan and feedback entry is tracked
2. **History**: Can review progression and changes over time
3. **Backup**: All work is safely stored on remote repository
4. **Collaboration**: Changes are immediately available
5. **Accountability**: Clear record of when and why changes were made

## Final Rule

**If you didn't commit and push, the task is not complete.**

Always end your workflow with:
```bash
git status
```

This confirms everything is committed and pushed. The output should show:
```
On branch master
Your branch is up to date with 'origin/master'.

nothing to commit, working tree clean
```

If you see uncommitted changes, you missed a step. Go back and commit/push them.

## Remember

Git operations via bash tool are **mandatory**, not optional. Every file creation or modification must be followed by the complete git workflow:

```bash
git add [files] && git commit -m "message" && git push
```

No shortcuts. No exceptions. Always commit and push.
