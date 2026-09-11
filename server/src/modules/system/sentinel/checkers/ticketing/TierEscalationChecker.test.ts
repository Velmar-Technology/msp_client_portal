import { describe, it, expect } from 'vitest';
import { TierEscalationChecker } from './TierEscalationChecker';
import { ActionSequence } from '../../types';

describe('TierEscalationChecker (BL-104)', () => {
  const checker = new TierEscalationChecker();

  it('should pass when a CRITICAL ticket is escalated to Tier 2 within 10 minutes', async () => {
    const t0 = new Date('2026-09-07T10:00:00Z');
    const tEscalate = new Date('2026-09-07T10:08:00Z'); // 8m (within 10m)

    const sequence: ActionSequence = {
      entityId: 'ticket-crit-escalated',
      entityType: 'TICKET',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'ticket-crit-escalated',
          entityType: 'TICKET',
          action: 'TICKET_CREATED',
          timestamp: t0,
          tenantId: 'tenant-1',
          metadata: { priority: 'CRITICAL' },
        },
        {
          id: 's2',
          entityId: 'ticket-crit-escalated',
          entityType: 'TICKET',
          action: 'TIER_ESCALATED',
          timestamp: tEscalate,
          tenantId: 'tenant-1',
          metadata: { notes: 'Auto-escalated to Tier 2' },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a CRITICAL violation when a CRITICAL ticket remains unworked and unescalated after 15 minutes', async () => {
    const pastTime = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago

    const sequence: ActionSequence = {
      entityId: 'ticket-crit-unworked',
      entityType: 'TICKET',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'ticket-crit-unworked',
          entityType: 'TICKET',
          action: 'TICKET_CREATED',
          timestamp: pastTime,
          tenantId: 'tenant-1',
          metadata: { priority: 'CRITICAL' },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-104');
    expect(result.violations[0].severity).toBe('CRITICAL');
  });
});
