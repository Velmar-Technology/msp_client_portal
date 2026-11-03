import { describe, it, expect } from 'vitest';
import { BaseTenantRepository } from './BaseTenantRepository';

class TestTenantRepository extends BaseTenantRepository<any> {
  constructor() {
    super({ id: 'dummy_id', tenant_id: 'dummy_tenant' }, 'test_tenant_table');
  }
}

describe('BaseTenantRepository Defense-in-Depth (ADR-018)', () => {
  const repo = new TestTenantRepository();
  const validUuid = '11111111-1111-4111-a111-111111111111';

  it('returns null when findTenantById is called with an invalid entity UUID', async () => {
    const result = await repo.findTenantById('not-a-uuid', validUuid);
    expect(result).toBeNull();
  });

  it('returns null when findTenantById is called with an invalid tenant UUID', async () => {
    const result = await repo.findTenantById(validUuid, 'not-a-tenant-uuid');
    expect(result).toBeNull();
  });

  it('returns empty array when findTenantAll is called with an invalid tenant UUID', async () => {
    const result = await repo.findTenantAll('invalid-tenant');
    expect(result).toEqual([]);
  });

  it('returns false when deleteTenantById is called with an invalid UUID', async () => {
    const result = await repo.deleteTenantById('invalid', validUuid);
    expect(result).toBe(false);
  });

  it('returns 0 when countTenant is called with an invalid tenant UUID', async () => {
    const count = await repo.countTenant('invalid-tenant');
    expect(count).toBe(0);
  });
});
