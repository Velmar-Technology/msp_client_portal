import { Request, Response } from 'express';
import { crmService, CRMService } from '@modules/crm/services/CRMService';
import {
  CreateLeadDTO,
  UpdateLeadDTO,
  UpdateLeadStageDTO,
  SendCrmQuotationDTO,
  ResendCrmQuotationDTO,
  ConvertLeadToSubscriptionDTO,
  CreateLeadActivityDTO,
  UpdateLeadActivityDTO,
  GetLeadsQueryDTO,
  UpdateQuotationStatusDTO,
  ModifySubscriptionDTO,
  CancelSubscriptionDTO,
} from '@shared/dtos/crm.dto';

/**
 * Controller handling HTTP requests for CRM lead pipeline management, quotes, activities, and conversion to subscriptions.
 */
export class CRMController {
  /**
   * Initializes CRMController with CRMService dependency.
   *
   * @param service - CRM domain service
   */
  constructor(private service: CRMService = crmService) {}

  /**
   * Handles querying paginated and filtered leads.
   *
   * @param req - Express request with query parameters
   * @param res - Express response returning leads and pagination metadata
   */
  async getLeads(req: Request, res: Response): Promise<void> {
    const query = GetLeadsQueryDTO.parse(req.query);
    const result = await this.service.getLeads(req.user!.tenantId, query);
    res.json({
      success: true,
      data: result.leads,
      pagination: {
        total: result.total,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: Math.ceil(result.total / (query.limit || 20)),
      },
    });
  }

  /**
   * Handles retrieving CRM pipeline stats (funnel counts, value, conversion rates).
   *
   * @param req - Express request
   * @param res - Express response returning pipeline stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await this.service.getPipelineStats(req.user!.tenantId);
    res.json({ success: true, data: stats });
  }

  /**
   * Handles retrieving a single lead by UUID.
   *
   * @param req - Express request with lead ID in params
   * @param res - Express response returning lead
   */
  async getLeadById(req: Request, res: Response): Promise<void> {
    const lead = await this.service.getLeadById(req.params.id as string, req.user!.tenantId);
    res.json({ success: true, data: lead });
  }

  /**
   * Handles creating a new sales lead.
   *
   * @param req - Express request with CreateLeadDTO body
   * @param res - Express response returning HTTP 201 with created lead
   */
  async createLead(req: Request, res: Response): Promise<void> {
    const data = CreateLeadDTO.parse(req.body);
    const lead = await this.service.createLead(data, req.user!.tenantId, req.user!.userId);
    res.status(201).json({ success: true, data: lead });
  }

  /**
   * Handles updating fields on a lead.
   *
   * @param req - Express request with lead ID in params and UpdateLeadDTO body
   * @param res - Express response returning updated lead
   */
  async updateLead(req: Request, res: Response): Promise<void> {
    const data = UpdateLeadDTO.parse(req.body);
    const lead = await this.service.updateLead(req.params.id as string, data, req.user!.tenantId, req.user!.userId);
    res.json({ success: true, data: lead });
  }

  /**
   * Handles advancing or changing the pipeline stage of a lead.
   *
   * @param req - Express request with lead ID in params and UpdateLeadStageDTO body
   * @param res - Express response returning updated lead
   */
  async updateStage(req: Request, res: Response): Promise<void> {
    const { stage, lostReason } = UpdateLeadStageDTO.parse(req.body);
    const lead = await this.service.updateLeadStage(req.params.id as string, stage, lostReason, req.user!.tenantId, req.user!.userId);
    res.json({ success: true, data: lead });
  }

  /**
   * Handles deleting a lead record.
   *
   * @param req - Express request with lead ID in params
   * @param res - Express response returning deletion success status
   */
  async deleteLead(req: Request, res: Response): Promise<void> {
    await this.service.deleteLead(req.params.id as string, req.user!.tenantId);
    res.json({ success: true, message: 'Lead deleted successfully' });
  }

  /**
   * Handles dispatching a formal commercial price quotation to a lead or client.
   *
   * @param req - Express request with SendCrmQuotationDTO body
   * @param res - Express response returning HTTP 201 with generated quotation
   */
  async sendQuotation(req: Request, res: Response): Promise<void> {
    const data = SendCrmQuotationDTO.parse(req.body);
    const quotation = await this.service.sendQuotation(data, req.user!.tenantId, req.user!.userId);
    res.status(201).json({ success: true, data: quotation, message: 'Quotation sent successfully' });
  }

  /**
   * Handles re-sending a quotation reminder email.
   *
   * @param req - Express request with ResendCrmQuotationDTO body
   * @param res - Express response returning updated quotation
   */
  async resendQuotation(req: Request, res: Response): Promise<void> {
    const data = ResendCrmQuotationDTO.parse(req.body);
    const quotation = await this.service.resendQuotation(data, req.user!.tenantId, req.user!.userId);
    res.json({ success: true, data: quotation, message: 'Quotation reminder resent successfully' });
  }

  /**
   * Handles converting a closed-won lead into an active subscription and provisioning client access.
   *
   * @param req - Express request with lead ID in params and ConvertLeadToSubscriptionDTO body
   * @param res - Express response returning converted lead, subscription, and initial invoice
   */
  async convertLead(req: Request, res: Response): Promise<void> {
    const data = ConvertLeadToSubscriptionDTO.parse({
      ...req.body,
      leadId: req.params.id as string,
    });
    const result = await this.service.convertLeadToSubscription(data, req.user!.tenantId, req.user!.userId);
    res.json({ success: true, data: result, message: 'Lead converted to active subscription successfully' });
  }

  /**
   * Handles retrieving all timeline activity items for a lead.
   *
   * @param req - Express request with lead ID in params
   * @param res - Express response returning array of activities
   */
  async getActivities(req: Request, res: Response): Promise<void> {
    const activities = await this.service.getActivitiesForLead(req.params.id as string, req.user!.tenantId);
    res.json({ success: true, data: activities });
  }

  /**
   * Handles logging an interaction or task on a lead's timeline.
   *
   * @param req - Express request with lead ID in params and CreateLeadActivityDTO body
   * @param res - Express response returning HTTP 201 with created activity
   */
  async logActivity(req: Request, res: Response): Promise<void> {
    const data = CreateLeadActivityDTO.parse({
      ...req.body,
      leadId: req.params.id as string,
    });
    const activity = await this.service.logActivity(data, req.user!.tenantId, req.user!.userId);
    res.status(201).json({ success: true, data: activity });
  }

  /**
   * Handles updating a lead activity record.
   *
   * @param req - Express request with activityId in params and UpdateLeadActivityDTO body
   * @param res - Express response returning updated activity
   */
  async updateActivity(req: Request, res: Response): Promise<void> {
    const data = UpdateLeadActivityDTO.parse(req.body);
    const activity = await this.service.updateActivity(req.params.activityId as string, data, req.user!.tenantId);
    res.json({ success: true, data: activity });
  }

  /**
   * Handles deleting an activity from the timeline.
   *
   * @param req - Express request with activityId in params
   * @param res - Express response returning deletion success status
   */
  async deleteActivity(req: Request, res: Response): Promise<void> {
    await this.service.deleteActivity(req.params.activityId as string, req.user!.tenantId);
    res.json({ success: true, message: 'Activity deleted successfully' });
  }

  /**
   * Handles listing all quotations generated for a lead.
   *
   * @param req - Express request with lead ID in params
   * @param res - Express response returning array of quotations
   */
  async getQuotations(req: Request, res: Response): Promise<void> {
    const quotations = await this.service.getQuotationsForLead(req.params.id as string, req.user!.tenantId);
    res.json({ success: true, data: quotations });
  }

  /**
   * Handles updating the status of a commercial quotation.
   *
   * @param req - Express request with quotation ID in params and UpdateQuotationStatusDTO body
   * @param res - Express response returning updated quotation
   */
  async updateQuotationStatus(req: Request, res: Response): Promise<void> {
    const { status } = UpdateQuotationStatusDTO.parse(req.body);
    const quotation = await this.service.updateQuotationStatus(
      req.params.id as string,
      status,
      req.user!.tenantId,
      req.user!.userId,
    );
    res.json({ success: true, data: quotation, message: `Quotation marked as ${status}` });
  }

  /**
   * Handles querying upcoming activities and reminders due across the tenant.
   *
   * @param req - Express request
   * @param res - Express response returning array of upcoming activities
   */
  async getUpcomingActivities(req: Request, res: Response): Promise<void> {
    const activities = await this.service.getUpcomingActivities(req.user!.tenantId);
    res.json({ success: true, data: activities });
  }

  /**
   * Handles modifying a customer's subscription directly from the CRM interface.
   *
   * @param req - Express request with ModifySubscriptionDTO body
   * @param res - Express response returning modified subscription
   */
  async modifySubscription(req: Request, res: Response): Promise<void> {
    const { subId, planId, equipmentCount, leadId } = ModifySubscriptionDTO.parse(req.body);
    const result = await this.service.modifyCustomerSubscription(subId, planId, equipmentCount, req.user!.tenantId, leadId, req.user!.userId);
    res.json({ success: true, data: result, message: 'Subscription modified successfully' });
  }

  /**
   * Handles cancelling a customer's subscription directly from the CRM interface.
   *
   * @param req - Express request with CancelSubscriptionDTO body
   * @param res - Express response returning cancelled subscription
   */
  async cancelSubscription(req: Request, res: Response): Promise<void> {
    const { subId, leadId } = CancelSubscriptionDTO.parse(req.body);
    const result = await this.service.cancelCustomerSubscription(subId, req.user!.tenantId, leadId, req.user!.userId);
    res.json({ success: true, data: result, message: 'Subscription cancelled successfully' });
  }
}

export const crmController = new CRMController();
