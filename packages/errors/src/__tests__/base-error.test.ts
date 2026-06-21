import { describe, it, expect } from 'vitest';
import { AppError } from '../base-error';

class TestError extends AppError {
  public readonly code = 'TEST_ERROR';
  public readonly statusCode = 418;

  constructor(opts?: { message?: string; details?: Record<string, any>; correlationId?: string; originalError?: unknown; isOperational?: boolean }) {
    super({
      message: opts?.message ?? 'Test error',
      details: opts?.details,
      correlationId: opts?.correlationId,
      originalError: opts?.originalError,
      isOperational: opts?.isOperational,
    });
  }
}

describe('AppError (base)', () => {
  it('sets message correctly', () => {
    const err = new TestError({ message: 'Something broke' });
    expect(err.message).toBe('Something broke');
  });

  it('generates a correlationId with err_ prefix', () => {
    const err = new TestError();
    expect(err.correlationId).toMatch(/^err_[0-9a-f]{16}$/);
  });

  it('accepts an explicit correlationId', () => {
    const err = new TestError({ correlationId: 'custom-id' });
    expect(err.correlationId).toBe('custom-id');
  });

  it('defaults isOperational to true', () => {
    const err = new TestError();
    expect(err.isOperational).toBe(true);
  });

  it('respects isOperational = false', () => {
    const err = new TestError({ isOperational: false });
    expect(err.isOperational).toBe(false);
  });

  it('defaults details to empty object', () => {
    const err = new TestError();
    expect(err.details).toEqual({});
  });

  it('stores provided details', () => {
    const details = { field: 'email', reason: 'already taken' };
    const err = new TestError({ details });
    expect(err.details).toEqual(details);
  });

  it('wraps an Error as originalError', () => {
    const original = new Error('root cause');
    const err = new TestError({ originalError: original });
    expect(err.originalError).toBe(original);
  });

  it('wraps a non-Error originalError into an Error instance', () => {
    const err = new TestError({ originalError: 'string cause' });
    expect(err.originalError).toBeInstanceOf(Error);
    expect(err.originalError!.message).toBe('string cause');
  });

  it('captures a stack trace', () => {
    const err = new TestError();
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('TestError');
  });

  it('has abstract code and statusCode overridden by subclass', () => {
    const err = new TestError();
    expect(err.code).toBe('TEST_ERROR');
    expect(err.statusCode).toBe(418);
  });

  it('sets the prototype chain correctly (instanceof)', () => {
    const err = new TestError();
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(TestError);
  });

  it('preserves name from constructor', () => {
    const err = new TestError();
    expect(err.name).toBe('TestError');
  });
});
