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

// Security Middlewares
app.use(helmet());
app.use(cors());

// Parsing & Compression
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

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

// Production Frontend Static Serving & SPA Fallback
const clientDistPath = path.resolve(process.cwd(), 'dist');
if (process.env.NODE_ENV === 'production' || fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
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
