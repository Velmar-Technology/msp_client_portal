import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    countInWindow: vi.fn(),
    rmmAlertCreate: vi.fn(),
    ticketCreate: vi.fn(),
    ticketUpdateStatus: vi.fn(),
    ticketAssignTech: vi.fn(),
    eventCreate: vi.fn(),
    getNextTechnician: vi.fn(),
  };
});

vi.mock('../repositories/RmmAlertRepository', () => {
  return {
    rmmAlertRepository: {
      countInWindow: mocks.countInWindow,
      create: mocks.rmmAlertCreate,
    },
  };
});

vi.mock('../repositories/TicketRepository', () => {
  return {
    ticketRepository: {
      create: mocks.ticketCreate,
      updateStatus: mocks.ticketUpdateStatus,
      assignTechnician: mocks.ticketAssignTech,
    },
  };
});

vi.mock('../repositories/TicketEventRepository', () => {
  return {
    ticketEventRepository: {
      create: mocks.eventCreate,
    },
  };
});

vi.mock('./AssignmentService', () => {
  return {
    assignmentService: {
      getNextTechnician: mocks.getNextTechnician,
    },
  };
});

import { alertService } from './AlertService';
import { RmmAlertInput, TicketCategory, TicketPriority, TicketStatus } from '../types';

describe('AlertService', () => {
  const baseInput: RmmAlertInput = {
    alertType: 'DISK_FULL',
    assetId: 'asset-001',
    clientId: 'client-123',
    tenantId: 'tenant-456',
    executionTimeMs: 0,
    title: 'Disk full on server',
    description: 'Disk usage exceeded 90%',
  };

  const createdTicket = (overrides: Partial<any> = {}) => ({
    id: 'ticket-1',
    title: 'Disk full on server',
    description: 'Disk usage exceeded 90%',
    category: TicketCategory.REPAIR,
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    client_id: 'client-123',
    assigned_tech_id: null,
    equipment_id: null,
    tenant_id: 'tenant-456',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processRMMAlert', () => {
    it('deduplicates alerts within the 15-minute window for the same asset', async () => {
      mocks.countInWindow.mockResolvedValue(1);

      const result = await alertService.processRMMAlert(baseInput);

      expect(result.status).toBe('DEDUPLICATED');
      expect(mocks.ticketCreate).not.toHaveBeenCalled();
      expect(mocks.rmmAlertCreate).not.toHaveBeenCalled();
    });

    it('opens a flapping ticket with PREVENTATIVE_MAINTENANCE, FLAPPING_ALERT tag, and Tier 2 routing when count >= 3 in 24h', async () => {
      mocks.countInWindow.mockResolvedValueOnce(0).mockResolvedValueOnce(3);
      mocks.ticketCreate.mockResolvedValue(
        createdTicket({ category: TicketCategory.PREVENTATIVE_MAINTENANCE, title: '[FLAPPING_ALERT] Disk full on server' })
      );
      mocks.getNextTechnician.mockResolvedValue({ id: 'tech-2', name: 'Tier2 Tech', specialty: 'Tier 2' });

      const result = await alertService.processRMMAlert(baseInput);

      expect(result.status).toBe('FLAPPING');
      const ticket = (result as { ticket: any }).ticket;
      expect(ticket.category).toBe(TicketCategory.PREVENTATIVE_MAINTENANCE);
      expect(ticket.status).toBe(TicketStatus.OPEN);
      expect(ticket.title).toContain('[FLAPPING_ALERT]');
      expect(mocks.rmmAlertCreate).toHaveBeenCalledTimes(1);
      expect(mocks.getNextTechnician).toHaveBeenCalledWith(
        TicketCategory.PREVENTATIVE_MAINTENANCE,
        'Tier 2',
        TicketPriority.MEDIUM
      );
      expect(mocks.ticketAssignTech).toHaveBeenCalledWith('ticket-1', 'tech-2');
    });

    it('bypasses auto-close even when execution time is under 300s if flapping is detected', async () => {
      mocks.countInWindow.mockResolvedValueOnce(0).mockResolvedValueOnce(4);
      mocks.ticketCreate.mockResolvedValue(
        createdTicket({ category: TicketCategory.PREVENTATIVE_MAINTENANCE, title: '[FLAPPING_ALERT] Disk full on server' })
      );

      const result = await alertService.processRMMAlert({ ...baseInput, executionTimeMs: 100 });

      expect(result.status).toBe('FLAPPING');
      expect((result as { ticket: any }).ticket.status).toBe(TicketStatus.OPEN);
      expect(mocks.ticketUpdateStatus).not.toHaveBeenCalled();
    });

    it('auto-closes with RESOLVED_AUTOMATED when self-healed within 300s and count < 3', async () => {
      mocks.countInWindow.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
      mocks.ticketCreate.mockResolvedValue(createdTicket());
      mocks.ticketUpdateStatus.mockResolvedValue(
        createdTicket({ status: TicketStatus.RESOLVED_AUTOMATED })
      );

      const result = await alertService.processRMMAlert({ ...baseInput, executionTimeMs: 250 });

      expect(result.status).toBe('SELF_HEALED');
      const ticket = (result as { ticket: any }).ticket;
      expect(ticket.status).toBe(TicketStatus.RESOLVED_AUTOMATED);
      expect(mocks.ticketUpdateStatus).toHaveBeenCalledWith('ticket-1', TicketStatus.RESOLVED_AUTOMATED);
      expect(mocks.ticketAssignTech).not.toHaveBeenCalled();
    });

    it('creates a normal OPEN ticket when not flapping and not self-healed', async () => {
      mocks.countInWindow.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
      mocks.ticketCreate.mockResolvedValue(createdTicket());
      mocks.getNextTechnician.mockResolvedValue({ id: 'tech-1', name: 'General Tech' });

      const result = await alertService.processRMMAlert({ ...baseInput, executionTimeMs: 600000 });

      expect(result.status).toBe('TICKET_CREATED');
      const ticket = (result as { ticket: any }).ticket;
      expect(ticket.status).toBe(TicketStatus.OPEN);
      expect(ticket.category).toBe(TicketCategory.REPAIR);
      expect(mocks.getNextTechnician).toHaveBeenCalledWith(TicketCategory.REPAIR, undefined, TicketPriority.MEDIUM);
      expect(mocks.ticketAssignTech).toHaveBeenCalled();
    });
  });

  describe('KPI Calculators', () => {
    it('calculates noise reduction ratio correctly', () => {
      expect(alertService.calculateNoiseReductionRatio(100, 40)).toBeCloseTo(0.6);
      expect(alertService.calculateNoiseReductionRatio(0, 0)).toBe(0);
      expect(alertService.calculateNoiseReductionRatio(10, 15)).toBe(0);
    });

    it('calculates self-healing efficiency correctly', () => {
      expect(alertService.calculateSelfHealingEfficiency(70, 30)).toBeCloseTo(0.7);
      expect(alertService.calculateSelfHealingEfficiency(0, 0)).toBe(0);
    });

    it('calculates automated first contact resolution correctly', () => {
      expect(alertService.calculateFirstContactResolutionAutomation(40, 80)).toBeCloseTo(0.5);
      expect(alertService.calculateFirstContactResolutionAutomation(5, 0)).toBe(0);
    });
  });
});
