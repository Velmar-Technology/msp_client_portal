import { describe, it, expect } from 'vitest';
import { SubscriptionReactivationChecker } from './SubscriptionReactivationChecker';
import { ActionSequence } from '../../types';

describe('SubscriptionReactivationChecker (BL-401)', () => {
  const checker = new SubscriptionReactivationChecker();

  it('should pass when a paid invoice has an ACTIVE subscription', async () => {
    const sequence: ActionSequence = {
      entityId: 'inv-paid-active',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'inv-paid-active',
          entityType: 'INVOICE',
          action: 'INVOICE_PAID',
          timestamp: new Date(),
          tenantId: 'tenant-1',
        },
      ],
      rootContext: {
        subscription: { id: 'sub-active', status: 'ACTIVE' },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a CRITICAL violation when a paid invoice leaves subscription EXPIRED', async () => {
    const sequence: ActionSequence = {
      entityId: 'inv-paid-stalled',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'inv-paid-stalled',
          entityType: 'INVOICE',
          action: 'INVOICE_PAID',
          timestamp: new Date(),
          tenantId: 'tenant-1',
        },
      ],
      rootContext: {
        subscription: { id: 'sub-expired', status: 'EXPIRED' },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-401');
    expect(result.violations[0].severity).toBe('CRITICAL');
  });
});
