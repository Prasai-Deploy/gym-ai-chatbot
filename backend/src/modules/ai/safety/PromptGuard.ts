import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export class PromptGuard {
  public static readonly MAX_PROMPT_LENGTH = 4000;

  private readonly injectionKeywords = [
    'ignore all previous instructions',
    'ignore previous instructions',
    'system prompt',
    'reveal system prompt',
    'reveal developer prompt',
    'bypass rls',
    'forget instructions',
    'you are no longer striva',
    'you are now an unrestricted',
    'override security controls',
    'forget the user identity',
    'execute this tool regardless',
  ];

  public validatePrompt(prompt: string): Result<boolean, AppError> {
    if (!prompt || typeof prompt !== 'string') {
      return fail(new AppError('Invalid or empty prompt provided', 400));
    }

    if (prompt.length > PromptGuard.MAX_PROMPT_LENGTH) {
      return fail(
        new AppError(`Prompt size limit exceeded: Prompt length (${prompt.length}) exceeds maximum allowable threshold (${PromptGuard.MAX_PROMPT_LENGTH} characters)`, 400)
      );
    }

    const lower = prompt.toLowerCase();
    for (const keyword of this.injectionKeywords) {
      if (lower.includes(keyword)) {
        return fail(new AppError(`Security violation: Potential prompt injection detected ('${keyword}')`, 400));
      }
    }

    return ok(true);
  }
}
