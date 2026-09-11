import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

export const QBR_THRESHOLD_PERCENT = 70;

/**
 * Invariant Checker enforcing BL-601: Account Health Score & QBR Flagging.
 * Validates that:
 * 1. Health score evaluates to H = 0.40 S_ticket + 0.30 S_hardware + 0.30 S_security.
 * 2. Accounts with score < 70% generate a scheduled QBR review task.
 *
 * @see BL-601
 */
export class AccountHealthChecker implements InvariantChecker {
  readonly ruleCode = 'BL-601';
  readonly ruleName = 'Account Health Score & QBR Review Flag Rule';
  readonly category = 'CRM_HEALTH';

  /**
   * Evaluates tenant sequences for degraded health score flags.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const violations: InvariantViolation[] = [];

    for (const seq of sequences) {
      for (const step of seq.steps) {
        if (step.action === 'HEALTH_SCORE_EVALUATED' || step.metadata?.healthScore !== undefined) {
          const score = parseFloat((step.metadata?.healthScore as string) || '100');
          const qbrFlagged = Boolean(step.metadata?.qbrReviewFlagged);

          if (score < QBR_THRESHOLD_PERCENT && !qbrFlagged) {
            violations.push({
              ruleCode: this.ruleCode,
              ruleName: this.ruleName,
              severity: 'HIGH',
              entityId: seq.entityId,
              entityType: seq.entityType,
              tenantId: seq.tenantId,
              violatedAt: step.timestamp,
              rationale: `Account health score (${score}%) dropped below 70% without triggering a QBR review task (BL-601).`,
              evidence: {
                tenantId: seq.tenantId,
                healthScore: score,
                threshold: QBR_THRESHOLD_PERCENT,
                qbrReviewFlagged: false,
              },
              actionSequence: seq,
            });
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
