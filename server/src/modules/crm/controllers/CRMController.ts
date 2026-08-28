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

export class CRMController {
  constructor(private service: CRMService = crmService) {}

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

  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await this.service.getPipelineStats(req.user!.tenantId);
    res.json({ success: true, data: stats });
  }

  async getLeadById(req: Request, res: Response): Promise<void> {
    const lead = await this.service.getLeadById(req.params.id as string, req.user!.tenantId);
    res.json({ success: true, data: lead });
  }

  async createLead(req: Request, res: Response): Promise<void> {
    const data = CreateLeadDTO.parse(req.body);
    const lead = await this.service.createLead(data, req.user!.tenantId, req.user!.userId);
    res.status(201).json({ success: true, data: lead });
  }

  async updateLead(req: Request, res: Response): Promise<void> {
    const data = UpdateLeadDTO.parse(req.body);
    const lead = await this.service.updateLead(req.params.id as string, data, req.user!.tenantId, req.user!.userId);
    res.json({ success: true, data: lead });
  }

  async updateStage(req: Request, res: Response): Promise<void> {
    const { stage, lostReason } = UpdateLeadStageDTO.parse(req.body);
    const lead = await this.service.updateLeadStage(req.params.id as string, stage, lostReason, req.user!.tenantId, req.user!.userId);
    res.json({ success: true, data: lead });
  }

  async deleteLead(req: Request, res: Response): Promise<void> {
    await this.service.deleteLead(req.params.id as string, req.user!.tenantId);
    res.json({ success: true, message: 'Lead deleted successfully' });
  }

  async sendQuotation(req: Request, res: Response): Promise<void> {
    const data = SendCrmQuotationDTO.parse(req.body);
    const quotation = await this.service.sendQuotation(data, req.user!.tenantId, req.user!.userId);
    res.status(201).json({ success: true, data: quotation, message: 'Quotation sent successfully' });
  }

  async resendQuotation(req: Request, res: Response): Promise<void> {
    const data = ResendCrmQuotationDTO.parse(req.body);
    const quotation = await this.service.resendQuotation(data, req.user!.tenantId, req.user!.userId);
    res.json({ success: true, data: quotation, message: 'Quotation reminder resent successfully' });
  }

  async convertLead(req: Request, res: Response): Promise<void> {
    const data = ConvertLeadToSubscriptionDTO.parse({
      ...req.body,
      leadId: req.params.id as string,
    });
    const result = await this.service.convertLeadToSubscription(data, req.user!.tenantId, req.user!.userId);
    res.json({ success: true, data: result, message: 'Lead converted to active subscription successfully' });
  }

  async getActivities(req: Request, res: Response): Promise<void> {
    const activities = await this.service.getActivitiesForLead(req.params.id as string, req.user!.tenantId);
    res.json({ success: true, data: activities });
  }

  async logActivity(req: Request, res: Response): Promise<void> {
    const data = CreateLeadActivityDTO.parse({
      ...req.body,
      leadId: req.params.id as string,
    });
    const activity = await this.service.logActivity(data, req.user!.tenantId, req.user!.userId);
    res.status(201).json({ success: true, data: activity });
  }

  async updateActivity(req: Request, res: Response): Promise<void> {
    const data = UpdateLeadActivityDTO.parse(req.body);
    const activity = await this.service.updateActivity(req.params.activityId as string, data, req.user!.tenantId);
    res.json({ success: true, data: activity });
  }

  async deleteActivity(req: Request, res: Response): Promise<void> {
    await this.service.deleteActivity(req.params.activityId as string, req.user!.tenantId);
    res.json({ success: true, message: 'Activity deleted successfully' });
  }

  async getQuotations(req: Request, res: Response): Promise<void> {
    const quotations = await this.service.getQuotationsForLead(req.params.id as string, req.user!.tenantId);
    res.json({ success: true, data: quotations });
  }

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

  async getUpcomingActivities(req: Request, res: Response): Promise<void> {
    const activities = await this.service.getUpcomingActivities(req.user!.tenantId);
    res.json({ success: true, data: activities });
  }

  async modifySubscription(req: Request, res: Response): Promise<void> {
    const { subId, planId, equipmentCount, leadId } = ModifySubscriptionDTO.parse(req.body);
    const result = await this.service.modifyCustomerSubscription(subId, planId, equipmentCount, req.user!.tenantId, leadId, req.user!.userId);
    res.json({ success: true, data: result, message: 'Subscription modified successfully' });
  }

  async cancelSubscription(req: Request, res: Response): Promise<void> {
    const { subId, leadId } = CancelSubscriptionDTO.parse(req.body);
    const result = await this.service.cancelCustomerSubscription(subId, req.user!.tenantId, leadId, req.user!.userId);
    res.json({ success: true, data: result, message: 'Subscription cancelled successfully' });
  }
}

export const crmController = new CRMController();
