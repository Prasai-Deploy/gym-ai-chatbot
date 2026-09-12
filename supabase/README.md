# Database setup

STRIVA uses the numbered SQL migrations in `backend/supabase/migrations` as its only database source of truth.

## Apply migrations

Create a Supabase project, open its SQL editor, and run the files in numeric order:

1. `001_identity_domain.sql`
2. `002_exercise_library.sql`
3. `003_workout_engine.sql`
4. `004_progress_analytics.sql`
5. `005_intelligence_domain.sql`
6. `006_ai_runtime.sql`
7. `008_multi_tenant_saas_foundation.sql`
8. `009_ai_memory_and_usage.sql`
9. `010_analytics_and_attendance.sql`
10. `011_membership_management.sql`

Do not mix these with older root-level or legacy schema files. Those files are not part of the active deployment path.

## Environment boundary

The browser receives only the public Supabase values from the root environment:

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-anon-key>
```

The Node backend requires these private runtime values:

```text
NODE_ENV=production
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<public-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<private-service-role-key>
```

Never put the service-role key in a variable beginning with `VITE_`, source code, or a frontend build setting. It bypasses Row Level Security.

## Tenant security

Tenant-scoped API routes authenticate the Supabase JWT and then resolve organization membership from `organization_staff` or `profiles`. A caller-supplied organization header is treated only as a requested organization and is accepted after membership verification.

Verify isolation with at least two organizations before every production release.
