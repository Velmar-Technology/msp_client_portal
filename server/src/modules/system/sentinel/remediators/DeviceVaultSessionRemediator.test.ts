import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceVaultSessionRemediator } from './DeviceVaultSessionRemediator';
import { InvariantViolation } from '../types';

describe('DeviceVaultSessionRemediator (BL-205)', () => {
  let mockVaultwardenSvc: any;
  let mockEquipmentRepo: any;
  let remediator: DeviceVaultSessionRemediator;

  beforeEach(() => {
    mockVaultwardenSvc = {
      revokeDeviceSession: vi.fn().mockResolvedValue(true),
    };
    mockEquipmentRepo = {
      findById: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    };
    remediator = new DeviceVaultSessionRemediator(mockVaultwardenSvc, mockEquipmentRepo);
  });

  it('should successfully deauth upstream session and lock equipment slot for active device', async () => {
    mockEquipmentRepo.findById.mockResolvedValue({
      id: 'eq-slot-1',
      tenant_id: 'tenant-1',
      vaultwarden_org_id: 'org-1',
      vaultwarden_device_user_id: 'vw-user-uuid-1',
      vaultwarden_status: 'ACTIVE',
    });

    const violation: InvariantViolation = {
      ruleCode: 'BL-205',
      ruleName: 'Device-Bound Vault Security',
      severity: 'CRITICAL',
      entityId: 'eq-slot-1',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      violatedAt: new Date(),
      rationale: 'Vault session accessed on revoked/locked device (BL-205)',
      evidence: {
        deviceId: 'eq-slot-1',
      },
    };

    const result = await remediator.remediate(violation);

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('DEAUTH_AND_LOCKED');
    expect(mockVaultwardenSvc.revokeDeviceSession).toHaveBeenCalledWith('org-1', 'vw-user-uuid-1');
    expect(mockEquipmentRepo.update).toHaveBeenCalledWith('eq-slot-1', expect.objectContaining({
      vaultwarden_status: 'LOCKED',
    }));
  });

  it('should return ALREADY_LOCKED if equipment is already locked and not a failed revocation', async () => {
    mockEquipmentRepo.findById.mockResolvedValue({
      id: 'eq-slot-locked',
      tenant_id: 'tenant-1',
      vaultwarden_org_id: 'org-1',
      vaultwarden_device_user_id: 'vw-user-uuid-1',
      vaultwarden_status: 'LOCKED',
    });

    const violation: InvariantViolation = {
      ruleCode: 'BL-205',
      ruleName: 'Device-Bound Vault Security',
      severity: 'CRITICAL',
      entityId: 'eq-slot-locked',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      violatedAt: new Date(),
      rationale: 'Stale violation',
      evidence: {
        deviceId: 'eq-slot-locked',
      },
    };

    const result = await remediator.remediate(violation);

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('ALREADY_LOCKED');
    expect(mockVaultwardenSvc.revokeDeviceSession).not.toHaveBeenCalled();
    expect(mockEquipmentRepo.update).not.toHaveBeenCalled();
  });

  it('should retry upstream deauth if violation evidence indicates a failed revocation action', async () => {
    mockEquipmentRepo.findById.mockResolvedValue({
      id: 'eq-slot-failed',
      tenant_id: 'tenant-1',
      vaultwarden_org_id: 'org-1',
      vaultwarden_device_user_id: 'vw-user-uuid-1',
      vaultwarden_status: 'LOCKED',
    });

    const violation: InvariantViolation = {
      ruleCode: 'BL-205',
      ruleName: 'Device-Bound Vault Security',
      severity: 'HIGH',
      entityId: 'eq-slot-failed',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      violatedAt: new Date(),
      rationale: 'Device vault session revocation or lock failed (BL-205)',
      evidence: {
        action: 'VAULT_REVOCATION_FAILED',
        deviceId: 'eq-slot-failed',
      },
    };

    const result = await remediator.remediate(violation);

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('DEAUTH_AND_LOCKED');
    expect(mockVaultwardenSvc.revokeDeviceSession).toHaveBeenCalledWith('org-1', 'vw-user-uuid-1');
    expect(mockEquipmentRepo.update).toHaveBeenCalled();
  });

  it('should return EQUIPMENT_NOT_FOUND when equipment slot does not exist', async () => {
    mockEquipmentRepo.findById.mockResolvedValue(null);

    const violation: InvariantViolation = {
      ruleCode: 'BL-205',
      ruleName: 'Device-Bound Vault Security',
      severity: 'CRITICAL',
      entityId: 'non-existent',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      violatedAt: new Date(),
      rationale: 'Missing slot',
      evidence: { deviceId: 'non-existent' },
    };

    const result = await remediator.remediate(violation);

    expect(result.success).toBe(false);
    expect(result.actionTaken).toBe('EQUIPMENT_NOT_FOUND');
    expect(result.error).toContain('not found');
  });

  it('should return NO_ACTION when deviceId is missing from evidence and entityId', async () => {
    const violation: InvariantViolation = {
      ruleCode: 'BL-205',
      ruleName: 'Device-Bound Vault Security',
      severity: 'CRITICAL',
      entityId: '',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      violatedAt: new Date(),
      rationale: 'Empty ID',
      evidence: {},
    };

    const result = await remediator.remediate(violation);

    expect(result.success).toBe(false);
    expect(result.actionTaken).toBe('NO_ACTION');
  });

  it('should capture upstream Vaultwarden service errors gracefully', async () => {
    mockEquipmentRepo.findById.mockResolvedValue({
      id: 'eq-err',
      tenant_id: 'tenant-1',
      vaultwarden_org_id: 'org-1',
      vaultwarden_device_user_id: 'vw-err-user',
      vaultwarden_status: 'ACTIVE',
    });
    mockVaultwardenSvc.revokeDeviceSession.mockRejectedValue(
      new Error('Vaultwarden Rocket backend connection refused')
    );

    const violation: InvariantViolation = {
      ruleCode: 'BL-205',
      ruleName: 'Device-Bound Vault Security',
      severity: 'CRITICAL',
      entityId: 'eq-err',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      violatedAt: new Date(),
      rationale: 'Revocation failed',
      evidence: { deviceId: 'eq-err' },
    };

    const result = await remediator.remediate(violation);

    expect(result.success).toBe(false);
    expect(result.actionTaken).toBe('FAILED_REMEDIATION');
    expect(result.error).toContain('Vaultwarden Rocket backend connection refused');
  });
});
