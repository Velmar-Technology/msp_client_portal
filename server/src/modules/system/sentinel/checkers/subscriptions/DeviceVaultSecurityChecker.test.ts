import { describe, it, expect } from 'vitest';
import { DeviceVaultSecurityChecker } from './DeviceVaultSecurityChecker';
import { ActionSequence } from '../../types';

describe('DeviceVaultSecurityChecker (BL-205)', () => {
  const checker = new DeviceVaultSecurityChecker();

  it('should pass for safe vault sessions without credential leaks', async () => {
    const sequence: ActionSequence = {
      entityId: 'dev-slot-1',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'dev-slot-1',
          entityType: 'DEVICE',
          action: 'VAULT_PROVISIONED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
          metadata: { collectionId: 'coll-1', hidePasswords: true },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a CRITICAL violation when plaintext password is leaked', async () => {
    const sequence: ActionSequence = {
      entityId: 'dev-slot-leak',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's-leak',
          entityId: 'dev-slot-leak',
          entityType: 'DEVICE',
          action: 'VAULT_CREDENTIAL_RETRIEVED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
          metadata: { plaintextPassword: 'supersecretpassword123' },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-205');
    expect(result.violations[0].severity).toBe('CRITICAL');
  });

  it('should flag a CRITICAL violation when session is accessed after vault revocation', async () => {
    const t0 = new Date('2026-09-08T10:00:00Z');
    const t1 = new Date('2026-09-08T10:05:00Z');

    const sequence: ActionSequence = {
      entityId: 'dev-revoked',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'dev-revoked',
          entityType: 'DEVICE',
          action: 'VAULT_REVOKED',
          timestamp: t0,
          tenantId: 'tenant-1',
        },
        {
          id: 's2',
          entityId: 'dev-revoked',
          entityType: 'DEVICE',
          action: 'VAULT_SESSION_ACCESSED',
          timestamp: t1,
          tenantId: 'tenant-1',
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-205');
  });

  it('should flag a HIGH violation when device vault session revocation fails and remains unresolved', async () => {
    const sequence: ActionSequence = {
      entityId: 'dev-fail',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's-fail',
          entityId: 'dev-fail',
          entityType: 'DEVICE',
          action: 'VAULT_REVOCATION_FAILED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
          metadata: {
            deviceId: 'dev-fail',
            orgId: 'org-vault-1',
            deviceUserId: 'vw-user-fail',
            error: 'Upstream 401 Unauthorized',
          },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-205');
    expect(result.violations[0].severity).toBe('HIGH');
    expect(result.violations[0].evidence.deviceId).toBe('dev-fail');
    expect(result.violations[0].evidence.orgId).toBe('org-vault-1');
    expect(result.violations[0].evidence.deviceUserId).toBe('vw-user-fail');
  });

  it('should pass when a failed revocation is subsequently resolved by VAULT_REVOKED', async () => {
    const sequence: ActionSequence = {
      entityId: 'dev-recovered',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'dev-recovered',
          entityType: 'DEVICE',
          action: 'VAULT_REVOCATION_FAILED',
          timestamp: new Date('2026-09-08T10:00:00Z'),
          tenantId: 'tenant-1',
        },
        {
          id: 's2',
          entityId: 'dev-recovered',
          entityType: 'DEVICE',
          action: 'VAULT_REVOKED',
          timestamp: new Date('2026-09-08T10:05:00Z'),
          tenantId: 'tenant-1',
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });
});
