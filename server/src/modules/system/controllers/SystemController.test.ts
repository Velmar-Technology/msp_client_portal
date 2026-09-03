import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemController } from './SystemController';
import { UnauthorizedError, ValidationError } from '@shared/errors';

describe('SystemController - resetVaultAccess', () => {
  let controller: SystemController;
  let mockSystemService: any;
  let mockVaultwardenService: any;
  let mockRes: any;

  beforeEach(() => {
    mockSystemService = {
      getApiStatus: vi.fn(),
    };
    mockVaultwardenService = {
      resetUserVaultAccess: vi.fn().mockResolvedValue({
        success: true,
        message: 'Invitation dispatched',
      }),
    };
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
    controller = new SystemController(mockSystemService, mockVaultwardenService);
  });

  it('successfully triggers reset and returns 200 JSON payload', async () => {
    const mockReq = {
      user: {
        email: 'user@tenant.com',
        tenant_id: 'tenant-uuid-1',
      },
    } as any;

    await controller.resetVaultAccess(mockReq, mockRes);

    expect(mockVaultwardenService.resetUserVaultAccess).toHaveBeenCalledWith('tenant-uuid-1', 'user@tenant.com');
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: {
        success: true,
        message: 'Invitation dispatched',
      },
    });
  });

  it('throws UnauthorizedError if user is not authenticated', async () => {
    const mockReq = {} as any;

    await expect(controller.resetVaultAccess(mockReq, mockRes)).rejects.toThrow(UnauthorizedError);
  });

  it('throws ValidationError if tenant_id is missing', async () => {
    const mockReq = {
      user: {
        email: 'user@tenant.com',
      },
    } as any;

    await expect(controller.resetVaultAccess(mockReq, mockRes)).rejects.toThrow(ValidationError);
  });
});
