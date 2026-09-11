import { describe, it, expect } from 'vitest';
import { QuotaEnforcementChecker } from './QuotaEnforcementChecker';
import { ActionSequence } from '../../types';

describe('QuotaEnforcementChecker (BL-201)', () => {
  const checker = new QuotaEnforcementChecker();

  it('should pass when ticket count is within allowed quota', async () => {
    const sequences: ActionSequence[] = [
      {
        entityId: 't-1',
        entityType: 'TICKET',
        tenantId: 'tenant-beta',
        steps: [
          {
            id: 's1',
            entityId: 't-1',
            entityType: 'TICKET',
            action: 'TICKET_CREATED',
            timestamp: new Date('2026-09-01T10:00:00Z'),
            tenantId: 'tenant-beta',
          },
        ],
        rootContext: {
          subscription: { max_tickets: 5 },
        },
      },
    ];

    const result = await checker.evaluate(sequences);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a HIGH violation when ticket count exceeds allowed quota', async () => {
    const sequences: ActionSequence[] = [];
    for (let i = 1; i <= 6; i++) {
      sequences.push({
        entityId: `t-${i}`,
        entityType: 'TICKET',
        tenantId: 'tenant-beta',
        steps: [
          {
            id: `s-${i}`,
            entityId: `t-${i}`,
            entityType: 'TICKET',
            action: 'TICKET_CREATED',
            timestamp: new Date('2026-09-02T10:00:00Z'),
            tenantId: 'tenant-beta',
          },
        ],
        rootContext: {
          subscription: { max_tickets: 5 }, // allowed 5, creating 6
        },
      });
    }

    const result = await checker.evaluate(sequences);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-201');
    expect(result.violations[0].evidence.totalCreated).toBe(6);
    expect(result.violations[0].evidence.allowedQuota).toBe(5);
  });
});
