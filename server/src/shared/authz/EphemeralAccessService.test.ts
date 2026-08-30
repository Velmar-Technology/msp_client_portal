import { describe, it, expect, beforeEach } from 'vitest';
import { EphemeralAccessService } from './EphemeralAccessService';
import { ZanzibarTupleStore } from './ZanzibarTupleStore';

describe('EphemeralAccessService (ZSP & JIT Escalation)', () => {
  let zanzibar: ZanzibarTupleStore;
  let jitService: EphemeralAccessService;

  beforeEach(() => {
    zanzibar = new ZanzibarTupleStore();
    jitService = new EphemeralAccessService(zanzibar);
  });

  it('submits a pending JIT request and enforces parameter validations', () => {
    expect(() =>
      jitService.createRequest({
        requesterId: '',
        requestedRelations: [{ subject: 'user:tech-1', relation: 'admin', object: 'tenant:tenant-1' }],
        durationMinutes: 30,
        justification: 'Emergency outage diagnosis',
      }),
    ).toThrow('requesterId is required');

    expect(() =>
      jitService.createRequest({
        requesterId: 'tech-1',
        requestedRelations: [],
        durationMinutes: 30,
        justification: 'Emergency outage diagnosis',
      }),
    ).toThrow('At least one RelationTuple is required');

    expect(() =>
      jitService.createRequest({
        requesterId: 'tech-1',
        requestedRelations: [{ subject: 'user:tech-1', relation: 'admin', object: 'tenant:tenant-1' }],
        durationMinutes: 600,
        justification: 'Emergency outage diagnosis',
      }),
    ).toThrow('JIT duration must be between 1 and 480 minutes');

    const req = jitService.createRequest({
      requesterId: 'tech-1',
      tenantId: 'tenant-1',
      requestedRelations: [{ subject: 'user:tech-1', relation: 'admin', object: 'tenant:tenant-1' }],
      durationMinutes: 45,
      justification: 'Critical DB indexing failure repair',
      ticketId: 'ticket-999',
    });

    expect(req.id).toMatch(/^jit-req-/);
    expect(req.status).toBe('PENDING');
    expect(req.durationMinutes).toBe(45);
  });

  it('approves a request, injects relation tuples into Zanzibar, and sets expiration', () => {
    const req = jitService.createRequest({
      requesterId: 'tech-1',
      tenantId: 'tenant-1',
      requestedRelations: [{ subject: 'user:tech-1', relation: 'admin', object: 'tenant:tenant-1' }],
      durationMinutes: 60,
      justification: 'Scheduled firewall firmware upgrade',
    });

    // Before approval, Zanzibar check fails
    expect(zanzibar.check('user:tech-1', 'admin', 'tenant:tenant-1')).toBe(false);

    const grant = jitService.approveRequest(req.id, 'supervisor-admin');

    expect(grant.status).toBe('ACTIVE');
    expect(grant.approvedBy).toBe('supervisor-admin');
    expect(grant.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // After approval, Zanzibar check succeeds
    expect(zanzibar.check('user:tech-1', 'admin', 'tenant:tenant-1')).toBe(true);
    expect(zanzibar.check('user:tech-1', 'viewer', 'tenant:tenant-1')).toBe(true); // hierarchy check
  });

  it('denies a pending request without touching Zanzibar', () => {
    const req = jitService.createRequest({
      requesterId: 'tech-2',
      requestedRelations: [{ subject: 'user:tech-2', relation: 'owner', object: 'tenant:tenant-2' }],
      durationMinutes: 30,
      justification: 'Curiosity investigation',
    });

    const denied = jitService.denyRequest(req.id, 'Insufficient justification');
    expect(denied.status).toBe('DENIED');
    expect(zanzibar.check('user:tech-2', 'owner', 'tenant:tenant-2')).toBe(false);
  });

  it('manually revokes an active grant and purges Zanzibar tuples immediately', () => {
    const req = jitService.createRequest({
      requesterId: 'tech-1',
      requestedRelations: [{ subject: 'user:tech-1', relation: 'admin', object: 'tenant:tenant-1' }],
      durationMinutes: 30,
      justification: 'Break-glass access',
    });

    const grant = jitService.approveRequest(req.id, 'admin-1');
    expect(zanzibar.check('user:tech-1', 'admin', 'tenant:tenant-1')).toBe(true);

    const revoked = jitService.revokeGrant(grant.id, 'admin-1');
    expect(revoked.status).toBe('REVOKED');
    expect(zanzibar.check('user:tech-1', 'admin', 'tenant:tenant-1')).toBe(false);
  });

  it('sweeps expired grants when the TTL has passed', () => {
    const req = jitService.createRequest({
      requesterId: 'tech-1',
      requestedRelations: [{ subject: 'user:tech-1', relation: 'admin', object: 'tenant:tenant-1' }],
      durationMinutes: 1,
      justification: 'Short test',
    });

    const grant = jitService.approveRequest(req.id, 'admin-1');
    // Artificially rewind expiresAt
    grant.expiresAt = new Date(Date.now() - 5000);

    const sweptCount = jitService.sweepExpiredGrants();
    expect(sweptCount).toBe(1);
    expect(grant.status).toBe('EXPIRED');
    expect(zanzibar.check('user:tech-1', 'admin', 'tenant:tenant-1')).toBe(false);
  });
});
