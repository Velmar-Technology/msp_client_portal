import { describe, it, expect } from 'vitest';
import { SlaCancellationChecker } from './SlaCancellationChecker';
import { ActionSequence } from '../../types';

describe('SlaCancellationChecker (BL-101)', () => {
  const checker = new SlaCancellationChecker();

  it('should pass when a WARRANTY ticket is cancelled within 60 minutes', async () => {
    const createdAt = new Date('2026-09-05T10:00:00Z');
    const cancelledAt = new Date('2026-09-05T10:45:00Z'); // 45m later (valid)

    const sequence: ActionSequence = {
      entityId: 'ticket-valid-warranty',
      entityType: 'TICKET',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 'step-1',
          entityId: 'ticket-valid-warranty',
          entityType: 'TICKET',
          action: 'TICKET_CREATED',
          timestamp: createdAt,
          tenantId: 'tenant-1',
          metadata: { category: 'WARRANTY' },
        },
        {
          id: 'step-2',
          entityId: 'ticket-valid-warranty',
          entityType: 'TICKET',
          action: 'STATUS_CHANGED_CANCELLED',
          timestamp: cancelledAt,
          tenantId: 'tenant-1',
          newState: { status: 'CANCELLED' },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
    expect(result.evaluatedCount).toBe(1);
  });

  it('should flag a CRITICAL violation when a WARRANTY ticket is cancelled after 60 minutes', async () => {
    const createdAt = new Date('2026-09-05T10:00:00Z');
    const cancelledAt = new Date('2026-09-05T11:15:00Z'); // 75m later (breach)

    const sequence: ActionSequence = {
      entityId: 'ticket-invalid-warranty',
      entityType: 'TICKET',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 'step-1',
          entityId: 'ticket-invalid-warranty',
          entityType: 'TICKET',
          action: 'TICKET_CREATED',
          timestamp: createdAt,
          tenantId: 'tenant-1',
          metadata: { category: 'WARRANTY' },
        },
        {
          id: 'step-2',
          entityId: 'ticket-invalid-warranty',
          entityType: 'TICKET',
          action: 'STATUS_CHANGED_CANCELLED',
          timestamp: cancelledAt,
          tenantId: 'tenant-1',
          newState: { status: 'CANCELLED' },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-101');
    expect(result.violations[0].severity).toBe('CRITICAL');
    expect(result.violations[0].evidence.elapsedMinutes).toBe(75);
  });

  it('should ignore non-restricted categories cancelled after 60 minutes', async () => {
    const createdAt = new Date('2026-09-05T10:00:00Z');
    const cancelledAt = new Date('2026-09-05T13:00:00Z'); // 3 hours later

    const sequence: ActionSequence = {
      entityId: 'ticket-general-repair',
      entityType: 'TICKET',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 'step-1',
          entityId: 'ticket-general-repair',
          entityType: 'TICKET',
          action: 'TICKET_CREATED',
          timestamp: createdAt,
          tenantId: 'tenant-1',
          metadata: { category: 'GENERAL_INQUIRY' },
        },
        {
          id: 'step-2',
          entityId: 'ticket-general-repair',
          entityType: 'TICKET',
          action: 'STATUS_CHANGED_CANCELLED',
          timestamp: cancelledAt,
          tenantId: 'tenant-1',
          newState: { status: 'CANCELLED' },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });
});
