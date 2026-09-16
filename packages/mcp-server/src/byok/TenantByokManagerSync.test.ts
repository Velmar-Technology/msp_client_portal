import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantByokManager } from './TenantByokManager.js';

describe('TenantByokManager Dynamic Backend Sync', () => {
  let manager: TenantByokManager;

  beforeEach(() => {
    manager = TenantByokManager.getInstance();
    // Clean up test tenant
    manager.removeTenantProfile('test-school-sync-123');
  });

  it('fetches and caches tenant credentials from MspApiClient on demand', async () => {
    const mockApiClient = {
      getTenantByokProfile: vi.fn().mockResolvedValue({
        tenantId: 'test-school-sync-123',
        provider: 'anthropic',
        apiKey: 'sk-ant-sync-key-12345678',
        model: 'claude-3-5-sonnet-20241022',
      }),
    };

    manager.setApiClient(mockApiClient);

    expect(manager.hasTenantProfile('test-school-sync-123')).toBe(false);

    // Call ensureTenantProfile
    const profile = await manager.ensureTenantProfile('test-school-sync-123');

    expect(mockApiClient.getTenantByokProfile).toHaveBeenCalledWith('test-school-sync-123');
    expect(profile).toBeDefined();
    expect(profile?.apiKey).toBe('sk-ant-sync-key-12345678');
    expect(profile?.provider).toBe('anthropic');

    // Subsequent status check is now configured
    const status = manager.getTenantStatus('test-school-sync-123');
    expect(status.isConfigured).toBe(true);
    expect(status.keyMasked).toBe('sk-a...5678');

    // Second call uses memory cache and does not re-fetch
    await manager.ensureTenantProfile('test-school-sync-123');
    expect(mockApiClient.getTenantByokProfile).toHaveBeenCalledTimes(1);
  });

  it('handles remote fetch failure without throwing unhandled exceptions', async () => {
    const mockApiClient = {
      getTenantByokProfile: vi.fn().mockRejectedValue(new Error('Network error')),
    };

    manager.setApiClient(mockApiClient);

    const profile = await manager.ensureTenantProfile('non-existent-tenant');
    expect(profile).toBeUndefined();

    const status = manager.getTenantStatus('non-existent-tenant');
    expect(status.isConfigured).toBe(false);
  });
});
