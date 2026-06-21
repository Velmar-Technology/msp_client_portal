import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
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
