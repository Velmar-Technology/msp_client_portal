import { describe, it, expect } from 'vitest';
import { AlertNoiseFlappingChecker, FLAPPING_TAG } from './AlertNoiseFlappingChecker';
import { ActionSequence } from '../../types';

describe('AlertNoiseFlappingChecker (BL-103)', () => {
  const checker = new AlertNoiseFlappingChecker();

  it('should pass when 3 triggers in 24h are correctly tagged with [FLAPPING_ALERT]', async () => {
    const t0 = new Date('2026-09-06T08:00:00Z');
    const t1 = new Date('2026-09-06T12:00:00Z');
    const t2 = new Date('2026-09-06T16:00:00Z');

    const sequence: ActionSequence = {
      entityId: 'endpoint-tagged',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 'alt-1',
          entityId: 'endpoint-tagged',
          entityType: 'DEVICE',
          action: 'ALERT_TRIGGERED',
          timestamp: t0,
          tenantId: 'tenant-1',
          metadata: { title: 'RAM threshold exceeded' },
        },
        {
          id: 'alt-2',
          entityId: 'endpoint-tagged',
          entityType: 'DEVICE',
          action: 'ALERT_TRIGGERED',
          timestamp: t1,
          tenantId: 'tenant-1',
          metadata: { title: 'RAM threshold exceeded' },
        },
        {
          id: 'alt-3',
          entityId: 'endpoint-tagged',
          entityType: 'DEVICE',
          action: 'ALERT_TRIGGERED',
          timestamp: t2,
          tenantId: 'tenant-1',
          metadata: { title: `${FLAPPING_TAG} RAM threshold exceeded` },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a HIGH violation when 3 triggers in 24h lack the [FLAPPING_ALERT] tag', async () => {
    const t0 = new Date('2026-09-06T08:00:00Z');
    const t1 = new Date('2026-09-06T10:00:00Z');
    const t2 = new Date('2026-09-06T14:00:00Z');

    const sequence: ActionSequence = {
      entityId: 'endpoint-untagged',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 'alt-1',
          entityId: 'endpoint-untagged',
          entityType: 'DEVICE',
          action: 'ALERT_TRIGGERED',
          timestamp: t0,
          tenantId: 'tenant-1',
          metadata: { title: 'Disk I/O saturated' },
        },
        {
          id: 'alt-2',
          entityId: 'endpoint-untagged',
          entityType: 'DEVICE',
          action: 'ALERT_TRIGGERED',
          timestamp: t1,
          tenantId: 'tenant-1',
          metadata: { title: 'Disk I/O saturated' },
        },
        {
          id: 'alt-3',
          entityId: 'endpoint-untagged',
          entityType: 'DEVICE',
          action: 'ALERT_TRIGGERED',
          timestamp: t2,
          tenantId: 'tenant-1',
          metadata: { title: 'Disk I/O saturated' }, // missing tag!
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-103');
    expect(result.violations[0].severity).toBe('HIGH');
  });
});
