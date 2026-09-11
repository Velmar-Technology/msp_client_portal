import { describe, it, expect } from 'vitest';
import { LicenseTrueUpChecker } from './LicenseTrueUpChecker';
import { ActionSequence } from '../../types';

describe('LicenseTrueUpChecker (BL-202)', () => {
  const checker = new LicenseTrueUpChecker();

  it('should pass when active devices match or are under quota', async () => {
    const sequence: ActionSequence = {
      entityId: 'inv-1',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [],
      rootContext: {
        subscription: { device_quota: 10, active_devices_count: 8 },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a HIGH violation when active devices exceed quota', async () => {
    const sequence: ActionSequence = {
      entityId: 'inv-drift',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [],
      rootContext: {
        subscription: { device_quota: 10, active_devices_count: 14 },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-202');
    expect(result.violations[0].evidence.unbilledExcess).toBe(4);
  });
});
