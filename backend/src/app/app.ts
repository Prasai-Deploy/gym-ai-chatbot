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
import { env } from '@config/env';

export const app = express();
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        mediaSrc: ["'self'", 'blob:'],
        connectSrc: ["'self'", env.SUPABASE_URL, env.SUPABASE_URL.replace('https://', 'wss://')],
        frameSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
        workerSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
const configuredOrigins = (env.CORS_ORIGINS || env.APP_URL || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      const normalizedOrigin = origin?.replace(/\/$/, '');
      const isLocalDevelopment =
        env.NODE_ENV === 'development' &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin || '');
      if (!origin || configuredOrigins.includes(normalizedOrigin || '') || isLocalDevelopment) {
        return callback(null, true);
      }
      return callback(new Error('Origin is not allowed by CORS'));
    },
  }),
);

// Parsing & Compression
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Sprint 3E — Enterprise Security Middleware
import {
  correlationIdMiddleware,
  rateLimitMiddleware,
  securityHeadersMiddleware,
} from '@middleware/security.middleware';
app.use(correlationIdMiddleware);
app.use(securityHeadersMiddleware);
app.use(rateLimitMiddleware);

// Logging Middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger }));
}

// Infrastructure Routes
app.use('/', healthRouter);

// OAuth Direct Fallback Endpoints
app.get('/auth/google', (req, res) => {
  const supabaseUrl = env.SUPABASE_URL;
  const appUrl = env.APP_URL
    ? env.APP_URL.replace(/\/$/, '')
    : `${req.protocol}://${req.get('host')}`;
  const redirectUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(`${appUrl}/auth/callback`)}`;
  res.redirect(redirectUrl);
});

app.get('/auth/google/callback', (req, res) => {
  const appUrl = env.APP_URL
    ? env.APP_URL.replace(/\/$/, '')
    : `${req.protocol}://${req.get('host')}`;
  res.redirect(`${appUrl}/auth/callback`);
});

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

const clientDistPath =
  possibleDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html'))) || possibleDistPaths[0];
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
