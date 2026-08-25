import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAdmin, ALLOWED_ADMIN_ROLES } from '../../src/middleware/auth.middleware';
import { AuthError, ForbiddenError } from '../../src/errors/AppError';

describe('Admin Authorization Security Tests (requireAdmin Middleware)', () => {
  const createMockReqRes = (user?: any, headers: Record<string, string> = {}) => {
    const req = {
      headers,
      user,
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    return { req, res, next };
  };

  it('1. Unauthenticated user (no user object) → Rejected with AuthError', async () => {
    const { req, res, next } = createMockReqRes();

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as any).mock.calls[0][0];
    expect(err).toBeInstanceOf(AuthError);
    expect(err.statusCode).toBe(401);
  });

  it('2. Member role → Rejected with ForbiddenError (403)', async () => {
    const user = { id: 'usr-1', user_metadata: { role: 'Member' } };
    const { req, res, next } = createMockReqRes(user);

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as any).mock.calls[0][0];
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain("Role 'Member' is not authorized");
  });

  it('3. Trainer role → Rejected with ForbiddenError (403)', async () => {
    const user = { id: 'usr-2', user_metadata: { role: 'Trainer' } };
    const { req, res, next } = createMockReqRes(user);

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as any).mock.calls[0][0];
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain("Role 'Trainer' is not authorized");
  });

  it('4. Front Desk role → Rejected with ForbiddenError (403)', async () => {
    const user = { id: 'usr-3', user_metadata: { role: 'Front Desk' } };
    const { req, res, next } = createMockReqRes(user);

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as any).mock.calls[0][0];
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain("Role 'Front Desk' is not authorized");
  });

  it('5. Gym Manager role → Allowed according to RBAC policy', async () => {
    const user = { id: 'usr-4', user_metadata: { role: 'Gym Manager' } };
    const { req, res, next } = createMockReqRes(user);

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((next as any).mock.calls[0][0]).toBeUndefined(); // Success (no error passed)
  });

  it('6. Organization Owner role → Allowed according to RBAC policy', async () => {
    const user = { id: 'usr-5', user_metadata: { role: 'Organization Owner' } };
    const { req, res, next } = createMockReqRes(user);

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((next as any).mock.calls[0][0]).toBeUndefined();
  });

  it('7. Platform Super Admin role → Allowed according to RBAC policy', async () => {
    const user = { id: 'usr-6', user_metadata: { role: 'Platform Super Admin' } };
    const { req, res, next } = createMockReqRes(user);

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((next as any).mock.calls[0][0]).toBeUndefined();
  });

  it('8. Anti-Spoofing: Client header x-role cannot bypass authorization', async () => {
    // User claims 'Member' in token, but attempts to spoof 'Organization Owner' via client header
    const user = { id: 'usr-7', user_metadata: { role: 'Member' } };
    const { req, res, next } = createMockReqRes(user, { 'x-role': 'Organization Owner' });

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as any).mock.calls[0][0];
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.statusCode).toBe(403);
  });
});
