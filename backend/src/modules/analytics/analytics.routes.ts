import { Router } from 'express';
import { requireAuth } from '@middleware/auth';
import { tenantMiddleware } from '@middleware/tenant.middleware';
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
import { DateRange, ReportType, ReportFormat } from './analytics.types';
import { ValidationError } from '@errors/AppError';

export const analyticsRouter = Router();
analyticsRouter.use(tenantMiddleware);

function getPeriod(req: any): DateRange {
  return {
    from: (req.query.from as string) || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    to:   (req.query.to as string)   || new Date().toISOString().split('T')[0],
  };
}

function getOrgId(req: any): string {
  const orgId = req.organizationContext?.organizationId || (req.headers['x-organization-id'] as string);
  if (!orgId || orgId.trim() === '') {
    throw new ValidationError('Organization context is required for analytics (fail-closed)');
  }
  return orgId;
}

// ─── Executive ───────────────────────────────────────────────────────────────
analyticsRouter.get('/executive', requireAuth, async (req, res, next) => {
  try {
    const report = await analyticsEngine.getFullReport(getOrgId(req), getPeriod(req));
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// ─── KPIs ────────────────────────────────────────────────────────────────────
analyticsRouter.get('/kpis', requireAuth, async (req, res, next) => {
  try {
    const report = await analyticsEngine.getFullReport(getOrgId(req), getPeriod(req));
    res.json({ success: true, data: { kpis: report.kpis } });
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/kpis/catalog', requireAuth, (_req, res) => {
  res.json({ success: true, data: { catalog: analyticsEngine.getKPICatalog() } });
});

// ─── Domain-specific ─────────────────────────────────────────────────────────
analyticsRouter.get('/revenue', requireAuth, async (req, res, next) => {
  try {
    const data = await revenueAnalytics.compute(getOrgId(req), getPeriod(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/attendance', requireAuth, async (req, res, next) => {
  try {
    const data = await attendanceAnalytics.compute(getOrgId(req), getPeriod(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/members', requireAuth, async (req, res, next) => {
  try {
    const data = await memberAnalytics.compute(getOrgId(req), getPeriod(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get('/trainers', requireAuth, async (req, res, next) => {
  try {
    const data = await trainerAnalytics.compute(getOrgId(req), getPeriod(req));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

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

analyticsRouter.get('/retention', requireAuth, async (req, res, next) => {
  try {
    const data = await retentionAnalytics.compute(getOrgId(req), getPeriod(req));
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
