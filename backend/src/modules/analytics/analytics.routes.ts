import { Router } from 'express';
import { requireAuth } from '@middleware/auth';
import { tenantMiddleware } from '@middleware/tenant.middleware';
import { requireRoles } from '@middleware/rbac.middleware';
import { analyticsEngine } from './AnalyticsEngine';
import {
  revenueAnalytics,
  attendanceAnalytics,
  memberAnalytics,
  trainerAnalytics,
  workoutAnalytics,
  nutritionAnalytics,
  retentionAnalytics,
} from './AnalyticsEngines';
import { ownerAnalyticsService } from './ownerAnalytics.service';
import { DateRange, ReportType, ReportFormat } from './analytics.types';
import { ValidationError } from '@errors/AppError';
import { AttendanceService } from '../attendance/attendance.service';
import { orgBillingService } from '../billing/organization/orgBilling.service';

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);
analyticsRouter.use(tenantMiddleware);

const attendanceService = new AttendanceService();

function getPeriod(req: any): DateRange {
  return {
    from: (req.query.from as string) || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    to:   (req.query.to as string)   || new Date().toISOString().split('T')[0],
  };
}

function getOrgId(req: any): string {
  const orgId = req.organizationContext?.organizationId;
  if (!orgId || orgId.trim() === '') {
    throw new ValidationError('Organization tenant context is required for analytics (fail-closed)');
  }
  return orgId;
}

// ─── Canonical STRIVA V2 Gym Owner Analytics ─────────────────────────────────

/**
 * GET /api/v1/analytics/overview
 * Canonical Gym Owner Analytics unified overview.
 * Scoped strictly to authenticated organization.
 */
analyticsRouter.get(
  '/overview',
  requireAuth,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  async (req, res, next) => {
    try {
      const bounds = ownerAnalyticsService.parseTimeWindow(
        req.query.window as string,
        req.query.from as string,
        req.query.to as string
      );
      const data = await ownerAnalyticsService.getOverview(getOrgId(req), bounds);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/analytics/members
 * Scoped member analytics (active, trial, inactive, growth).
 */
analyticsRouter.get(
  '/members',
  requireAuth,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  async (req, res, next) => {
    try {
      const bounds = ownerAnalyticsService.parseTimeWindow(
        req.query.window as string,
        req.query.from as string,
        req.query.to as string
      );
      const data = await ownerAnalyticsService.getMemberAnalytics(getOrgId(req), bounds);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/analytics/attendance
 * Scoped attendance analytics from canonical attendance_logs.
 */
analyticsRouter.get(
  '/attendance',
  requireAuth,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  async (req, res, next) => {
    try {
      const bounds = ownerAnalyticsService.parseTimeWindow(
        req.query.window as string,
        req.query.from as string,
        req.query.to as string
      );
      const data = await ownerAnalyticsService.getAttendanceAnalytics(getOrgId(req), bounds);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/analytics/trainers
 * Scoped trainer analytics from trainer_member_assignments.
 */
analyticsRouter.get(
  '/trainers',
  requireAuth,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  async (req, res, next) => {
    try {
      const bounds = ownerAnalyticsService.parseTimeWindow(
        req.query.window as string,
        req.query.from as string,
        req.query.to as string
      );
      const data = await ownerAnalyticsService.getTrainerAnalytics(getOrgId(req), bounds);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/analytics/retention
 * Deterministic attendance-based retention calculation.
 */
analyticsRouter.get(
  '/retention',
  requireAuth,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  async (req, res, next) => {
    try {
      const bounds = ownerAnalyticsService.parseTimeWindow(
        req.query.window as string,
        req.query.from as string,
        req.query.to as string
      );
      const data = await ownerAnalyticsService.getRetentionAnalytics(getOrgId(req), bounds);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/analytics/financials
 * Scoped B2B Gym Software financial metrics.
 * Excludes consumer subscriptions.
 */
analyticsRouter.get(
  '/financials',
  requireAuth,
  requireRoles(['Platform Super Admin', 'Organization Owner']),
  async (req, res, next) => {
    try {
      const bounds = ownerAnalyticsService.parseTimeWindow(
        req.query.window as string,
        req.query.from as string,
        req.query.to as string
      );
      const data = await orgBillingService.getFinancialSummary(getOrgId(req), bounds.from, bounds.to);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Executive & Legacy KPIs ─────────────────────────────────────────────────
analyticsRouter.get(
  '/executive',
  requireAuth,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  async (req, res, next) => {
    try {
      const report = await analyticsEngine.getFullReport(getOrgId(req), getPeriod(req));
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
);

analyticsRouter.get(
  '/kpis',
  requireAuth,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  async (req, res, next) => {
    try {
      const report = await analyticsEngine.getFullReport(getOrgId(req), getPeriod(req));
      res.json({ success: true, data: { kpis: report.kpis } });
    } catch (err) {
      next(err);
    }
  }
);

analyticsRouter.get('/kpis/catalog', requireAuth, (_req, res) => {
  res.json({ success: true, data: { catalog: analyticsEngine.getKPICatalog() } });
});

// ─── Legacy/Platform Revenue ─────────────────────────────────────────────────
analyticsRouter.get(
  '/revenue',
  requireAuth,
  requireRoles(['Platform Super Admin', 'Organization Owner', 'Gym Manager']),
  async (req, res, next) => {
    try {
      const data = await revenueAnalytics.compute(getOrgId(req), getPeriod(req));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Attendance Self-History & Operational Fallbacks ─────────────────────────
analyticsRouter.get('/attendance/history', requireAuth, async (req: any, res, next) => {
  try {
    const orgId = getOrgId(req);
    const targetUserId = (req.query.userId as string) || req.user.id;
    const callerRole = req.organizationContext?.roleKey || req.user.user_metadata?.role || req.user.role || 'Member';

    if (targetUserId !== req.user.id) {
      const isStaff = ['Platform Super Admin', 'Organization Owner', 'Gym Manager', 'Front Desk', 'Trainer'].includes(callerRole);
      if (!isStaff) {
        throw new ValidationError('Members cannot view attendance history of other members');
      }
    }

    const data = await attendanceService.getHistory(orgId, targetUserId);
    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
});

analyticsRouter.post('/attendance/checkin', requireAuth, async (req: any, res, next) => {
  try {
    const orgId = getOrgId(req);
    const callerRole = req.organizationContext?.roleKey || req.user.user_metadata?.role || req.user.role || 'Member';
    const data = await attendanceService.checkIn(req.user.id, callerRole, orgId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

analyticsRouter.post('/attendance/checkout', requireAuth, async (req: any, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { attendanceId } = req.body;
    if (!attendanceId) throw new ValidationError('attendanceId is required for check-out');
    const callerRole = req.organizationContext?.roleKey || req.user.user_metadata?.role || req.user.role || 'Member';
    const data = await attendanceService.checkOut(req.user.id, callerRole, orgId, attendanceId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── Additional Workouts & Nutrition Telemetry ──────────────────────────────
analyticsRouter.get('/workouts', requireAuth, async (req, res, next) => {
  try {
    const data = await workoutAnalytics.compute(getOrgId(req), getPeriod(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/nutrition', requireAuth, async (req, res, next) => {
  try {
    const data = await nutritionAnalytics.compute(getOrgId(req), getPeriod(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ─── Reports & Export ────────────────────────────────────────────────────────
analyticsRouter.post('/reports', requireAuth, async (req, res, next) => {
  try {
    const { reportType, format } = req.body as { reportType: ReportType; format: ReportFormat };
    const result = await analyticsEngine.exportReport(getOrgId(req), getPeriod(req), reportType, format);

    if (format === 'csv' && result.csvContent) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report.csv"`);
      return res.send(result.csvContent);
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});
