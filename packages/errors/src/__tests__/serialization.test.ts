import { describe, it, expect } from 'vitest';
import { serializeError } from '../serialization';
import { ValidationError } from '../domain-errors';
import { AppError } from '../base-error';

describe('serializeError', () => {
  it('serializes an AppError with success: false', () => {
    const err = new ValidationError('bad input', { field: 'email' });
    const result = serializeError(err, false);

    expect(result.success).toBe(false);
    expect(result.code).toBe('VALIDATION_ERROR');
    expect(result.message).toBe('bad input');
    expect(result.correlationId).toMatch(/^err_/);
    expect(result.details?.field).toBe('email');
  });

  it('wraps a non-AppError into InternalServerError', () => {
    const result = serializeError(new Error('raw'), false);
    expect(result.code).toBe('INTERNAL_SERVER_ERROR');
    expect(result.message).toBe('An internal server error occurred. Please contact support.');
    expect(result.correlationId).toMatch(/^err_/);
  });

  it('wraps a non-Error value into InternalServerError', () => {
    const result = serializeError('string error', false);
    expect(result.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('masks non-operational error messages in production', () => {
    const err = new (class extends AppError {
      public readonly code = 'DB_ERROR';
      public readonly statusCode = 500;
      constructor() {
        super({ message: 'Connection pool exhausted', isOperational: false });
      }
    })();

    const prod = serializeError(err, true);
    expect(prod.message).toBe('An internal server error occurred. Please contact support.');
    expect(prod.stack).toBeUndefined();
  });

  it('includes stack trace in development mode', () => {
    const err = new ValidationError('test');
    const result = serializeError(err, false);
    expect(result.stack).toBeDefined();
    expect(result.stack).toContain('ValidationError');
  });

  it('excludes stack trace in production mode', () => {
    const err = new ValidationError('test');
    const result = serializeError(err, true);
    expect(result.stack).toBeUndefined();
  });

  it('includes originalError details in development', () => {
    const original = new Error('root cause');
    const err = new ValidationError('test', {}, original);
    const result = serializeError(err, false);

    expect(result.details?.originalError).toBeDefined();
    expect(result.details!.originalError.name).toBe('Error');
    expect(result.details!.originalError.message).toBe('root cause');
  });

  it('excludes originalError details in production', () => {
    const original = new Error('root cause');
    const err = new ValidationError('test', {}, original);
    const result = serializeError(err, true);

    expect(result.details?.originalError).toBeUndefined();
  });

  it('omits details key entirely when empty and no original error', () => {
    const err = new ValidationError('clean');
    const result = serializeError(err, false);
    expect(result.details).toBeUndefined();
  });
});
