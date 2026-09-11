import { describe, it, expect } from 'vitest';
import { RenewalSchedulerChecker } from './RenewalSchedulerChecker';
import { ActionSequence } from '../../types';

describe('RenewalSchedulerChecker (BL-402)', () => {
  const checker = new RenewalSchedulerChecker();

  it('should pass for valid renewal invoices with positive total amounts', async () => {
    const sequence: ActionSequence = {
      entityId: 'inv-valid-renew',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'inv-valid-renew',
          entityType: 'INVOICE',
          action: 'INVOICE_ISSUED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
          metadata: { totalAmount: '350.00' },
        },
      ],
      rootContext: {
        subscription: { id: 'sub-1', status: 'ACTIVE' },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a HIGH violation for renewal invoices with zero or negative totals', async () => {
    const sequence: ActionSequence = {
      entityId: 'inv-zero',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'inv-zero',
          entityType: 'INVOICE',
          action: 'INVOICE_ISSUED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
          metadata: { totalAmount: '0.00' },
        },
      ],
      rootContext: {
        subscription: { id: 'sub-1', status: 'ACTIVE' },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-402');
  });
});
