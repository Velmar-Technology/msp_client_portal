import { describe, it, expect } from 'vitest';
import { StateMachineChecker } from './StateMachineChecker';
import { ActionSequence } from '../../types';

describe('StateMachineChecker (BL-301)', () => {
  const checker = new StateMachineChecker();

  it('should pass for legal lifecycle transitions by a technician', async () => {
    const sequence: ActionSequence = {
      entityId: 't-legal',
      entityType: 'TICKET',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 't-legal',
          entityType: 'TICKET',
          action: 'TICKET_CREATED',
          timestamp: new Date('2026-09-08T10:00:00Z'),
          tenantId: 'tenant-1',
        },
        {
          id: 's2',
          entityId: 't-legal',
          entityType: 'TICKET',
          action: 'STATUS_CHANGED_IN_PROGRESS',
          timestamp: new Date('2026-09-08T10:10:00Z'),
          actorRole: 'TECHNICIAN',
          tenantId: 'tenant-1',
          previousState: { status: 'OPEN' },
          newState: { status: 'IN_PROGRESS' },
        },
        {
          id: 's3',
          entityId: 't-legal',
          entityType: 'TICKET',
          action: 'STATUS_CHANGED_RESOLVED',
          timestamp: new Date('2026-09-08T11:00:00Z'),
          actorRole: 'TECHNICIAN',
          tenantId: 'tenant-1',
          previousState: { status: 'IN_PROGRESS' },
          newState: { status: 'RESOLVED' },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a CRITICAL violation when a CANCELLED ticket transitions to another state', async () => {
    const sequence: ActionSequence = {
      entityId: 't-illegal-terminal',
      entityType: 'TICKET',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 't-illegal-terminal',
          entityType: 'TICKET',
          action: 'STATUS_CHANGED_IN_PROGRESS',
          timestamp: new Date('2026-09-08T10:00:00Z'),
          tenantId: 'tenant-1',
          previousState: { status: 'CANCELLED' },
          newState: { status: 'IN_PROGRESS' },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-301');
    expect(result.violations[0].severity).toBe('CRITICAL');
  });

  it('should flag a HIGH violation when a client actor attempts to resolve a ticket', async () => {
    const sequence: ActionSequence = {
      entityId: 't-client-resolve',
      entityType: 'TICKET',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 't-client-resolve',
          entityType: 'TICKET',
          action: 'STATUS_CHANGED_RESOLVED',
          timestamp: new Date('2026-09-08T10:00:00Z'),
          actorId: 'client-user-1',
          actorRole: 'CLIENT',
          tenantId: 'tenant-1',
          previousState: { status: 'IN_PROGRESS' },
          newState: { status: 'RESOLVED' },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations.some((v) => v.severity === 'HIGH')).toBe(true);
  });
});
