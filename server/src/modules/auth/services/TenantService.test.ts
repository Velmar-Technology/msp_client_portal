import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TenantService } from './TenantService';
import { NotFoundError } from '@shared/errors';

describe('TenantService', () => {
  let mockTenantRepo: any;
  let tenantService: TenantService;

  beforeEach(() => {
    mockTenantRepo = {
      listAll: vi.fn(),
      findById: vi.fn(),
    };
    tenantService = new TenantService(mockTenantRepo);
  });

  describe('listTenants', () => {
    it('returns sanitized list of registered tenants', async () => {
      const dummyTenants = [
        {
          id: 'tenant-1',
          name: 'Acme Corp',
          subdomain: 'acme',
          account_status: 'ACTIVE',
          created_at: new Date('2026-01-01'),
          vault_grace_extension_until: null,
        },
        {
          id: 'tenant-2',
          name: 'Beta LLC',
          subdomain: 'beta',
          account_status: 'ACTIVE',
          created_at: new Date('2026-01-02'),
          vault_grace_extension_until: null,
        },
      ];

      mockTenantRepo.listAll.mockResolvedValue(dummyTenants);

      const result = await tenantService.listTenants(50);

      expect(mockTenantRepo.listAll).toHaveBeenCalledWith(50);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'tenant-1',
        name: 'Acme Corp',
        subdomain: 'acme',
        account_status: 'ACTIVE',
        created_at: dummyTenants[0].created_at,
      });
    });
  });

  describe('getTenantById', () => {
    it('returns tenant when found', async () => {
      const dummyTenant = {
        id: 'tenant-1',
        name: 'Acme Corp',
      };
      mockTenantRepo.findById.mockResolvedValue(dummyTenant);

      const result = await tenantService.getTenantById('tenant-1');
      expect(result).toEqual(dummyTenant);
    });

    it('throws NotFoundError when tenant does not exist', async () => {
      mockTenantRepo.findById.mockResolvedValue(null);

      await expect(tenantService.getTenantById('missing-id')).rejects.toThrow(NotFoundError);
    });
  });
});
