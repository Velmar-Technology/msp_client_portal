import { describe, it, expect } from 'vitest';
import { VaultProvisioningChecker } from './VaultProvisioningChecker';
import { ActionSequence } from '../../types';

describe('VaultProvisioningChecker (BL-206)', () => {
  const checker = new VaultProvisioningChecker();

  it('passes when subscription has no failed invitations', async () => {
    const sequence: ActionSequence = {
      entityId: 'sub-1',
      entityType: 'SUBSCRIPTION',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'sub-1',
          entityType: 'SUBSCRIPTION',
          action: 'SUBSCRIPTION_CREATED',
          timestamp: new Date('2026-09-11T10:00:00Z'),
          tenantId: 'tenant-1',
        },
        {
          id: 's2',
          entityId: 'sub-1',
          entityType: 'SUBSCRIPTION',
          action: 'VAULT_INVITATION_SENT',
          timestamp: new Date('2026-09-11T10:01:00Z'),
          tenantId: 'tenant-1',
          metadata: { email: 'epolanco@velmartech.com.do' },
        },
      ],
    };

    const res = await checker.evaluate([sequence]);
    expect(res.violations).toHaveLength(0);
    expect(res.ruleCode).toBe('BL-206');
  });

  it('flags a HIGH violation when VAULT_INVITATION_FAILED is unresolved', async () => {
    const sequence: ActionSequence = {
      entityId: 'sub-failed',
      entityType: 'SUBSCRIPTION',
      tenantId: 'tenant-velmar',
      steps: [
        {
          id: 's-fail',
          entityId: 'sub-failed',
          entityType: 'SUBSCRIPTION',
          action: 'VAULT_INVITATION_FAILED',
          timestamp: new Date('2026-09-11T12:00:00Z'),
          tenantId: 'tenant-velmar',
          metadata: {
            email: 'epolanco@velmartech.com.do',
            orgId: 'vw-org-velmar',
            upstreamStatus: 500,
            error: 'Failed to invite epolanco@velmartech.com.do to Vaultwarden organization',
          },
        },
      ],
    };

    const res = await checker.evaluate([sequence]);
    expect(res.violations).toHaveLength(1);
    expect(res.violations[0].ruleCode).toBe('BL-206');
    expect(res.violations[0].severity).toBe('HIGH');
    expect(res.violations[0].evidence.email).toBe('epolanco@velmartech.com.do');
    expect(res.violations[0].evidence.upstreamStatus).toBe(500);
  });

  it('passes if a failed invitation is subsequently resolved by VAULT_RESET_INVITED', async () => {
    const sequence: ActionSequence = {
      entityId: 'sub-healed',
      entityType: 'SUBSCRIPTION',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'sub-healed',
          entityType: 'SUBSCRIPTION',
          action: 'VAULT_INVITATION_FAILED',
          timestamp: new Date('2026-09-11T10:00:00Z'),
          tenantId: 'tenant-1',
          metadata: { email: 'epolanco@velmartech.com.do' },
        },
        {
          id: 's2',
          entityId: 'sub-healed',
          entityType: 'SUBSCRIPTION',
          action: 'VAULT_RESET_INVITED',
          timestamp: new Date('2026-09-11T10:05:00Z'),
          tenantId: 'tenant-1',
          metadata: { email: 'epolanco@velmartech.com.do' },
        },
      ],
    };

    const res = await checker.evaluate([sequence]);
    expect(res.violations).toHaveLength(0);
  });
});
