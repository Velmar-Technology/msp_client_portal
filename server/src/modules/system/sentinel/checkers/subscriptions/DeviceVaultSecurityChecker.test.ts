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
});
