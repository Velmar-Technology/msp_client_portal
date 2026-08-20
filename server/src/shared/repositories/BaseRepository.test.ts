import { describe, it, expect } from 'vitest';
import { BaseRepository } from './BaseRepository';

class TestRepository extends BaseRepository<any> {
  constructor() {
    super({ id: 'dummy_id' }, 'test_table');
  }
}

describe('BaseRepository Defense-in-Depth', () => {
  const repo = new TestRepository();

  it('returns null when findById is called with an invalid UUID string', async () => {
    const result = await repo.findById('TCK-94821');
    expect(result).toBeNull();
  });

  it('returns false when deleteById is called with an invalid UUID string', async () => {
    const result = await repo.deleteById('not-a-uuid');
    expect(result).toBe(false);
  });
});
