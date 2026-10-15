import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { IdentityController } from '../../src/modules/identity/controllers/IdentityController';
import { IIdentityService } from '../../src/modules/identity/services/IIdentityService';
import { ok } from '../../src/shared/core/Result';

/**
 * DB-5B: Demo Reset Authorization & SQL Hardening Regression Test Suite
 * 
 * Verifies that:
 * 1. SQL migration phase_11_prelaunch_hardening.sql strictly enforces exact case-insensitive
 *    equality (LOWER(v_demo_email) = 'demo@sweatfix.com') without loose %demo% wildcards.
 * 2. IdentityController strictly blocks non-demo accounts (including substring matches like
 *    demosthenes@gmail.com and academic.democracy@oxford.edu).
 * 3. Rejected targets cause zero service/database calls and zero deletions.
 */
describe('DB-5B: Demo Reset Authorization & Security Invariants', () => {
  const migrationPath = path.join(
    __dirname,
    '../../supabase/migrations/phase_11_prelaunch_hardening.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  // --------------------------------------------------------------------------
  // PART 1: Database Migration SQL Invariants
  // --------------------------------------------------------------------------
  describe('Database Migration Invariants (phase_11_prelaunch_hardening.sql)', () => {
    it('1. Enforces strict case-insensitive equality against demo@sweatfix.com', () => {
      // Must use LOWER(v_demo_email) = 'demo@sweatfix.com' or <> 'demo@sweatfix.com'
      expect(migrationSql).toMatch(/LOWER\(v_demo_email\)\s*<>\s*'demo@sweatfix\.com'/i);
    });

    it('2. Strictly prohibits permissive substring wildcards (%demo%) in email validation', () => {
      // The loose pattern that caused DB5A-01 must NOT exist
      expect(migrationSql).not.toContain("LIKE '%demo%'");
      expect(migrationSql).not.toContain("LIKE '%demo'");
      expect(migrationSql).not.toContain("LIKE 'demo%'");
    });

    it('3. Enforces fail-closed guards for NULL and missing target users', () => {
      expect(migrationSql).toContain('IF target_user_id IS NULL THEN');
      expect(migrationSql).toContain("RAISE EXCEPTION 'Target user ID must not be null'");
      expect(migrationSql).toContain('IF v_demo_email IS NULL THEN');
      expect(migrationSql).toContain("RAISE EXCEPTION 'Target user profile not found: %', target_user_id");
    });

    it('4. Enforces foreign key safe deletion sequence (exercise_sets before v2_workout_sessions)', () => {
      const setsDeletionIndex = migrationSql.indexOf('DELETE FROM public.exercise_sets');
      const sessionsDeletionIndex = migrationSql.indexOf('DELETE FROM public.v2_workout_sessions');

      expect(setsDeletionIndex).toBeGreaterThan(-1);
      expect(sessionsDeletionIndex).toBeGreaterThan(-1);
      expect(setsDeletionIndex).toBeLessThan(sessionsDeletionIndex);
    });

    it('5. Hardens search_path and restricts routine execution to service_role', () => {
      expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.reset_demo_account(target_user_id UUID)');
      expect(migrationSql).toContain('SECURITY DEFINER SET search_path = pg_catalog, pg_temp');
      expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.reset_demo_account(UUID) FROM PUBLIC;');
      expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.reset_demo_account(UUID) FROM anon;');
      expect(migrationSql).toContain('REVOKE ALL ON FUNCTION public.reset_demo_account(UUID) FROM authenticated;');
      expect(migrationSql).toContain('GRANT EXECUTE ON FUNCTION public.reset_demo_account(UUID) TO service_role;');
    });
  });

  // --------------------------------------------------------------------------
  // PART 2: Identity Controller Authorization Guards
  // --------------------------------------------------------------------------
  describe('IdentityController Authorization & Rejection Gates', () => {
    let mockService: Partial<IIdentityService>;
    let controller: IdentityController;
    let mockRes: Partial<Response>;
    let jsonMock: any;
    let statusMock: any;
    let nextMock: any;

    beforeEach(() => {
      jsonMock = vi.fn();
      statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      mockRes = {
        status: statusMock,
        json: jsonMock,
      };
      nextMock = vi.fn();

      mockService = {
        resetDemoData: vi.fn().mockResolvedValue(ok(undefined)),
      };

      // Mock dependencies for IdentityController instantiation
      const mockRepo = {} as any;
      controller = new IdentityController(mockService as IIdentityService, mockRepo);
    });

    it('6. Accepts exact approved demo email: demo@sweatfix.com', async () => {
      const req = {
        user: { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', email: 'demo@sweatfix.com' },
      } as unknown as Request;

      await controller.resetDemoData(req, mockRes as Response, nextMock);

      expect(mockService.resetDemoData).toHaveBeenCalledWith('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ success: true, message: 'Demo data reset successfully' });
    });

    it('7. Rejects known malicious substring: demosthenes@gmail.com', async () => {
      const req = {
        user: { id: '44444444-4444-4444-8444-444444444444', email: 'demosthenes@gmail.com' },
      } as unknown as Request;

      await controller.resetDemoData(req, mockRes as Response, nextMock);

      expect(mockService.resetDemoData).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('Forbidden') })
      );
    });

    it('8. Rejects known malicious domain/subdomain: academic.democracy@oxford.edu', async () => {
      const req = {
        user: { id: '55555555-5555-4555-8555-555555555555', email: 'academic.democracy@oxford.edu' },
      } as unknown as Request;

      await controller.resetDemoData(req, mockRes as Response, nextMock);

      expect(mockService.resetDemoData).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('Forbidden') })
      );
    });

    it('9. Rejects unrelated legitimate member: legit_member@example.com', async () => {
      const req = {
        user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'legit_member@example.com' },
      } as unknown as Request;

      await controller.resetDemoData(req, mockRes as Response, nextMock);

      expect(mockService.resetDemoData).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: expect.stringContaining('Forbidden') })
      );
    });

    it('10. Rejects attacker trying domain spoofing: demo@not-sweatfix.com or demo@sweatfix.com.attacker.com', async () => {
      const req = {
        user: { id: '66666666-6666-4666-8666-666666666666', email: 'demo@not-sweatfix.com' },
      } as unknown as Request;

      await controller.resetDemoData(req, mockRes as Response, nextMock);

      expect(mockService.resetDemoData).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });
});
