const EXPECTED_STAGING_HOST = 'db.ymrblyiwohvxptiqjfsi.supabase.co';
const EXPECTED_STAGING_PROJECT_REF = 'ymrblyiwohvxptiqjfsi';

function validateStagingDatabaseUrl(dbUrl) {
  if (!dbUrl || typeof dbUrl !== 'string' || dbUrl.trim() === '') {
    throw new Error('FAIL-CLOSED TARGET GUARD: DATABASE_URL is missing or empty. Staging runner aborted before connecting.');
  }

  let parsed;
  try {
    parsed = new URL(dbUrl);
  } catch {
    throw new Error('FAIL-CLOSED TARGET GUARD: DATABASE_URL is malformed or invalid. Staging runner aborted before connecting.');
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error(
      `FAIL-CLOSED TARGET GUARD: Unauthorized protocol "${parsed.protocol}". Expected "postgresql:" or "postgres:". Staging runner aborted before connecting.`
    );
  }

  const hostname = parsed.hostname;

  if (hostname !== EXPECTED_STAGING_HOST) {
    throw new Error(
      `FAIL-CLOSED TARGET GUARD: Unauthorized database host "${hostname}". Expected strictly "${EXPECTED_STAGING_HOST}". Staging runner aborted before connecting.`
    );
  }

  const parts = hostname.split('.');
  if (
    parts.length !== 4 ||
    parts[0] !== 'db' ||
    parts[1] !== EXPECTED_STAGING_PROJECT_REF ||
    parts[2] !== 'supabase' ||
    parts[3] !== 'co'
  ) {
    throw new Error(
      `FAIL-CLOSED TARGET GUARD: Hostname structure invalid. Project reference must equal "${EXPECTED_STAGING_PROJECT_REF}". Staging runner aborted before connecting.`
    );
  }

  return {
    host: hostname,
    projectRef: EXPECTED_STAGING_PROJECT_REF,
    port: parsed.port || '5432'
  };
}

module.exports = { validateStagingDatabaseUrl };
