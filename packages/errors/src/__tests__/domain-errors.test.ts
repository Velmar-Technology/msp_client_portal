import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
  RateLimitError,
  ExternalServiceError,
  SlaViolationError,
  TicketLimitExceededError,
  InvalidTransitionError,
  InvalidFileTypeError,
} from '../domain-errors';

describe('ValidationError', () => {
  it('has code VALIDATION_ERROR', () => {
    expect(new ValidationError('invalid').code).toBe('VALIDATION_ERROR');
  });
  it('has statusCode 400', () => {
    expect(new ValidationError('invalid').statusCode).toBe(400);
  });
  it('is operational', () => {
    expect(new ValidationError('invalid').isOperational).toBe(true);
  });
  it('stores details', () => {
    const err = new ValidationError('invalid', { fields: [{ field: 'name', message: 'required' }] });
    expect(err.details.fields).toHaveLength(1);
  });
});

describe('NotFoundError', () => {
  it('has code NOT_FOUND_ERROR', () => {
    expect(new NotFoundError('missing').code).toBe('NOT_FOUND_ERROR');
  });
  it('has statusCode 404', () => {
    expect(new NotFoundError('missing').statusCode).toBe(404);
  });
  it('is operational', () => {
    expect(new NotFoundError('missing').isOperational).toBe(true);
  });
});

describe('UnauthorizedError', () => {
  it('has code UNAUTHORIZED_ERROR', () => {
    expect(new UnauthorizedError().code).toBe('UNAUTHORIZED_ERROR');
  });
  it('has statusCode 401', () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
  });
  it('is operational', () => {
    expect(new UnauthorizedError().isOperational).toBe(true);
  });
  it('defaults message to Unauthorized', () => {
    expect(new UnauthorizedError().message).toBe('Unauthorized');
  });
});

describe('ForbiddenError', () => {
  it('has code FORBIDDEN_ERROR', () => {
    expect(new ForbiddenError().code).toBe('FORBIDDEN_ERROR');
  });
  it('has statusCode 403', () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });
  it('is operational', () => {
    expect(new ForbiddenError().isOperational).toBe(true);
  });
  it('defaults message to Forbidden', () => {
    expect(new ForbiddenError().message).toBe('Forbidden');
  });
});

describe('ConflictError', () => {
  it('has code CONFLICT_ERROR', () => {
    expect(new ConflictError('duplicate').code).toBe('CONFLICT_ERROR');
  });
  it('has statusCode 409', () => {
    expect(new ConflictError('duplicate').statusCode).toBe(409);
  });
  it('is operational', () => {
    expect(new ConflictError('duplicate').isOperational).toBe(true);
  });
});

describe('InternalServerError', () => {
  it('has code INTERNAL_SERVER_ERROR', () => {
    expect(new InternalServerError().code).toBe('INTERNAL_SERVER_ERROR');
  });
  it('has statusCode 500', () => {
    expect(new InternalServerError().statusCode).toBe(500);
  });
  it('is NOT operational (programmer bug / system failure)', () => {
    expect(new InternalServerError().isOperational).toBe(false);
  });
  it('defaults message', () => {
    expect(new InternalServerError().message).toBe('An unexpected internal error occurred.');
  });
  it('wraps originalError', () => {
    const original = new Error('db crash');
    const err = new InternalServerError('Server error', original);
    expect(err.originalError).toBe(original);
  });
});

describe('RateLimitError', () => {
  it('has code RATE_LIMIT_EXCEEDED', () => {
    expect(new RateLimitError().code).toBe('RATE_LIMIT_EXCEEDED');
  });
  it('has statusCode 429', () => {
    expect(new RateLimitError().statusCode).toBe(429);
  });
  it('is operational', () => {
    expect(new RateLimitError().isOperational).toBe(true);
  });
  it('defaults message', () => {
    expect(new RateLimitError().message).toBe('Rate limit exceeded');
  });
  it('stores details', () => {
    const err = new RateLimitError('too many', { tenantId: 't1', limit: 1000 });
    expect(err.details.tenantId).toBe('t1');
  });
});

describe('ExternalServiceError', () => {
  it('has code EXTERNAL_SERVICE_ERROR', () => {
    expect(new ExternalServiceError('fail').code).toBe('EXTERNAL_SERVICE_ERROR');
  });
  it('has statusCode 502', () => {
    expect(new ExternalServiceError('fail').statusCode).toBe(502);
  });
  it('is operational', () => {
    expect(new ExternalServiceError('fail').isOperational).toBe(true);
  });
  it('stores upstream details', () => {
    const err = new ExternalServiceError('Nextcloud failed', { upstream: 500, service: 'nextcloud' });
    expect(err.details.service).toBe('nextcloud');
  });
});

describe('SlaViolationError', () => {
  it('has code SLA_VIOLATION', () => {
    expect(new SlaViolationError('expired').code).toBe('SLA_VIOLATION');
  });
  it('has statusCode 403 (inherits ForbiddenError)', () => {
    expect(new SlaViolationError('expired').statusCode).toBe(403);
  });
  it('is operational', () => {
    expect(new SlaViolationError('expired').isOperational).toBe(true);
  });
  it('is instance of ForbiddenError', () => {
    expect(new SlaViolationError('expired')).toBeInstanceOf(ForbiddenError);
  });
});

describe('TicketLimitExceededError', () => {
  it('has code TICKET_LIMIT_EXCEEDED', () => {
    expect(new TicketLimitExceededError('limit reached').code).toBe('TICKET_LIMIT_EXCEEDED');
  });
  it('has statusCode 403 (inherits ForbiddenError)', () => {
    expect(new TicketLimitExceededError('limit reached').statusCode).toBe(403);
  });
  it('is operational', () => {
    expect(new TicketLimitExceededError('limit reached').isOperational).toBe(true);
  });
  it('is instance of ForbiddenError', () => {
    expect(new TicketLimitExceededError('limit reached')).toBeInstanceOf(ForbiddenError);
  });
  it('stores quota details', () => {
    const err = new TicketLimitExceededError('limit', { current: 5, limit: 5 });
    expect(err.details.current).toBe(5);
  });
});

describe('InvalidTransitionError', () => {
  it('has code INVALID_STATUS_TRANSITION', () => {
    expect(new InvalidTransitionError('bad transition').code).toBe('INVALID_STATUS_TRANSITION');
  });
  it('has statusCode 400 (inherits ValidationError)', () => {
    expect(new InvalidTransitionError('bad transition').statusCode).toBe(400);
  });
  it('is operational', () => {
    expect(new InvalidTransitionError('bad transition').isOperational).toBe(true);
  });
  it('is instance of ValidationError', () => {
    expect(new InvalidTransitionError('bad transition')).toBeInstanceOf(ValidationError);
  });
});

describe('InvalidFileTypeError', () => {
  it('has code INVALID_FILE_TYPE', () => {
    expect(new InvalidFileTypeError('not allowed').code).toBe('INVALID_FILE_TYPE');
  });
  it('has statusCode 400 (inherits ValidationError)', () => {
    expect(new InvalidFileTypeError('not allowed').statusCode).toBe(400);
  });
  it('is operational', () => {
    expect(new InvalidFileTypeError('not allowed').isOperational).toBe(true);
  });
  it('is instance of ValidationError', () => {
    expect(new InvalidFileTypeError('not allowed')).toBeInstanceOf(ValidationError);
  });
});
