# STRIVA v2 Repository Standards

## Overview
Repositories are the **ONLY** layer in the STRIVA backend permitted to communicate with the Supabase Database. Controllers, Services, and AI Tools must inject and utilize these repositories to read/write data.

## Rules
1. **Never return raw database rows:** Repositories must return Domain Entities or DTOs.
2. **Never throw Database errors:** Always return `Result<T, AppError>`. Services should check `result.isFailure()` instead of using `try/catch`.
3. **No Business Logic:** Repositories are purely for data access. If you are computing BMI or deciding if a user *can* view a workout, that belongs in the Application Service.
4. **Transactions:** Because Supabase over HTTP doesn't support interactive transactions, multi-table atomic writes must be written as Postgres RPC Functions and executed via the `TransactionManager`.

## Naming Conventions
- Interfaces must be prefixed with `I` (e.g., `IWorkoutRepository`).
- Files must map to domains (e.g., `src/modules/workout/repositories/...`).
- Methods should follow standard REST-like naming (`findById`, `findMany`, `create`, `update`, `delete`, `softDelete`, `restore`).

## Mapping Layer
Use the `IMapper` interface to convert between:
- **TModel:** The raw Supabase JSON row.
- **TEntity:** The rich TypeScript Domain Object.
- **TDTO:** The sanitized object sent over HTTP.
