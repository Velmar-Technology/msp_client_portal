import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SelfHealingService } from './SelfHealingService';
import { InvariantViolation, RemediationHandler } from '../types';

describe('SelfHealingService', () => {
  let mockHandler: RemediationHandler;
  let service: SelfHealingService;

  beforeEach(() => {
    mockHandler = {
      ruleCode: 'BL-401',
      name: 'Mock Reactivator',
      remediate: vi.fn().mockResolvedValue({
        ruleCode: 'BL-401',
        entityId: 'sub-100',
        tenantId: 'tenant-test',
        success: true,
        actionTaken: 'REACTIVATE_SUBSCRIPTION',
        remediatedAt: new Date(),
      }),
    };

    service = new SelfHealingService([mockHandler]);
  });

  it('should execute registered remediator when a matching violation is processed', async () => {
    const violation: InvariantViolation = {
      ruleCode: 'BL-401',
      ruleName: 'Subscription Reactivation on Payment Rule',
      severity: 'CRITICAL',
      entityId: 'inv-1',
      entityType: 'INVOICE',
      tenantId: 'tenant-test',
      violatedAt: new Date(),
      rationale: 'Paid invoice left sub expired',
      evidence: { subscriptionId: 'sub-100' },
    };

    const results = await service.autoHealViolations([violation]);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].actionTaken).toBe('REACTIVATE_SUBSCRIPTION');
    expect(mockHandler.remediate).toHaveBeenCalledTimes(1);
  });

  it('should skip violations that have no registered remediator', async () => {
    const violation: InvariantViolation = {
      ruleCode: 'BL-999',
      ruleName: 'Unregistered Rule',
      severity: 'MEDIUM',
      entityId: 'entity-1',
      entityType: 'TICKET',
      tenantId: 'tenant-test',
      violatedAt: new Date(),
      rationale: 'Something else',
      evidence: {},
    };

    const results = await service.autoHealViolations([violation]);
    expect(results).toHaveLength(0);
    expect(mockHandler.remediate).not.toHaveBeenCalled();
  });

  it('should trip the circuit breaker if auto-remediations exceed 5 per tenant per hour', async () => {
    const violations: InvariantViolation[] = [];
    for (let i = 1; i <= 7; i++) {
      violations.push({
        ruleCode: 'BL-401',
        ruleName: 'Subscription Reactivation on Payment Rule',
        severity: 'CRITICAL',
        entityId: `inv-${i}`,
        entityType: 'INVOICE',
        tenantId: 'tenant-flood',
        violatedAt: new Date(),
        rationale: 'Paid invoice left sub expired',
        evidence: { subscriptionId: `sub-${i}` },
      });
    }

    const results = await service.autoHealViolations(violations);
    expect(results).toHaveLength(7);

    // First 5 succeeded
    expect(results.slice(0, 5).every((r) => r.success)).toBe(true);

    // 6th and 7th tripped the circuit breaker
    expect(results[5].success).toBe(false);
    expect(results[5].actionTaken).toBe('CIRCUIT_BREAKER_TRIPPED');
    expect(results[6].success).toBe(false);
    expect(results[6].actionTaken).toBe('CIRCUIT_BREAKER_TRIPPED');
  });
});
