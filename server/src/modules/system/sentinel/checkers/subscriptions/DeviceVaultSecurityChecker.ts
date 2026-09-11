import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/**
 * Invariant Checker enforcing BL-205: Device-Bound Password Management & Vault Security.
 * Validates that:
 * 1. Plaintext secrets are never leaked in metadata (`hidePasswords: true`).
 * 2. Device vault session revocations and locks complete reliably; flags failed or dropped revocations.
 * 3. When an equipment slot is marked LOCKED, no subsequent vault session operations succeed.
 *
 * @see BL-205
 */
export class DeviceVaultSecurityChecker implements InvariantChecker {
  readonly ruleCode = 'BL-205';
  readonly ruleName = 'Device-Bound Vault Security & Credential Isolation';
  readonly category = 'SUBSCRIPTIONS';

  /**
   * Evaluates device vault sequences for secret leaks, failed revocations, and revoked session violations.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const deviceSequences = sequences.filter((s) => s.entityType === 'DEVICE');
    const violations: InvariantViolation[] = [];

    for (const seq of deviceSequences) {
      let isVaultLocked = false;
      let failedRevocationStep = null;

      for (const step of seq.steps) {
        // Check for prohibited plaintext credential leakage
        if (
          step.metadata?.plaintextPassword ||
          step.metadata?.password ||
          step.metadata?.secretKey
        ) {
          violations.push({
            ruleCode: this.ruleCode,
            ruleName: this.ruleName,
            severity: 'CRITICAL',
            entityId: seq.entityId,
            entityType: 'DEVICE',
            tenantId: seq.tenantId,
            violatedAt: step.timestamp,
            rationale: `Device vault action exposed plaintext credentials, violating the 'hidePasswords: true' policy (BL-205).`,
            evidence: {
              stepId: step.id,
              action: step.action,
              deviceId: seq.entityId,
            },
            actionSequence: seq,
          });
        }

        // Track failed revocation or lock attempts
        if (
          step.action === 'VAULT_REVOCATION_FAILED' ||
          step.action === 'DEVICE_LOCK_FAILED'
        ) {
          failedRevocationStep = step;
        }

        if (step.action === 'VAULT_REVOKED' || step.action === 'DEVICE_LOCKED') {
          isVaultLocked = true;
          failedRevocationStep = null;
        }

        if (isVaultLocked && step.action === 'VAULT_SESSION_ACCESSED') {
          violations.push({
            ruleCode: this.ruleCode,
            ruleName: this.ruleName,
            severity: 'CRITICAL',
            entityId: seq.entityId,
            entityType: 'DEVICE',
            tenantId: seq.tenantId,
            violatedAt: step.timestamp,
            rationale: `Vault session accessed on revoked/locked device '${seq.entityId}' (BL-205).`,
            evidence: {
              stepId: step.id,
              action: step.action,
              deviceId: seq.entityId,
            },
            actionSequence: seq,
          });
        }
      }

      // If a revocation or lock failed and was never cleanly completed afterwards
      if (failedRevocationStep) {
        const orgId =
          (failedRevocationStep.metadata?.orgId as string) ||
          (failedRevocationStep.metadata?.vaultwardenOrgId as string) ||
          seq.tenantId;

        const deviceUserId =
          (failedRevocationStep.metadata?.deviceUserId as string) ||
          (failedRevocationStep.metadata?.vaultwardenDeviceUserId as string) ||
          (failedRevocationStep.metadata?.vaultwarden_device_user_id as string);

        violations.push({
          ruleCode: this.ruleCode,
          ruleName: this.ruleName,
          severity: 'HIGH',
          entityId: seq.entityId,
          entityType: 'DEVICE',
          tenantId: seq.tenantId,
          violatedAt: failedRevocationStep.timestamp,
          rationale: `Device vault session revocation or lock failed for endpoint '${seq.entityId}' (BL-205).`,
          evidence: {
            stepId: failedRevocationStep.id,
            action: failedRevocationStep.action,
            deviceId: seq.entityId,
            orgId,
            deviceUserId,
            error: failedRevocationStep.metadata?.error,
          },
          actionSequence: seq,
        });
      }
    }

    return {
      ruleCode: this.ruleCode,
      ruleName: this.ruleName,
      category: this.category,
      evaluatedCount: deviceSequences.length,
      violations,
    };
  }
}
