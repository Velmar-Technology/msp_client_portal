import { logger } from '@shared/utils/logger';
import {
  VaultwardenService,
  vaultwardenService as defaultVaultwardenService,
} from '../../services/VaultwardenService';
import {
  EquipmentRepository,
  equipmentRepository as defaultEquipmentRepository,
} from '@modules/equipment';
import { InvariantViolation, RemediationHandler, RemediationResult } from '../types';

/**
 * Autonomous Self-Healing Remediator for BL-205: Device-Bound Password Management & Vault Security.
 * When a workstation vault revocation has failed, dropped, or an endpoint requires an emergency lock:
 * 1. Checks live status of the physical equipment slot in the datastore (idempotency check).
 * 2. If already locked and no upstream deauth retry is needed, marks the violation as safely resolved.
 * 3. De-authenticates active Vaultwarden device user sessions upstream via admin deauth.
 * 4. Updates datastore status to 'LOCKED' and timestamps the synchronization.
 *
 * @see BL-205
 */
export class DeviceVaultSessionRemediator implements RemediationHandler {
  readonly ruleCode = 'BL-205';
  readonly name = 'Device Vault Session Remediator';

  /**
   * Initializes remediator with dependency injection for VaultwardenService and EquipmentRepository.
   *
   * @param vaultwardenSvc - Vaultwarden integration domain service
   * @param equipmentRepo - Equipment data repository
   */
  constructor(
    private readonly vaultwardenSvc: VaultwardenService = defaultVaultwardenService,
    private readonly equipmentRepo: EquipmentRepository = defaultEquipmentRepository
  ) {}

  /**
   * Executes autonomous remediation of failed or pending device vault session revocations.
   *
   * @param violation - BL-205 invariant violation
   * @returns RemediationResult
   */
  async remediate(violation: InvariantViolation): Promise<RemediationResult> {
    const deviceId =
      (violation.evidence?.deviceId as string) ||
      violation.entityId ||
      '';
    const tenantId = violation.tenantId;

    if (!deviceId) {
      return {
        ruleCode: this.ruleCode,
        entityId: violation.entityId,
        tenantId: violation.tenantId,
        success: false,
        actionTaken: 'NO_ACTION',
        error: 'Missing device ID in violation evidence',
        remediatedAt: new Date(),
      };
    }

    try {
      // 1. Locate physical equipment slot
      const equipment = await this.equipmentRepo.findById(deviceId);
      if (!equipment) {
        logger.warn(`[Sentinel Auto-Heal] Equipment slot '${deviceId}' not found in datastore.`);
        return {
          ruleCode: this.ruleCode,
          entityId: violation.entityId,
          tenantId: violation.tenantId,
          success: false,
          actionTaken: 'EQUIPMENT_NOT_FOUND',
          error: `Equipment slot '${deviceId}' not found`,
          remediatedAt: new Date(),
        };
      }

      const targetOrgId =
        equipment.vaultwarden_org_id ||
        (violation.evidence?.orgId as string) ||
        tenantId;

      const deviceUserId =
        equipment.vaultwarden_device_user_id ||
        (violation.evidence?.deviceUserId as string) ||
        null;

      const isFailedRevocationAction =
        violation.evidence?.action === 'VAULT_REVOCATION_FAILED' ||
        violation.evidence?.action === 'DEVICE_LOCK_FAILED';

      // 2. Idempotency check: if already locked and not a failed revocation requiring upstream retry
      if (equipment.vaultwarden_status === 'LOCKED' && !isFailedRevocationAction) {
        logger.info(
          `[Sentinel Auto-Heal] Equipment slot '${deviceId}' is already in LOCKED status. Violation marked resolved.`
        );
        return {
          ruleCode: this.ruleCode,
          entityId: violation.entityId,
          tenantId: violation.tenantId,
          success: true,
          actionTaken: 'ALREADY_LOCKED',
          details: { deviceId, status: 'LOCKED' },
          remediatedAt: new Date(),
        };
      }

      // 3. De-authorize Vaultwarden device sessions upstream if device user is mapped
      let upstreamRevoked = false;
      if (deviceUserId) {
        upstreamRevoked = await this.vaultwardenSvc.revokeDeviceSession(targetOrgId, deviceUserId);
        logger.info(
          `[Sentinel Auto-Heal] Upstream device session de-authorized for user '${deviceUserId}' in org '${targetOrgId}' (BL-205).`
        );
      } else {
        logger.warn(
          `[Sentinel Auto-Heal] No vaultwarden_device_user_id mapped for equipment '${deviceId}'; proceeding to lock slot locally.`
        );
      }

      // 4. Update equipment record in database to LOCKED
      await this.equipmentRepo.update(equipment.id, {
        vaultwarden_status: 'LOCKED',
        vaultwarden_last_synced_at: new Date(),
      });

      logger.info(
        `[Sentinel Auto-Heal] Successfully locked equipment slot '${equipment.id}' and revoked vault access (BL-205).`
      );

      return {
        ruleCode: this.ruleCode,
        entityId: violation.entityId,
        tenantId: violation.tenantId,
        success: true,
        actionTaken: 'DEAUTH_AND_LOCKED',
        details: {
          deviceId: equipment.id,
          deviceUserId,
          targetOrgId,
          upstreamRevoked,
        },
        remediatedAt: new Date(),
      };
    } catch (err: any) {
      logger.error(
        `[Sentinel Auto-Heal Error] Failed to heal device vault session for equipment '${deviceId}':`,
        err
      );
      return {
        ruleCode: this.ruleCode,
        entityId: violation.entityId,
        tenantId: violation.tenantId,
        success: false,
        actionTaken: 'FAILED_REMEDIATION',
        error: err.message || String(err),
        remediatedAt: new Date(),
      };
    }
  }
}
