import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantSettingsService } from './TenantSettingsService';
import { TenantSettingsRepository } from '../repositories/TenantSettingsRepository';
import { ValidationError } from '@shared/errors';

describe('TenantSettingsService (ADR-019)', () => {
  let mockRepo: Partial<TenantSettingsRepository>;
  let service: TenantSettingsService;
  const tenantId = '11111111-1111-4111-a111-111111111111';

  beforeEach(() => {
    mockRepo = {
      findByKey: vi.fn(),
      findAllByModule: vi.fn(),
      upsert: vi.fn(),
      deleteByKey: vi.fn(),
    };
    service = new TenantSettingsService(mockRepo as TenantSettingsRepository);
  });

  describe('get', () => {
    it('returns configured value when setting exists in database', async () => {
      vi.mocked(mockRepo.findByKey!).mockResolvedValue({
        id: 's-1',
        tenant_id: tenantId,
        key: 'helpdesk.auto_close_days',
        value: 7,
        module: 'helpdesk',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const value = await service.get<number>(tenantId, 'helpdesk.auto_close_days', 3);
      expect(value).toBe(7);
      expect(mockRepo.findByKey).toHaveBeenCalledWith(tenantId, 'helpdesk.auto_close_days');
    });

    it('returns fallback default when setting is not present', async () => {
      vi.mocked(mockRepo.findByKey!).mockResolvedValue(null);

      const value = await service.get<string>(tenantId, 'billing.currency', 'DOP');
      expect(value).toBe('DOP');
    });

    it('returns default when tenantId is empty', async () => {
      const value = await service.get('', 'any.key', 'fallback');
      expect(value).toBe('fallback');
      expect(mockRepo.findByKey).not.toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('validates and upserts configuration parameter successfully', async () => {
      const expectedRow = {
        id: 's-2',
        tenant_id: tenantId,
        key: 'system.theme',
        value: 'dark',
        module: 'system',
        created_at: new Date(),
        updated_at: new Date(),
      };
      vi.mocked(mockRepo.upsert!).mockResolvedValue(expectedRow);

      const result = await service.set(tenantId, 'system.theme', 'dark', 'system');
      expect(result).toEqual(expectedRow);
      expect(mockRepo.upsert).toHaveBeenCalledWith(tenantId, 'system.theme', 'dark', 'system');
    });

    it('throws ValidationError when key is blank', async () => {
      await expect(service.set(tenantId, '   ', 'value')).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when tenantId is missing', async () => {
      await expect(service.set('', 'key', 'value')).rejects.toThrow(ValidationError);
    });
  });

  describe('getAll', () => {
    it('returns flat dictionary of key-value pairs', async () => {
      vi.mocked(mockRepo.findAllByModule!).mockResolvedValue([
        {
          id: 's-1',
          tenant_id: tenantId,
          key: 'crm.auto_assign',
          value: true,
          module: 'crm',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 's-2',
          tenant_id: tenantId,
          key: 'crm.default_stage',
          value: 'NEW',
          module: 'crm',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const all = await service.getAll(tenantId, 'crm');
      expect(all).toEqual({
        'crm.auto_assign': true,
        'crm.default_stage': 'NEW',
      });
    });
  });
});
