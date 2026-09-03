import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VaultwardenService } from './VaultwardenService';
import { env } from '@shared/config/env';
import { ExternalServiceError } from '@shared/errors';

describe('VaultwardenService', () => {
  let service: VaultwardenService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new VaultwardenService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('createOrganization', () => {
    it('returns simulated organization when VAULTWARDEN_ADMIN_TOKEN is missing', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = '';

      const res = await service.createOrganization('Acme Corp', 'admin@acme.com');
      expect(res.name).toBe('Acme Corp');
      expect(res.billingEmail).toBe('admin@acme.com');
      expect(res.id).toMatch(/^vw_org_/);

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('creates organization via REST API when token is set', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ Id: 'real-org-123', Name: 'Acme Corp' }),
      } as any);

      const res = await service.createOrganization('Acme Corp', 'admin@acme.com');
      expect(res.id).toBe('real-org-123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/organizations'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-admin-token',
          }),
        })
      );

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('throws ExternalServiceError when upstream API fails', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as any);

      await expect(service.createOrganization('Acme Corp', 'admin@acme.com')).rejects.toThrow(
        ExternalServiceError
      );

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });
  });

  describe('inviteUserToOrganization', () => {
    it('invites user via API', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      } as any);

      const res = await service.inviteUserToOrganization('org-123', 'user@acme.com', 'User');
      expect(res.invited).toBe(true);
      expect(res.email).toBe('user@acme.com');

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });
  });

  describe('deactivateOrganizationUsers (BL-702 Day 15)', () => {
    it('deactivates member users upon non-payment suspension', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi
        .fn()
        .mockImplementation(async (_: string, init?: any) => {
          if (init?.method === 'GET') {
            return {
              ok: true,
              json: async () => ({
                Data: [{ Id: 'u1', Status: 1 }, { Id: 'u2', Status: 1 }],
              }),
            };
          }
          return { ok: true };
        });

      const count = await service.deactivateOrganizationUsers('org-123');
      expect(count).toBe(2);

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });
  });

  describe('deleteOrganization (BL-702 Day 30 Purge)', () => {
    it('deletes organization cleanly', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      } as any);

      const purged = await service.deleteOrganization('org-123');
      expect(purged).toBe(true);

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });
  });

  describe('resetUserVaultAccess', () => {
    it('returns simulated success when token is not configured', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = '';

      const res = await service.resetUserVaultAccess('org-123', 'jane@acme.com');
      expect(res.success).toBe(true);
      expect(res.message).toContain('Simulated reset invitation');

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('removes stale user, deletes global user, and issues fresh invite', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      const fetchCalls: Array<{ url: string; method: string }> = [];
      global.fetch = vi.fn().mockImplementation(async (url: string, init?: any) => {
        const method = init?.method || 'GET';
        fetchCalls.push({ url, method });

        if (url.includes('/api/organizations/org-123/users') && method === 'GET') {
          return {
            ok: true,
            json: async () => ({ Data: [{ Id: 'user-member-1', Email: 'jane@acme.com' }] }),
          };
        }
        if (url.includes('/admin/users') && method === 'GET') {
          return {
            ok: true,
            json: async () => [{ Id: 'user-global-1', Email: 'jane@acme.com' }],
          };
        }
        return { ok: true, json: async () => ({}) };
      });

      const res = await service.resetUserVaultAccess('org-123', 'jane@acme.com');
      expect(res.success).toBe(true);
      expect(res.message).toContain('fresh invitation has been dispatched');

      // Verify sequence
      expect(fetchCalls.some((c) => c.url.includes('/api/organizations/org-123/users/user-member-1') && c.method === 'DELETE')).toBe(true);
      expect(fetchCalls.some((c) => c.url.includes('/admin/users/user-global-1/delete') && c.method === 'POST')).toBe(true);
      expect(fetchCalls.some((c) => c.url.includes('/api/organizations/org-123/users/invite') && c.method === 'POST')).toBe(true);

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('throws ExternalServiceError if re-invite fails', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockImplementation(async (url: string, _?: any) => {
        if (url.includes('/api/organizations/org-123/users/invite')) {
          return { ok: false, status: 502 };
        }
        return { ok: true, json: async () => [] };
      });

      await expect(service.resetUserVaultAccess('org-123', 'jane@acme.com')).rejects.toThrow(
        ExternalServiceError
      );

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });
  });
});
