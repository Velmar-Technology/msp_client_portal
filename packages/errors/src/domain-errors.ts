import { AppError } from './base-error';

/**
 * 400 Bad Request / Data Validation Failure
 */
export class ValidationError extends AppError {
  public readonly code = 'VALIDATION_ERROR';
  public readonly statusCode = 400;

  constructor(message: string, details?: Record<string, any>, originalError?: unknown) {
    super({
      message,
      details,
      originalError,
      isOperational: true
    });
  }
}

/**
 * 404 Resource Not Found
 */
export class NotFoundError extends AppError {
  public readonly code = 'NOT_FOUND_ERROR';
  public readonly statusCode = 404;

  constructor(message: string, details?: Record<string, any>, originalError?: unknown) {
    super({
      message,
      details,
      originalError,
      isOperational: true
    });
  }
}

/**
 * 401 Unauthorized / Token Expiry
 */
export class UnauthorizedError extends AppError {
  public readonly code = 'UNAUTHORIZED_ERROR';
  public readonly statusCode = 401;

  constructor(message = 'Unauthorized', details?: Record<string, any>, originalError?: unknown) {
    super({
      message,
      details,
      originalError,
      isOperational: true
    });
  }
}

/**
 * 403 Forbidden / Insufficient Permission RBAC
 */
export class ForbiddenError extends AppError {
  public readonly code = 'FORBIDDEN_ERROR';
  public readonly statusCode = 403;

  constructor(message = 'Forbidden', details?: Record<string, any>, originalError?: unknown) {
    super({
      message,
      details,
      originalError,
      isOperational: true
    });
  }
}

/**
 * 409 Conflict / Unique Constraints
 */
export class ConflictError extends AppError {
  public readonly code = 'CONFLICT_ERROR';
  public readonly statusCode = 409;

  constructor(message: string, details?: Record<string, any>, originalError?: unknown) {
    super({
      message,
      details,
      originalError,
      isOperational: true
    });
  }
}

/**
 * 500 Unhandled System Failures
 */
export class InternalServerError extends AppError {
  public readonly code = 'INTERNAL_SERVER_ERROR';
  public readonly statusCode = 500;

  constructor(message = 'An unexpected internal error occurred.', originalError?: unknown) {
    super({
      message,
      originalError,
      isOperational: false
    });
  }
}

/**
 * 429 Rate Limit Exceeded
 */
export class RateLimitError extends AppError {
  public readonly code = 'RATE_LIMIT_EXCEEDED';
  public readonly statusCode = 429;

  constructor(message = 'Rate limit exceeded', details?: Record<string, any>, originalError?: unknown) {
    super({
      message,
      details,
      originalError,
      isOperational: true
    });
  }
}

/**
 * 502 External Service Failure (e.g. Nextcloud, third-party APIs)
 */
export class ExternalServiceError extends AppError {
  public readonly code = 'EXTERNAL_SERVICE_ERROR';
  public readonly statusCode = 502;

  constructor(message: string, details?: Record<string, any>, originalError?: unknown) {
    super({
      message,
      details,
      originalError,
      isOperational: true
    });
  }
}

/**
 * 403 SLA Violation — ticket cancellation window expired
 */
export class SlaViolationError extends ForbiddenError {
  public readonly code = 'SLA_VIOLATION';

  constructor(message: string, details?: Record<string, any>, originalError?: unknown) {
    super(message, details, originalError);
  }
}

/**
 * 403 Ticket creation limit reached for client or device
 */
export class TicketLimitExceededError extends ForbiddenError {
  public readonly code = 'TICKET_LIMIT_EXCEEDED';

  constructor(message: string, details?: Record<string, any>, originalError?: unknown) {
    super(message, details, originalError);
  }
}

/**
 * 400 Invalid status transition (e.g. OPEN → RESOLVED)
 */
export class InvalidTransitionError extends ValidationError {
  public readonly code = 'INVALID_STATUS_TRANSITION';

  constructor(message: string, details?: Record<string, any>, originalError?: unknown) {
    super(message, details, originalError);
  }
}

/**
 * 400 Uploaded file type not allowed
 */
export class InvalidFileTypeError extends ValidationError {
  public readonly code = 'INVALID_FILE_TYPE';

  constructor(message: string, details?: Record<string, any>, originalError?: unknown) {
    super(message, details, originalError);
  }
}
