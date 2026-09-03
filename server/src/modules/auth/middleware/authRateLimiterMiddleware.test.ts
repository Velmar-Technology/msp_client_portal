import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  authLoginRateLimiter,
  authRegisterRateLimiter,
  authPasswordResetRateLimiter,
} from './authRateLimiterMiddleware';
import { resetRateLimitStore } from '@shared/middleware/gatewayRateLimiterMiddleware';
import { RateLimitError } from '@shared/errors';

describe('Auth Rate Limiter Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(async () => {
    vi.clearAllMocks();
    await resetRateLimitStore();
    req = {
      ip: '192.168.1.100',
      body: {},
      headers: {},
    };
    res = {
      setHeader: vi.fn(),
    };
    next = vi.fn();
  });

  describe('authLoginRateLimiter — Brute Force Protection', () => {
    it('allows up to 5 login attempts per IP and account, then throws RateLimitError', async () => {
      req.body = { email: 'victim@company.com' };

      // 5 attempts allowed
      for (let i = 0; i < 5; i++) {
        await authLoginRateLimiter(req as Request, res as Response, next);
        expect(next).toHaveBeenLastCalledWith();
      }

      // 6th attempt blocked
      await authLoginRateLimiter(req as Request, res as Response, next);
      const err = (next as any).mock.calls[5][0];
      expect(err).toBeInstanceOf(RateLimitError);
      expect(err.statusCode).toBe(429);
      expect(err.message).toContain('Too many login attempts');
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('tracks attempts independently per target email account', async () => {
      // 5 attempts against account A
      req.body = { email: 'userA@company.com' };
      for (let i = 0; i < 5; i++) {
        await authLoginRateLimiter(req as Request, res as Response, next);
      }
      // 6th attempt against account A is blocked
      await authLoginRateLimiter(req as Request, res as Response, next);
      expect((next as any).mock.calls[5][0]).toBeInstanceOf(RateLimitError);

      // Attempt against account B from same IP is allowed
      req.body = { email: 'userB@company.com' };
      await authLoginRateLimiter(req as Request, res as Response, next);
      expect(next).toHaveBeenLastCalledWith();
    });
  });

  describe('authRegisterRateLimiter — Registration Flood Control', () => {
    it('enforces limit per IP address', async () => {
      req.ip = '10.0.0.50';

      for (let i = 0; i < 10; i++) {
        await authRegisterRateLimiter(req as Request, res as Response, next);
        expect(next).toHaveBeenLastCalledWith();
      }

      // 11th request blocked
      await authRegisterRateLimiter(req as Request, res as Response, next);
      const err = (next as any).mock.calls[10][0];
      expect(err).toBeInstanceOf(RateLimitError);
      expect(err.statusCode).toBe(429);
      expect(err.message).toContain('Too many registration requests');
    });
  });

  describe('authPasswordResetRateLimiter', () => {
    it('blocks repeated password reset attempts after threshold', async () => {
      req.body = { email: 'target@msp.com' };

      for (let i = 0; i < 5; i++) {
        await authPasswordResetRateLimiter(req as Request, res as Response, next);
      }

      await authPasswordResetRateLimiter(req as Request, res as Response, next);
      const err = (next as any).mock.calls[5][0];
      expect(err).toBeInstanceOf(RateLimitError);
      expect(err.statusCode).toBe(429);
      expect(err.message).toContain('Too many password reset attempts');
    });
  });
});
