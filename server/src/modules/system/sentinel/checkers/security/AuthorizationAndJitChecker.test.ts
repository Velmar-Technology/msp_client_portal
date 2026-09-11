import { describe, it, expect } from 'vitest';
import { AuthorizationAndJitChecker } from './AuthorizationAndJitChecker';
import { ActionSequence } from '../../types';

describe('AuthorizationAndJitChecker (BL-302)', () => {
  const checker = new AuthorizationAndJitChecker();

  it('should pass when JIT action is performed within active grant window', async () => {
    const actionTime = new Date('2026-09-08T12:00:00Z');
    const expiresAt = new Date('2026-09-08T12:30:00Z'); // 30m later

    const sequence: ActionSequence = {
      entityId: 'dev-jit-valid',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 'step-jit',
          entityId: 'dev-jit-valid',
          entityType: 'DEVICE',
          action: 'REMOTE_COMMAND_EXECUTED',
          timestamp: actionTime,
          tenantId: 'tenant-1',
          metadata: {
            jitGrantId: 'grant-xyz',
            jitExpiresAt: expiresAt.toISOString(),
          },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a CRITICAL violation when action occurs after JIT grant expires', async () => {
    const actionTime = new Date('2026-09-08T13:05:00Z');
    const expiresAt = new Date('2026-09-08T13:00:00Z'); // expired 5m prior!

    const sequence: ActionSequence = {
      entityId: 'dev-jit-expired',
      entityType: 'DEVICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 'step-jit-late',
          entityId: 'dev-jit-expired',
          entityType: 'DEVICE',
          action: 'REMOTE_COMMAND_EXECUTED',
          timestamp: actionTime,
          tenantId: 'tenant-1',
          metadata: {
            jitGrantId: 'grant-expired-1',
            jitExpiresAt: expiresAt.toISOString(),
          },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-302');
    expect(result.violations[0].severity).toBe('CRITICAL');
  });

  it('should flag a CRITICAL violation when cross-tenant access occurs without delegation', async () => {
    const sequence: ActionSequence = {
      entityId: 't-cross',
      entityType: 'TICKET',
      tenantId: 'tenant-alpha',
      steps: [
        {
          id: 's-leak',
          entityId: 't-cross',
          entityType: 'TICKET',
          action: 'TICKET_UPDATED',
          timestamp: new Date(),
          tenantId: 'tenant-alpha',
          metadata: {
            targetTenantId: 'tenant-beta', // unauthorized cross-tenant attempt!
            crossTenantDelegated: false,
          },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-302');
  });
});
