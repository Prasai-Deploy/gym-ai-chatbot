import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export interface SafetyCheckResult {
  safe: boolean;
  category: 'NORMAL' | 'MEDICAL_QUERY' | 'HIGH_RISK_FITNESS' | 'PROMPT_INJECTION';
  safeResponse?: string;
}

export class SafetyPolicy {
  private readonly medicalPatterns: RegExp[] = [
    /\b(?:diagnose|diagnosis)\b/i,
    /\b(?:prescribe|medication|prescription|dosage)\b/i,
    /\bdo\s+i\s+have\s+(?:diabetes|cancer|hypertension|covid|cardiac|heart\s+disease)\b/i,
    /\bhow\s+to\s+treat\s+(?:my|an?)\s+(?:infection|fever|fracture|broken\s+bone)\b/i,
    /\bchange\s+my\s+(?:blood\s+pressure|insulin|heart|antidepressant)\s+medication\b/i,
  ];

  private readonly highRiskPatterns: RegExp[] = [
    /\b(?:dehydrate|dry\s+fast)\b/i,
    /\b(?:starve|water\s+fast)\s+for\s+\d+\s*(?:days?|weeks?)\b/i,
    /\bpush\s+through\s+(?:[a-z]+\s+)*(?:pain|injury)\b/i,
    /\bhow\s+to\s+(?:pass\s+out|faint)\b/i,
    /\b(?:unverified|illegal|underground)\s+(?:steroid|anabolic|drug|sarms)\b/i,
  ];

  private readonly injectionPatterns: RegExp[] = [
    /ignore\s+(?:all\s+)?previous\s+instructions/i,
    /reveal\s+(?:your\s+)?system\s+prompt/i,
    /disable\s+(?:all\s+)?safety/i,
    /you\s+are\s+now\s+(?:an?\s+)?unrestricted/i,
    /forget\s+(?:the\s+)?user'?s?\s+identity/i,
    /override\s+tool\s+permissions/i,
    /execute\s+this\s+tool\s+regardless/i,
  ];

  public evaluatePrompt(promptText: string): Result<SafetyCheckResult, AppError> {
    if (!promptText || promptText.trim().length === 0) {
      return ok({ safe: true, category: 'NORMAL' });
    }

    const text = promptText.trim();

    // 1. Check Prompt Injection
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(text)) {
        return fail(new AppError('Security violation: Malicious prompt injection payload blocked', 400));
      }
    }

    // 2. Check Medical Diagnosis / Prescription Requests
    for (const pattern of this.medicalPatterns) {
      if (pattern.test(text)) {
        return ok({
          safe: false,
          category: 'MEDICAL_QUERY',
          safeResponse:
            "TRINETRA is STRIVA's intelligent health and fitness guidance layer, not a medical provider. I cannot diagnose medical conditions or prescribe medications. If you suspect a medical issue or require medical advice, please consult a qualified healthcare professional.",
        });
      }
    }

    // 3. Check High-Risk / Dangerous Fitness Requests
    for (const pattern of this.highRiskPatterns) {
      if (pattern.test(text)) {
        return ok({
          safe: false,
          category: 'HIGH_RISK_FITNESS',
          safeResponse:
            "I cannot recommend extreme dehydration, starvation diets, or training through severe sharp pain. I am happy to help you design a safe, sustainable fitness and nutrition approach tailored to your goals.",
        });
      }
    }

    return ok({ safe: true, category: 'NORMAL' });
  }
}

export const safetyPolicy = new SafetyPolicy();
