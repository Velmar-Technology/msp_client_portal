import { describe, it, expect } from 'vitest';
import { RoundRobinDispatchChecker } from './RoundRobinDispatchChecker';
import { ActionSequence } from '../../types';

describe('RoundRobinDispatchChecker (BL-102)', () => {
  const checker = new RoundRobinDispatchChecker();

  it('should pass when a ticket is assigned to a technician', async () => {
    const sequence: ActionSequence = {
      entityId: 'ticket-assigned',
      entityType: 'TICKET',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 'step-1',
          entityId: 'ticket-assigned',
          entityType: 'TICKET',
          action: 'TICKET_CREATED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
          metadata: { category: 'HARDWARE' },
        },
      ],
      rootContext: {
        ticket: { assigned_tech_id: 'tech-sarah' },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
    expect(result.evaluatedCount).toBe(1);
  });

  it('should flag a HIGH violation when a ticket remains unassigned past 15 minutes', async () => {
    const pastTime = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago

    const sequence: ActionSequence = {
      entityId: 'ticket-stalled-unassigned',
      entityType: 'TICKET',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 'step-1',
          entityId: 'ticket-stalled-unassigned',
          entityType: 'TICKET',
          action: 'TICKET_CREATED',
          timestamp: pastTime,
          tenantId: 'tenant-1',
          metadata: { category: 'NETWORK' },
        },
      ],
      rootContext: {
        ticket: { assigned_tech_id: null },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-102');
    expect(result.violations[0].severity).toBe('HIGH');
  });
});
