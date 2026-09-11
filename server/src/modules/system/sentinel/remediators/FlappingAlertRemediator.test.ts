import { describe, it, expect, vi } from 'vitest';
import { FlappingAlertRemediator } from './FlappingAlertRemediator';
import { InvariantViolation } from '../types';
import { FLAPPING_TAG } from '../checkers/ticketing/AlertNoiseFlappingChecker';

describe('FlappingAlertRemediator (BL-103)', () => {
  it('should successfully tag flapping alert with [FLAPPING_ALERT] and escalate ticket', async () => {
    const mockDb: any = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([
              {
                id: 'alert-123',
                alert_type: 'High Memory Usage',
                ticket_id: 'ticket-456',
                tenant_id: 'tenant-abc',
              },
            ]).mockResolvedValueOnce([
              { id: 'admin-user-id' },
            ]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      }),
    };

    const remediator = new FlappingAlertRemediator(mockDb);

    const violation: InvariantViolation = {
      ruleCode: 'BL-103',
      ruleName: 'Alert Noise, Auto-Remediation & Flapping Rule',
      severity: 'HIGH',
      entityId: 'dev-001',
      entityType: 'DEVICE',
      tenantId: 'tenant-abc',
      violatedAt: new Date(),
      rationale: '3 triggers in 24h untagged',
      evidence: {
        deviceId: 'dev-001',
        alertId: 'alert-123',
        triggerCount: 3,
        timeWindowHours: 12,
        lastAlertTitle: 'High Memory Usage',
      },
    };

    const result = await remediator.remediate(violation);

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('TAG_FLAPPING_ALERT_AND_ROUTE_TIER_2');
    expect(result.details?.flappingTag).toBe(FLAPPING_TAG);
    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);
  });

  it('should handle missing alert gracefully and still return success report', async () => {
    const mockDb: any = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const remediator = new FlappingAlertRemediator(mockDb);

    const violation: InvariantViolation = {
      ruleCode: 'BL-103',
      ruleName: 'Alert Noise, Auto-Remediation & Flapping Rule',
      severity: 'HIGH',
      entityId: 'dev-002',
      entityType: 'DEVICE',
      tenantId: 'tenant-abc',
      violatedAt: new Date(),
      rationale: '3 triggers in 24h untagged',
      evidence: {
        deviceId: 'dev-002',
      },
    };

    const result = await remediator.remediate(violation);
    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('TAG_FLAPPING_ALERT_AND_ROUTE_TIER_2');
  });
});
