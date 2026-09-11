import { describe, it, expect } from 'vitest';
import { NonPaymentEnforcementChecker } from './NonPaymentEnforcementChecker';
import { ActionSequence } from '../../types';

describe('NonPaymentEnforcementChecker (BL-702)', () => {
  const checker = new NonPaymentEnforcementChecker();

  it('should pass when tenant is not overdue', async () => {
    const sequence: ActionSequence = {
      entityId: 't-healthy',
      entityType: 'TENANT',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 't-healthy',
          entityType: 'TENANT',
          action: 'TICKET_CREATED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
        },
      ],
      rootContext: {
        tenant: { oldest_overdue_days: 0 },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a CRITICAL violation when write action occurs at Day 5+ overdue', async () => {
    const sequence: ActionSequence = {
      entityId: 't-overdue',
      entityType: 'TENANT',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 't-overdue',
          entityType: 'TENANT',
          action: 'TICKET_CREATED', // write mutation attempted while delinquent!
          timestamp: new Date(),
          tenantId: 'tenant-1',
        },
      ],
      rootContext: {
        tenant: { oldest_overdue_days: 7, status: 'ACTIVE' },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-702');
    expect(result.violations[0].severity).toBe('CRITICAL');
  });
});
