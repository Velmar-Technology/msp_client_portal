import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireSubscriptionFeature } from './requireSubscriptionFeature';
import { UserRole } from '@shared/types';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';
import type { SubscriptionService } from '@modules/subscriptions';

describe('requireSubscriptionFeature middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockSubService: Partial<SubscriptionService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {};
    mockNext = vi.fn();
    mockSubService = {
      getClientActiveFeatures: vi.fn(),
    };
  });

  it('should throw UnauthorizedError if req.user is absent', async () => {
    mockReq = {};
    const middleware = requireSubscriptionFeature('PASSWORD_MANAGER', mockSubService as SubscriptionService);

    await expect(
      middleware(mockReq as Request, mockRes as Response, mockNext)
    ).rejects.toThrowError(UnauthorizedError);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should bypass feature check and call next() for ADMIN role', async () => {
    mockReq = {
      user: {
        id: 'admin-1',
        email: 'admin@velmar.com',
        role: UserRole.ADMIN,
        tenant_id: 'tenant-123',
      },
    };

    const middleware = requireSubscriptionFeature('PASSWORD_MANAGER', mockSubService as SubscriptionService);
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockSubService.getClientActiveFeatures).not.toHaveBeenCalled();
  });

  it('should bypass feature check and call next() for TECHNICIAN role', async () => {
    mockReq = {
      user: {
        id: 'tech-1',
        email: 'tech@velmar.com',
        role: UserRole.TECHNICIAN,
        tenant_id: 'tenant-123',
      },
    };

    const middleware = requireSubscriptionFeature('RMM_PATCH_MANAGEMENT', mockSubService as SubscriptionService);
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledOnce();
    expect(mockSubService.getClientActiveFeatures).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenError if CLIENT has no tenant_id', async () => {
    mockReq = {
      user: {
        id: 'client-1',
        email: 'client@example.com',
        role: UserRole.CLIENT,
        tenant_id: '' as any,
      },
    };

    const middleware = requireSubscriptionFeature('PASSWORD_MANAGER', mockSubService as SubscriptionService);

    await expect(
      middleware(mockReq as Request, mockRes as Response, mockNext)
    ).rejects.toThrowError(ForbiddenError);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenError if tenant lacks the required feature', async () => {
    mockReq = {
      user: {
        id: 'client-1',
        email: 'client@example.com',
        role: UserRole.CLIENT,
        tenant_id: 'tenant-abc',
      },
    };

    vi.mocked(mockSubService.getClientActiveFeatures!).mockResolvedValue([
      'HELPDESK_SUPPORT',
      'CLOUD_STORAGE',
    ]);

    const middleware = requireSubscriptionFeature('PASSWORD_MANAGER', mockSubService as SubscriptionService);

    await expect(
      middleware(mockReq as Request, mockRes as Response, mockNext)
    ).rejects.toThrowError(ForbiddenError);

    expect(mockSubService.getClientActiveFeatures).toHaveBeenCalledWith('tenant-abc');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next() if tenant has the required feature in active subscriptions', async () => {
    mockReq = {
      user: {
        id: 'client-1',
        email: 'client@example.com',
        role: UserRole.CLIENT,
        tenant_id: 'tenant-abc',
      },
    };

    vi.mocked(mockSubService.getClientActiveFeatures!).mockResolvedValue([
      'HELPDESK_SUPPORT',
      'PASSWORD_MANAGER',
    ]);

    const middleware = requireSubscriptionFeature('PASSWORD_MANAGER', mockSubService as SubscriptionService);
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockSubService.getClientActiveFeatures).toHaveBeenCalledWith('tenant-abc');
    expect(mockNext).toHaveBeenCalledOnce();
  });

  it('should call next() if client has a composite bundle containing the required feature', async () => {
    mockReq = {
      user: {
        id: 'client-1',
        email: 'client@example.com',
        role: UserRole.CLIENT,
        tenant_id: 'tenant-abc',
      },
    };

    vi.mocked(mockSubService.getClientActiveFeatures!).mockResolvedValue([
      'PASSWORD_DARK_WEB',
      'PASSWORD_MANAGER',
      'DARK_WEB_MONITORING',
    ]);

    const middleware = requireSubscriptionFeature('PASSWORD_MANAGER', mockSubService as SubscriptionService);
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledOnce();
  });
});
