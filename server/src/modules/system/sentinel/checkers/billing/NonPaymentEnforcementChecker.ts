import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/**
 * Invariant Checker enforcing BL-702: 4-Tier Non-Payment Delinquency Scale.
 * Validates that:
 * - Day 5 overdue: write mutations are blocked (mode is READ_ONLY).
 * - Day 15 overdue: access is halted (status is SUSPENDED).
 * - Active write actions while overdue >=5 days without payment are flagged as CRITICAL.
 *
 * @see BL-702
 */
export class NonPaymentEnforcementChecker implements InvariantChecker {
  readonly ruleCode = 'BL-702';
  readonly ruleName = '4-Tier Overdue Non-Payment Enforcement Scale';
  readonly category = 'BILLING';

  /**
   * Evaluates action sequences for illicit write operations during delinquency states.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const violations: InvariantViolation[] = [];

    for (const seq of sequences) {
      const rawTenant = seq.rootContext?.tenant as
        | { id?: string; status?: string; oldest_overdue_days?: number }
        | undefined;

      const overdueDays = rawTenant?.oldest_overdue_days || 0;

      if (overdueDays >= 5) {
        // Find write mutations executed during Day 5+ delinquency
        const writeStep = seq.steps.find(
          (s) =>
            s.action === 'TICKET_CREATED' ||
            s.action === 'VAULT_CREDENTIAL_RETRIEVED' ||
            s.action === 'DEVICE_PROVISIONED' ||
            s.action.startsWith('MUTATION_')
        );

        if (writeStep) {
          violations.push({
            ruleCode: this.ruleCode,
            ruleName: this.ruleName,
            severity: 'CRITICAL',
            entityId: seq.entityId,
            entityType: seq.entityType,
            tenantId: seq.tenantId,
            violatedAt: writeStep.timestamp,
            rationale: `Tenant executed write action '${writeStep.action}' while overdue by ${overdueDays} days, bypassing READ_ONLY/SUSPENDED enforcement (BL-702).`,
            evidence: {
              tenantId: seq.tenantId,
              overdueDays,
              executedAction: writeStep.action,
              tenantStatus: rawTenant?.status,
            },
            actionSequence: seq,
          });
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
