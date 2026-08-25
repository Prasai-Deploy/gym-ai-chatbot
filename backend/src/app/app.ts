import path from 'path';
import fs from 'fs';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { logger } from '@logger/index';
import { errorHandler } from '@middleware/errorHandler';
import { healthRouter } from './health';
import { NotFoundError } from '@errors/AppError';

export const app = express();

// Security Middlewares - Relax CSP for SPA fonts, icons, and media
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors());

// Parsing & Compression
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Sprint 3E — Enterprise Security Middleware
import { correlationIdMiddleware, rateLimitMiddleware, securityHeadersMiddleware } from '@middleware/security.middleware';
app.use(correlationIdMiddleware);
app.use(securityHeadersMiddleware);
app.use(rateLimitMiddleware);

// Logging Middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger }));
}

// Infrastructure Routes
app.use('/', healthRouter);

import { identityRouter } from '../modules/identity/routes';
import { exerciseRouter, adminExerciseRouter } from '../modules/exercise/routes';
import { workoutRouter, adminWorkoutRouter } from '../modules/workout/routes';
import { progressRouter } from '../modules/progress/routes';
import { intelligenceRouter } from '../modules/intelligence/routes';
import { aiRouter } from '../modules/ai/routes';
import { adminRouter } from '../modules/admin/routes';
import { billingRouter } from '../modules/billing/routes';
import { organizationRouter } from '../modules/organization';
import { integrationRouter } from '../modules/integrations';
import { analyticsRouter } from '../modules/analytics';

// Domain Routes
app.use('/api/v1/identity', identityRouter);
app.use('/api/v1/exercises', exerciseRouter);
app.use('/api/v1/admin/exercises', adminExerciseRouter);
app.use('/api/v1/workouts', workoutRouter);
app.use('/api/v1/admin/workouts', adminWorkoutRouter);
app.use('/api/v1/progress', progressRouter);
app.use('/api/v1/intelligence', intelligenceRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/organizations', organizationRouter);
app.use('/api/v1/integrations', integrationRouter);
app.use('/api/v1/analytics', analyticsRouter);

// Production Frontend Static Serving & SPA Fallback
const possibleDistPaths = [
  path.resolve(process.cwd(), 'dist'),
  path.resolve(process.cwd(), '../dist'),
  path.resolve(__dirname, '../../dist'),
  path.resolve(__dirname, '../../../dist'),
  path.resolve(__dirname, '../../../../dist'),
];

const clientDistPath = possibleDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html'))) || possibleDistPaths[0];
const distExists = fs.existsSync(clientDistPath);
const indexExists = fs.existsSync(path.join(clientDistPath, 'index.html'));

logger.info(`[Startup Diagnostic] process.cwd(): ${process.cwd()}`);
logger.info(`[Startup Diagnostic] selected clientDistPath: ${clientDistPath}`);
logger.info(`[Startup Diagnostic] fs.existsSync(clientDistPath): ${distExists}`);
logger.info(`[Startup Diagnostic] fs.existsSync(index.html): ${indexExists}`);

if (process.env.NODE_ENV === 'production' || distExists || indexExists) {
  logger.info(`Serving frontend from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Catch-all 404
app.use('*', (_req, _res, next) => {
  next(new NotFoundError());
});

// Global Error Handler
app.use(errorHandler);
