import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '@logger/index';

// ─── Rate Limiter (In-memory sliding window) ─────────────────────────────────
interface RateEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateEntry>();

const RATE_LIMIT_MAX = 120;      // requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000;  // 1 minute window

export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const clientKey = `${req.ip}:${req.path}`;
  const now = Date.now();
  const entry = rateLimitStore.get(clientKey);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(clientKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    logger.warn(`[RateLimiter] Limit exceeded for key ${clientKey}`);
    res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      retryAfterMs: entry.resetAt - now,
    });
    return;
  }

  next();
};

// ─── Correlation ID Injector ──────────────────────────────────────────────────
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  next();
};

// ─── Security Response Headers ────────────────────────────────────────────────
export const securityHeadersMiddleware = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};
