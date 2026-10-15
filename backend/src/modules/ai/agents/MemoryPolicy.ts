import { MemoryCandidate, MemoryCategory } from './memory.types';
import { Result, ok, fail } from '@shared/core/Result';
import { ValidationError } from '@errors/AppError';

export class MemoryPolicy {
  private readonly ALLOWED_CATEGORIES: Set<MemoryCategory> = new Set([
    'PROFILE',
    'FITNESS',
    'TRAINING',
    'NUTRITION',
    'RECOVERY',
    'GOALS',
    'PREFERENCES',
    'HABITS',
    'EQUIPMENT',
    'SCHEDULE',
    'COACHING_STYLE',
  ]);

  private readonly INJECTION_PATTERNS: RegExp[] = [
    /ignore\s+previous\s+instructions/i,
    /system\s+prompt/i,
    /you\s+are\s+now\s+dan/i,
    /override\s+rules/i,
    /forget\s+all\s+prior/i,
    /disregard\s+safety/i,
    /act\s+as\s+root/i,
  ];

  private readonly SECRET_PATTERNS: RegExp[] = [
    /sk-[a-zA-Z0-9]{20,}/i,
    /bearer\s+[a-zA-Z0-9\._\-]+/i,
    /eyJ[a-zA-Z0-9\._\-]+\.[a-zA-Z0-9\._\-]+/i, // JWT token pattern
    /\b(?:password|passwd|api_key|apikey|secret_key|private_key)\b\s*[:=]\s*\S+/i,
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card pattern
  ];

  public validateCandidate(
    candidate: MemoryCandidate,
    callerUserId: string,
    callerOrgId: string
  ): Result<void, ValidationError> {
    if (!candidate.userId || candidate.userId !== callerUserId) {
      return fail(new ValidationError('Memory candidate user_id does not match authenticated caller identity'));
    }
    if (!candidate.organizationId || candidate.organizationId !== callerOrgId) {
      return fail(new ValidationError('Memory candidate organization_id does not match tenant context'));
    }

    if (!this.ALLOWED_CATEGORIES.has(candidate.category)) {
      return fail(new ValidationError(`Unsupported memory category: ${candidate.category}`));
    }

    if (!candidate.key || candidate.key.trim() === '') {
      return fail(new ValidationError('Memory key cannot be empty'));
    }

    if (!candidate.value || candidate.value.trim() === '') {
      return fail(new ValidationError('Memory value cannot be empty'));
    }

    // Policy: Inferred candidates are NOT automatically persisted unless high confidence
    if (candidate.source === 'inferred' && candidate.confidence !== 'high') {
      return fail(new ValidationError('Inferred memories with low/medium confidence are restricted from automatic persistence'));
    }

    // Security Check 1: Prompt Injection Payload Filtering
    const textToScan = `${candidate.key} ${candidate.value}`;
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(textToScan)) {
        return fail(new ValidationError('Memory candidate contains potential prompt injection or system override payload'));
      }
    }

    // Security Check 2: Secret & Credential Filtering
    for (const pattern of this.SECRET_PATTERNS) {
      if (pattern.test(textToScan)) {
        return fail(new ValidationError('Memory candidate contains sensitive credentials, keys, or auth tokens'));
      }
    }

    return ok(undefined);
  }
}

export const memoryPolicy = new MemoryPolicy();
