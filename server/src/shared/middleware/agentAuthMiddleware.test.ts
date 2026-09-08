import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { agentAuthMiddleware } from './agentAuthMiddleware';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';
import { equipmentRepository } from '@modules/equipment';

vi.mock('@modules/equipment', () => ({
  equipmentRepository: {
    findByAgentToken: vi.fn(),
  },
}));

describe('agentAuthMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      headers: {},
      query: {},
    };
    res = {};
    next = vi.fn();
  });

  it('calls next with UnauthorizedError when Authorization header is missing', async () => {
    await agentAuthMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as any).mock.calls[0][0];
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.message).toContain('Missing or invalid agent authorization header');
  });

  it('calls next with UnauthorizedError when header does not use Bearer scheme', async () => {
    req.headers = { authorization: 'Basic dXNlcjpwYXNz' };

    await agentAuthMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as any).mock.calls[0][0];
    expect(error).toBeInstanceOf(UnauthorizedError);
  });

  it('calls next with ForbiddenError when token is not found in database', async () => {
    req.headers = { authorization: 'Bearer invalid-token-123' };
    vi.mocked(equipmentRepository.findByAgentToken).mockResolvedValue(null);

    await agentAuthMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as any).mock.calls[0][0];
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.message).toContain('Invalid or unrecognized agent token');
  });

  it('calls next with ForbiddenError when equipment slot is not in an active status', async () => {
    req.headers = { authorization: 'Bearer agent-token-valid' };
    vi.mocked(equipmentRepository.findByAgentToken).mockResolvedValue({
      equipment: {
        id: 'equip-111',
        status: 'DECOMMISSIONED',
        agent_hostname: 'DESKTOP-FINANCE-01',
        device_name: 'Dell OptiPlex 7090',
      } as any,
      clientId: 'user-client-123',
      tenantId: 'tenant-456',
    });

    await agentAuthMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as any).mock.calls[0][0];
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.message).toContain('is not authorized');
  });

  it('populates req.agent and calls next() with no errors for valid active equipment', async () => {
    req.headers = { authorization: 'Bearer agent-token-valid' };
    vi.mocked(equipmentRepository.findByAgentToken).mockResolvedValue({
      equipment: {
        id: 'equip-111',
        status: 'ACTIVE',
        agent_hostname: 'DESKTOP-FINANCE-01',
        device_name: 'Dell OptiPlex 7090',
      } as any,
      clientId: 'user-client-123',
      tenantId: 'tenant-456',
    });

    await agentAuthMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.headers?.['x-tenant-id']).toBe('tenant-456');
    expect(req.headers?.['x-user-id']).toBe('user-client-123');
    expect(req.agent).toEqual({
      equipmentId: 'equip-111',
      slotId: 'equip-111',
      tenantId: 'tenant-456',
      clientId: 'user-client-123',
      hostname: 'DESKTOP-FINANCE-01',
      deviceName: 'Dell OptiPlex 7090',
    });
  });

  it('accepts token provided via query parameter as fallback', async () => {
    req.query = { token: 'agent-token-valid' };
    vi.mocked(equipmentRepository.findByAgentToken).mockResolvedValue({
      equipment: {
        id: 'equip-222',
        status: 'BOUND',
        agent_hostname: 'WORKSTATION-02',
        device_name: 'Lenovo ThinkPad',
      } as any,
      clientId: 'user-client-789',
      tenantId: 'tenant-456',
    });

    await agentAuthMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.agent?.equipmentId).toBe('equip-222');
  });
});
