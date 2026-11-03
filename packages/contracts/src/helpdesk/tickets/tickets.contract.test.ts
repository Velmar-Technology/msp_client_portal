import { describe, it, expect } from 'vitest';
import {
  CreateTicketInputSchema,
  UpdateTicketStatusInputSchema,
  TicketQuerySchema,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketResponseSchema,
  CreateAgentTicketInputSchema,
  CreateAgentTicketResponseSchema,
  AddAgentTicketResponseInputSchema,
  AgentFlightRecorderSchema,
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

  describe('Agent Ticket Contracts', () => {
    it('validates CreateAgentTicketInputSchema with flight recorder telemetry', () => {
      const input = {
        reporterName: 'Sarah Jenkins',
        reporterEmail: 'sarah.jenkins@company.local',
        title: 'Application freezing on startup',
        description: 'Accounting software crashes with out of memory error immediately after launch.',
        category: TicketCategory.HELPDESK,
        deviceSnapshot: {
          os: 'Windows 11 Pro',
          osVersion: '10.0.22631',
          uptimeSeconds: 86400,
          cpuUsagePercent: 78.5,
          memoryUsagePercent: 92.1,
          topProcesses: [
            { name: 'chrome.exe', pid: 1420, cpuPercent: 32.1, memoryBytes: 4294967296 },
            { name: 'acct_app.exe', pid: 5892, cpuPercent: 41.2, memoryBytes: 2147483648 },
          ],
          recentEventErrors: [
            { source: 'Application Error', eventId: 1000, message: 'Faulting application name: acct_app.exe' },
          ],
        },
      };

      const result = CreateAgentTicketInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe(TicketPriority.MEDIUM);
        expect(result.data.deviceSnapshot?.topProcesses?.length).toBe(2);
      }
    });

    it('rejects CreateAgentTicketInputSchema with invalid email', () => {
      const invalid = {
        reporterName: 'Sarah',
        reporterEmail: 'not-an-email',
        title: 'Application freezing on startup',
        description: 'Accounting software crashes repeatedly.',
      };

      const result = CreateAgentTicketInputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates AddAgentTicketResponseInputSchema', () => {
      const valid = {
        reporterName: 'Sarah Jenkins',
        message: 'I restarted the machine and the issue is still persisting.',
      };

      const result = AddAgentTicketResponseInputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates CreateAgentTicketResponseSchema', () => {
      const response = {
        ticketId: '11111111-1111-1111-1111-111111111111',
        title: 'Application freezing on startup',
        status: TicketStatus.OPEN,
        priority: TicketPriority.MEDIUM,
        category: TicketCategory.HELPDESK,
        assignedTechName: 'Lead Tech Alex',
        reporterName: 'Sarah Jenkins',
        reporterEmail: 'sarah.jenkins@company.local',
        createdAt: new Date().toISOString(),
      };

      const result = CreateAgentTicketResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });
  });
});

