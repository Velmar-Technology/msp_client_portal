import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authorize } from './authzMiddleware';
import { UserRole } from '@shared/types';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';

describe('authzMiddleware (Universal SOTA Authorization Middleware)', () => {
  it('throws UnauthorizedError when req.user is absent', async () => {
    const middleware = authorize('read', 'ticket');
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await expect(middleware(req, res, next)).rejects.toThrow(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows access for ADMIN users on any resource', async () => {
    const middleware = authorize('delete', 'invoice');
    const req = {
      user: { userId: 'admin-1', email: 'admin@example.com', role: UserRole.ADMIN, tenantId: 'tenant-msp' },
      params: { id: 'inv-123' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('permits CLIENT reading their own resource in their tenant', async () => {
    const middleware = authorize('read', 'ticket', (req) => ({
      id: req.params.id,
      tenantId: 'tenant-client',
      ownerId: 'usr-client',
    }));

    const req = {
      user: { userId: 'usr-client', email: 'client@example.com', role: UserRole.CLIENT, tenantId: 'tenant-client' },
      params: { id: 'ticket-999' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('throws ForbiddenError when CLIENT attempts cross-tenant operation', async () => {
    const middleware = authorize('read', 'ticket', (req) => ({
      id: req.params.id,
      tenantId: 'tenant-other',
      ownerId: 'other-user',
    }));

    const req = {
      user: { userId: 'usr-client', email: 'client@example.com', role: UserRole.CLIENT, tenantId: 'tenant-client' },
      params: { id: 'ticket-cross' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await expect(middleware(req, res, next)).rejects.toThrow(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });

  it('throws ForbiddenError when CLIENT account is in READ_ONLY state attempting writes', async () => {
    const middleware = authorize('create', 'ticket');
    const req = {
      user: {
        userId: 'usr-client',
        email: 'client@example.com',
        role: UserRole.CLIENT,
        tenantId: 'tenant-client',
        accountStatus: 'READ_ONLY',
      },
      params: {},
      body: {},
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await expect(middleware(req, res, next)).rejects.toThrow(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });
});
