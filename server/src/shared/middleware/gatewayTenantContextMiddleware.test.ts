import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { gatewayTenantContextMiddleware, isPublicOrSystemRoute } from './gatewayTenantContextMiddleware';
import { getTenantContext } from '@shared/db/tenantContext';
import { ForbiddenError } from '@shared/errors';

describe('gatewayTenantContextMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      path: '/api/v1/tickets',
      headers: {},
    };
    res = {};
    next = vi.fn();
  });

  it('allows public health and auth routes without tenant context', () => {
    expect(isPublicOrSystemRoute('/api/v1/health')).toBe(true);
    expect(isPublicOrSystemRoute('/api/v1/auth/login')).toBe(true);
    expect(isPublicOrSystemRoute('/api/v1/tickets/agent')).toBe(true);
    expect(isPublicOrSystemRoute('/api/v1/tickets/123e4567-e89b-12d3-a456-426614174000/responses/agent')).toBe(true);
    expect(isPublicOrSystemRoute('/api/v1/tickets')).toBe(false);

    req.path = '/api/v1/health';
    gatewayTenantContextMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('throws ForbiddenError 403 when tenant route is accessed without tenantId', () => {
    req.path = '/api/v1/tickets';
    req.headers = {};

    gatewayTenantContextMiddleware(req as Request, res as Response, next);

    const err = (next as any).mock.calls[0][0];
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain('TENANT_CONTEXT_REQUIRED');
  });

  it('binds tenantId and user metadata into AsyncLocalStorage for valid tenant requests', () => {
    req.path = '/api/v1/tickets';
    req.headers = {
      'x-tenant-id': 'tenant-uuid-1234',
      'x-user-id': 'user-uuid-5678',
    };
    req.user = {
      role: 'CLIENT',
      userId: 'user-uuid-5678',
      tenantId: 'tenant-uuid-1234',
    };

    let capturedContext: any;
    next = vi.fn().mockImplementation(() => {
      capturedContext = getTenantContext();
    });

    gatewayTenantContextMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(capturedContext).toEqual({
      tenantId: 'tenant-uuid-1234',
      userId: 'user-uuid-5678',
      role: 'CLIENT',
      isSystemAdmin: false,
    });
  });

  it('sets isSystemAdmin to true when user role is ADMIN', () => {
    req.path = '/api/v1/tickets';
    req.headers = { 'x-tenant-id': 'admin-tenant' };
    req.user = { role: 'ADMIN', userId: 'admin-1', tenantId: 'admin-tenant' };

    let capturedContext: any;
    next = vi.fn().mockImplementation(() => {
      capturedContext = getTenantContext();
    });

    gatewayTenantContextMiddleware(req as Request, res as Response, next);

    expect(capturedContext?.isSystemAdmin).toBe(true);
  });
});
