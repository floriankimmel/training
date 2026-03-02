# Todoist Integration für Trainingspläne

## Übersicht

Nach dem Erstellen eines neuen Wochenplans werden die einzelnen Trainingseinheiten automatisch als Todos in Todoist angelegt.

## Konfiguration

- **API Key**: Siehe Fritz's TOOLS.md (nicht im Repo!)
- **API Version**: v1
- **Projekt**: 🗓️ Trainingsplan
- **Project ID**: `6g6FfGCGXJpv2qG4`

## Todo-Format

- **Titel**: `👟 Laufen: <Name der Einheit>`
- **Due Date**: Datum der Einheit (YYYY-MM-DD)
- **Description**: Enthält Dauer, HR-Zone, wichtigste Details

### Beispiel

```
Titel: 👟 Laufen: Hill Intervals
Due Date: 2026-03-02
Description:
5x 3min @ Z4 (165-174 bpm)
55min total
⌚ Brustgurt!
```

## Regeln

1. **Kein Todo für REST Days** — nur echte Lauf-Einheiten
2. **Wochenende flexibel** — bei "Saturday OR Sunday" → immer **Sonntag** als Due Date
3. **Nur hinzufügen** — alte Todos werden NICHT gelöscht
4. **Brustgurt-Reminder** — immer `⌚ Brustgurt!` in Description

## API-Aufruf

```bash
curl -s -X POST "https://api.todoist.com/api/v1/tasks" \
  -H "Authorization: Bearer $TODOIST_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "👟 Laufen: <Name>",
    "project_id": "6g6FfGCGXJpv2qG4",
    "due_date": "YYYY-MM-DD",
    "description": "<Details>"
  }'
```

> **Note**: API Key ist in Fritz's TOOLS.md gespeichert, nicht im Repo.

## Workflow

Nach `/coach` oder Weekly Training Check-in:

1. ✅ Trainingsplan erstellen und committen
2. ✅ Für jede Lauf-Einheit ein Todo in Todoist anlegen
3. ✅ Florian informieren dass Plan + Todos ready sind

---

*Erstellt: 2026-03-02*
