import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultInvitationRemediator } from './VaultInvitationRemediator';
import { VaultwardenService } from '../../services/VaultwardenService';
import { InvariantViolation } from '../types';

describe('VaultInvitationRemediator (BL-206)', () => {
  let mockVaultwarden: VaultwardenService;
  let remediator: VaultInvitationRemediator;

  const sampleViolation: InvariantViolation = {
    ruleCode: 'BL-206',
    ruleName: 'Vault Provisioning & Invitation Integrity',
    severity: 'HIGH',
    entityId: 'sub-velmar',
    entityType: 'SUBSCRIPTION',
    tenantId: 'tenant-velmar',
    violatedAt: new Date(),
    rationale: 'Failed invite',
    evidence: {
      email: 'epolanco@velmartech.com.do',
      orgId: 'vw-org-velmar',
      upstreamStatus: 500,
    },
  };

  beforeEach(() => {
    mockVaultwarden = {
      checkUserInvitationStatus: vi.fn(),
      inviteUserToOrganization: vi.fn(),
      resetUserVaultAccess: vi.fn(),
    } as unknown as VaultwardenService;

    remediator = new VaultInvitationRemediator(mockVaultwarden);
  });

  it('resolves idempotently if user is already enrolled in the vault organization', async () => {
    vi.mocked(mockVaultwarden.checkUserInvitationStatus).mockResolvedValue('ACCEPTED');

    const result = await remediator.remediate(sampleViolation);

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('ALREADY_ENROLLED');
    expect(mockVaultwarden.inviteUserToOrganization).not.toHaveBeenCalled();
  });

  it('dispatches fresh invitation if user status is NOT_FOUND', async () => {
    vi.mocked(mockVaultwarden.checkUserInvitationStatus).mockResolvedValue('NOT_FOUND');
    vi.mocked(mockVaultwarden.inviteUserToOrganization).mockResolvedValue({
      invited: true,
      email: 'epolanco@velmartech.com.do',
      orgId: 'vw-org-velmar',
    });

    const result = await remediator.remediate(sampleViolation);

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('REINVITE_USER');
    expect(mockVaultwarden.inviteUserToOrganization).toHaveBeenCalledWith(
      'vw-org-velmar',
      'epolanco@velmartech.com.do',
      'User'
    );
  });

  it('falls back to resetUserVaultAccess if direct invite encounters an error', async () => {
    vi.mocked(mockVaultwarden.checkUserInvitationStatus).mockResolvedValue('NOT_FOUND');
    vi.mocked(mockVaultwarden.inviteUserToOrganization).mockRejectedValue(
      new Error('Upstream invite conflict')
    );
    vi.mocked(mockVaultwarden.resetUserVaultAccess).mockResolvedValue({
      success: true,
      message: 'Reset invitation dispatched',
    });

    const result = await remediator.remediate(sampleViolation);

    expect(result.success).toBe(true);
    expect(result.actionTaken).toBe('RESET_AND_REINVITED');
    expect(mockVaultwarden.resetUserVaultAccess).toHaveBeenCalledWith(
      'tenant-velmar',
      'epolanco@velmartech.com.do'
    );
  });

  it('reports failure when both invite and reset fail', async () => {
    vi.mocked(mockVaultwarden.checkUserInvitationStatus).mockResolvedValue('NOT_FOUND');
    vi.mocked(mockVaultwarden.inviteUserToOrganization).mockRejectedValue(
      new Error('Invite error')
    );
    vi.mocked(mockVaultwarden.resetUserVaultAccess).mockRejectedValue(
      new Error('Reset service unavailable')
    );

    const result = await remediator.remediate(sampleViolation);

    expect(result.success).toBe(false);
    expect(result.actionTaken).toBe('FAILED_REMEDIATION');
    expect(result.error).toContain('Reset service unavailable');
  });
});
