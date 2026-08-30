import { describe, it, expect } from 'vitest';
import { WorkloadIdentityService } from './WorkloadIdentityService';

describe('WorkloadIdentityService (SPIFFE & Non-Human PoLP)', () => {
  const workloadService = new WorkloadIdentityService('test-crypto-secret-key-32-chars-long');

  it('formats and parses SPIFFE IDs properly', () => {
    const spiffeId = workloadService.formatSpiffeId('tenant-alpha', 'rmm_agent', 'agent-node-01');
    expect(spiffeId).toBe('spiffe://msp.portal/tenant/tenant-alpha/rmm_agent/agent-node-01');

    const parsed = workloadService.parseSpiffeId(spiffeId);
    expect(parsed.tenantId).toBe('tenant-alpha');
    expect(parsed.workloadType).toBe('rmm_agent');
    expect(parsed.workloadId).toBe('agent-node-01');
  });

  it('issues and cryptographically verifies short-lived workload tokens', () => {
    const issued = workloadService.issueToken({
      tenantId: 'tenant-100',
      workloadType: 'ai_agent',
      workloadId: 'copilot-vector-sync',
      allowedActions: ['vector:query', 'document:read'],
      allowedResourcePrefixes: ['knowledge:tenant-100:', 'ticket:tenant-100:'],
    }, 60);

    expect(issued.token).toBeDefined();
    expect(issued.claims.spiffeId).toBe('spiffe://msp.portal/tenant/tenant-100/ai_agent/copilot-vector-sync');

    const claims = workloadService.verifyToken(issued.token);
    expect(claims.tenantId).toBe('tenant-100');
    expect(claims.allowedActions).toContain('vector:query');
  });

  it('rejects tampered or forged tokens', () => {
    const issued = workloadService.issueToken({
      tenantId: 'tenant-100',
      workloadType: 'microservice',
      workloadId: 'billing-cron',
      allowedActions: ['invoice:renew'],
      allowedResourcePrefixes: ['*'],
    });

    const tampered = `${issued.token}tampered`;
    expect(() => workloadService.verifyToken(tampered)).toThrow();
  });

  it('rejects expired tokens', () => {
    // 0 second TTL
    const issued = workloadService.issueToken({
      tenantId: 'tenant-100',
      workloadType: 'rmm_agent',
      workloadId: 'agent-1',
      allowedActions: ['telemetry:write'],
      allowedResourcePrefixes: ['equipment:eq-1'],
    }, -1);

    expect(() => workloadService.verifyToken(issued.token)).toThrow(/expired/);
  });

  it('evaluates authorization against actions and resource prefixes', () => {
    const issued = workloadService.issueToken({
      tenantId: 'tenant-1',
      workloadType: 'rmm_agent',
      workloadId: 'agent-1',
      allowedActions: ['telemetry:write', 'heartbeat:ping'],
      allowedResourcePrefixes: ['equipment:eq-1', 'equipment:eq-2'],
    });

    // Allowed action & allowed resource
    expect(workloadService.isAuthorized(issued.claims, 'telemetry:write', 'equipment:eq-1-cpu')).toBe(true);

    // Disallowed action
    expect(workloadService.isAuthorized(issued.claims, 'patch:execute', 'equipment:eq-1-cpu')).toBe(false);

    // Disallowed resource
    expect(workloadService.isAuthorized(issued.claims, 'telemetry:write', 'equipment:eq-999')).toBe(false);
  });
});
