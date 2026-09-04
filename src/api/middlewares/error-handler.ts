import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/errors/app-error.js';
import { logger } from '../../shared/logger/index.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn({ path: req.path, statusCode: err.statusCode, code: err.code, message: err.message }, 'API Client Error');
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: (err as any).details || undefined,
      },
    });
  }

  logger.error({ path: req.path, error: err.stack }, 'Unhandled Internal Server Error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred.',
    },
  });
}
