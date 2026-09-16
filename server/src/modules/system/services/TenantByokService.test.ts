import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TenantByokService } from './TenantByokService';

// Mock DB
vi.mock('@shared/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
  tenantByokCredentials: {
    id: 'id',
    tenant_id: 'tenant_id',
    provider: 'provider',
    model: 'model',
    base_url: 'base_url',
    encrypted_api_key: 'encrypted_api_key',
    key_iv: 'key_iv',
    key_auth_tag: 'key_auth_tag',
    key_masked: 'key_masked',
    is_valid: 'is_valid',
    last_tested_at: 'last_tested_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
}));

describe('TenantByokService', () => {
  let service: TenantByokService;

  beforeEach(() => {
    service = new TenantByokService();
    vi.clearAllMocks();
  });

  describe('Cryptographic Operations (AES-256-GCM)', () => {
    it('encrypts and decrypts API key back to original plaintext', () => {
      const plainKey = 'sk-proj-test1234567890abcdefghijklmnopqrstuvwxyz';
      const encrypted = service.encrypt(plainKey);

      expect(encrypted.encryptedApiKey).toBeDefined();
      expect(encrypted.keyIv).toHaveLength(24); // 12 bytes hex
      expect(encrypted.keyAuthTag).toHaveLength(32); // 16 bytes hex
      expect(encrypted.encryptedApiKey).not.toEqual(plainKey);

      const decrypted = service.decrypt(
        encrypted.encryptedApiKey,
        encrypted.keyIv,
        encrypted.keyAuthTag
      );
      expect(decrypted).toBe(plainKey);
    });

    it('fails to decrypt if auth tag is tampered', () => {
      const plainKey = 'sk-ant-test-key-12345';
      const encrypted = service.encrypt(plainKey);

      // Corrupt auth tag
      const tamperedTag = '00' + encrypted.keyAuthTag.slice(2);

      expect(() => {
        service.decrypt(encrypted.encryptedApiKey, encrypted.keyIv, tamperedTag);
      }).toThrow();
    });

    it('masks keys securely', () => {
      expect(service.maskKey('sk-proj-1234567890abcdef')).toBe('sk-p...cdef');
      expect(service.maskKey('short')).toBe('****');
      expect(service.maskKey('12345678')).toBe('****');
      expect(service.maskKey('123456789')).toBe('1234...6789');
    });
  });

  describe('testConnection', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('returns success when OpenAI endpoint returns 200 with models', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'gpt-4o' }, { id: 'gpt-4o-mini' }],
        }),
      });

      const result = await service.testConnection({
        provider: 'openai',
        apiKey: 'sk-proj-valid-key',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('OpenAI API key validated');
      expect(result.modelsAvailable).toContain('gpt-4o');
    });

    it('returns error when OpenAI returns 401 unauthorized', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: 'Incorrect API key provided' },
        }),
      });

      const result = await service.testConnection({
        provider: 'openai',
        apiKey: 'sk-proj-invalid-key',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Incorrect API key provided');
    });

    it('returns success when Anthropic endpoint returns 200', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'claude-3-5-sonnet-20241022' }],
        }),
      });

      const result = await service.testConnection({
        provider: 'anthropic',
        apiKey: 'sk-ant-valid-key',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Anthropic API key validated');
    });

    it('handles network timeouts gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection timed out'));

      const result = await service.testConnection({
        provider: 'openai',
        apiKey: 'sk-proj-key',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection timed out');
    });
  });
});
