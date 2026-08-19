import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { gatewayAuthMiddleware } from './gatewayAuthMiddleware';
import { createGatewayRateLimiter, resetRateLimitStore } from './gatewayRateLimiterMiddleware';
import { gatewayHeaderPropagatorMiddleware } from './gatewayRouterMiddleware';
import { userRepository } from '../repositories/UserRepository';
import { AppError } from '../utils/AppError';

vi.mock('../repositories/UserRepository', () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

describe('API Gateway Layer Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStore();
    req = {
      headers: {},
      ip: '127.0.0.1',
    };
    res = {
      setHeader: vi.fn(),
    };
    next = vi.fn();
  });

  describe('gatewayAuthMiddleware — Ingress Header Injection', () => {
    it('decodes Bearer JWT and injects X-User-Id and X-Tenant-Id downstream headers', async () => {
      const payload = { userId: 'user-100', tenantId: 'tenant-500', role: 'CLIENT' };
      const token = jwt.sign(payload, env.JWT_SECRET);
      req.headers = { authorization: `Bearer ${token}` };

      await gatewayAuthMiddleware(req as Request, res as Response, next);

      expect(req.headers['x-user-id']).toBe('user-100');
      expect(req.headers['x-tenant-id']).toBe('tenant-500');
      expect(req.user).toMatchObject(payload);
      expect(next).toHaveBeenCalled();
    });

    it('falls back to fetching tenantId from UserRepository if missing in token', async () => {
      const payload = { userId: 'user-100', role: 'CLIENT' };
      const token = jwt.sign(payload, env.JWT_SECRET);
      req.headers = { authorization: `Bearer ${token}` };

      vi.mocked(userRepository.findById).mockResolvedValueOnce({
        id: 'user-100',
        tenant_id: 'tenant-repo-777',
      } as any);

      await gatewayAuthMiddleware(req as Request, res as Response, next);

      expect(userRepository.findById).toHaveBeenCalledWith('user-100');
      expect(req.headers['x-user-id']).toBe('user-100');
      expect(req.headers['x-tenant-id']).toBe('tenant-repo-777');
      expect(next).toHaveBeenCalled();
    });

    it('allows unauthenticated requests to proceed cleanly without setting headers', async () => {
      await gatewayAuthMiddleware(req as Request, res as Response, next);

      expect(req.headers['x-user-id']).toBeUndefined();
      expect(req.headers['x-tenant-id']).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('gatewayRateLimiterMiddleware — Multi-Tenant Rate Limiting', () => {
    it('allows requests within limit and attaches rate limit headers', () => {
      const limiter = createGatewayRateLimiter({ windowMs: 60000, maxRequests: 2 });
      req.headers = { 'x-tenant-id': 'tenant-alpha' };

      // Request 1
      limiter(req as Request, res as Response, next);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '2');
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '1');
      expect(next).toHaveBeenLastCalledWith();

      // Request 2
      limiter(req as Request, res as Response, next);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
      expect(next).toHaveBeenLastCalledWith();
    });

    it('throws AppError 429 when rate limit is exceeded for a tenant', () => {
      const limiter = createGatewayRateLimiter({ windowMs: 60000, maxRequests: 2 });
      req.headers = { 'x-tenant-id': 'tenant-alpha' };

      // Request 1 & 2
      limiter(req as Request, res as Response, next);
      limiter(req as Request, res as Response, next);

      // Request 3 (Exceeds limit)
      limiter(req as Request, res as Response, next);
      const err = (next as any).mock.calls[2][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('TOO_MANY_REQUESTS');
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('isolates rate limits per tenant ID so noisy neighbors do not affect others', () => {
      const limiter = createGatewayRateLimiter({ windowMs: 60000, maxRequests: 1 });

      // Tenant A request 1
      req.headers = { 'x-tenant-id': 'tenant-A' };
      limiter(req as Request, res as Response, next);
      expect(next).toHaveBeenLastCalledWith();

      // Tenant A request 2 (blocked)
      limiter(req as Request, res as Response, next);
      const err = (next as any).mock.calls[1][0];
      expect(err.statusCode).toBe(429);

      // Tenant B request 1 (allowed)
      req.headers = { 'x-tenant-id': 'tenant-B' };
      limiter(req as Request, res as Response, next);
      expect(next).toHaveBeenLastCalledWith();
    });
  });

  describe('gatewayHeaderPropagatorMiddleware — Header Propagation', () => {
    it('propagates userId and tenantId from req.user to headers', () => {
      req.user = { userId: 'u-99', tenantId: 't-99', role: 'ADMIN' };

      gatewayHeaderPropagatorMiddleware(req as Request, res as Response, next);

      expect(req.headers['x-user-id']).toBe('u-99');
      expect(req.headers['x-tenant-id']).toBe('t-99');
      expect(next).toHaveBeenCalled();
    });
  });
});
