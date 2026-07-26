# STRIVA v2 Backend

This is the core Express API and AI Orchestration backend for STRIVA v2.
It follows Clean Architecture principles and is designed as the middle layer between the frontends and the Supabase PostgreSQL database.

## Prerequisites
- Node.js 22 LTS
- pnpm (or npm)

## Installation
```bash
cd backend
pnpm install
```

## Environment
Copy the example environment file and populate the secrets:
```bash
cp .env.example .env
```

## Running the Server
```bash
# Development (with watch mode)
pnpm run dev

# Production Build
pnpm run build
pnpm start
```

## Architecture Notes
- **Source of Truth:** Business modules write to Supabase. AI reads. AI never writes directly.
- **Validation:** All inputs must be strictly validated with Zod.
- **Errors:** Throw instances of `AppError` subclasses. The Global Error Handler will catch and format them.
