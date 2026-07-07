# STRIVA v2: Workout Execution Engine

## Overview
The Workout Engine is designed around strict separation between **Planning** and **Execution**, backed by an event-sourced state machine. This design is critical for our AI coaching engine, which needs 100% accurate historical replayability.

## 1. Planning Layer (Immutable History)
Programs are hierarchically structured:
`Program` -> `Version` -> `Block` -> `Week` -> `Day` -> `Day Exercise`

When a trainer or AI creates a program, it is drafted in `program_versions`. 
When `is_published` becomes true, the version is locked. If changes are needed, a new version must be created. This guarantees that if Member A is on Version 1, and the author changes the program (Version 2), Member A's history and current trajectory are not corrupted.

## 2. Execution Layer (State Machine)
Members execute workouts via `workout_sessions`. 
A session transitions through states:
- `planned` -> `started` -> `paused` -> `resumed` -> `completed` / `abandoned`

### Event Sourcing (`workout_events`)
Every transition writes an append-only JSON blob to `workout_events` (`Workout.STARTED`, `Workout.COMPLETED`). This log allows the AI to reconstruct exactly how long a user rested, when they paused, and if they abandoned the workout.

## REST Endpoints
**Members:**
- `POST /api/v1/workouts/sessions/:id/transition` - Trigger state change.
- `PATCH /api/v1/workouts/sets/:setId` - Log weight/reps/rpe for a set.

**Admins:**
- `POST /api/v1/admin/workouts/programs` - Create Program.
- `POST /api/v1/admin/workouts/programs/:programId/versions/:versionId/publish` - Publish Version.
