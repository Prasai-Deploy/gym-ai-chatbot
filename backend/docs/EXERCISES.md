# STRIVA v2: Exercise Library Domain

## Overview
The Exercise Library is the central nervous system for all workout program generation. Exercises are **System Owned Reference Data**. Users do not own exercises. 

## Highly Normalized Database Structure
Because the AI relies heavily on metadata to generate accurate programs, the library is strictly normalized:
- **`exercises`**: Core table.
- **`muscle_groups`**: Chest, Back, etc.
- **`equipment`**: Dumbbells, Barbell, Bodyweight, etc.
- **`movement_patterns`**: Push, Pull, Hinge, Squat, Carry.
- **`exercise_categories`**: Strength, Cardio, Mobility.

## RLS Security
- **Authenticated Users (Members/Trainers):** Have `READ ONLY` access to all exercise tables.
- **Service Role / Admin:** Has full CRUD access.

## Seed Script
Since the data is reference data, we use a seed script to deploy exercises across environments:
```bash
npx ts-node backend/scripts/seed_exercises.ts
```

## AI Ready
The database includes `exercise_alternatives` and `exercise_variations` mapping tables. This allows the AI to swap a `Barbell Bench Press` for a `Dumbbell Bench Press` if the user is traveling and lacks a barbell, without hallucinating the swap logic.
