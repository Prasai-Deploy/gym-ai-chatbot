import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export class SafetyGuard {
  /**
   * Evaluates the incoming user prompt for injection attempts or unsafe topics.
   */
  public async evaluatePrompt(prompt: string): Promise<Result<boolean, AppError>> {
    const lower = prompt.toLowerCase();
    
    // Naive prompt injection detection for the slice
    const blockedKeywords = [
      'ignore all previous instructions',
      'system prompt',
      'bypass',
      'forget instructions',
      'you are no longer striva'
    ];

    for (const keyword of blockedKeywords) {
      if (lower.includes(keyword)) {
        return fail(new AppError('Prompt injection detected. Request rejected.', 400));
      }
    }

    return ok(true);
  }

  /**
   * Evaluates the final AI response before showing it to the user.
   */
  public async evaluateResponse(response: string): Promise<Result<boolean, AppError>> {
    const lower = response.toLowerCase();
    
    const medicalKeywords = [
      'diagnose', 'prescribe', 'treatment plan', 'disease', 'cure'
    ];

    for (const keyword of medicalKeywords) {
      if (lower.includes(keyword)) {
        // In a real system, we might flag this for review or append a medical disclaimer.
        // Here we just reject it.
        return fail(new AppError('AI generated potentially unsafe medical advice. Request rejected.', 500));
      }
    }

    return ok(true);
  }
}
