# STRIVA V2 — Phase 11 / DB-5E: Free-Plan Disaster Recovery Runbook

**Document Version:** 1.0.0  
**Target Project Reference:** `ymrblyiwohvxptiqjfsi`  
**Supabase Tier:** Free  
**Scope:** Standalone logical backup, integrity verification, and recovery procedures for prelaunch staging

---

## 1. Operational Context & Security Boundaries

### 1.1. Free-Plan Realities vs Supabase Managed PITR
- **Platform Managed PITR (Pro/Enterprise only):** Provides continuous physical base snapshots and WAL streaming that enable rewinding an entire database cluster to an exact second via the Supabase web console.
- **Free Plan Logical Recovery (This Runbook):** Because self-service PITR is not available to Free plan projects, disaster recovery relies on **consistent, off-cluster logical SQL exports** taken immediately before any migration or major operational change.
- **Critical Caveat:** A logical backup is a point-in-time snapshot. It does **not** provide continuous point-in-time rewind. If disaster occurs hours after a backup, any data written between the backup and the failure will not be in the snapshot.

### 1.2. Secret Handling & Storage Security
- **Never expose credentials:** Do not hardcode database connection strings, passwords, or service-role keys in scripts, terminal logs, or version control.
- **Artifact Isolation:** Store all backup files in an isolated location outside the public web root (e.g., `<scratchDir>/backups/` or an encrypted, private storage volume).
- **Git Protection:** Ensure `.gitignore` explicitly ignores backup artifacts (`backups/`, `*.dump`, `*.sql.bak`).

---

## 2. Step 1: Pre-Migration Consistent Backup Procedure

Before applying any migration to the staging database, an operator or automated runner must execute the following logical dump sequence.

### 2.1. Environment Configuration
Ensure `DATABASE_URL` is set in the secure environment (e.g., `backend/.env`):
```bash
export PG_URL="$DATABASE_URL"
```

### 2.2. Schema DDL Backup
Export all public tables, functions, triggers, sequences, and RLS policies:
```bash
pg_dump \
  --schema-only \
  --schema=public \
  --no-owner \
  --quote-all-identifiers \
  "$PG_URL" > backups/striva_staging_baseline_schema.sql
```
*Note:* If using PostgreSQL 17/18 `pg_dump`, sanitize any client meta-commands:
```bash
# Sanitize \restrict meta-commands for generic psql compatibility
sed -i -E 's/^\\(un)?restrict .*$/-- &/' backups/striva_staging_baseline_schema.sql
```

### 2.3. Auth Identities Backup
Because public domain tables (`profiles`, `subscriptions`) enforce foreign keys against `auth.users(id)`, export the current identity records:
```bash
node -e "
const { Client } = require('pg');
const fs = require('fs');
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  const res = await c.query('SELECT id, email, raw_user_meta_data, created_at, updated_at FROM auth.users ORDER BY created_at;');
  let sql = 'CREATE SCHEMA IF NOT EXISTS auth;\nCREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ);\n';
  for (const u of res.rows) {
    sql += \`INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at) VALUES ('\${u.id}', '\${u.email}', '\${JSON.stringify(u.raw_user_meta_data || {})}'::jsonb, '\${u.created_at.toISOString()}', '\${u.updated_at.toISOString()}') ON CONFLICT (id) DO NOTHING;\n\`;
  }
  fs.writeFileSync('backups/striva_staging_baseline_auth.sql', sql);
  console.log('Saved', res.rows.length, 'auth identities.');
  await c.end();
});
"
```

### 2.4. Application Data Backup
Export data records for all public tables using `--column-inserts`, wrapping with replica mode to guarantee constraint-safe execution:
```bash
echo "SET session_replication_role = replica;" > backups/striva_staging_baseline_data.sql
pg_dump \
  --data-only \
  --schema=public \
  --no-owner \
  --column-inserts \
  --quote-all-identifiers \
  "$PG_URL" >> backups/striva_staging_baseline_data.sql
echo "SET session_replication_role = DEFAULT;" >> backups/striva_staging_baseline_data.sql
```

---

## 3. Step 2: Backup Integrity Verification

Before proceeding with migration deployment, verify that the backup artifacts are complete and consistent:

1. **Verify File Sizes:**
   - Schema SQL: > 250 KB
   - Auth SQL: > 1 KB
   - Data SQL: > 40 KB
2. **Verify Baseline Migration History:**
   Inspect the data dump to confirm it contains the latest applied migration:
   ```bash
   grep -E "INSERT INTO \"public\"\.\"_migrations\"" backups/striva_staging_baseline_data.sql | tail -n 3
   ```
   *Expected output must include:* `phase_10b_workout_core_schema.sql` (baseline 25).

---

## 4. Step 3: Emergency Restoration Procedure

If a migration fails or introduces an unrecoverable defect and must be rolled back to the pre-migration baseline:

### 4.1. Destination Preparation
Connect to the target PostgreSQL instance or restored database:
```sql
-- 1. Ensure required platform roles exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN CREATE ROLE supabase_admin; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN CREATE ROLE authenticator; END IF;
END $$;

-- 2. Ensure auth schema and helpers exist
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.role', true), '')::text;
$$ LANGUAGE sql STABLE;
```

### 4.2. Sequential File Restoration
Execute the backup files in strict chronological dependency order:
```bash
# Step 1: Restore auth identities first (satisfies foreign keys)
psql "$PG_URL" -f backups/striva_staging_baseline_auth.sql

# Step 2: Restore schema DDL (creates tables, functions, triggers, policies)
psql "$PG_URL" -f backups/striva_staging_baseline_schema.sql

# Step 3: Restore application data (populates tables in replica mode)
psql "$PG_URL" -f backups/striva_staging_baseline_data.sql
```

---

## 5. Step 4: Post-Restore Verification Checklist

Execute the following SQL verification suite to confirm that the restored database is healthy and identical to the pre-migration baseline:

```sql
-- 1. Check Migration Baseline Count (Must be exactly 25)
SELECT count(*) AS migration_count FROM public._migrations;

-- 2. Inspect Latest 5 Migrations
SELECT id, name, run_at FROM public._migrations ORDER BY id DESC LIMIT 5;

-- 3. Verify Table Count (Must be 99 base tables)
SELECT count(*) AS public_tables 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- 4. Check Critical Domain Table Row Counts
SELECT 
  (SELECT count(*) FROM public.organizations) AS organizations,
  (SELECT count(*) FROM public.profiles) AS profiles,
  (SELECT count(*) FROM public.subscriptions) AS subscriptions,
  (SELECT count(*) FROM public.exercises) AS exercises;

-- 5. Check Fallback Default State
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'organization_id';
```

**Passing Criteria:**
- `migration_count = 25`
- `public_tables = 99`
- `organizations = 1`, `profiles = 5`, `subscriptions = 4`, `exercises = 4`
- `profiles.organization_id` has pre-migration fallback default `'00000000-0000-0000-0000-000000000001'::uuid`.

---

## 6. Disaster Recovery Limitations & Maintenance Instructions

1. **Storage Bucket Objects:**  
   Currently, staging project `ymrblyiwohvxptiqjfsi` contains 0 storage buckets and 0 storage objects. If user avatars or workout media are introduced in the future, Supabase Storage API synchronization scripts must be added to this runbook.
2. **Replication Role Safeguard:**  
   Always verify that `SET session_replication_role = replica;` wraps data imports. Without this, cyclic foreign key references between `profiles`, `v2_fitness_profiles`, and `subscriptions` will cause `psql` to abort with foreign key constraint errors.
3. **Backup Retention:**  
   Retain at least 3 historical pre-migration backup sets in an off-host encrypted archive. Discard backups older than 30 days unless tagged as a release baseline.
