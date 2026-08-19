import { AppError as SharedAppError } from '@shared/errors';

/**
 * @deprecated Use domain error classes from '@shared/errors' directly instead:
 * - NotFoundError, ForbiddenError, ValidationError, UnauthorizedError
 * - ConflictError, InternalServerError, RateLimitError, ExternalServiceError
 * - SlaViolationError, TicketLimitExceededError, InvalidTransitionError, InvalidFileTypeError
 *
 * This facade is kept for backward compatibility only and will be removed in a future release.
 */
export class AppError extends SharedAppError {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: Record<string, any>,
    originalError?: unknown
  ) {
    super({
      message,
      isOperational,
      details,
      originalError
    });
    this.statusCode = statusCode;
    this.code = code;
  }

  // ---- Factory Methods ----

  static badRequest(message: string, code = 'BAD_REQUEST'): AppError {
    return new AppError(message, 400, code);
  }

  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED'): AppError {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN'): AppError {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND'): AppError {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code = 'CONFLICT'): AppError {
    return new AppError(message, 409, code);
  }

  static slaViolation(message: string): AppError {
    return new AppError(message, 403, 'SLA_VIOLATION');
  }

  static tooManyRequests(message = 'Rate limit exceeded', code = 'TOO_MANY_REQUESTS'): AppError {
    return new AppError(message, 429, code);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, 500, 'INTERNAL_ERROR', false);
  }
}

