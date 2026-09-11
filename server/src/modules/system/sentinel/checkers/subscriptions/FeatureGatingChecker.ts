import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/**
 * Invariant Checker enforcing BL-204: Feature Gating & Entitlements Rule.
 * Validates that unentitled feature operations were strictly rejected with HTTP 403 or locked.
 *
 * @see BL-204
 */
export class FeatureGatingChecker implements InvariantChecker {
  readonly ruleCode = 'BL-204';
  readonly ruleName = 'Feature Gating & Entitlements Rule';
  readonly category = 'SUBSCRIPTIONS';

  /**
   * Evaluates action sequences for illicit feature executions.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const violations: InvariantViolation[] = [];

    for (const seq of sequences) {
      // Check if sequence contains an unauthorized feature execution
      const unauthorizedStep = seq.steps.find(
        (s) =>
          s.metadata?.featureViolation === true ||
          (s.metadata?.featureCode && s.metadata?.planEntitled === false)
      );

      if (unauthorizedStep) {
        violations.push({
          ruleCode: this.ruleCode,
          ruleName: this.ruleName,
          severity: 'HIGH',
          entityId: seq.entityId,
          entityType: seq.entityType,
          tenantId: seq.tenantId,
          violatedAt: unauthorizedStep.timestamp,
          rationale: `Tenant executed gated feature '${unauthorizedStep.metadata?.featureCode}' without required plan entitlement (BL-204).`,
          evidence: {
            featureCode: unauthorizedStep.metadata?.featureCode,
            tenantId: seq.tenantId,
            actorId: unauthorizedStep.actorId,
          },
          actionSequence: seq,
        });
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
