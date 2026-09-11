import { describe, it, expect } from 'vitest';
import { TechnicianBountyChecker } from './TechnicianBountyChecker';
import { ActionSequence } from '../../types';

describe('TechnicianBountyChecker (BL-801)', () => {
  const checker = new TechnicianBountyChecker();

  it('should pass for legitimate technician resolution with commission recorded', async () => {
    const sequence: ActionSequence = {
      entityId: 't-bounty-valid',
      entityType: 'TICKET',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 't-bounty-valid',
          entityType: 'TICKET',
          action: 'TICKET_CREATED',
          timestamp: new Date('2026-09-09T10:00:00Z'),
          tenantId: 'tenant-1',
          metadata: { priority: 'HIGH' },
        },
        {
          id: 's2',
          entityId: 't-bounty-valid',
          entityType: 'TICKET',
          action: 'STATUS_CHANGED_RESOLVED',
          timestamp: new Date('2026-09-09T11:00:00Z'),
          tenantId: 'tenant-1',
          actorRole: 'TECHNICIAN',
        },
        {
          id: 's3',
          entityId: 't-bounty-valid',
          entityType: 'TICKET',
          action: 'COMMISSION_RECORDED',
          timestamp: new Date('2026-09-09T11:01:00Z'),
          tenantId: 'tenant-1',
          metadata: { totalEarning: '18.00' },
        },
      ],
      rootContext: {
        earning: { total_earning: '18.00', status: 'HELD' },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a CRITICAL violation if an automated resolution is paid a commission', async () => {
    const sequence: ActionSequence = {
      entityId: 't-bounty-auto',
      entityType: 'TICKET',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 't-bounty-auto',
          entityType: 'TICKET',
          action: 'TICKET_CREATED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
          metadata: { source: 'AUTOMATED_SCRIPT' },
        },
        {
          id: 's2',
          entityId: 't-bounty-auto',
          entityType: 'TICKET',
          action: 'STATUS_CHANGED_RESOLVED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
          metadata: { notes: 'RESOLVED_AUTOMATED' },
        },
        {
          id: 's3',
          entityId: 't-bounty-auto',
          entityType: 'TICKET',
          action: 'COMMISSION_RECORDED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
          metadata: { totalEarning: '10.00' }, // illicit earning on automated!
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-801');
    expect(result.violations[0].severity).toBe('CRITICAL');
  });

  it('should flag a CRITICAL violation when a reopened ticket fails to void commission', async () => {
    const sequence: ActionSequence = {
      entityId: 't-reopened-unvoided',
      entityType: 'TICKET',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 't-reopened-unvoided',
          entityType: 'TICKET',
          action: 'TICKET_CREATED',
          timestamp: new Date('2026-09-09T10:00:00Z'),
          tenantId: 'tenant-1',
        },
        {
          id: 's2',
          entityId: 't-reopened-unvoided',
          entityType: 'TICKET',
          action: 'STATUS_CHANGED_RESOLVED',
          timestamp: new Date('2026-09-09T11:00:00Z'),
          tenantId: 'tenant-1',
        },
        {
          id: 's3',
          entityId: 't-reopened-unvoided',
          entityType: 'TICKET',
          action: 'STATUS_CHANGED_IN_PROGRESS', // Reopened!
          timestamp: new Date('2026-09-09T11:30:00Z'),
          tenantId: 'tenant-1',
        },
      ],
      rootContext: {
        earning: { total_earning: '14.00', status: 'HELD' }, // Still HELD, not VOIDED!
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-801');
    expect(result.violations[0].severity).toBe('CRITICAL');
  });
});
