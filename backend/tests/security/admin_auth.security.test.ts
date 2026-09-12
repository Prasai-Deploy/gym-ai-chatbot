import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../../src/middleware/auth.middleware';
import { AuthError, ForbiddenError } from '../../src/errors/AppError';

describe('Admin Authorization Security Tests (requireAdmin Middleware)', () => {
  const createMockReqRes = (
    user?: any,
    headers: Record<string, string> = {},
    organizationContext?: { organizationId: string; roleKey?: string },
  ) => {
    const req = {
      headers,
      user,
      organizationContext,
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

  it('3. Editable user metadata cannot assign the Trainer role', async () => {
    const user = { id: 'usr-2', user_metadata: { role: 'Trainer' } };
    const { req, res, next } = createMockReqRes(user);

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as any).mock.calls[0][0];
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain("Role 'Member' is not authorized");
  });

  it('4. Editable user metadata cannot assign the Front Desk role', async () => {
    const user = { id: 'usr-3', user_metadata: { role: 'Front Desk' } };
    const { req, res, next } = createMockReqRes(user);

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = (next as any).mock.calls[0][0];
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain("Role 'Member' is not authorized");
  });

  it('5. Verified Gym Manager organization membership → Allowed', async () => {
    const user = { id: 'usr-4' };
    const { req, res, next } = createMockReqRes(
      user,
      {},
      {
        organizationId: '00000000-0000-4000-8000-000000000001',
        roleKey: 'Gym Manager',
      },
    );

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((next as any).mock.calls[0][0]).toBeUndefined(); // Success (no error passed)
  });

  it('6. Verified Organization Owner membership → Allowed', async () => {
    const user = { id: 'usr-5' };
    const { req, res, next } = createMockReqRes(
      user,
      {},
      {
        organizationId: '00000000-0000-4000-8000-000000000001',
        roleKey: 'Organization Owner',
      },
    );

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((next as any).mock.calls[0][0]).toBeUndefined();
  });

  it('7. Server-controlled Platform Super Admin role → Allowed', async () => {
    const user = { id: 'usr-6', app_metadata: { role: 'Platform Super Admin' } };
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
