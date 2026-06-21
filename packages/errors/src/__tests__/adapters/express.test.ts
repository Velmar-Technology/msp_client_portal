import { describe, it, expect, vi } from 'vitest';
import { createExpressErrorMiddleware } from '../../adapters/express';
import { ValidationError, InternalServerError } from '../../domain-errors';
import type { Request, Response } from 'express';

function mockReq(overrides: Partial<Request> = {}): Request {
  return { method: 'GET', originalUrl: '/test', ...overrides } as Request;
}

function mockRes(): Response {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('createExpressErrorMiddleware', () => {
  it('responds with the correct status code for AppError subclasses', () => {
    const handler = createExpressErrorMiddleware();
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    handler(new ValidationError('bad'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'VALIDATION_ERROR' })
    );
  });

  it('responds with 500 for non-AppError errors', () => {
    const handler = createExpressErrorMiddleware();
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    handler(new Error('generic'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INTERNAL_SERVER_ERROR' })
    );
  });

  it('calls logger.warn for operational errors (status < 500)', () => {
    const logger = { error: vi.fn(), warn: vi.fn() };
    const handler = createExpressErrorMiddleware({ logger });
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    handler(new ValidationError('bad'), req, res, next);

    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('calls logger.error for critical errors (status >= 500)', () => {
    const logger = { error: vi.fn(), warn: vi.fn() };
    const handler = createExpressErrorMiddleware({ logger });
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    handler(new InternalServerError(), req, res, next);

    expect(logger.error).toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('masks stack in production when isProduction=true', () => {
    const handler = createExpressErrorMiddleware({ isProduction: true });
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    handler(new ValidationError('bad'), req, res, next);

    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.stack).toBeUndefined();
  });

  it('includes stack in development when isProduction=false', () => {
    const handler = createExpressErrorMiddleware({ isProduction: false });
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    handler(new ValidationError('bad'), req, res, next);

    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.stack).toBeDefined();
  });

  it('does not call next', () => {
    const handler = createExpressErrorMiddleware();
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    handler(new ValidationError('bad'), req, res, next);

    expect(next).not.toHaveBeenCalled();
  });
});
