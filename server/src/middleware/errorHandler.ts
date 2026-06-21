import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { serializeError } from '@shared/errors';

/**
 * Global centralized error handler middleware.
 * Catches all errors, formats them consistently using @shared/errors serialization, and logs appropriately.
 * Must be registered LAST in the middleware chain.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const isProduction = env.NODE_ENV === 'production';
  const serialized = serializeError(err, isProduction);
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const isOperational = err instanceof AppError ? err.isOperational : false;

  const logDetails = {
    code: serialized.code,
    message: err.message,
    statusCode,
    path: req.path,
    method: req.method,
    correlationId: serialized.correlationId,
    stack: err.stack,
    originalError: err instanceof AppError ? err.originalError : undefined,
    details: err instanceof AppError ? err.details : undefined
  };

  // Log the error using existing Winston logger
  if (isOperational) {
    logger.warn(`Operational request warning: ${serialized.message}`, logDetails);
  } else {
    logger.error(`Critical server error: ${serialized.message}`, logDetails);
  }

  res.status(statusCode).json(serialized);
}

