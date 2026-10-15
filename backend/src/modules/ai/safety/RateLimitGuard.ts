import { Result, ok, fail } from '@shared/core/Result';
import { AppError } from '@errors/AppError';

export class RateLimitGuard {
  private requestCounts: Map<string, { count: number; windowStart: number; failures: number }> = new Map();
  private readonly maxRequestsPerMinute = 30;
  private readonly maxConsecutiveFailures = 10;

  public checkRateLimit(userId: string): Result<boolean, AppError> {
    if (!userId || userId.trim() === '') {
      return fail(new AppError('User ID is required for rate limit enforcement', 400));
    }

    const now = Date.now();
    const record = this.requestCounts.get(userId) || { count: 0, windowStart: now, failures: 0 };

    if (now - record.windowStart > 60000) {
      record.count = 1;
      record.windowStart = now;
      record.failures = 0;
    } else {
      record.count += 1;
    }

    this.requestCounts.set(userId, record);

    if (record.count > this.maxRequestsPerMinute) {
      return fail(new AppError('AI chat rate limit exceeded. Please wait a moment before sending more messages.', 429));
    }

    if (record.failures >= this.maxConsecutiveFailures) {
      return fail(new AppError('Too many consecutive failed requests. Please wait a minute before retrying.', 429));
    }

    return ok(true);
  }

  public recordFailure(userId: string): void {
    if (!userId) return;
    const record = this.requestCounts.get(userId);
    if (record) {
      record.failures += 1;
      this.requestCounts.set(userId, record);
    }
  }

  public recordSuccess(userId: string): void {
    if (!userId) return;
    const record = this.requestCounts.get(userId);
    if (record) {
      record.failures = 0;
      this.requestCounts.set(userId, record);
    }
  }
}
