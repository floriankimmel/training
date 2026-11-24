# Apple Reminders holds the active schedule, the Wochenplan holds the reasoning

The athlete trains off his phone, not off a markdown file, so the reminder is what actually gets acted on. Apple Reminders (list 🏅 Trainingsplan, tag `training`) is therefore the source of truth for *when* an Einheit happens; `trainings/week-WW-YYYY.md` stays the source of truth for *what* it is and *why*. Because two sources can drift, `training/lint.py` shells out to `remctl` and checks every non-rest Einheit of the latest Wochenplan against a reminder of the same Einheit-Art on the same day — duration, Kraft Tag page refs and the `@workout` spec line included.

## Considered Options

- **Markdown only, reminders written by hand**: rejected, because a rescheduled day silently stops matching what the phone shows, and the phone is what the athlete follows.
- **Reminders only**: rejected, because a reminder has nowhere to hold the philosophy of a week, the Schwelle targets or the feedback that follows.
- **Calendar (.ics) instead of Reminders**: rejected, because an Einheit is a to-do that can be completed or moved, not a fixed appointment; completion state is what feedback reads back.

## Consequences

Lint carries a dependency on a macOS-only CLI, and skips the whole reminders check with a WARN when `remctl` is absent — so a green lint on any other machine says nothing about schedule drift. Every plan edit must write both sides in the same change; this is why the `coach` and `reschedule` skills always touch Reminders, never only `trainings/`.
