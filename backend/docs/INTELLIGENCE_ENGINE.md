# STRIVA v2: Intelligence Services & Context Engine

## Overview
The Intelligence Layer is the final architectural boundary before the LLM. It ensures that the AI component is strictly a stateless consumer of context, rather than a monolithic agent querying databases directly.

## AI Context Architecture
The LLM requires a vast amount of context to generate personalized workouts and advice. If we allow the LLM to query the database directly, we risk hallucinations, PII leaks, and extreme coupling.

Instead, we utilize the **ContextBuilderService**. This service queries all internal domains (Identity, Workout, Progress, Nutrition, Recovery, Memory) and flattens the data into a single, highly structured JSON object: the `UnifiedAIContextDTO`. 

When the LLM integration is built in a future sprint, its only input will be this DTO.

## Services
- **NutritionService:** Manages caloric intake and hydration trends.
- **RecoveryService:** Calculates daily readiness based on sleep, stress, and soreness.
- **MemoryService:** A persistent Key-Value store where the backend or AI can save long-term categorical information (e.g., `Category: PREFERENCE`, `Key: EQUIPMENT`, `Value: ["Dumbbells", "Barbell"]`).
- **RecommendationService:** A rule-based engine that evaluates the `UnifiedAIContextDTO` and outputs structured advice without an LLM.

## Database Migrations
We have established the following new tables:
- `ai_memory`
- `recovery_logs`
- `nutrition_logs`
- `user_goals`
- `recommendations`

By enforcing this structure, STRIVA guarantees that the AI operates within safe, deterministic bounds.
