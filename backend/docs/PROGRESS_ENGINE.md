# STRIVA v2: Progress Analytics Integration Engine

## Overview
The Progress domain calculates metrics, streaks, achievements, and snapshots. It operates purely as a **downstream consumer**. It NEVER reads from or joins directly against the `workout_sessions` table in its operational queries.

## Event-Driven Architecture
We use an internal `EventBus` (Node.js EventEmitter) to decouple domains:
1. `WorkoutExecutionService` completes a workout and emits `Workout.COMPLETED`.
2. `WorkoutEventSubscriber` (inside the Progress Domain) intercepts the event.
3. The subscriber delegates to `ProgressAnalyticsService` to increment the `workout_count`.
4. The subscriber delegates to `AchievementService` to check if `workout_count` reached a milestone (e.g., 100 workouts).
5. If achieved, `AchievementService` persists the unlock and emits `Achievement.UNLOCKED`.

This guarantees that the Workout Engine never slows down or fails because of complex analytics calculations.

## Tables
- `progress_statistics`: Fast lookup for dashboard metrics (1:1 with auth).
- `progress_snapshots`: Time-series JSONB payloads for rendering trend charts without recalculating thousands of rows.
- `achievements`: System-owned reference data.
- `user_achievements`: Unlock ledger.

## Future AI Integration
The AI agent will subscribe to `Achievement.UNLOCKED` and `Milestone.REACHED` events to proactively congratulate users and adjust upcoming training blocks based on recent success metrics!
