import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LeadStage, LeadPriority, QuotationStatus } from '@shared/types';
import { ValidationError, NotFoundError } from '@shared/errors';

const mocks = vi.hoisted(() => {
  return {
    leadRepo: {
      findByTenant: vi.fn(),
      findLeadById: vi.fn(),
      createLead: vi.fn(),
      updateLead: vi.fn(),
      deleteLead: vi.fn(),
      getPipelineStats: vi.fn(),
    },
    activityRepo: {
      findByLead: vi.fn(),
      findUpcomingByTenant: vi.fn(),
      createActivity: vi.fn(),
      updateActivity: vi.fn(),
      deleteActivity: vi.fn(),
    },
    quotationRepo: {
      createQuotation: vi.fn(),
      findQuotationById: vi.fn(),
      findByLead: vi.fn(),
      updateReminderTimestamp: vi.fn(),
      updateQuotationStatus: vi.fn(),
    },
    userRepo: {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
    },
    planRepo: {
      findById: vi.fn(),
    },
    subService: {
      createSubscription: vi.fn(),
      updateSubscription: vi.fn(),
    },
    invoiceRepo: {
      findByTenant: vi.fn(),
    },
    sendQuotationEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
  };
});

vi.mock('@shared/utils/emailService', () => ({
  sendQuotationEmail: mocks.sendQuotationEmail,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
}));

import { CRMService } from './CRMService';

describe('CRMService', () => {
  let service: CRMService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CRMService(
      mocks.leadRepo as any,
      mocks.activityRepo as any,
      mocks.quotationRepo as any,
      mocks.userRepo as any,
      mocks.planRepo as any,
      mocks.subService as any,
      mocks.invoiceRepo as any,
    );
  });

  describe('createLead', () => {
    it('creates lead, calculates expected revenue from plan, and logs creation activity', async () => {
      mocks.planRepo.findById.mockResolvedValue({
        id: 'STANDARD',
        name: { en_US: 'Standard Plan' },
        price: 50,
      });

      const mockCreatedLead = {
        id: 'lead-1',
        tenant_id: 'tenant-1',
        contact_name: 'John Doe',
        contact_email: 'john@example.com',
        stage: LeadStage.NEW,
        priority: LeadPriority.MEDIUM,
        expected_revenue: 59,
        probability: 10,
        plan_id: 'STANDARD',
        billing_cycle: 'monthly',
        equipment_count: 1,
        created_at: new Date(),
        updated_at: new Date(),
      };
      mocks.leadRepo.createLead.mockResolvedValue(mockCreatedLead);

      const result = await service.createLead(
        {
          contactName: 'John Doe',
          contactEmail: 'john@example.com',
          planId: 'STANDARD',
          equipmentCount: 1,
        },
        'tenant-1',
        'user-admin',
      );

      expect(result).toEqual(mockCreatedLead);
      expect(mocks.leadRepo.createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          contactName: 'John Doe',
          contactEmail: 'john@example.com',
          expectedRevenue: 59,
          probability: 10,
        }),
        'tenant-1',
      );
      expect(mocks.activityRepo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          activityType: 'STAGE_CHANGE',
          title: 'Lead Created',
        }),
        'tenant-1',
        'user-admin',
      );
    });
  });

  describe('updateLeadStage', () => {
    it('updates stage, recalculates probability, and logs stage change activity', async () => {
      const existingLead = {
        id: 'lead-1',
        tenant_id: 'tenant-1',
        stage: LeadStage.NEW,
        probability: 10,
      };
      mocks.leadRepo.findLeadById.mockResolvedValue(existingLead);
      mocks.leadRepo.updateLead.mockResolvedValue({
        ...existingLead,
        stage: LeadStage.QUALIFIED,
        probability: 30,
      });

      const updated = await service.updateLeadStage(
        'lead-1',
        LeadStage.QUALIFIED,
        null,
        'tenant-1',
        'user-admin',
      );

      expect(updated.stage).toBe(LeadStage.QUALIFIED);
      expect(mocks.leadRepo.updateLead).toHaveBeenCalledWith(
        'lead-1',
        expect.objectContaining({ stage: LeadStage.QUALIFIED, probability: 30 }),
        'tenant-1',
      );
      expect(mocks.activityRepo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          activityType: 'STAGE_CHANGE',
          title: 'Stage Changed: NEW → QUALIFIED',
        }),
        'tenant-1',
        'user-admin',
      );
    });
  });

  describe('sendQuotation', () => {
    const buildQuoteMock = (): Record<string, unknown> => ({
      id: 'quote-1',
      quotation_number: 'QT-2026-0001',
      tenant_id: 'tenant-1',
      lead_id: 'lead-1',
      recipient_name: 'Alice Smith',
      recipient_email: 'alice@example.com',
      plan_id: 'PRO',
      billing_cycle: 'monthly',
      equipment_count: 2,
      subtotal: 200,
      tax: 36,
      total: 236,
      status: QuotationStatus.SENT,
      sent_at: new Date(),
      created_at: new Date(),
    });

    const arrangePlan = (): void => {
      mocks.planRepo.findById.mockResolvedValue({
        id: 'PRO',
        name: { en_US: 'Pro Plan' },
        price: 100,
        features: [],
      });
    };

    it('generates quotation with correct tax, sends email, updates lead to PROPOSITION, and logs activity', async () => {
      arrangePlan();
      mocks.leadRepo.findLeadById.mockResolvedValue({ id: 'lead-1', stage: LeadStage.NEW });

      const mockQuote = buildQuoteMock();
      mocks.quotationRepo.createQuotation.mockResolvedValue(mockQuote);

      const quote = await service.sendQuotation(
        {
          leadId: 'lead-1',
          recipientName: 'Alice Smith',
          recipientEmail: 'alice@example.com',
          planId: 'PRO',
          billingCycle: 'monthly',
          equipmentCount: 2,
        },
        'tenant-1',
        'user-admin',
      );

      expect(quote.quotation_number).toBe('QT-2026-0001');
      expect(mocks.sendQuotationEmail).toHaveBeenCalledWith(
        'alice@example.com',
        'Alice Smith',
        expect.objectContaining({ id: 'PRO' }),
        'monthly',
        2,
        200,
        36,
        236,
        'en_US',
      );
      expect(mocks.leadRepo.updateLead).toHaveBeenCalledWith(
        'lead-1',
        expect.objectContaining({
          stage: LeadStage.PROPOSITION,
          probability: 60,
          expectedRevenue: 236,
        }),
        'tenant-1',
      );
      expect(mocks.activityRepo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          activityType: 'QUOTE_SENT',
          title: 'Quotation Sent: QT-2026-0001',
        }),
        'tenant-1',
        'user-admin',
      );
    });

    it('schedules an automatic PENDING follow-up reminder due in 3 days', async () => {
      arrangePlan();
      mocks.leadRepo.findLeadById.mockResolvedValue({ id: 'lead-1', stage: LeadStage.NEW });
      mocks.quotationRepo.createQuotation.mockResolvedValue(buildQuoteMock());

      const before = Date.now();
      await service.sendQuotation(
        {
          leadId: 'lead-1',
          recipientName: 'Alice Smith',
          recipientEmail: 'alice@example.com',
          planId: 'PRO',
          billingCycle: 'monthly',
          equipmentCount: 2,
        },
        'tenant-1',
        'user-admin',
      );

      const reminderCall = mocks.activityRepo.createActivity.mock.calls.find(
        (call) => call[0].activityType === 'QUOTE_REMINDER',
      );
      expect(reminderCall).toBeDefined();
      expect(reminderCall[0].status).toBe('PENDING');
      expect(reminderCall[0].leadId).toBe('lead-1');

      const dueDate = new Date(reminderCall[0].dueDate).getTime();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      expect(dueDate).toBeGreaterThanOrEqual(before + threeDaysMs - 1000);
      expect(dueDate).toBeLessThanOrEqual(Date.now() + threeDaysMs + 1000);
    });

    it('does not regress a WON lead back to PROPOSITION when sending a quotation', async () => {
      arrangePlan();
      mocks.leadRepo.findLeadById.mockResolvedValue({ id: 'lead-1', stage: LeadStage.WON });
      mocks.quotationRepo.createQuotation.mockResolvedValue(buildQuoteMock());

      await service.sendQuotation(
        {
          leadId: 'lead-1',
          recipientName: 'Alice Smith',
          recipientEmail: 'alice@example.com',
          planId: 'PRO',
          billingCycle: 'monthly',
          equipmentCount: 2,
        },
        'tenant-1',
        'user-admin',
      );

      expect(mocks.leadRepo.updateLead).toHaveBeenCalledWith(
        'lead-1',
        expect.not.objectContaining({ stage: LeadStage.PROPOSITION }),
        'tenant-1',
      );
      expect(mocks.leadRepo.updateLead).toHaveBeenCalledWith(
        'lead-1',
        expect.objectContaining({ expectedRevenue: 236 }),
        'tenant-1',
      );
    });
  });

  describe('resendQuotation', () => {
    const buildQuoteMock = (status: QuotationStatus = QuotationStatus.SENT): Record<string, unknown> => ({
      id: 'quote-1',
      quotation_number: 'QT-2026-0001',
      tenant_id: 'tenant-1',
      lead_id: 'lead-1',
      recipient_name: 'Alice Smith',
      recipient_email: 'alice@example.com',
      plan_id: 'PRO',
      billing_cycle: 'monthly',
      equipment_count: 2,
      subtotal: 200,
      tax: 36,
      total: 236,
      status,
      sent_at: new Date(),
      created_at: new Date(),
    });

    it('resends quotation email, updates reminder timestamp, and logs activity', async () => {
      mocks.quotationRepo.findQuotationById.mockResolvedValue(buildQuoteMock());
      mocks.planRepo.findById.mockResolvedValue({
        id: 'PRO',
        name: { en_US: 'Pro Plan' },
        price: 100,
        features: [],
      });

      await service.resendQuotation(
        { quotationId: 'quote-1', customMessage: 'Following up on quotation' },
        'tenant-1',
        'user-admin',
      );

      expect(mocks.sendQuotationEmail).toHaveBeenCalled();
      expect(mocks.quotationRepo.updateReminderTimestamp).toHaveBeenCalledWith('quote-1', 'tenant-1');
      expect(mocks.activityRepo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          activityType: 'QUOTE_REMINDER',
          title: 'Quotation Reminder Sent: QT-2026-0001',
        }),
        'tenant-1',
        'user-admin',
      );
    });

    it('rejects resending a quotation that is no longer in SENT status', async () => {
      mocks.quotationRepo.findQuotationById.mockResolvedValue(buildQuoteMock(QuotationStatus.ACCEPTED));

      await expect(
        service.resendQuotation({ quotationId: 'quote-1' }, 'tenant-1', 'user-admin'),
      ).rejects.toThrow(ValidationError);
      expect(mocks.sendQuotationEmail).not.toHaveBeenCalled();
    });
  });

  describe('updateQuotationStatus', () => {
    const buildQuoteMock = (status: QuotationStatus): Record<string, unknown> => ({
      id: 'quote-1',
      quotation_number: 'QT-2026-0001',
      tenant_id: 'tenant-1',
      lead_id: 'lead-1',
      recipient_name: 'Alice Smith',
      recipient_email: 'alice@example.com',
      plan_id: 'PRO',
      billing_cycle: 'monthly',
      equipment_count: 2,
      subtotal: 200,
      tax: 36,
      total: 236,
      status,
      sent_at: new Date(),
      created_at: new Date(),
    });

    it('marks a SENT quotation as ACCEPTED and logs the decision on the lead', async () => {
      mocks.quotationRepo.findQuotationById.mockResolvedValue(buildQuoteMock(QuotationStatus.ACCEPTED));
      mocks.quotationRepo.findQuotationById.mockResolvedValueOnce(buildQuoteMock(QuotationStatus.SENT));

      const updated = await service.updateQuotationStatus('quote-1', QuotationStatus.ACCEPTED, 'tenant-1');

      expect(updated.status).toBe(QuotationStatus.ACCEPTED);
      expect(mocks.quotationRepo.updateQuotationStatus).toHaveBeenCalledWith(
        'quote-1',
        QuotationStatus.ACCEPTED,
        'tenant-1',
      );
      expect(mocks.activityRepo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          activityType: 'QUOTE_STATUS_CHANGE',
          title: 'Quotation Accepted: QT-2026-0001',
        }),
        'tenant-1',
        undefined,
      );
    });

    it('rejects invalid status transitions', async () => {
      mocks.quotationRepo.findQuotationById.mockResolvedValue(buildQuoteMock(QuotationStatus.DECLINED));

      await expect(
        service.updateQuotationStatus('quote-1', QuotationStatus.ACCEPTED, 'tenant-1'),
      ).rejects.toThrow(ValidationError);
      expect(mocks.quotationRepo.updateQuotationStatus).not.toHaveBeenCalled();
    });

    it('throws NotFoundError for a missing quotation', async () => {
      mocks.quotationRepo.findQuotationById.mockResolvedValue(null);

      await expect(
        service.updateQuotationStatus('missing', QuotationStatus.ACCEPTED, 'tenant-1'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getUpcomingActivities', () => {
    it('delegates to the activity repository tenant-wide query', async () => {
      const upcoming = [{ id: 'act-1', title: 'Follow-up call' }];
      mocks.activityRepo.findUpcomingByTenant.mockResolvedValue(upcoming);

      const result = await service.getUpcomingActivities('tenant-1');
      expect(result).toBe(upcoming);
      expect(mocks.activityRepo.findUpcomingByTenant).toHaveBeenCalledWith('tenant-1');
    });
  });

  describe('convertLeadToSubscription', () => {
    it('creates active subscription, sets lead to WON, and logs activity for existing client', async () => {
      const mockLead = {
        id: 'lead-1',
        tenant_id: 'tenant-1',
        client_id: 'client-user-1',
        contact_name: 'Bob Ross',
        contact_email: 'bob@example.com',
        plan_id: 'ENTERPRISE',
        equipment_count: 5,
        billing_cycle: 'annual',
      };
      mocks.leadRepo.findLeadById.mockResolvedValue(mockLead);
      mocks.planRepo.findById.mockResolvedValue({
        id: 'ENTERPRISE',
        name: { en_US: 'Enterprise Suite' },
        price: 300,
      });
      mocks.subService.createSubscription.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
      });
      mocks.invoiceRepo.findByTenant.mockResolvedValue([
        { id: 'inv-1', client_id: 'client-user-1', total: 300 },
      ]);
      mocks.leadRepo.updateLead.mockResolvedValue({
        ...mockLead,
        stage: LeadStage.WON,
        probability: 100,
      });

      const result = await service.convertLeadToSubscription(
        { leadId: 'lead-1' },
        'tenant-1',
        'user-admin',
      );

      expect(result.lead.stage).toBe(LeadStage.WON);
      expect(result.invoice).toEqual({ id: 'inv-1', client_id: 'client-user-1', total: 300 });
      expect(result.clientCreated).toBe(false);
      expect(mocks.subService.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'ENTERPRISE',
          equipmentCount: 5,
          clientId: 'client-user-1',
          billingCycle: 'annual',
        }),
        'client-user-1',
        'tenant-1',
        true,
      );
      expect(mocks.activityRepo.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          activityType: 'PLAN_ASSIGNED',
          title: 'Lead Converted: Active Subscription Created (ENTERPRISE)',
        }),
        'tenant-1',
        'user-admin',
      );
    });

    it('automatically creates client user, sends password setup email, and provisions subscription when client does not exist', async () => {
      const mockLead = {
        id: 'lead-new',
        tenant_id: 'tenant-1',
        client_id: null,
        contact_name: 'Alice Wonder',
        contact_email: 'alice@example.com',
        contact_phone: '+18095551234',
        plan_id: 'PRO',
        equipment_count: 2,
        billing_cycle: 'monthly',
      };
      mocks.leadRepo.findLeadById.mockResolvedValue(mockLead);
      mocks.userRepo.findByEmail.mockResolvedValue(null);
      mocks.userRepo.create.mockResolvedValue({
        id: 'new-client-id',
        email: 'alice@example.com',
        name: 'Alice Wonder',
        role: 'CLIENT',
        language: 'en_US',
      });
      mocks.planRepo.findById.mockResolvedValue({
        id: 'PRO',
        name: { en_US: 'Professional Plan' },
        price: 150,
      });
      mocks.subService.createSubscription.mockResolvedValue({
        id: 'sub-new',
        status: 'ACTIVE',
      });
      mocks.invoiceRepo.findByTenant.mockResolvedValue([
        { id: 'inv-new', client_id: 'new-client-id', total: 177 },
      ]);
      mocks.leadRepo.updateLead.mockResolvedValue({
        ...mockLead,
        client_id: 'new-client-id',
        stage: LeadStage.WON,
        probability: 100,
      });

      const result = await service.convertLeadToSubscription(
        { leadId: 'lead-new' },
        'tenant-1',
        'user-admin',
      );

      expect(result.clientCreated).toBe(true);
      expect(result.invoice).toEqual({ id: 'inv-new', client_id: 'new-client-id', total: 177 });
      expect(mocks.userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'alice@example.com',
          name: 'Alice Wonder',
          role: 'CLIENT',
          tenant_id: 'tenant-1',
          phone_number: '+18095551234',
        }),
      );
      expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(
        'alice@example.com',
        'Alice Wonder',
        expect.any(String),
        'en_US',
      );
      expect(mocks.subService.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'new-client-id',
          plan: 'PRO',
        }),
        'new-client-id',
        'tenant-1',
        true,
      );
    });
  });

  describe('getPipelineStats', () => {
    it('delegates to lead repository', async () => {
      const stats = {
        totalLeads: 10,
        pipelineValue: 5000,
        wonRevenue: 2000,
        leadsInProposition: 3,
        conversionRate: 67,
        stageBreakdown: {
          NEW: { count: 3, value: 1000 },
          QUALIFIED: { count: 2, value: 1500 },
          PROPOSITION: { count: 3, value: 2500 },
          WON: { count: 2, value: 2000 },
          LOST: { count: 0, value: 0 },
        },
      };
      mocks.leadRepo.getPipelineStats.mockResolvedValue(stats);

      const result = await service.getPipelineStats('tenant-1');
      expect(result).toEqual(stats);
      expect(mocks.leadRepo.getPipelineStats).toHaveBeenCalledWith('tenant-1');
    });
  });

  describe('deleteLead', () => {
    it('deletes lead when found in tenant', async () => {
      mocks.leadRepo.findLeadById.mockResolvedValue({ id: 'lead-1' });
      mocks.leadRepo.deleteLead.mockResolvedValue(true);

      await service.deleteLead('lead-1', 'tenant-1');
      expect(mocks.leadRepo.deleteLead).toHaveBeenCalledWith('lead-1', 'tenant-1');
    });

    it('throws NotFoundError if lead does not exist', async () => {
      mocks.leadRepo.findLeadById.mockResolvedValue(null);

      await expect(service.deleteLead('lead-999', 'tenant-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteActivity', () => {
    it('deletes activity when found in tenant', async () => {
      mocks.activityRepo.deleteActivity.mockResolvedValue(true);

      await service.deleteActivity('act-1', 'tenant-1');
      expect(mocks.activityRepo.deleteActivity).toHaveBeenCalledWith('act-1', 'tenant-1');
    });

    it('throws NotFoundError if activity does not exist', async () => {
      mocks.activityRepo.deleteActivity.mockResolvedValue(false);

      await expect(service.deleteActivity('act-999', 'tenant-1')).rejects.toThrow(NotFoundError);
    });
  });
});
