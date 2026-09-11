import { describe, it, expect } from 'vitest';
import { AutoRenewSyncChecker } from './AutoRenewSyncChecker';
import { ActionSequence } from '../../types';

describe('AutoRenewSyncChecker (BL-402)', () => {
  const checker = new AutoRenewSyncChecker();

  it('should pass for healthy active recurring subscriptions with future renewal date', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);

    const sequence: ActionSequence = {
      entityId: 'inv-recurring-ok',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'inv-recurring-ok',
          entityType: 'INVOICE',
          action: 'INVOICE_ISSUED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
          metadata: { totalAmount: '55.00' },
        },
      ],
      rootContext: {
        subscription: {
          id: 'sub-active-1',
          status: 'ACTIVE',
          paypal_order_id: 'I-BW879123J',
          renewal_date: futureDate,
          equipment_count: 5,
        },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
    expect(result.evaluatedCount).toBe(1);
  });

  it('should ignore non-recurring one-time order subscriptions', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    const sequence: ActionSequence = {
      entityId: 'inv-onetime',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'inv-onetime',
          entityType: 'INVOICE',
          action: 'INVOICE_ISSUED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
        },
      ],
      rootContext: {
        subscription: {
          id: 'sub-onetime-1',
          status: 'ACTIVE',
          paypal_order_id: '5O1234567890ABCDE', // Standard PayPal order ID, not an I-... agreement
          renewal_date: pastDate,
          equipment_count: 2,
        },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a CRITICAL violation for cancelled subscriptions with unrevoked zombie agreements', async () => {
    const sequence: ActionSequence = {
      entityId: 'inv-zombie',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'inv-zombie',
          entityType: 'INVOICE',
          action: 'INVOICE_ISSUED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
        },
      ],
      rootContext: {
        subscription: {
          id: 'sub-cancelled-zombie',
          status: 'CANCELLED',
          paypal_order_id: 'I-ZOMBIE882',
          renewal_date: new Date(),
          equipment_count: 1,
        },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].severity).toBe('CRITICAL');
    expect(result.violations[0].rationale).toContain('still has active PayPal recurring agreement');
  });

  it('should pass for cancelled subscriptions when cancellation step is recorded', async () => {
    const sequence: ActionSequence = {
      entityId: 'inv-cancelled-clean',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'inv-cancelled-clean',
          entityType: 'INVOICE',
          action: 'PAYPAL_SUBSCRIPTION_CANCELLED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
        },
      ],
      rootContext: {
        subscription: {
          id: 'sub-clean-cancel',
          status: 'CANCELLED',
          paypal_order_id: 'I-CLEAN991',
          renewal_date: new Date(),
          equipment_count: 1,
        },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a HIGH violation for past-due auto-renew stagnation without payment capture', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3); // 3 days overdue

    const sequence: ActionSequence = {
      entityId: 'inv-stagnant',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'inv-stagnant',
          entityType: 'INVOICE',
          action: 'INVOICE_ISSUED',
          timestamp: pastDate,
          tenantId: 'tenant-1',
        },
      ],
      rootContext: {
        subscription: {
          id: 'sub-stagnant',
          status: 'ACTIVE',
          paypal_order_id: 'I-STAGNANT123',
          renewal_date: pastDate,
          equipment_count: 3,
        },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].severity).toBe('HIGH');
    expect(result.violations[0].rationale).toContain('past due');
  });

  it('should flag a HIGH violation for invalid equipment slot count on recurring subscription', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);

    const sequence: ActionSequence = {
      entityId: 'inv-zero-equip',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'inv-zero-equip',
          entityType: 'INVOICE',
          action: 'INVOICE_ISSUED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
        },
      ],
      rootContext: {
        subscription: {
          id: 'sub-zero-equip',
          status: 'ACTIVE',
          paypal_order_id: 'I-ZERO999',
          renewal_date: futureDate,
          equipment_count: 0,
        },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].severity).toBe('HIGH');
    expect(result.violations[0].rationale).toContain('non-positive equipment count');
  });
});
