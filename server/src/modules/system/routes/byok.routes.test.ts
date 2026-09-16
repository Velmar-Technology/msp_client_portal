import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantByokController } from '../controllers/TenantByokController';
import type { TenantByokService } from '../services/TenantByokService';

describe('TenantByokController', () => {
  let mockService: Partial<TenantByokService>;
  let controller: TenantByokController;

  beforeEach(() => {
    mockService = {
      upsertTenantByok: vi.fn(),
      getTenantByokStatus: vi.fn(),
      testConnection: vi.fn(),
      getDecryptedKeyForTenant: vi.fn(),
    };
    controller = new TenantByokController(mockService as TenantByokService);
  });

  describe('saveConfig', () => {
    it('saves valid configuration and returns status', async () => {
      const req: any = {
        user: { tenantId: '11111111-2222-3333-4444-555555555555' },
        body: {
          provider: 'openai',
          apiKey: 'sk-proj-valid-1234567890',
          model: 'gpt-4o',
        },
      };
      const res: any = {
        json: vi.fn(),
      };

      (mockService.upsertTenantByok as any).mockResolvedValue({
        tenantId: '11111111-2222-3333-4444-555555555555',
        provider: 'openai',
        model: 'gpt-4o',
        isConfigured: true,
        keyMasked: 'sk-p...7890',
      });

      await controller.saveConfig(req, res);

      expect(mockService.upsertTenantByok).toHaveBeenCalledWith(
        '11111111-2222-3333-4444-555555555555',
        expect.objectContaining({ provider: 'openai', apiKey: 'sk-proj-valid-1234567890' })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ isConfigured: true }),
        })
      );
    });

    it('throws ValidationError if payload fails schema validation', async () => {
      const req: any = {
        user: { tenantId: '11111111-2222-3333-4444-555555555555' },
        body: {
          provider: 'openai',
          apiKey: '   ', // empty trimmed key
        },
      };
      const res: any = { json: vi.fn() };

      await expect(controller.saveConfig(req, res)).rejects.toThrow();
    });

    it('throws UnauthorizedError if tenant context is missing', async () => {
      const req: any = {
        user: null,
        body: { apiKey: 'sk-proj-key' },
      };
      const res: any = { json: vi.fn() };

      await expect(controller.saveConfig(req, res)).rejects.toThrow();
    });
  });

  describe('getStatus', () => {
    it('returns sanitized status for tenant', async () => {
      const req: any = {
        user: { tenantId: 'tenant-123' },
      };
      const res: any = { json: vi.fn() };

      (mockService.getTenantByokStatus as any).mockResolvedValue({
        tenantId: 'tenant-123',
        provider: 'openai',
        isConfigured: false,
        keyMasked: 'NONE',
      });

      await controller.getStatus(req, res);

      expect(mockService.getTenantByokStatus).toHaveBeenCalledWith('tenant-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ isConfigured: false }),
      });
    });
  });

  describe('testConnection', () => {
    it('invokes service.testConnection with valid payload', async () => {
      const req: any = {
        body: {
          provider: 'openai',
          apiKey: 'sk-proj-key',
        },
      };
      const res: any = { json: vi.fn() };

      (mockService.testConnection as any).mockResolvedValue({
        success: true,
        latencyMs: 150,
        message: 'Validated',
      });

      await controller.testConnection(req, res);

      expect(mockService.testConnection).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'openai', apiKey: 'sk-proj-key' })
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ success: true }),
      });
    });
  });

  describe('getInternalTenantCredentials', () => {
    it('resolves decrypted credentials when internal service token matches', async () => {
      const expectedToken = process.env.MSP_API_KEY || 'test-system-token';
      process.env.MSP_API_KEY = expectedToken;

      const req: any = {
        headers: {
          'x-api-key': expectedToken,
        },
        params: {
          tenantId: 'tenant-abc',
        },
      };
      const res: any = { json: vi.fn() };

      (mockService.getDecryptedKeyForTenant as any).mockResolvedValue({
        tenantId: 'tenant-abc',
        provider: 'openai',
        apiKey: 'sk-proj-decrypted',
      });

      await controller.getInternalTenantCredentials(req, res);

      expect(mockService.getDecryptedKeyForTenant).toHaveBeenCalledWith('tenant-abc');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ apiKey: 'sk-proj-decrypted' }),
      });
    });

    it('rejects unauthorized request with invalid token', async () => {
      const req: any = {
        headers: {
          'x-api-key': 'wrong-token',
        },
        params: {
          tenantId: 'tenant-abc',
        },
      };
      const res: any = { json: vi.fn() };

      await expect(controller.getInternalTenantCredentials(req, res)).rejects.toThrow();
    });
  });
});
