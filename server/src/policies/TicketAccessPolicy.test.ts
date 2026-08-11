import { describe, it, expect, beforeEach } from 'vitest';
import { ticketAccessPolicy, TicketAccessPolicy } from './TicketAccessPolicy';
import { Ticket, TicketCategory, TicketFilters, TicketStatus, UserContext, UserRole } from '../types';

describe('TicketAccessPolicy', () => {
  const buildTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
    id: 'ticket-1',
    title: 'Server is down',
    description: 'Main server stopped responding',
    category: TicketCategory.SERVICE_OUTAGE,
    status: TicketStatus.OPEN,
    priority: 'HIGH' as Ticket['priority'],
    client_id: 'client-123',
    assigned_tech_id: null,
    equipment_id: null,
    tenant_id: 'tenant-456',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  const clientCtx: UserContext = { userId: 'client-123', role: UserRole.CLIENT, tenantId: 'tenant-456' };
  const technicianCtx: UserContext = { userId: 'tech-1', role: UserRole.TECHNICIAN, tenantId: 'tenant-456' };
  const adminCtx: UserContext = { userId: 'admin-1', role: UserRole.ADMIN, tenantId: 'tenant-456' };

  beforeEach(() => {
    vi.resetModules();
  });

  it('permits a client to read a ticket within their tenant', () => {
    expect(() => ticketAccessPolicy.assertReadAccess(buildTicket(), clientCtx)).not.toThrow();
  });

  it('rejects a client reading a ticket from another tenant', () => {
    const foreignTicket = buildTicket({ tenant_id: 'tenant-other' });
    expect(() => ticketAccessPolicy.assertReadAccess(foreignTicket, clientCtx)).toThrowError(
      expect.objectContaining({ statusCode: 403 })
    );
  });

  it('permits admins to read any ticket regardless of tenant', () => {
    expect(() => ticketAccessPolicy.assertReadAccess(buildTicket(), adminCtx)).not.toThrow();
  });

  describe('assertStatusTransition', () => {
    it('accepts a legal transition', () => {
      expect(() => ticketAccessPolicy.assertStatusTransition(TicketStatus.OPEN, TicketStatus.IN_PROGRESS)).not.toThrow();
    });

    it('rejects an illegal transition', () => {
      expect(() => ticketAccessPolicy.assertStatusTransition(TicketStatus.CLOSED, TicketStatus.OPEN)).toThrowError(
        expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' })
      );
    });
  });

  describe('assertStatusUpdateAccess', () => {
    it('lets a client cancel their own ticket', () => {
      expect(() =>
        ticketAccessPolicy.assertStatusUpdateAccess(buildTicket(), TicketStatus.CANCELLED, clientCtx)
      ).not.toThrow();
    });

    it('forbids a client from applying any non-cancel status', () => {
      expect(() =>
        ticketAccessPolicy.assertStatusUpdateAccess(buildTicket(), TicketStatus.IN_PROGRESS, clientCtx)
      ).toThrowError(expect.objectContaining({ statusCode: 403 }));
    });

    it('forbids a client from cancelling a ticket they do not own', () => {
      const foreignTicket = buildTicket({ client_id: 'client-other' });
      expect(() =>
        ticketAccessPolicy.assertStatusUpdateAccess(foreignTicket, TicketStatus.CANCELLED, clientCtx)
      ).toThrowError(expect.objectContaining({ statusCode: 403 }));
    });

    it('allows a technician to change the status of an assigned ticket', () => {
      const assignedTicket = buildTicket({ assigned_tech_id: 'tech-1' });
      expect(() =>
        ticketAccessPolicy.assertStatusUpdateAccess(assignedTicket, TicketStatus.IN_PROGRESS, technicianCtx)
      ).not.toThrow();
    });

    it('allows an admin to change any status', () => {
      expect(() =>
        ticketAccessPolicy.assertStatusUpdateAccess(buildTicket(), TicketStatus.IN_PROGRESS, adminCtx)
      ).not.toThrow();
    });
  });

  describe('enforceSLARule', () => {
    it('allows cancellation within the 1-hour SLA window', () => {
      const recent = buildTicket({ created_at: new Date(Date.now() - 30 * 60 * 1000) });
      expect(() => ticketAccessPolicy.enforceSLARule(recent)).not.toThrow();
    });

    it('throws an SLA violation once the 1-hour window has elapsed', () => {
      const old = buildTicket({ created_at: new Date(Date.now() - 90 * 60 * 1000) });
      expect(() => ticketAccessPolicy.enforceSLARule(old)).toThrowError(
        expect.objectContaining({ statusCode: 403, code: 'SLA_VIOLATION' })
      );
    });
  });

  describe('applyFilterScope', () => {
    const baseFilters: TicketFilters = { page: 1, limit: 20 };

    it('scopes a client to their tenant', () => {
      const scoped = ticketAccessPolicy.applyFilterScope(baseFilters, clientCtx);
      expect(scoped.tenantId).toBe('tenant-456');
    });

    it('scopes a technician to their own assigned tickets', () => {
      const scoped = ticketAccessPolicy.applyFilterScope(baseFilters, technicianCtx);
      expect(scoped.assignedTechId).toBe('tech-1');
    });

    it('leaves admin filters untouched', () => {
      const scoped = ticketAccessPolicy.applyFilterScope(baseFilters, adminCtx);
      expect(scoped).toEqual(baseFilters);
    });
  });

  it('exposes a reusable policy instance', () => {
    expect(ticketAccessPolicy).toBeInstanceOf(TicketAccessPolicy);
  });
});
