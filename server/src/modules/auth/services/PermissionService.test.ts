import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionService } from './PermissionService';
import { UserRole } from '@shared/types';

describe('PermissionService', () => {
  let mockPermRepo: any;
  let mockCache: any;
  let service: PermissionService;

  beforeEach(() => {
    mockPermRepo = {
      getUserPermissions: vi.fn(),
      getUserRoles: vi.fn(),
      getRolesForTenant: vi.fn(),
      getAllPermissions: vi.fn(),
      assignRoleToUser: vi.fn(),
      removeRoleFromUser: vi.fn(),
    };

    mockCache = {
      wrapVersioned: vi.fn(async (_ns, _scope, _id, _ttl, fetcher) => fetcher()),
      del: vi.fn(),
      invalidateScope: vi.fn(),
    };

    service = new PermissionService(mockPermRepo, mockCache);
  });

  describe('getUserPermissions', () => {
    it('returns empty array when userId or tenantId is missing', async () => {
      const res = await service.getUserPermissions('', '');
      expect(res).toEqual([]);
    });

    it('returns database permissions when present', async () => {
      mockPermRepo.getUserPermissions.mockResolvedValue(['crm:leads:read', 'tickets:read']);

      const res = await service.getUserPermissions('user-1', 'tenant-1');
      expect(res).toEqual(['crm:leads:read', 'tickets:read']);
      expect(mockCache.wrapVersioned).toHaveBeenCalled();
    });

    it('supplements ADMIN users with all system permissions', async () => {
      mockPermRepo.getUserPermissions.mockResolvedValue(['custom:perm']);

      const res = await service.getUserPermissions('admin-user', 'tenant-1', UserRole.ADMIN);
      expect(res).toContain('custom:perm');
      expect(res).toContain('crm:leads:read');
      expect(res).toContain('users:manage');
      expect(res).toContain('system:audit');
    });

    it('falls back to default permissions based on legacy role when DB yields none', async () => {
      mockPermRepo.getUserPermissions.mockResolvedValue([]);

      const adminPerms = await service.getUserPermissions('u1', 't1', UserRole.ADMIN);
      expect(adminPerms).toContain('crm:leads:read');

      const techPerms = await service.getUserPermissions('u2', 't1', UserRole.TECHNICIAN);
      expect(techPerms).toContain('tickets:manage');
      expect(techPerms).not.toContain('roles:manage');

      const clientPerms = await service.getUserPermissions('u3', 't1', UserRole.CLIENT);
      expect(clientPerms).toContain('tickets:create');
      expect(clientPerms).not.toContain('tickets:manage');
    });
  });

  describe('hasPermission & hasAnyPermission', () => {
    it('verifies exact capability match', async () => {
      mockPermRepo.getUserPermissions.mockResolvedValue(['crm:leads:read']);

      const hasRead = await service.hasPermission('u1', 't1', 'crm:leads:read');
      const hasWrite = await service.hasPermission('u1', 't1', 'crm:leads:write');

      expect(hasRead).toBe(true);
      expect(hasWrite).toBe(false);
    });

    it('verifies any capability match', async () => {
      mockPermRepo.getUserPermissions.mockResolvedValue(['crm:leads:read']);

      const matched = await service.hasAnyPermission('u1', 't1', ['crm:leads:write', 'crm:leads:read']);
      const unmatched = await service.hasAnyPermission('u1', 't1', ['crm:leads:write', 'system:audit']);

      expect(matched).toBe(true);
      expect(unmatched).toBe(false);
    });
  });

  describe('invalidation', () => {
    it('deletes specific user cache key', async () => {
      await service.invalidateUserPermissions('u1', 't1');
      expect(mockCache.del).toHaveBeenCalledWith('rbac:t1:perms:u1');
    });

    it('invalidates entire tenant rbac scope', async () => {
      await service.invalidateTenantPermissions('t1');
      expect(mockCache.invalidateScope).toHaveBeenCalledWith('rbac', 't1');
    });
  });
});
