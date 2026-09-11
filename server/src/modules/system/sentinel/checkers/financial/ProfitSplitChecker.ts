import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

export const HQ_PROFIT_RATIO = 0.7;
export const LEAD_ENGINEER_PROFIT_RATIO = 0.3;

/**
 * Invariant Checker enforcing BL-802: 70/30 Net Profit Split Calculation Rule.
 * Validates that:
 * 1. Net pool = Gross Paid Revenue - Total Deductible OpEx.
 * 2. Distributions strictly allocate 70% to HQ and 30% to Lead Engineer / Admin.
 *
 * @see BL-802
 */
export class ProfitSplitChecker implements InvariantChecker {
  readonly ruleCode = 'BL-802';
  readonly ruleName = '70/30 Net Profit Split Rule';
  readonly category = 'FINANCIAL';

  /**
   * Evaluates financial sequences for mathematical accuracy in profit distributions.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const violations: InvariantViolation[] = [];

    for (const seq of sequences) {
      for (const step of seq.steps) {
        if (step.action === 'PROFIT_DISTRIBUTED' || step.action === 'FINANCIAL_REPORT_GENERATED') {
          const gross = parseFloat((step.metadata?.grossRevenue as string) || '0');
          const opex = parseFloat((step.metadata?.totalOpex as string) || '0');
          const hqShare = parseFloat((step.metadata?.hqDistributed as string) || '0');
          const leadShare = parseFloat((step.metadata?.leadDistributed as string) || '0');

          if (gross > opex) {
            const netPool = gross - opex;
            const expectedHq = netPool * HQ_PROFIT_RATIO;
            const expectedLead = netPool * LEAD_ENGINEER_PROFIT_RATIO;

            const hqDiff = Math.abs(hqShare - expectedHq);
            const leadDiff = Math.abs(leadShare - expectedLead);

            if (hqDiff > 0.05 || leadDiff > 0.05) {
              violations.push({
                ruleCode: this.ruleCode,
                ruleName: this.ruleName,
                severity: 'CRITICAL',
                entityId: seq.entityId,
                entityType: seq.entityType,
                tenantId: seq.tenantId,
                violatedAt: step.timestamp,
                rationale: `Profit distribution deviated from mandatory 70/30 split (BL-802). HQ diff: $${hqDiff.toFixed(2)}, Lead diff: $${leadDiff.toFixed(2)}.`,
                evidence: {
                  gross,
                  opex,
                  netPool,
                  actualHq: hqShare,
                  expectedHq,
                  actualLead: leadShare,
                  expectedLead,
                },
                actionSequence: seq,
              });
            }
          }
        }
      }
    }

    return {
      ruleCode: this.ruleCode,
      ruleName: this.ruleName,
      category: this.category,
      evaluatedCount: sequences.length,
      violations,
    };
  }
}
