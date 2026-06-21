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
