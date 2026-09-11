import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SequenceSentinelService } from './SequenceSentinelService';
import { SequenceAggregatorService } from './SequenceAggregatorService';
import { VitestRegressionSynthesizer } from './VitestRegressionSynthesizer';
import { InvariantChecker } from '../types';

describe('SequenceSentinelService', () => {
  let mockAggregator: SequenceAggregatorService;
  let mockSynthesizer: VitestRegressionSynthesizer;
  let service: SequenceSentinelService;

  beforeEach(() => {
    mockAggregator = {
      aggregateAll: vi.fn().mockResolvedValue([]),
    } as any;

    mockSynthesizer = {
      saveRegressionTest: vi.fn().mockResolvedValue('/path/to/test.spec.ts'),
    } as any;
  });

  it('should compile an empty clean scorecard when no sequences violate rules', async () => {
    service = new SequenceSentinelService(mockAggregator, mockSynthesizer);

    const report = await service.runAudit({
      startDate: new Date('2026-09-01T00:00:00Z'),
      endDate: new Date('2026-09-10T00:00:00Z'),
    });

    expect(report.totalViolations).toBe(0);
    expect(report.scorecard).toHaveLength(19); // 19 checkers across all 18 master rules evaluated!
    expect(report.scorecard.every((r) => r.status === 'PASS')).toBe(true);
  });

  it('should flag violations and synthesize regression tests when checkers detect drift', async () => {
    const mockViolatingChecker: InvariantChecker = {
      ruleCode: 'BL-101',
      ruleName: '1-Hour SLA Cancellation Constraint',
      category: 'TICKETING',
      evaluate: vi.fn().mockResolvedValue({
        ruleCode: 'BL-101',
        ruleName: '1-Hour SLA Cancellation Constraint',
        category: 'TICKETING',
        evaluatedCount: 1,
        violations: [
          {
            ruleCode: 'BL-101',
            ruleName: '1-Hour SLA Cancellation Constraint',
            severity: 'CRITICAL',
            entityId: 'ticket-broken',
            entityType: 'TICKET',
            tenantId: 'tenant-1',
            violatedAt: new Date(),
            rationale: 'Late cancellation breach',
            evidence: { elapsedMinutes: 90 },
          },
        ],
      }),
    };

    service = new SequenceSentinelService(mockAggregator, mockSynthesizer, undefined, [mockViolatingChecker]);

    const report = await service.runAudit(
      {
        startDate: new Date('2026-09-01T00:00:00Z'),
        endDate: new Date('2026-09-10T00:00:00Z'),
      },
      { generateTests: true }
    );

    expect(report.totalViolations).toBe(1);
    expect(report.scorecard[0].status).toBe('FAIL');
    expect(mockSynthesizer.saveRegressionTest).toHaveBeenCalledTimes(1);
    expect(report.synthesizedTestPaths).toEqual(['/path/to/test.spec.ts']);
  });

  it('should trigger self-healing when autoHeal option is enabled', async () => {
    const mockViolatingChecker: InvariantChecker = {
      ruleCode: 'BL-401',
      ruleName: 'Subscription Reactivation Constraint',
      category: 'BILLING',
      evaluate: vi.fn().mockResolvedValue({
        ruleCode: 'BL-401',
        ruleName: 'Subscription Reactivation Constraint',
        category: 'BILLING',
        evaluatedCount: 1,
        violations: [
          {
            ruleCode: 'BL-401',
            ruleName: 'Subscription Reactivation Constraint',
            severity: 'CRITICAL',
            entityId: 'inv-1',
            entityType: 'INVOICE',
            tenantId: 'tenant-1',
            violatedAt: new Date(),
            rationale: 'Subscription remained expired after invoice paid',
            evidence: { subscriptionId: 'sub-1' },
          },
        ],
      }),
    };

    const mockSelfHealing = {
      autoHealViolations: vi.fn().mockResolvedValue([
        {
          violationId: 'BL-401:inv-1',
          ruleCode: 'BL-401',
          entityId: 'inv-1',
          actionTaken: 'REACTIVATE_SUBSCRIPTION',
          success: true,
          details: { updatedSubscriptionId: 'sub-1' },
        },
      ]),
    } as any;

    service = new SequenceSentinelService(
      mockAggregator,
      mockSynthesizer,
      mockSelfHealing,
      [mockViolatingChecker]
    );

    const report = await service.runAudit(
      {
        startDate: new Date('2026-09-01T00:00:00Z'),
        endDate: new Date('2026-09-10T00:00:00Z'),
      },
      { autoHeal: true }
    );

    expect(mockSelfHealing.autoHealViolations).toHaveBeenCalledTimes(1);
    expect(report.remediations).toHaveLength(1);
    expect(report.remediations![0].success).toBe(true);
  });
});
