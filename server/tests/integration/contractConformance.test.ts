import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/index';
import {
  TicketResponseSchema,
  TicketListResponseSchema,
  InvoiceResponseSchema,
  CreateTicketInputSchema,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@shared/contracts';

describe('Contract-First API Conformance Suite (@shared/contracts & ADR-001)', () => {
  describe('HTTP Route Gateway & Contract Conformance', () => {
    it('GET /api/v1/health conforms to health contract without requiring tenant context', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: expect.stringContaining('Velmar Technology SRL MSP API is running'),
        timestamp: expect.any(String),
      });
    });

    it('POST /api/v1/auth/login validates input against LoginDTO and returns 400 on invalid payload', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: '' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('GET /api/v1/tickets fails closed with 403 when tenant context is omitted', async () => {
      const res = await request(app).get('/api/v1/tickets');

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN_ERROR');
      expect(res.body.message).toContain('TENANT_CONTEXT_REQUIRED');
    });
  });

  describe('Zod Canonical Contract Conformance (Contract-First Invariants)', () => {
    it('validates canonical TicketResponseSchema against compliant ticket payload', () => {
      const validTicketPayload = {
        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        title: 'Router Interface flapping on core switch',
        description: 'BGP sessions flapping every 15 minutes on core rack A switch.',
        category: TicketCategory.SERVICE_OUTAGE,
        status: TicketStatus.OPEN,
        priority: TicketPriority.HIGH,
        clientId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        assignedTechId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        equipmentId: null,
        clientName: 'Acme Corp Admin',
        clientEmail: 'admin@acme.corp',
        createdAt: '2026-09-01T12:00:00.000Z',
        updatedAt: '2026-09-01T12:00:00.000Z',
        events: [
          {
            id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
            ticketId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
            oldStatus: null,
            newStatus: 'OPEN',
            changedBy: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            notes: 'Ticket created via portal',
            createdAt: '2026-09-01T12:00:00.000Z',
          },
        ],
      };

      const parseResult = TicketResponseSchema.safeParse(validTicketPayload);
      expect(parseResult.success).toBe(true);
    });

    it('rejects drifted ticket payload missing required canonical fields or invalid enum', () => {
      const driftedPayload = {
        id: 'not-a-uuid',
        title: 'Short',
        status: 'INVALID_STATUS', // Non-canonical status
      };

      const parseResult = TicketResponseSchema.safeParse(driftedPayload);
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map((i) => i.path.join('.'));
        expect(issues).toContain('id');
        expect(issues).toContain('status');
      }
    });

    it('validates canonical InvoiceResponseSchema against compliant invoice payload', () => {
      const validInvoicePayload = {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        invoice_number: 'INV-2026-0001',
        client_id: '4fa85f64-5717-4562-b3fc-2c963f66afa7',
        amount: 500,
        tax_amount: 90,
        total: 590,
        currency: 'USD',
        status: 'PENDING',
        invoice_date: '2026-09-01',
        due_date: '2026-09-15',
        created_at: '2026-09-01T00:00:00.000Z',
        line_items: [
          {
            description: 'Standard Managed Support Plan',
            quantity: 1,
            unit_price: 500,
          },
        ],
      };

      const parseResult = InvoiceResponseSchema.safeParse(validInvoicePayload);
      expect(parseResult.success).toBe(true);
    });

    it('validates CreateTicketInputSchema and rejects title under 5 characters', () => {
      const invalidInput = {
        title: 'Fix',
        description: 'Detailed description exceeding 10 characters',
        category: TicketCategory.REPAIR,
      };

      const result = CreateTicketInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 5 characters');
      }
    });
  });
});
