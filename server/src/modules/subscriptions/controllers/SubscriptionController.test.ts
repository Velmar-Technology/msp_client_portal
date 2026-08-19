import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';

const mocks = vi.hoisted(() => {
  return {
    getClientSubscriptions: vi.fn(),
    getSubscriptionById: vi.fn(),
    createSubscription: vi.fn(),
    updateSubscription: vi.fn(),
    getClientTenantId: vi.fn(),
    userFindById: vi.fn(),
  };
});

vi.mock('@modules/subscriptions/services/SubscriptionService', () => {
  return {
    subscriptionService: {
      getClientSubscriptions: mocks.getClientSubscriptions,
      getSubscriptionById: mocks.getSubscriptionById,
      createSubscription: mocks.createSubscription,
      updateSubscription: mocks.updateSubscription,
      getClientTenantId: mocks.getClientTenantId,
    },
  };
});

vi.mock('@modules/auth/repositories/UserRepository', () => {
  return {
    userRepository: {
      findById: mocks.userFindById,
    },
  };
});

import { subscriptionController } from './SubscriptionController';

describe('SubscriptionController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return client subscriptions for tenantId', async () => {
      const mockSubs = [{ id: 'sub-1', tenant_id: 'tenant-123' }];
      mocks.getClientSubscriptions.mockResolvedValue(mockSubs);

      const req = {
        user: { tenantId: 'tenant-123' },
      } as unknown as Request;
      const res = {
        json: vi.fn(),
      } as unknown as Response;

      await subscriptionController.getAll(req, res);

      expect(mocks.getClientSubscriptions).toHaveBeenCalledWith('tenant-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSubs,
      });
    });
  });

  describe('getById', () => {
    it('should return subscription details', async () => {
      const mockSub = { id: 'sub-1', tenant_id: 'tenant-123' };
      mocks.getSubscriptionById.mockResolvedValue(mockSub);

      const req = {
        params: { id: 'sub-1' },
        user: { tenantId: 'tenant-123' },
      } as unknown as Request;
      const res = {
        json: vi.fn(),
      } as unknown as Response;

      await subscriptionController.getById(req, res);

      expect(mocks.getSubscriptionById).toHaveBeenCalledWith('sub-1', 'tenant-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSub,
      });
    });
  });

  describe('create', () => {
    const input = {
      serviceName: 'Premium Helpdesk',
      plan: 'PL-001',
      equipmentCount: 3,
    };

    it('should use caller userId when roles is CLIENT', async () => {
      const mockSub = { id: 'sub-1', client_id: 'client-123' };
      mocks.createSubscription.mockResolvedValue(mockSub);

      const req = {
        body: { ...input, clientId: 'client-456' }, // CLIENT shouldn't override
        user: { userId: 'client-123', tenantId: 'tenant-123', role: 'CLIENT' },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await subscriptionController.create(req, res);

      expect(mocks.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining(input),
        'client-123', // Matches req.user.userId
        'tenant-123',
        false
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSub,
      });
    });

    it('should use specified clientId when roles is ADMIN and clientId is provided', async () => {
      const mockSub = { id: 'sub-1', client_id: 'client-456' };
      mocks.createSubscription.mockResolvedValue(mockSub);
      mocks.getClientTenantId.mockResolvedValue('tenant-456');

      const req = {
        body: { ...input, clientId: 'client-456' }, // ADMIN overrides
        user: { userId: 'admin-123', tenantId: 'tenant-123', role: 'ADMIN' },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await subscriptionController.create(req, res);

      expect(mocks.getClientTenantId).toHaveBeenCalledWith('client-456');
      expect(mocks.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining(input),
        'client-456', // Matches req.body.clientId
        'tenant-456', // Matches clientUser.tenant_id
        true
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should fallback to admin userId when roles is ADMIN but clientId is missing', async () => {
      const mockSub = { id: 'sub-1', client_id: 'admin-123' };
      mocks.createSubscription.mockResolvedValue(mockSub);

      const req = {
        body: input,
        user: { userId: 'admin-123', tenantId: 'tenant-123', role: 'ADMIN' },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await subscriptionController.create(req, res);

      expect(mocks.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining(input),
        'admin-123',
        'tenant-123',
        false
      );
    });
  });

  describe('update', () => {
    it('should update subscription details', async () => {
      const mockSub = { id: 'sub-1', plan: 'PL-002' };
      mocks.updateSubscription.mockResolvedValue(mockSub);

      const req = {
        params: { id: 'sub-1' },
        body: { plan: 'PL-002' },
        user: { tenantId: 'tenant-123' },
      } as unknown as Request;
      const res = {
        json: vi.fn(),
      } as unknown as Response;

      await subscriptionController.update(req, res);

      expect(mocks.updateSubscription).toHaveBeenCalledWith(
        'sub-1',
        { plan: 'PL-002' },
        'tenant-123',
        false
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSub,
      });
    });
  });
});
