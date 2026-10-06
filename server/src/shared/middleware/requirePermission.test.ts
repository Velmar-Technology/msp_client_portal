import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requirePermission, requireAnyPermission } from './requirePermission';
import { permissionService } from '@modules/auth';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';
import { UserRole } from '@shared/types';

vi.mock('@modules/auth', () => ({
  permissionService: {
    getUserPermissions: vi.fn(),
  },
}));

describe('requirePermission & requireAnyPermission middlewares', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      user: {
        userId: 'u1',
        tenantId: 't1',
        role: UserRole.ADMIN,
      },
    };
    res = {};
    next = vi.fn();
  });

  describe('requirePermission', () => {
    it('throws UnauthorizedError when req.user is absent', async () => {
      req.user = undefined;
      const mw = requirePermission('crm:leads:read');

      await expect(mw(req, res, next)).rejects.toThrow(UnauthorizedError);
      expect(next).not.toHaveBeenCalled();
    });

    it('passes when user has the required permission', async () => {
      vi.mocked(permissionService.getUserPermissions).mockResolvedValue(['crm:leads:read', 'crm:leads:write']);
      const mw = requirePermission('crm:leads:read');

      await mw(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user.permissions).toEqual(['crm:leads:read', 'crm:leads:write']);
    });

    it('throws ForbiddenError when user is missing required permission', async () => {
      vi.mocked(permissionService.getUserPermissions).mockResolvedValue(['tickets:read']);
      const mw = requirePermission('crm:leads:read');

      await expect(mw(req, res, next)).rejects.toThrow(ForbiddenError);
      expect(next).not.toHaveBeenCalled();
    });

    it('passes wildcard permission (*)', async () => {
      vi.mocked(permissionService.getUserPermissions).mockResolvedValue(['*']);
      const mw = requirePermission('crm:leads:read', 'custom:perm');

      await mw(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireAnyPermission', () => {
    it('passes when at least one permission is held', async () => {
      vi.mocked(permissionService.getUserPermissions).mockResolvedValue(['crm:leads:read']);
      const mw = requireAnyPermission('crm:leads:write', 'crm:leads:read');

      await mw(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('throws ForbiddenError when none of the permissions are held', async () => {
      vi.mocked(permissionService.getUserPermissions).mockResolvedValue(['tickets:read']);
      const mw = requireAnyPermission('crm:leads:write', 'crm:leads:read');

      await expect(mw(req, res, next)).rejects.toThrow(ForbiddenError);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
