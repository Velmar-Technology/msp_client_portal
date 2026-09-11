import { logger } from '@shared/utils/logger';
import {
  VaultwardenService,
  vaultwardenService as defaultVaultwardenService,
} from '../../services/VaultwardenService';
import { InvariantViolation, RemediationHandler, RemediationResult } from '../types';

/**
 * Autonomous Self-Healing Remediator for BL-206: Vault Provisioning & Invitation Integrity.
 * When a user invitation to Vaultwarden has failed or dropped out, this remediator:
 * 1. Checks live enrollment status in the target Vaultwarden organization (idempotency check).
 * 2. If already enrolled or pending, marks the violation as safely resolved.
 * 3. If missing, attempts to re-invite the user or reset vault access so a fresh zero-knowledge invite is delivered.
 *
 * @see BL-206
 */
export class VaultInvitationRemediator implements RemediationHandler {
  readonly ruleCode = 'BL-206';
  readonly name = 'Vault Provisioning & Invitation Remediator';

  /**
   * Initializes remediator with optional VaultwardenService injection for unit tests.
   *
   * @param vaultwardenSvc - Vaultwarden integration domain service
   */
  constructor(
    private readonly vaultwardenSvc: VaultwardenService = defaultVaultwardenService
  ) {}

  /**
   * Executes autonomous remediation of failed or missing vault invitations.
   *
   * @param violation - BL-206 invariant violation
   * @returns RemediationResult
   */
  async remediate(violation: InvariantViolation): Promise<RemediationResult> {
    const email = (violation.evidence?.email as string) || '';
    const orgId =
      (violation.evidence?.orgId as string) ||
      violation.tenantId ||
      '';

    if (!email || !orgId) {
      return {
        ruleCode: this.ruleCode,
        entityId: violation.entityId,
        tenantId: violation.tenantId,
        success: false,
        actionTaken: 'NO_ACTION',
        error: 'Missing email or organization ID in violation evidence',
        remediatedAt: new Date(),
      };
    }

    try {
      // 1. Idempotency check: verify current membership state
      const currentStatus = await this.vaultwardenSvc.checkUserInvitationStatus(orgId, email);

      if (currentStatus === 'ACCEPTED' || currentStatus === 'INVITED') {
        logger.info(
          `[Sentinel Auto-Heal] User '${email}' is already in '${currentStatus}' status in org '${orgId}'. Violation marked resolved.`
        );
        return {
          ruleCode: this.ruleCode,
          entityId: violation.entityId,
          tenantId: violation.tenantId,
          success: true,
          actionTaken: 'ALREADY_ENROLLED',
          details: { email, orgId, status: currentStatus },
          remediatedAt: new Date(),
        };
      }

      // 2. Dispatch fresh invitation
      const inviteRes = await this.vaultwardenSvc.inviteUserToOrganization(orgId, email, 'User');

      logger.info(
        `[Sentinel Auto-Heal] Successfully dispatched vault invitation for '${email}' in org '${orgId}' (BL-206).`
      );

      return {
        ruleCode: this.ruleCode,
        entityId: violation.entityId,
        tenantId: violation.tenantId,
        success: true,
        actionTaken: 'REINVITE_USER',
        details: {
          email,
          orgId,
          alreadyEnrolled: inviteRes.alreadyEnrolled,
        },
        remediatedAt: new Date(),
      };
    } catch (err: any) {
      logger.warn(
        `[Sentinel Auto-Heal] Direct invite failed for '${email}'; attempting resetUserVaultAccess: ${err.message}`
      );

      try {
        const resetRes = await this.vaultwardenSvc.resetUserVaultAccess(violation.tenantId, email);
        return {
          ruleCode: this.ruleCode,
          entityId: violation.entityId,
          tenantId: violation.tenantId,
          success: true,
          actionTaken: 'RESET_AND_REINVITED',
          details: { email, orgId, message: resetRes.message },
          remediatedAt: new Date(),
        };
      } catch (resetErr: any) {
        logger.error(
          `[Sentinel Auto-Heal Error] Failed to heal vault invitation for '${email}':`,
          resetErr
        );
        return {
          ruleCode: this.ruleCode,
          entityId: violation.entityId,
          tenantId: violation.tenantId,
          success: false,
          actionTaken: 'FAILED_REMEDIATION',
          error: resetErr.message || String(resetErr),
          remediatedAt: new Date(),
        };
      }
    }
  }
}
