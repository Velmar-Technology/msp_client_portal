import { describe, it, expect, beforeEach } from 'vitest';
import { HybridPolicyEngine } from './HybridPolicyEngine';
import { ZanzibarTupleStore } from './ZanzibarTupleStore';
import { PolicyAsCodeEngine } from './PolicyAsCodeEngine';
import { UserRole } from '@shared/types';
import { AuthzContext } from './types';

describe('HybridPolicyEngine (Unified PDP)', () => {
  let zanzibar: ZanzibarTupleStore;
  let pacEngine: PolicyAsCodeEngine;
  let engine: HybridPolicyEngine;

  beforeEach(() => {
    zanzibar = new ZanzibarTupleStore();
    pacEngine = new PolicyAsCodeEngine();
    engine = new HybridPolicyEngine(zanzibar, pacEngine);
  });

  it('grants global access to ADMIN role', async () => {
    const ctx: AuthzContext = {
      subject: { id: 'admin-1', type: 'user', role: UserRole.ADMIN },
      action: 'delete',
      resource: { id: 'ticket-1', type: 'ticket', tenantId: 'tenant-99' },
    };

    const decision = await engine.evaluate(ctx);
    expect(decision.allowed).toBe(true);
  });

  it('rejects CLIENT trying to perform forbidden actions (e.g. assign technician)', async () => {
    const ctx: AuthzContext = {
      subject: { id: 'client-1', type: 'user', role: UserRole.CLIENT, tenantId: 'tenant-1' },
      action: 'assign',
      resource: { id: 'ticket-1', type: 'ticket', tenantId: 'tenant-1', ownerId: 'client-1' },
    };

    const decision = await engine.evaluate(ctx);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('is not permitted to perform action "assign"');
  });

  it('permits CLIENT reading their own ticket via ReBAC relation', async () => {
    engine.grantRelation('client-1', 'owner', 'ticket', 'ticket-10');

    const ctx: AuthzContext = {
      subject: { id: 'client-1', type: 'user', role: UserRole.CLIENT, tenantId: 'tenant-1' },
      action: 'read',
      resource: { id: 'ticket-10', type: 'ticket', tenantId: 'tenant-1', ownerId: 'client-1' },
    };

    const decision = await engine.evaluate(ctx);
    expect(decision.allowed).toBe(true);
  });

  it('enforces multi-tenant isolation boundary (cross-tenant access denied)', async () => {
    engine.grantRelation('client-1', 'viewer', 'ticket', 'ticket-20');

    const ctx: AuthzContext = {
      subject: { id: 'client-1', type: 'user', role: UserRole.CLIENT, tenantId: 'tenant-1' },
      action: 'read',
      resource: { id: 'ticket-20', type: 'ticket', tenantId: 'tenant-2' },
    };

    const decision = await engine.evaluate(ctx);
    expect(decision.allowed).toBe(false);
    expect(decision.violatedPolicy).toBe('PAC-TENANT-ISOLATION-001');
  });

  it('enforces 1-hour SLA cancellation window rule (BL-101)', async () => {
    const oldDate = new Date(Date.now() - 7 * 24 * 3600 * 1000); // 7 days ago (guarantees business hours have elapsed)

    const ctx: AuthzContext = {
      subject: { id: 'client-1', type: 'user', role: UserRole.CLIENT, tenantId: 'tenant-1' },
      action: 'cancel',
      resource: {
        id: 'ticket-30',
        type: 'ticket',
        tenantId: 'tenant-1',
        ownerId: 'client-1',
        attributes: { createdAt: oldDate.toISOString() },
      },
    };

    const decision = await engine.evaluate(ctx);
    expect(decision.allowed).toBe(false);
    expect(decision.violatedPolicy).toBe('PAC-SLA-CANCELLATION-BL101');
  });

  it('enforces Non-Payment scale account status write restriction (BL-702)', async () => {
    const ctx: AuthzContext = {
      subject: { id: 'client-1', type: 'user', role: UserRole.CLIENT, tenantId: 'tenant-1' },
      action: 'create',
      resource: { id: 'ticket-new', type: 'ticket', tenantId: 'tenant-1' },
      environment: { accountStatus: 'READ_ONLY' },
    };

    const decision = await engine.evaluate(ctx);
    expect(decision.allowed).toBe(false);
    expect(decision.violatedPolicy).toBe('PAC-NONPAYMENT-GUARD-BL702');
  });

  it('authorizes non-human service accounts via Workload Identity claims', async () => {
    const ctx: AuthzContext = {
      subject: {
        id: 'agent-zabbix-1',
        type: 'agent',
        role: UserRole.TECHNICIAN,
        attributes: {
          workloadClaims: {
            spiffeId: 'spiffe://msp.portal/tenant/t-1/rmm_agent/agent-1',
            workloadType: 'rmm_agent',
            tenantId: 't-1',
            allowedActions: ['telemetry:write'],
            allowedResourcePrefixes: ['equipment:eq-1'],
            issuedAt: Math.floor(Date.now() / 1000),
            expiresAt: Math.floor(Date.now() / 1000) + 300,
            nonce: 'abc',
          },
        },
      },
      action: 'telemetry:write',
      resource: { id: 'eq-1', type: 'equipment', tenantId: 't-1' },
    };

    const decision = await engine.evaluate(ctx);
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toContain('Authorized via Cryptographic Workload Identity');
  });

  it('enforces Step-Up MFA when device compliance is flagged in environment', async () => {
    engine.grantRelation('tech-1', 'editor', 'ticket', 'ticket-40');

    const ctx: AuthzContext = {
      subject: { id: 'tech-1', type: 'user', role: UserRole.TECHNICIAN, tenantId: 'tenant-1' },
      action: 'update',
      resource: { id: 'ticket-40', type: 'ticket', tenantId: 'tenant-1' },
      environment: { deviceCompliant: false },
    };

    const decision = await engine.evaluate(ctx);
    expect(decision.allowed).toBe(false);
    expect(decision.requiredStepUpMfa).toBe(true);
    expect(decision.reason).toContain('Step-Up MFA');
  });
});
