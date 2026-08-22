import { describe, it, expect, vi } from 'vitest';
import { withTenantContext } from './tenantContext';
import { db } from './index';

vi.mock('./index', () => ({
  db: {
    transaction: vi.fn(),
  },
}));

describe('withTenantContext — Row-Level Security Wrapper', () => {
  it('sets app.current_tenant_id within transaction and executes callback', async () => {
    const mockTx = {
      execute: vi.fn().mockResolvedValueOnce([]),
    };

    vi.mocked(db.transaction).mockImplementationOnce(async (cb: any) => {
      return cb(mockTx);
    });

    const result = await withTenantContext('tenant-abc-123', async (_tx) => {
      expect(mockTx.execute).toHaveBeenCalled();
      return 'query-result';
    });

    expect(db.transaction).toHaveBeenCalled();
    expect(result).toBe('query-result');
  });
});
