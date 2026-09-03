import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  requestIdMiddleware,
  getRequestContext,
  parseTraceparent,
} from './requestIdMiddleware';

describe('requestIdMiddleware & W3C Trace Propagation', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  const headersSet: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(headersSet)) {
      delete headersSet[key];
    }
    req = {
      headers: {},
      method: 'GET',
      url: '/api/v1/health',
      get: vi.fn().mockReturnValue('test-agent'),
      ip: '127.0.0.1',
    };
    res = {
      setHeader: vi.fn().mockImplementation((key: string, val: string) => {
        headersSet[key.toLowerCase()] = val;
      }),
      on: vi.fn(),
      statusCode: 200,
    };
    next = vi.fn();
  });

  it('generates a new UUID v4 request ID when X-Request-Id header is absent', () => {
    let capturedId: string | undefined;

    next = vi.fn().mockImplementation(() => {
      capturedId = getRequestContext()?.requestId;
    });

    requestIdMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
    expect(capturedId).toBeDefined();
    expect(capturedId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('propagates existing X-Request-Id header from client', () => {
    const existingId = 'client-req-999888';
    req.headers = { 'x-request-id': existingId };

    let capturedId: string | undefined;
    next = vi.fn().mockImplementation(() => {
      capturedId = getRequestContext()?.requestId;
    });

    requestIdMiddleware(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', existingId);
    expect(capturedId).toBe(existingId);
  });

  it('parses valid W3C traceparent headers', () => {
    const validHeader = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const parsed = parseTraceparent(validHeader);

    expect(parsed.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(parsed.spanId).toBe('00f067aa0ba902b7');
  });

  it('handles malformed traceparent headers gracefully', () => {
    expect(parseTraceparent(undefined)).toEqual({});
    expect(parseTraceparent('invalid-trace-string')).toEqual({});
    expect(parseTraceparent('')).toEqual({});
  });

  it('captures Datadog trace header or W3C trace context into async request context', () => {
    req.headers = {
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      'x-tenant-id': 'tenant-test-123',
    };

    let ctx: any;
    next = vi.fn().mockImplementation(() => {
      ctx = getRequestContext();
    });

    requestIdMiddleware(req as Request, res as Response, next);

    expect(ctx?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(ctx?.spanId).toBe('00f067aa0ba902b7');
    expect(ctx?.tenantId).toBe('tenant-test-123');
  });
});
