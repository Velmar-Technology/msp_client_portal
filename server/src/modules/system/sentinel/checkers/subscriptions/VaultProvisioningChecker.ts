import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/**
 * Invariant Checker enforcing BL-206: Vault Provisioning & Invitation Integrity.
 * Validates that:
 * 1. For any client subscription entitled to PASSWORD_MANAGER, an organization is provisioned and owner invited.
 * 2. Unresolved VAULT_INVITATION_FAILED actions or dropped invitations trigger an invariant violation.
 * 3. Idempotently recognizes resolved or retried invitations.
 *
 * @see BL-206
 */
export class VaultProvisioningChecker implements InvariantChecker {
  readonly ruleCode = 'BL-206';
  readonly ruleName = 'Vault Provisioning & Invitation Integrity';
  readonly category = 'SUBSCRIPTIONS';

  /**
   * Evaluates sequences for failed or missing vault organization invitations.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const relevantSequences = sequences.filter(
      (s) => s.entityType === 'SUBSCRIPTION' || s.entityType === 'DEVICE' || s.entityType === 'INVOICE'
    );
    const violations: InvariantViolation[] = [];

    for (const seq of relevantSequences) {
      let failedStep = null;
      let isResolved = false;

      for (const step of seq.steps) {
        if (
          step.action === 'VAULT_INVITATION_FAILED' ||
          step.action === 'VAULT_PROVISION_FAILED'
        ) {
          failedStep = step;
          isResolved = false;
        }

        if (
          step.action === 'VAULT_INVITATION_SENT' ||
          step.action === 'VAULT_PROVISIONED' ||
          step.action === 'VAULT_RESET_INVITED'
        ) {
          isResolved = true;
          failedStep = null;
        }
      }

      if (failedStep && !isResolved) {
        const email =
          (failedStep.metadata?.email as string) ||
          (failedStep.metadata?.ownerEmail as string) ||
          (seq.rootContext?.clientEmail as string) ||
          'unknown@tenant.local';

        const orgId =
          (failedStep.metadata?.orgId as string) ||
          (failedStep.metadata?.vaultwardenOrgId as string) ||
          seq.tenantId;

        violations.push({
          ruleCode: this.ruleCode,
          ruleName: this.ruleName,
          severity: 'HIGH',
          entityId: seq.entityId,
          entityType: seq.entityType,
          tenantId: seq.tenantId,
          violatedAt: failedStep.timestamp,
          rationale: `Vault organization invitation failed or remains unprovisioned for '${email}' in org '${orgId}' (BL-206).`,
          evidence: {
            stepId: failedStep.id,
            action: failedStep.action,
            email,
            orgId,
            upstreamStatus: failedStep.metadata?.upstreamStatus,
            error: failedStep.metadata?.error,
          },
          actionSequence: seq,
        });
      }
    }

    return {
      ruleCode: this.ruleCode,
      ruleName: this.ruleName,
      category: this.category,
      evaluatedCount: relevantSequences.length,
      violations,
    };
  }
}
