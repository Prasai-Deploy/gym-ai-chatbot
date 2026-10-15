import { describe, it, expect, vi } from 'vitest';
import { requireAuth, requireAdmin } from '../../src/middleware/auth.middleware';
import { tenantMiddleware } from '../../src/middleware/tenant.middleware';
import { requireRoles } from '../../src/middleware/rbac.middleware';
import { AuthError, ForbiddenError } from '../../src/errors/AppError';

// Mock Supabase Database Client
vi.mock('../../src/database/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async (token: string) => {
        if (token === 'valid-member-token') {
          return { data: { user: { id: 'usr-member-1', email: 'member@striva.app', user_metadata: { role: 'Member' } } }, error: null };
        }
        if (token === 'valid-owner-token') {
          return { data: { user: { id: 'usr-owner-1', email: 'owner@striva.app', user_metadata: { role: 'Organization Owner' } } }, error: null };
        }
        if (token === 'valid-superadmin-token') {
          return { data: { user: { id: 'usr-super-1', email: 'super@striva.app', user_metadata: { role: 'Platform Super Admin' } } }, error: null };
        }
        return { data: { user: null }, error: new Error('Invalid token') };
      }),
    },
    from: vi.fn((table: string) => {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: string) => {
          if (table === 'organization_members' && (val === 'usr-member-1' || val === 'usr-owner-1')) {
            return Promise.resolve({
              data: [{ organization_id: 'org-valid-100', role: 'Member' }],
              error: null,
            });
          }
          if (table === 'organizations' && val === 'usr-owner-1') {
            return Promise.resolve({
              data: [{ id: 'org-valid-100' }],
              error: null,
            });
          }
          return Promise.resolve({ data: [], error: null });
        }),
      };
    }),
  },
}));

describe('Sprint 4 — Phase 4 Security: JWT Auth, Tenant Isolation & RBAC', () => {

  describe('1. JWT Authentication (requireAuth)', () => {
    it('rejects requests with missing Authorization header (401)', async () => {
      const req: any = { headers: {} };
      const res: any = {};
      const next = vi.fn();

      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AuthError));
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    it('rejects requests with invalid or expired JWT tokens (401)', async () => {
      const req: any = { headers: { authorization: 'Bearer invalid-token' } };
      const res: any = {};
      const next = vi.fn();

      await requireAuth(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(AuthError));
    });

    it('populates req.user upon successful JWT verification', async () => {
      const req: any = { headers: { authorization: 'Bearer valid-member-token' } };
      const res: any = {};
      const next = vi.fn();

      await requireAuth(req, res, next);
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('usr-member-1');
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('2. Multi-Tenant Isolation & Header Spoofing Protection (tenantMiddleware)', () => {
    it('resolves valid user organization membership from database', async () => {
      const req: any = {
        user: { id: 'usr-member-1' },
        headers: {},
      };
      const res: any = {};
      const next = vi.fn();

      await tenantMiddleware(req, res, next);
      expect(req.organizationContext).toBeDefined();
      expect(req.organizationContext.organizationId).toBe('org-valid-100');
      expect(next).toHaveBeenCalledWith();
    });

    it('fails closed (403 Forbidden) when user attempts to access an unassigned organization via spoofed x-organization-id header', async () => {
      const req: any = {
        user: { id: 'usr-member-1' },
        headers: { 'x-organization-id': 'org-victim-999' },
      };
      const res: any = {};
      const next = vi.fn();

      await tenantMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(next.mock.calls[0][0].message).toContain('User does not belong to requested organization');
    });

    it('fails closed (403 Forbidden) when user attempts to spoof organization_id in request body', async () => {
      const req: any = {
        user: { id: 'usr-member-1' },
        headers: {},
        body: { organization_id: 'org-victim-999' },
      };
      const res: any = {};
      const next = vi.fn();

      await tenantMiddleware(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('never assigns hardcoded fallback organization UUID 00000000-0000-0000-0000-000000000001', async () => {
      const req: any = {
        user: { id: 'usr-unassigned-user' },
        headers: {},
      };
      const res: any = {};
      const next = vi.fn();

      await tenantMiddleware(req, res, next);
      expect(req.organizationContext).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('3. Server-Side RBAC Enforcement (requireRoles & requireAdmin)', () => {
    it('denies Member users access to Admin endpoints (403 Forbidden)', async () => {
      const req: any = {
        user: { id: 'usr-member-1', user_metadata: { role: 'Member' } },
        organizationContext: { roleKey: 'Member' },
      };
      const res: any = {};
      const next = vi.fn();

      const middleware = requireRoles(['Organization Owner', 'Gym Manager']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });

    it('allows Organization Owner users access to management endpoints', async () => {
      const req: any = {
        user: { id: 'usr-owner-1', user_metadata: { role: 'Organization Owner' } },
        organizationContext: { roleKey: 'Organization Owner' },
      };
      const res: any = {};
      const next = vi.fn();

      const middleware = requireRoles(['Organization Owner', 'Gym Manager']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('allows Platform Super Admin users unconditional access across all endpoints', async () => {
      const req: any = {
        user: { id: 'usr-super-1', user_metadata: { role: 'Platform Super Admin' } },
      };
      const res: any = {};
      const next = vi.fn();

      const middleware = requireRoles(['Organization Owner']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
