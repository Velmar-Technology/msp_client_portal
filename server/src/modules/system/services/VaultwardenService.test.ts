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

    it('handles duplicate / already-invited user idempotently without throwing', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'User is already invited to this organization.',
      } as any);

      const res = await service.inviteUserToOrganization('org-123', 'epolanco@velmartech.com.do', 'Admin');
      expect(res.invited).toBe(true);
      expect(res.alreadyEnrolled).toBe(true);
      expect(res.email).toBe('epolanco@velmartech.com.do');

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('throws ExternalServiceError and preserves upstream error details on real failure', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Vaultwarden Server Error',
      } as any);

      await expect(
        service.inviteUserToOrganization('org-123', 'epolanco@velmartech.com.do', 'Admin')
      ).rejects.toThrow(ExternalServiceError);

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('falls back to /admin/invite when organization-scoped invite returns 404 (BL-206)', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
        if (url.includes('/api/organizations/org-123/users/invite')) {
          return {
            ok: false,
            status: 404,
            text: async () => JSON.stringify({ error: { code: 404, reason: 'Not Found' } }),
          };
        }
        if (url.endsWith('/admin')) {
          return {
            ok: true,
            status: 200,
            headers: {
              get: (header: string) => (header.toLowerCase() === 'set-cookie' ? 'VW_ADMIN=mock-jwt-cookie; Path=/admin' : null),
            },
          };
        }
        if (url.includes('/admin/invite')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ Id: 'user-new', Email: 'epolanco@velmartech.com.do' }),
          };
        }
        return { ok: true, json: async () => ({}) };
      });

      const res = await service.inviteUserToOrganization('org-123', 'epolanco@velmartech.com.do', 'Admin');
      expect(res.invited).toBe(true);
      expect(res.email).toBe('epolanco@velmartech.com.do');

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('treats 409 Conflict on /admin/invite fallback as idempotent success (BL-206)', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/api/organizations/org-123/users/invite')) {
          return {
            ok: false,
            status: 404,
            text: async () => 'Not Found',
          };
        }
        if (url.endsWith('/admin')) {
          return {
            ok: true,
            status: 200,
            headers: {
              get: (header: string) => (header.toLowerCase() === 'set-cookie' ? 'VW_ADMIN=mock-jwt-cookie; Path=/admin' : null),
            },
          };
        }
        if (url.includes('/admin/invite')) {
          return {
            ok: false,
            status: 409,
            text: async () => 'User already exists',
          };
        }
        return { ok: true, json: async () => ({}) };
      });

      const res = await service.inviteUserToOrganization('org-123', 'epolanco@velmartech.com.do', 'Admin');
      expect(res.invited).toBe(true);
      expect(res.alreadyEnrolled).toBe(true);
      expect(res.email).toBe('epolanco@velmartech.com.do');

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });
  });

  describe('getBaseUrl subpath resolution', () => {
    it('appends subpath from VAULTWARDEN_EXTERNAL_URL if not in VAULTWARDEN_URL', async () => {
      const origUrl = env.VAULTWARDEN_URL;
      const origExt = env.VAULTWARDEN_EXTERNAL_URL;
      (env as any).VAULTWARDEN_URL = 'http://vaultwarden:80';
      (env as any).VAULTWARDEN_EXTERNAL_URL = 'https://helpdesk.velmartech.com.do/vault';

      const url = (service as any).getBaseUrl();
      expect(url).toBe('http://vaultwarden:80/vault');

      (env as any).VAULTWARDEN_URL = origUrl;
      (env as any).VAULTWARDEN_EXTERNAL_URL = origExt;
    });

    it('does not duplicate subpath if VAULTWARDEN_URL already includes /vault', async () => {
      const origUrl = env.VAULTWARDEN_URL;
      const origExt = env.VAULTWARDEN_EXTERNAL_URL;
      (env as any).VAULTWARDEN_URL = 'http://vaultwarden:80/vault';
      (env as any).VAULTWARDEN_EXTERNAL_URL = 'https://helpdesk.velmartech.com.do/vault';

      const url = (service as any).getBaseUrl();
      expect(url).toBe('http://vaultwarden:80/vault');

      (env as any).VAULTWARDEN_URL = origUrl;
      (env as any).VAULTWARDEN_EXTERNAL_URL = origExt;
    });

    it('retains plain base URL when external URL has no subpath', async () => {
      const origUrl = env.VAULTWARDEN_URL;
      const origExt = env.VAULTWARDEN_EXTERNAL_URL;
      (env as any).VAULTWARDEN_URL = 'http://localhost:8080';
      (env as any).VAULTWARDEN_EXTERNAL_URL = 'http://localhost:8080';

      const url = (service as any).getBaseUrl();
      expect(url).toBe('http://localhost:8080');

      (env as any).VAULTWARDEN_URL = origUrl;
      (env as any).VAULTWARDEN_EXTERNAL_URL = origExt;
    });
  });

  describe('checkUserInvitationStatus', () => {
    it('returns ACCEPTED in simulated mode when token is absent', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = '';

      const status = await service.checkUserInvitationStatus('org-123', 'epolanco@velmartech.com.do');
      expect(status).toBe('ACCEPTED');

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('identifies INVITED and ACCEPTED status correctly from live payload', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-token';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          Data: [
            { Id: 'u1', Email: 'epolanco@velmartech.com.do', Status: 1 },
            { Id: 'u2', Email: 'active@velmartech.com.do', Status: 2 },
          ],
        }),
      } as any);

      const status1 = await service.checkUserInvitationStatus('org-123', 'epolanco@velmartech.com.do');
      expect(status1).toBe('INVITED');

      const status2 = await service.checkUserInvitationStatus('org-123', 'active@velmartech.com.do');
      expect(status2).toBe('ACCEPTED');

      const status3 = await service.checkUserInvitationStatus('org-123', 'unknown@velmartech.com.do');
      expect(status3).toBe('NOT_FOUND');

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
        if (url.includes('/users/invite') || url.includes('/admin/invite')) {
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

    it('handles simulated device user identifier (vw_user_...) gracefully without network call', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn();

      const res = await service.revokeDeviceSession('org-1', 'vw_user_rxiufz2t');
      expect(res).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('falls back to Admin API /admin/users/:id/deauth when direct org revoke returns 401', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
        if (url.includes('/api/organizations/org-1/users/real-user-uuid/revoke')) {
          return { ok: false, status: 401 };
        }
        if (url.endsWith('/admin') && opts?.method === 'POST') {
          return {
            ok: true,
            status: 200,
            headers: {
              get: (h: string) => (h.toLowerCase() === 'set-cookie' ? 'VW_ADMIN=test-cookie; Path=/' : null),
            },
          };
        }
        if (url.includes('/admin/users/real-user-uuid/deauth') && opts?.method === 'POST') {
          return { ok: true, status: 200 };
        }
        if (url.includes('/admin/users/real-user-uuid/disable') && opts?.method === 'POST') {
          return { ok: true, status: 200 };
        }
        return { ok: false, status: 404 };
      });

      const res = await service.revokeDeviceSession('org-1', 'real-user-uuid');
      expect(res).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/users/real-user-uuid/deauth'),
        expect.objectContaining({ method: 'POST' })
      );

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('treats 404 on Admin API deauth as idempotent success when user no longer exists', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
        if (url.includes('/api/organizations/org-1/users/gone-user-uuid/revoke')) {
          return { ok: false, status: 401 };
        }
        if (url.endsWith('/admin') && opts?.method === 'POST') {
          return {
            ok: true,
            status: 200,
            headers: {
              get: (h: string) => (h.toLowerCase() === 'set-cookie' ? 'VW_ADMIN=test-cookie; Path=/' : null),
            },
          };
        }
        if (url.includes('/admin/users/gone-user-uuid/deauth')) {
          return { ok: false, status: 404 };
        }
        return { ok: false, status: 404 };
      });

      const res = await service.revokeDeviceSession('org-1', 'gone-user-uuid');
      expect(res).toBe(true);

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });

    it('throws ExternalServiceError when both direct revoke and Admin API deauth fail with 500', async () => {
      const origToken = env.VAULTWARDEN_ADMIN_TOKEN;
      (env as any).VAULTWARDEN_ADMIN_TOKEN = 'mock-admin-token';

      global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
        if (url.includes('/api/organizations/org-1/users/err-user/revoke')) {
          return { ok: false, status: 500 };
        }
        if (url.endsWith('/admin') && opts?.method === 'POST') {
          return {
            ok: true,
            status: 200,
            headers: {
              get: (h: string) => (h.toLowerCase() === 'set-cookie' ? 'VW_ADMIN=test-cookie; Path=/' : null),
            },
          };
        }
        if (url.includes('/admin/users/err-user/deauth')) {
          return { ok: false, status: 500, text: async () => 'Internal Server Error' };
        }
        return { ok: false, status: 500 };
      });

      await expect(service.revokeDeviceSession('org-1', 'err-user')).rejects.toThrow(
        ExternalServiceError
      );

      (env as any).VAULTWARDEN_ADMIN_TOKEN = origToken;
    });
  });
});
