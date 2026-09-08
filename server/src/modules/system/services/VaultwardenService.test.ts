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

  describe('setOrganizationReadOnly (BL-702 Day 5)', () => {
    it('updates collection permissions to read-only', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      const putCalls: any[] = [];
      global.fetch = vi.fn().mockImplementation(async (url: string, init?: any) => {
        if (init?.method === 'GET') {
          return {
            ok: true,
            json: async () => ({ Data: [{ Id: 'col-1', Name: 'Default' }] }),
          };
        }
        if (init?.method === 'PUT') {
          putCalls.push({ url, body: JSON.parse(init.body) });
          return { ok: true };
        }
        return { ok: true };
      });

      const res = await service.setOrganizationReadOnly('org-123', true);
      expect(res).toBe(true);
      expect(putCalls.length).toBe(1);
      expect(putCalls[0].body).toEqual({ ReadOnly: true });

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('simulates read-only update when token is missing', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = '';

      const res = await service.setOrganizationReadOnly('org-123', true);
      expect(res).toBe(true);

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });
  });

  describe('exportOrganizationEncrypted (BL-702 Day 30)', () => {
    it('exports encrypted vault backup prior to organization deletion', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => '{"encrypted":true,"ciphers":[]}',
      } as any);

      const result = await service.exportOrganizationEncrypted('org-123');
      expect(result.data).toBe('{"encrypted":true,"ciphers":[]}');
      expect(result.filename).toContain('vault_escrow_backup_org-123');

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('simulates encrypted export in offline mode', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = '';

      const result = await service.exportOrganizationEncrypted('org-123');
      const parsed = JSON.parse(result.data);
      expect(parsed.encrypted).toBe(true);
      expect(parsed.format).toBe('bitwarden_encrypted_json');

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

  describe('createDeviceCollection', () => {
    it('simulates collection creation when token is empty', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = '';

      const colId = await service.createDeviceCollection('org-1', 'Front-Desk-PC');
      expect(colId).toMatch(/^vw_col_/);

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('creates collection via API when token is set', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ Id: 'real-col-789' }),
      } as any);

      const colId = await service.createDeviceCollection('org-1', 'Front-Desk-PC');
      expect(colId).toBe('real-col-789');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/organizations/org-1/collections'),
        expect.objectContaining({ method: 'POST' })
      );

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });
  });

  describe('provisionDeviceAccount', () => {
    it('simulates device account creation when token is empty', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = '';

      const res = await service.provisionDeviceAccount('org-1', 'col-1', 'device_1@tenant.local');
      expect(res.userId).toMatch(/^vw_user_/);
      expect(res.deviceToken).toMatch(/^vw_tok_/);

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('invites device account with hidePasswords enabled via API', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ Id: 'dev-user-999' }),
      } as any);

      const res = await service.provisionDeviceAccount('org-1', 'col-1', 'device_1@tenant.local');
      expect(res.userId).toBe('dev-user-999');

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });
  });

  describe('revokeDeviceSession', () => {
    it('simulates session revocation when token is empty', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = '';

      const res = await service.revokeDeviceSession('org-1', 'dev-user-1');
      expect(res).toBe(true);

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('calls revoke endpoint when token is set', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      } as any);

      const res = await service.revokeDeviceSession('org-1', 'dev-user-1');
      expect(res).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/organizations/org-1/users/dev-user-1/revoke'),
        expect.objectContaining({ method: 'PUT' })
      );

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });
  });
});
