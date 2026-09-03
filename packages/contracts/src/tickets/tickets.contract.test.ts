import { describe, it, expect } from 'vitest';
import {
  CreateTicketInputSchema,
  UpdateTicketStatusInputSchema,
  TicketQuerySchema,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketResponseSchema,
} from './tickets.contract';

describe('Ticket Contracts', () => {
  describe('CreateTicketInputSchema', () => {
    it('validates a valid payload with defaults', () => {
      const valid = {
        title: 'Printer not printing documents',
        description: 'Office printer is displaying an error code 50.4 error.',
        category: TicketCategory.REPAIR,
      };

      const result = CreateTicketInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe(TicketPriority.MEDIUM);
      }
    });

    it('rejects title shorter than 5 characters', () => {
      const invalid = {
        title: 'Fix',
        description: 'Office printer is displaying an error code 50.4 error.',
        category: TicketCategory.REPAIR,
      };

      const result = CreateTicketInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects description shorter than 10 characters', () => {
      const invalid = {
        title: 'Printer broken',
        description: 'broken',
        category: TicketCategory.REPAIR,
      };

      const result = CreateTicketInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateTicketStatusInputSchema', () => {
    it('accepts valid status transition', () => {
      const result = UpdateTicketStatusInputSchema.safeParse({
        status: TicketStatus.RESOLVED,
        notes: 'Replaced toner cartridge',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = UpdateTicketStatusInputSchema.safeParse({
        status: 'NON_EXISTENT_STATUS',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('TicketQuerySchema', () => {
    it('coerces string numbers for page and limit', () => {
      const result = TicketQuerySchema.safeParse({
        page: '2',
        limit: '25',
        status: TicketStatus.OPEN,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(25);
        expect(result.data.status).toBe(TicketStatus.OPEN);
      }
    });
  });

  describe('TicketResponseSchema', () => {
    it('validates a complete ticket response', () => {
      const ticket = {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Network latency spike',
        description: 'Ping times exceeding 400ms to core gateway',
        category: TicketCategory.SERVICE_OUTAGE,
        status: TicketStatus.IN_PROGRESS,
        priority: TicketPriority.HIGH,
        clientId: '22222222-2222-2222-2222-222222222222',
        assignedTechId: '33333333-3333-3333-3333-333333333333',
        equipmentId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = TicketResponseSchema.safeParse(ticket);
      expect(result.success).toBe(true);
    });
  });
});
