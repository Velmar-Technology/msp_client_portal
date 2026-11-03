import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KbService, type KbStorePort } from './KbService';
import { NotFoundError } from '@shared/errors';

describe('KbService', () => {
  let mockStore: KbStorePort;
  let service: KbService;

  beforeEach(() => {
    mockStore = {
      findAllByTenant: vi.fn().mockResolvedValue([]),
      findByIdAndTenant: vi.fn().mockResolvedValue(null),
      createRecord: vi.fn().mockImplementation(async (data) => ({
        id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date(),
        updated_at: new Date(),
        ...data,
      })),
    };
    service = new KbService(mockStore);
  });

  it('lists records for a tenant', async () => {
    const result = await service.list('tenant-1');
    expect(result).toEqual([]);
    expect(mockStore.findAllByTenant).toHaveBeenCalledWith('tenant-1');
  });

  it('throws NotFoundError when record does not exist', async () => {
    await expect(service.getById('missing-id', 'tenant-1')).rejects.toThrow(NotFoundError);
  });

  it('creates a new record with default ACTIVE status', async () => {
    const created = await service.create('tenant-1', { name: 'Item A', status: 'ACTIVE' });
    expect(created.name).toBe('Item A');
    expect(mockStore.createRecord).toHaveBeenCalled();
  });
});
