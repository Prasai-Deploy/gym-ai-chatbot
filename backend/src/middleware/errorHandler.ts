import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '@errors/AppError';
import { logger } from '@logger/index';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    if (err instanceof ValidationError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.message,
          details: err.details,
        },
      });
    }

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.constructor.name.replace('Error', '').toUpperCase() + '_ERROR',
        message: err.message,
      },
    });
  }

  // Unhandled Exception
  logger.error(err, 'Unhandled Exception');
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
};
