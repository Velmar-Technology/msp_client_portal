import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/**
 * Invariant Checker enforcing BL-302: SOTA Hybrid Authorization & Zero Standing Privileges (ZSP).
 * Validates that:
 * 1. Elevated actions requiring JIT Ephemeral access were executed strictly within the active grant window.
 * 2. Cross-tenant queries without valid multi-tenant delegation are flagged.
 *
 * @see BL-302
 */
export class AuthorizationAndJitChecker implements InvariantChecker {
  readonly ruleCode = 'BL-302';
  readonly ruleName = 'Hybrid Authorization, ZSP & Ephemeral Grant Rule';
  readonly category = 'SECURITY';

  /**
   * Evaluates sequences for expired JIT privilege usage or cross-tenant leakage.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const violations: InvariantViolation[] = [];

    for (const seq of sequences) {
      for (const step of seq.steps) {
        // Check 1: Cross-tenant isolation violation
        if (step.metadata?.targetTenantId && step.metadata.targetTenantId !== seq.tenantId) {
          if (!step.metadata.crossTenantDelegated) {
            violations.push({
              ruleCode: this.ruleCode,
              ruleName: this.ruleName,
              severity: 'CRITICAL',
              entityId: seq.entityId,
              entityType: seq.entityType,
              tenantId: seq.tenantId,
              violatedAt: step.timestamp,
              rationale: `Cross-tenant access attempted from tenant '${seq.tenantId}' to '${step.metadata.targetTenantId}' without authorized delegation (BL-302).`,
              evidence: {
                stepId: step.id,
                sourceTenantId: seq.tenantId,
                targetTenantId: step.metadata.targetTenantId,
                actorId: step.actorId,
              },
              actionSequence: seq,
            });
          }
        }

        // Check 2: Expired JIT Ephemeral access usage
        if (step.metadata?.jitGrantId) {
          const grantExpiresAtStr = step.metadata.jitExpiresAt as string | undefined;
          if (grantExpiresAtStr) {
            const grantExpiresAt = new Date(grantExpiresAtStr);
            if (step.timestamp.getTime() > grantExpiresAt.getTime()) {
              violations.push({
                ruleCode: this.ruleCode,
                ruleName: this.ruleName,
                severity: 'CRITICAL',
                entityId: seq.entityId,
                entityType: seq.entityType,
                tenantId: seq.tenantId,
                violatedAt: step.timestamp,
                rationale: `Elevated action executed after JIT ephemeral grant '${step.metadata.jitGrantId}' had already expired (BL-302).`,
                evidence: {
                  jitGrantId: step.metadata.jitGrantId,
                  actionTimestamp: step.timestamp.toISOString(),
                  grantExpiresAt: grantExpiresAt.toISOString(),
                  deltaSeconds: Math.round((step.timestamp.getTime() - grantExpiresAt.getTime()) / 1000),
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
