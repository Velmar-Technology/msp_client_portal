import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../base-error';
import { serializeError } from '../serialization';

interface LoggerInterface {
  error: (msg: string, ...meta: any[]) => void;
  warn: (msg: string, ...meta: any[]) => void;
}

interface ExpressErrorMiddlewareOptions {
  logger?: LoggerInterface;
  isProduction?: boolean;
}

/**
 * Creates an Express global error-handling middleware.
 * Accepts an optional logger (e.g. Winston logger) to record structured trace logs.
 *
 * @param options.logger Optional logging interface
 * @param options.isProduction Controls output masking; defaults to NODE_ENV check
 */
export function createExpressErrorMiddleware(options?: ExpressErrorMiddlewareOptions): ErrorRequestHandler {
  const isProduction = options?.isProduction ?? process.env.NODE_ENV === 'production';
  const logger = options?.logger;

  return (
    err: unknown,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
  ): void => {
    const serialized = serializeError(err, isProduction);
    const statusCode = err instanceof AppError ? err.statusCode : 500;

    const logDetails = {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      correlationId: serialized.correlationId,
      code: serialized.code,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      originalError: err instanceof AppError ? err.originalError : undefined,
      details: err instanceof AppError ? err.details : undefined
    };

    if (logger) {
      if (statusCode >= 500) {
        logger.error(`Critical server error: ${serialized.message}`, logDetails);
      } else {
        logger.warn(`Operational request warning: ${serialized.message}`, logDetails);
      }
    } else {
      if (statusCode >= 500) {
        console.error(`[CRITICAL] Server error: ${JSON.stringify(logDetails)}`);
      } else {
        console.warn(`[WARNING] Request warning: ${JSON.stringify(logDetails)}`);
      }
    }

    res.status(statusCode).json(serialized);
  };
}
