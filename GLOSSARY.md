# Training

Shared vocabulary for plans, feedback, benchmarks and the webview. Zone boundaries live only in `zones.md`; terms here refer to zones by name.

## Intensity

**Schwelle**:
Laktatschwelle, the intensity of Z3. Never Z4.
_Avoid_: Tempo (as a synonym), Schwelle for HF 160–170

**Schwellen-Pace**:
Pace in Zone for Z3.
_Avoid_: Threshold pace @ HF 160–170, Tempo pace

**Tempo**:
Sustained hard work in Z3 or Z4. Never Z2.
_Avoid_: Tempo Z2, Tempoblock for Z2 work

**Z2-Block**:
A sustained repetition held in Z2 with Z1 recovery between repetitions.
_Avoid_: Tempo, Tempoblock

**Flacher Lauf**:
A run with less than 15 hm per km; only flat runs count for pace-at-zone metrics.
_Avoid_: easy terrain, road run

**Pace in Zone**:
Median running pace on flat runs while heart rate is inside one named zone, counting only runs with at least 5 minutes in that zone.
_Avoid_: pace @ HF x–y (raw bpm bands)

**Aerobe Effizienz**:
Pace in Zone for Z1. The one outcome metric for aerobic fitness in plans, STATUS and reports (`python -m training report`, section 3), compared per 28-day block. Z1 because easy runs reach it every week; Z2 has only 1–2 qualifying runs per block. Running easy runs near the Z1 cap flatters it, so judge it together with the share of time above the cap.
_Avoid_: efficiency @140–150, Pace @ HF 140–150, Aerobe Effizienz for Z2

**Efficiency Factor**:
Speed per heartbeat on a single flat run, averaged over the runs of a month. A second, coarser fitness signal than Aerobe Effizienz: it judges a run by its average heart rate instead of by the time actually spent in a zone.
_Avoid_: Effizienz, Aerobe Effizienz (they are a different metric), EF-Pace

## Load

**TRIMP**:
Heart-rate-weighted training load of an Einheit, a day or a week: every second counts for more the closer heart rate sits to hrMax.
_Avoid_: Belastungspunkte, load (unqualified), Trainingsumfang

**ACWR**:
The last 7 days of TRIMP divided by the average TRIMP week of the last 28. Sweet spot 0.8–1.3; above 1.5 is a load spike.
_Avoid_: Belastungsquotient, acute load (for the ratio itself)

## Readiness

**Readiness**:
The daily go/no-go verdict GREEN, AMBER or RED, from how many Recovery-Flags are raised (0, 1, 2+). A day has no verdict at all when none of the three signals has enough history behind it.
_Avoid_: Recovery-Ampel, tier, readiness score

**Recovery-Flag**:
One recovery signal clearly worse than the athlete's recent normal: HRV, resting heart rate, or sleep debt.
_Avoid_: bad tier, red metric

**Körpergewicht-Trend**:
The 7-day mean of the morning weigh-ins compared with the 7 days before (kg/week) and the 28 days before. Single weigh-ins are noise (±1 kg water/glycogen); only the averages count. A move of 1.5 kg/week or more either way raises a weight warning (`training/weight.py`, `WEEKLY_LIMIT_KG`). Not a Recovery-Flag: it does not change the Readiness verdict; the coach judges it against the goal.
_Avoid_: Gewicht (for the trend), weight score

## Schedule

**Einheit**:
One planned or completed training activity. A plan day can hold several Einheiten.
_Avoid_: Session (in German docs), Training (for a single activity)

**Einheit-Art**:
The kind of an Einheit: run, bike, strength, footwork or rest. Every Einheit has exactly one.
_Avoid_: type, sport

**Wochenplan**:
The plan for one ISO week: a dated day per weekday, each holding its Einheiten.
_Avoid_: Weekly plan file, Trainingsplan (for a single week), week

**Legacy-Plan**:
A Wochenplan written before the canonical day/Einheit layout; readable but not linted.
_Avoid_: old format, v1 plan

**Kraft Tag**:
One of the numbered strength Einheiten of the current Strength-Pointer week.
_Avoid_: Krafttag, strength day, Tag N (on its own)

**Strength-Pointer**:
The record of where the athlete currently stands in the strength program: which program, which program week, and the calendar week it is being trained in.
_Avoid_: Kraft-Pointer, Kraft marker, strength marker

**Reisetag**:
A calendar day on which strength training is not possible. The flying-out day still allows Kraft, and so does the return day when the calendar entry says so.
_Avoid_: travel day (in German docs), away day
