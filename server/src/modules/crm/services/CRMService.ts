import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '@shared/config/env';
import { hashPassword } from '@shared/utils/passwordUtils';
import { logger } from '@shared/utils/logger';
import { LeadRepository, leadRepository } from '@modules/crm/repositories/LeadRepository';
import { LeadActivityRepository, leadActivityRepository } from '@modules/crm/repositories/LeadActivityRepository';
import { QuotationRepository, quotationRepository } from '@modules/crm/repositories/QuotationRepository';
import { UserRepository, userRepository } from '@modules/auth';
import { PlanRepository, planRepository, SubscriptionService, subscriptionService } from '@modules/subscriptions';
import { InvoiceRepository, invoiceRepository } from '@modules/billing';
import { sendPasswordResetEmail, sendQuotationEmail } from '@shared/utils/emailService';
import { NotFoundError, ValidationError } from '@shared/errors';
import {
  Lead,
  LeadActivity,
  Quotation,
  QuotationStatus,
  LeadStage,
  CrmPipelineStats,
  Subscription,
  SubscriptionStatus,
  UserRole,
  Invoice,
} from '@shared/types';
import {
  CreateLeadInput,
  UpdateLeadInput,
  SendCrmQuotationInput,
  ResendCrmQuotationInput,
  ConvertLeadToSubscriptionInput,
  CreateLeadActivityInput,
  UpdateLeadActivityInput,
  GetLeadsQueryInput,
} from '@shared/dtos/crm.dto';
import { TAX_RATE } from '@shared/config/constants';

const STAGE_PROBABILITIES: Record<LeadStage, number> = {
  [LeadStage.NEW]: 10,
  [LeadStage.QUALIFIED]: 30,
  [LeadStage.PROPOSITION]: 60,
  [LeadStage.WON]: 100,
  [LeadStage.LOST]: 0,
};

const QUOTATION_STATUS_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  [QuotationStatus.DRAFT]: [QuotationStatus.SENT],
  [QuotationStatus.SENT]: [QuotationStatus.ACCEPTED, QuotationStatus.DECLINED, QuotationStatus.EXPIRED],
  [QuotationStatus.ACCEPTED]: [],
  [QuotationStatus.DECLINED]: [],
  [QuotationStatus.EXPIRED]: [],
};

const QUOTATION_STATUS_ACTIVITY_TITLES: Record<QuotationStatus, string> = {
  [QuotationStatus.DRAFT]: 'Quotation Drafted',
  [QuotationStatus.SENT]: 'Quotation Sent',
  [QuotationStatus.ACCEPTED]: 'Quotation Accepted',
  [QuotationStatus.DECLINED]: 'Quotation Declined',
  [QuotationStatus.EXPIRED]: 'Quotation Expired',
};

const FOLLOW_UP_REMINDER_DAYS = 3;

/**
 * Domain service orchestrating the CRM sales pipeline, lead stage progressions,
 * quotation dispatching, activity tracking, and auto-provisioning client subscriptions upon deal close.
 *
 * @see BL-501 CRM Lead Pipeline Progression & Conversion
 */
export class CRMService {
  /**
   * Initializes CRMService with lead, activity, quotation, user, plan, subscription, and invoice repositories.
   *
   * @param leadRepo - Lead repository
   * @param activityRepo - Lead activity timeline repository
   * @param quotationRepo - Quotation repository
   * @param userRepo - User repository
   * @param planRepo - Plan catalog repository
   * @param subService - Subscription lifecycle service
   * @param invoiceRepo - Invoice repository
   */
  constructor(
    private leadRepo: LeadRepository = leadRepository,
    private activityRepo: LeadActivityRepository = leadActivityRepository,
    private quotationRepo: QuotationRepository = quotationRepository,
    private userRepo: UserRepository = userRepository,
    private planRepo: PlanRepository = planRepository,
    private subService: SubscriptionService = subscriptionService,
    private invoiceRepo: InvoiceRepository = invoiceRepository,
  ) {}

  /**
   * Retrieves a paginated and filtered list of leads for a tenant.
   *
   * @param tenantId - Tenant UUID
   * @param query - Filtering and pagination parameters
   * @returns Object with leads array and total count
   */
  async getLeads(tenantId: string, query: GetLeadsQueryInput = {}): Promise<{ leads: Lead[]; total: number }> {
    return this.leadRepo.findByTenant(tenantId, query);
  }

  /**
   * Retrieves a single lead by UUID.
   *
   * @param id - Lead UUID
   * @param tenantId - Tenant UUID
   * @returns Lead entity
   * @throws {NotFoundError} When lead is not found
   */
  async getLeadById(id: string, tenantId: string): Promise<Lead> {
    const lead = await this.leadRepo.findLeadById(id, tenantId);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }
    return lead;
  }

  /**
   * Retrieves pipeline performance metrics (leads per stage, weighted revenue, conversion rates).
   *
   * @param tenantId - Tenant UUID
   * @returns CrmPipelineStats aggregate metrics
   */
  async getPipelineStats(tenantId: string): Promise<CrmPipelineStats> {
    return this.leadRepo.getPipelineStats(tenantId);
  }

  /**
   * Creates a new lead in the CRM pipeline and logs initial creation activity.
   *
   * @param data - Lead creation parameters
   * @param tenantId - Tenant UUID
   * @param creatorUserId - Creator user UUID
   * @returns Created Lead entity
   */
  async createLead(data: CreateLeadInput, tenantId: string, creatorUserId?: string): Promise<Lead> {
    let validPlanId: string | null = null;
    let expectedRev = data.expectedRevenue;

    if (data.planId) {
      const plan = await this.planRepo.findById(data.planId);
      if (plan) {
        validPlanId = plan.id;
        if (!expectedRev || expectedRev === 0) {
          const mult = data.billingCycle === 'annual' ? 12 * 0.8 : 1;
          expectedRev = Math.round(plan.price * mult * (data.equipmentCount || 1) * (1 + TAX_RATE) * 100) / 100;
        }
      }
    }

    const lead = await this.leadRepo.createLead(
      {
        ...data,
        planId: validPlanId,
        expectedRevenue: expectedRev ?? 0,
        probability: data.probability ?? (data.stage ? STAGE_PROBABILITIES[data.stage] : 10),
      },
      tenantId,
    );

    await this.activityRepo.createActivity(
      {
        leadId: lead.id,
        activityType: 'STAGE_CHANGE',
        title: 'Lead Created',
        summary: `Lead created in ${lead.stage} stage with priority ${lead.priority}.`,
        status: 'COMPLETED',
      },
      tenantId,
      creatorUserId,
    );

    return lead;
  }

  /**
   * Updates lead attributes, calculates probabilities on stage change, and logs activity.
   *
   * @param id - Lead UUID
   * @param data - Update fields
   * @param tenantId - Tenant UUID
   * @param userId - Modifying user UUID
   * @returns Updated Lead entity
   * @throws {NotFoundError} When lead is not found
   */
  async updateLead(id: string, data: UpdateLeadInput, tenantId: string, userId?: string): Promise<Lead> {
    const existing = await this.getLeadById(id, tenantId);

    const isStageChanged = data.stage && data.stage !== existing.stage;
    const updateData: UpdateLeadInput = { ...data };

    if (isStageChanged && data.probability === undefined) {
      updateData.probability = STAGE_PROBABILITIES[data.stage as LeadStage] ?? existing.probability;
    }

    if (data.planId) {
      const plan = await this.planRepo.findById(data.planId);
      updateData.planId = plan ? plan.id : null;
    }

    const updated = await this.leadRepo.updateLead(id, updateData, tenantId);
    if (!updated) {
      throw new NotFoundError('Lead not found for update');
    }

    if (isStageChanged) {
      await this.activityRepo.createActivity(
        {
          leadId: id,
          activityType: 'STAGE_CHANGE',
          title: `Stage Changed: ${existing.stage} → ${data.stage}`,
          summary: data.lostReason ? `Reason: ${data.lostReason}` : undefined,
          status: 'COMPLETED',
        },
        tenantId,
        userId,
      );
    }

    return updated;
  }

  /**
   * Advances or changes a lead's pipeline stage.
   *
   * @see BL-501
   * @param id - Lead UUID
   * @param stage - Target LeadStage
   * @param lostReason - Optional reason if stage is LOST
   * @param tenantId - Tenant UUID
   * @param userId - Modifying user UUID
   * @returns Updated Lead entity
   */
  async updateLeadStage(
    id: string,
    stage: LeadStage,
    lostReason: string | null | undefined,
    tenantId: string,
    userId?: string,
  ): Promise<Lead> {
    return this.updateLead(id, { stage, lostReason, probability: STAGE_PROBABILITIES[stage] }, tenantId, userId);
  }

  /**
   * Deletes a lead record from the tenant's CRM database.
   *
   * @param id - Lead UUID
   * @param tenantId - Tenant UUID
   * @throws {NotFoundError} When lead does not exist
   */
  async deleteLead(id: string, tenantId: string): Promise<void> {
    await this.getLeadById(id, tenantId);
    const deleted = await this.leadRepo.deleteLead(id, tenantId);
    if (!deleted) {
      throw new NotFoundError('Lead not found');
    }
  }

  /**
   * Generates a formal price quotation, dispatches an email, advances lead stage to PROPOSITION, and schedules a follow-up.
   *
   * @param data - SendCrmQuotationInput parameters
   * @param tenantId - Tenant UUID
   * @param userId - Creating user UUID
   * @returns Created Quotation entity
   * @throws {NotFoundError} When plan is not found
   */
  async sendQuotation(data: SendCrmQuotationInput, tenantId: string, userId?: string): Promise<Quotation> {
    const plan = await this.planRepo.findById(data.planId);
    if (!plan) {
      throw new NotFoundError(`Plan '${data.planId}' not found`);
    }

    let recipientLang = 'en_US';
    if (data.clientId) {
      const clientUser = await this.userRepo.findById(data.clientId);
      if (clientUser?.language) {
        recipientLang = clientUser.language;
      }
    } else if (userId) {
      const creatorUser = await this.userRepo.findById(userId);
      if (creatorUser?.language) {
        recipientLang = creatorUser.language;
      }
    }

    const billingCycle = data.billingCycle || 'monthly';
    const equipmentCount = data.equipmentCount || 1;
    const priceMultiplier = billingCycle === 'annual' ? 12 * 0.8 : 1;
    const subtotal = Math.round(plan.price * priceMultiplier * equipmentCount * 100) / 100;
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const validUntil = new Date(Date.now() + (data.validDays || 30) * 24 * 60 * 60 * 1000);

    const quotation = await this.quotationRepo.createQuotation({
      tenantId,
      leadId: data.leadId || null,
      clientId: data.clientId || null,
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      planId: plan.id,
      billingCycle,
      equipmentCount,
      subtotal,
      tax,
      total,
      validUntil,
      createdBy: userId || null,
    });

    await sendQuotationEmail(
      data.recipientEmail,
      data.recipientName,
      plan,
      billingCycle,
      equipmentCount,
      subtotal,
      tax,
      total,
      recipientLang,
    );

    if (data.leadId) {
      const currentLead = await this.leadRepo.findLeadById(data.leadId, tenantId);
      const canAdvanceStage =
        !currentLead ||
        currentLead.stage === LeadStage.NEW ||
        currentLead.stage === LeadStage.QUALIFIED;

      await this.leadRepo.updateLead(
        data.leadId,
        {
          ...(canAdvanceStage
            ? { stage: LeadStage.PROPOSITION, probability: STAGE_PROBABILITIES[LeadStage.PROPOSITION] }
            : {}),
          planId: plan.id,
          billingCycle,
          equipmentCount,
          expectedRevenue: total,
        },
        tenantId,
      );

      await this.activityRepo.createActivity(
        {
          leadId: data.leadId,
          activityType: 'QUOTE_SENT',
          title: `Quotation Sent: ${quotation.quotation_number}`,
          summary: `Sent formal quotation for ${plan.id} ($${total} ${billingCycle}) to ${data.recipientEmail}. Valid until ${validUntil.toLocaleDateString()}.`,
          status: 'COMPLETED',
        },
        tenantId,
        userId,
      );

      await this.scheduleFollowUpReminder(data.leadId, quotation.quotation_number, tenantId);
    }

    return quotation;
  }

  /**
   * Automatically creates a reminder task 3 days after quotation delivery.
   *
   * @param leadId - Lead UUID
   * @param quotationNumber - Quotation display number
   * @param tenantId - Tenant UUID
   */
  private async scheduleFollowUpReminder(
    leadId: string,
    quotationNumber: string,
    tenantId: string,
  ): Promise<void> {
    const dueDate = new Date(Date.now() + FOLLOW_UP_REMINDER_DAYS * 24 * 60 * 60 * 1000);
    await this.activityRepo.createActivity(
      {
        leadId,
        activityType: 'QUOTE_REMINDER',
        title: `Follow-up reminder due: ${quotationNumber}`,
        summary: `Automatic follow-up scheduled ${FOLLOW_UP_REMINDER_DAYS} days after quotation delivery.`,
        dueDate: dueDate.toISOString(),
        status: 'PENDING',
      },
      tenantId,
    );
  }

  /**
   * Resends a quotation email reminder for an existing quotation in SENT status.
   *
   * @param data - ResendCrmQuotationInput parameters
   * @param tenantId - Tenant UUID
   * @param userId - Actor user UUID
   * @returns Updated Quotation entity
   * @throws {NotFoundError} When quotation or plan is not found
   * @throws {ValidationError} When quotation is not in SENT status
   */
  async resendQuotation(data: ResendCrmQuotationInput, tenantId: string, userId?: string): Promise<Quotation> {
    const quotation = await this.quotationRepo.findQuotationById(data.quotationId, tenantId);
    if (!quotation) {
      throw new NotFoundError('Quotation not found');
    }

    if (quotation.status !== QuotationStatus.SENT) {
      throw new ValidationError(
        `Quotation ${quotation.quotation_number} is ${quotation.status} and can no longer be resent. Only quotations in SENT status support reminders.`,
      );
    }

    const plan = await this.planRepo.findById(quotation.plan_id);
    if (!plan) {
      throw new NotFoundError(`Plan '${quotation.plan_id}' not found`);
    }

    let recipientLang = 'en_US';
    if (quotation.client_id) {
      const clientUser = await this.userRepo.findById(quotation.client_id);
      if (clientUser?.language) {
        recipientLang = clientUser.language;
      }
    }

    await sendQuotationEmail(
      quotation.recipient_email,
      quotation.recipient_name,
      plan,
      quotation.billing_cycle as 'monthly' | 'annual',
      quotation.equipment_count,
      quotation.subtotal,
      quotation.tax,
      quotation.total,
      recipientLang,
    );

    await this.quotationRepo.updateReminderTimestamp(quotation.id, tenantId);

    if (quotation.lead_id) {
      await this.activityRepo.createActivity(
        {
          leadId: quotation.lead_id,
          activityType: 'QUOTE_REMINDER',
          title: `Quotation Reminder Sent: ${quotation.quotation_number}`,
          summary: `Follow-up quotation reminder re-sent to ${quotation.recipient_email}.${data.customMessage ? ` Note: ${data.customMessage}` : ''}`,
          status: 'COMPLETED',
        },
        tenantId,
        userId,
      );
    }

    const updated = await this.quotationRepo.findQuotationById(quotation.id, tenantId);
    return updated || quotation;
  }

  /**
   * Converts a lead into an active client subscription. Automatically provisions user account if needed,
   * creates subscription and initial invoice, marks lead as WON (100%), and logs timeline event.
   *
   * @see BL-501
   * @param data - ConvertLeadToSubscriptionInput parameters
   * @param tenantId - Tenant UUID
   * @param userId - Converting user UUID
   * @returns Object with updated lead, subscription, invoice, and clientCreated flag
   * @throws {ValidationError} When leadId or plan is missing, or email exists under another tenant
   * @throws {NotFoundError} When plan is not found
   */
  async convertLeadToSubscription(
    data: ConvertLeadToSubscriptionInput,
    tenantId: string,
    userId?: string,
  ): Promise<{ lead: Lead; subscription: Subscription; invoice?: Invoice; clientCreated?: boolean }> {
    if (!data.leadId) {
      throw new ValidationError('Lead ID is required');
    }
    const lead = await this.getLeadById(data.leadId, tenantId);

    let targetClientId = lead.client_id;
    let clientCreated = false;

    if (!targetClientId) {
      const existingUser = await this.userRepo.findByEmail(lead.contact_email);
      if (existingUser && existingUser.tenant_id === tenantId) {
        targetClientId = existingUser.id;
        await this.leadRepo.updateLead(lead.id, { clientId: targetClientId }, tenantId);
      } else if (!existingUser) {
        // Auto-create client user if account does not exist
        const tempPassword = crypto.randomBytes(24).toString('hex');
        const password_hash = await hashPassword(tempPassword);
        const newUser = await this.userRepo.create({
          email: lead.contact_email,
          name: lead.contact_name,
          password_hash,
          role: UserRole.CLIENT,
          tenant_id: tenantId,
          client_type: 'CLIENT',
          phone_number: lead.contact_phone || undefined,
        });

        targetClientId = newUser.id;
        clientCreated = true;
        await this.leadRepo.updateLead(lead.id, { clientId: targetClientId }, tenantId);

        // Generate password setup token valid for 72h
        const resetToken = jwt.sign({ userId: newUser.id }, env.JWT_SECRET, { expiresIn: '72h' });
        try {
          await sendPasswordResetEmail(newUser.email, newUser.name, resetToken, newUser.language);
          logger.info('Password setup invitation email dispatched on lead conversion', {
            userId: newUser.id,
            email: newUser.email,
          });
        } catch (err: unknown) {
          logger.error('Failed to send password setup invitation email on lead conversion', {
            userId: newUser.id,
            email: newUser.email,
            error: err instanceof Error ? err.message : err,
          });
        }
      } else {
        throw new ValidationError(
          `User account for ${lead.contact_email} exists under a different tenant.`
        );
      }
    }

    const planId = data.planId || lead.plan_id;
    if (!planId) {
      throw new ValidationError('Cannot convert lead without a selected plan.');
    }

    const plan = await this.planRepo.findById(planId);
    if (!plan) {
      throw new NotFoundError(`Plan '${planId}' not found`);
    }

    const equipmentCount = data.equipmentCount ?? lead.equipment_count ?? 1;
    const billingCycle = (data.billingCycle || lead.billing_cycle || 'monthly') as 'monthly' | 'annual';

    const planName = typeof plan.name === 'object' && plan.name !== null
      ? (plan.name.en_US || plan.name.es_DO || Object.values(plan.name)[0] || plan.id)
      : String(plan.name);

    const subscription = await this.subService.createSubscription(
      {
        serviceName: planName,
        plan: plan.id,
        equipmentCount,
        clientId: targetClientId,
        billingCycle,
        paymentMethod: data.paymentMethod || 'transfer',
      },
      targetClientId,
      tenantId,
      true, // byAdmin
    );

    // Retrieve the newly created initial invoice for this client
    const tenantInvoices = await this.invoiceRepo.findByTenant(tenantId, 10, 0);
    const invoice = tenantInvoices.find((inv) => inv.client_id === targetClientId);

    const updatedLead = await this.leadRepo.updateLead(
      lead.id,
      {
        stage: LeadStage.WON,
        probability: 100,
        planId: plan.id,
        equipmentCount,
        billingCycle,
      },
      tenantId,
    );

    await this.activityRepo.createActivity(
      {
        leadId: lead.id,
        activityType: 'PLAN_ASSIGNED',
        title: `Lead Converted: Active Subscription Created (${plan.id})`,
        summary: `Successfully subscribed customer to ${planName} with ${equipmentCount} device(s). Status marked as WON.${clientCreated ? ' Client account was automatically provisioned and invite email sent.' : ''}`,
        status: 'COMPLETED',
      },
      tenantId,
      userId,
    );

    return { lead: updatedLead || lead, subscription, invoice, clientCreated };
  }

  /**
   * Retrieves all logged activities and interactions for a given lead.
   *
   * @param leadId - Lead UUID
   * @param tenantId - Tenant UUID
   * @returns Array of LeadActivity entities
   */
  async getActivitiesForLead(leadId: string, tenantId: string): Promise<LeadActivity[]> {
    return this.activityRepo.findByLead(leadId, tenantId);
  }

  /**
   * Manually logs an interaction or scheduled task for a lead.
   *
   * @param data - CreateLeadActivityInput parameters
   * @param tenantId - Tenant UUID
   * @param userId - Logging user UUID
   * @returns Created LeadActivity entity
   * @throws {ValidationError} When leadId is missing
   */
  async logActivity(data: CreateLeadActivityInput, tenantId: string, userId?: string): Promise<LeadActivity> {
    if (!data.leadId) {
      throw new ValidationError('Lead ID is required');
    }
    await this.getLeadById(data.leadId, tenantId);
    return this.activityRepo.createActivity(data, tenantId, userId);
  }

  /**
   * Updates an existing lead activity record.
   *
   * @param id - Activity UUID
   * @param data - Update fields
   * @param tenantId - Tenant UUID
   * @returns Updated LeadActivity entity
   * @throws {NotFoundError} When activity not found
   */
  async updateActivity(id: string, data: UpdateLeadActivityInput, tenantId: string): Promise<LeadActivity> {
    const updated = await this.activityRepo.updateActivity(id, data, tenantId);
    if (!updated) {
      throw new NotFoundError('Activity not found');
    }
    return updated;
  }

  /**
   * Deletes an activity record.
   *
   * @param id - Activity UUID
   * @param tenantId - Tenant UUID
   * @throws {NotFoundError} When activity not found
   */
  async deleteActivity(id: string, tenantId: string): Promise<void> {
    const deleted = await this.activityRepo.deleteActivity(id, tenantId);
    if (!deleted) {
      throw new NotFoundError('Activity not found');
    }
  }

  /**
   * Retrieves all quotations linked to a specific lead.
   *
   * @param leadId - Lead UUID
   * @param tenantId - Tenant UUID
   * @returns Array of Quotation entities
   */
  async getQuotationsForLead(leadId: string, tenantId: string): Promise<Quotation[]> {
    return this.quotationRepo.findByLead(leadId, tenantId);
  }

  /**
   * Updates quotation status following valid state transition rules and logs timeline activity.
   *
   * @param quotationId - Quotation UUID
   * @param status - Target QuotationStatus
   * @param tenantId - Tenant UUID
   * @param userId - Modifying user UUID
   * @returns Updated Quotation entity
   * @throws {NotFoundError} When quotation not found
   * @throws {ValidationError} When state transition is invalid
   */
  async updateQuotationStatus(
    quotationId: string,
    status: QuotationStatus,
    tenantId: string,
    userId?: string,
  ): Promise<Quotation> {
    const quotation = await this.quotationRepo.findQuotationById(quotationId, tenantId);
    if (!quotation) {
      throw new NotFoundError('Quotation not found');
    }

    const currentStatus = quotation.status as QuotationStatus;
    const allowedTargets = QUOTATION_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(status)) {
      throw new ValidationError(
        `Invalid quotation status transition: ${currentStatus} → ${status}.`,
      );
    }

    await this.quotationRepo.updateQuotationStatus(quotationId, status, tenantId);

    if (quotation.lead_id) {
      await this.activityRepo.createActivity(
        {
          leadId: quotation.lead_id,
          activityType: 'QUOTE_STATUS_CHANGE',
          title: `${QUOTATION_STATUS_ACTIVITY_TITLES[status]}: ${quotation.quotation_number}`,
          summary: `Quotation ${quotation.quotation_number} ($${Number(quotation.total).toFixed(2)}) marked as ${status}.`,
          status: 'COMPLETED',
        },
        tenantId,
        userId,
      );
    }

    const updated = await this.quotationRepo.findQuotationById(quotationId, tenantId);
    return updated || quotation;
  }

  /**
   * Retrieves upcoming and pending activities across all leads for a tenant.
   *
   * @param tenantId - Tenant UUID
   * @returns Array of upcoming LeadActivity entities
   */
  async getUpcomingActivities(tenantId: string): Promise<LeadActivity[]> {
    return this.activityRepo.findUpcomingByTenant(tenantId);
  }

  /**
   * Modifies an active customer subscription and logs the modification on the CRM timeline.
   *
   * @param subId - Subscription UUID
   * @param planId - Target plan ID
   * @param equipmentCount - Number of devices
   * @param tenantId - Tenant UUID
   * @param leadId - Optional lead UUID to associate activity
   * @param userId - Modifying user UUID
   * @returns Updated Subscription entity
   */
  async modifyCustomerSubscription(
    subId: string,
    planId: string,
    equipmentCount: number,
    tenantId: string,
    leadId?: string,
    userId?: string,
  ): Promise<Subscription> {
    const updatedSub = await this.subService.updateSubscription(
      subId,
      {
        plan: planId,
        equipmentCount,
      },
      tenantId,
      true, // byAdmin
    );

    if (leadId) {
      await this.activityRepo.createActivity(
        {
          leadId,
          activityType: 'SUB_MODIFIED',
          title: `Subscription Modified (${planId})`,
          summary: `Updated subscription to ${planId} with ${equipmentCount} device(s).`,
          status: 'COMPLETED',
        },
        tenantId,
        userId,
      );
    }

    return updatedSub;
  }

  /**
   * Cancels a customer subscription from the CRM interface and logs cancellation on the lead timeline.
   *
   * @param subId - Subscription UUID
   * @param tenantId - Tenant UUID
   * @param leadId - Optional lead UUID to associate activity
   * @param userId - Modifying user UUID
   * @returns Cancelled Subscription entity
   */
  async cancelCustomerSubscription(
    subId: string,
    tenantId: string,
    leadId?: string,
    userId?: string,
  ): Promise<Subscription> {
    const updatedSub = await this.subService.updateSubscription(
      subId,
      {
        status: SubscriptionStatus.CANCELLED,
      },
      tenantId,
      true, // byAdmin
    );

    if (leadId) {
      await this.activityRepo.createActivity(
        {
          leadId,
          activityType: 'SUB_MODIFIED',
          title: 'Subscription Cancelled',
          summary: `Cancelled subscription ${subId}.`,
          status: 'COMPLETED',
        },
        tenantId,
        userId,
      );
    }

    return updatedSub;
  }
}

export const crmService = new CRMService();
