import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SequenceAggregatorService,
  SentinelEventReader,
  TicketLifecycleRecord,
  BillingLifecycleRecord,
} from './SequenceAggregatorService';
import { SequenceAuditWindow } from '../types';

describe('SequenceAggregatorService', () => {
  let mockReader: SentinelEventReader;
  let service: SequenceAggregatorService;

  const sampleWindow: SequenceAuditWindow = {
    startDate: new Date('2026-09-01T00:00:00Z'),
    endDate: new Date('2026-09-10T23:59:59Z'),
    tenantId: 'tenant-alpha',
  };

  beforeEach(() => {
    mockReader = {
      fetchTicketLifecycleData: vi.fn(),
      fetchBillingLifecycleData: vi.fn(),
      fetchRmmAlertData: vi.fn(),
      fetchLeadLifecycleData: vi.fn(),
    };
    service = new SequenceAggregatorService(mockReader);
  });

  describe('aggregateTicketSequences', () => {
    it('should aggregate ticket creation, status transitions, and commission earnings into chronologically sorted steps', async () => {
      const createdDate = new Date('2026-09-02T10:00:00Z');
      const inProgressDate = new Date('2026-09-02T10:15:00Z');
      const resolvedDate = new Date('2026-09-02T11:00:00Z');
      const earningDate = new Date('2026-09-02T11:01:00Z');

      const mockTicketRecord: TicketLifecycleRecord = {
        ticket: {
          id: 'ticket-101',
          title: 'Database latency spike',
          description: 'High p99',
          category: 'PERFORMANCE',
          priority: 'CRITICAL',
          status: 'RESOLVED',
          client_id: 'client-1',
          assigned_tech_id: 'tech-1',
          equipment_id: null,
          tenant_id: 'tenant-alpha',
          reporter_name: 'Jane Doe',
          reporter_email: 'jane@alpha.com',
          source: 'PORTAL',
          device_snapshot: null,
          created_at: createdDate,
          updated_at: resolvedDate,
        } as any,
        events: [
          {
            id: 'ev-1',
            ticket_id: 'ticket-101',
            old_status: 'OPEN',
            new_status: 'IN_PROGRESS',
            changed_by: 'tech-1',
            notes: 'Investigating query plan',
            tenant_id: 'tenant-alpha',
            created_at: inProgressDate,
          } as any,
          {
            id: 'ev-2',
            ticket_id: 'ticket-101',
            old_status: 'IN_PROGRESS',
            new_status: 'RESOLVED',
            changed_by: 'tech-1',
            notes: 'Added missing index',
            tenant_id: 'tenant-alpha',
            created_at: resolvedDate,
          } as any,
        ],
        earning: {
          id: 'earn-101',
          ticket_id: 'ticket-101',
          technician_id: 'tech-1',
          base_amount: '20.00',
          sla_bonus_amount: '4.00',
          total_earning: '24.00',
          status: 'HELD',
          tenant_id: 'tenant-alpha',
          created_at: earningDate,
          updated_at: earningDate,
        } as any,
        expenses: [],
      };

      vi.mocked(mockReader.fetchTicketLifecycleData).mockResolvedValue([mockTicketRecord]);

      const sequences = await service.aggregateTicketSequences(sampleWindow);

      expect(sequences).toHaveLength(1);
      const seq = sequences[0];
      expect(seq.entityId).toBe('ticket-101');
      expect(seq.entityType).toBe('TICKET');
      expect(seq.tenantId).toBe('tenant-alpha');
      expect(seq.steps).toHaveLength(4);

      // Verify strict chronological order
      expect(seq.steps[0].action).toBe('TICKET_CREATED');
      expect(seq.steps[0].timestamp).toEqual(createdDate);

      expect(seq.steps[1].action).toBe('STATUS_CHANGED_IN_PROGRESS');
      expect(seq.steps[1].timestamp).toEqual(inProgressDate);

      expect(seq.steps[2].action).toBe('STATUS_CHANGED_RESOLVED');
      expect(seq.steps[2].timestamp).toEqual(resolvedDate);

      expect(seq.steps[3].action).toBe('COMMISSION_RECORDED');
      expect(seq.steps[3].timestamp).toEqual(earningDate);
      expect(seq.steps[3].metadata?.totalEarning).toBe('24.00');
    });
  });

  describe('aggregateInvoiceSequences', () => {
    it('should aggregate issued invoices and payment confirmations', async () => {
      const issuedDate = new Date('2026-09-01T08:00:00Z');
      const paidDate = new Date('2026-09-03T14:30:00Z');

      const mockBillingRecord: BillingLifecycleRecord = {
        invoice: {
          id: 'inv-500',
          tenant_id: 'tenant-alpha',
          subscription_id: 'sub-1',
          subtotal: '1000.00',
          tax_amount: '180.00',
          total_amount: '1180.00',
          ncf_code: 'B0100000001',
          status: 'PAID',
          due_date: new Date('2026-09-15T00:00:00Z'),
          payment_method: 'PAYPAL',
          paypal_order_id: 'ORDER-12345',
          created_at: issuedDate,
          paid_at: paidDate,
        } as any,
        subscription: {
          id: 'sub-1',
          status: 'ACTIVE',
        } as any,
        tenant: {
          id: 'tenant-alpha',
          name: 'Alpha Corp',
        } as any,
      };

      vi.mocked(mockReader.fetchBillingLifecycleData).mockResolvedValue([mockBillingRecord]);

      const sequences = await service.aggregateInvoiceSequences(sampleWindow);

      expect(sequences).toHaveLength(1);
      const seq = sequences[0];
      expect(seq.entityId).toBe('inv-500');
      expect(seq.entityType).toBe('INVOICE');
      expect(seq.steps).toHaveLength(2);
      expect(seq.steps[0].action).toBe('INVOICE_ISSUED');
      expect(seq.steps[1].action).toBe('INVOICE_PAID');
    });
  });

  describe('aggregateAlertSequences', () => {
    it('should group RMM alerts by device entity and sort chronologically', async () => {
      const alert1Time = new Date('2026-09-04T09:00:00Z');
      const alert2Time = new Date('2026-09-04T09:12:00Z');

      const mockAlerts = [
        {
          id: 'alert-1',
          device_id: 'dev-win-01',
          tenant_id: 'tenant-alpha',
          severity: 'HIGH',
          title: 'High CPU Usage',
          status: 'RESOLVED',
          resolution_source: 'AUTOMATED_SCRIPT',
          duration_seconds: 120,
          created_at: alert1Time,
        } as any,
        {
          id: 'alert-2',
          device_id: 'dev-win-01',
          tenant_id: 'tenant-alpha',
          severity: 'HIGH',
          title: 'High CPU Usage',
          status: 'TRIGGERED',
          resolution_source: null,
          duration_seconds: null,
          created_at: alert2Time,
        } as any,
      ];

      vi.mocked(mockReader.fetchRmmAlertData).mockResolvedValue(mockAlerts);

      const sequences = await service.aggregateAlertSequences(sampleWindow);

      expect(sequences).toHaveLength(1);
      expect(sequences[0].entityId).toBe('dev-win-01');
      expect(sequences[0].steps).toHaveLength(2);
      expect(sequences[0].steps[0].action).toBe('ALERT_RESOLVED');
      expect(sequences[0].steps[1].action).toBe('ALERT_TRIGGERED');
    });
  });

  describe('aggregateAll', () => {
    it('should combine all domain sequences into a unified list', async () => {
      vi.mocked(mockReader.fetchTicketLifecycleData).mockResolvedValue([]);
      vi.mocked(mockReader.fetchBillingLifecycleData).mockResolvedValue([]);
      vi.mocked(mockReader.fetchRmmAlertData).mockResolvedValue([]);
      vi.mocked(mockReader.fetchLeadLifecycleData).mockResolvedValue([]);

      const all = await service.aggregateAll(sampleWindow);
      expect(Array.isArray(all)).toBe(true);
      expect(all).toHaveLength(0);
    });
  });
});
