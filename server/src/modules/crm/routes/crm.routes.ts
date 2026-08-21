import { Router } from 'express';
import { crmController } from '@modules/crm/controllers/CRMController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { rbacMiddleware } from '@shared/middleware/rbacMiddleware';
import { validate } from '@shared/middleware/validationMiddleware';
import { UserRole } from '@shared/types';
import {
  CreateLeadDTO,
  UpdateLeadDTO,
  UpdateLeadStageDTO,
  SendCrmQuotationDTO,
  ResendCrmQuotationDTO,
  ConvertLeadToSubscriptionDTO,
  CreateLeadActivityDTO,
  UpdateLeadActivityDTO,
  UpdateQuotationStatusDTO,
  ModifySubscriptionDTO,
  CancelSubscriptionDTO,
} from '@shared/dtos/crm.dto';

const router = Router();

// CRM routes require authentication and the ADMIN role (sales pipeline management)
router.use(authMiddleware);
router.use(rbacMiddleware(UserRole.ADMIN));

/** GET /api/v1/crm/stats — Get CRM pipeline summary statistics */
router.get('/stats', (req, res) => crmController.getStats(req, res));

/** GET /api/v1/crm/leads — List leads with filtering, search, and pagination */
router.get('/leads', (req, res) => crmController.getLeads(req, res));

/** POST /api/v1/crm/leads — Create a new lead */
router.post('/leads', validate(CreateLeadDTO), (req, res) => crmController.createLead(req, res));

/** GET /api/v1/crm/leads/:id — Get lead details by ID */
router.get('/leads/:id', (req, res) => crmController.getLeadById(req, res));

/** PATCH /api/v1/crm/leads/:id — Update lead details */
router.patch('/leads/:id', validate(UpdateLeadDTO), (req, res) => crmController.updateLead(req, res));

/** PATCH /api/v1/crm/leads/:id/stage — Update lead pipeline stage */
router.patch('/leads/:id/stage', validate(UpdateLeadStageDTO), (req, res) => crmController.updateStage(req, res));

/** POST /api/v1/crm/leads/:id/convert — Convert lead to an active client subscription */
router.post('/leads/:id/convert', validate(ConvertLeadToSubscriptionDTO), (req, res) => crmController.convertLead(req, res));

/** POST /api/v1/crm/quotations/send — Generate and send a formal plan quotation email */
router.post('/quotations/send', validate(SendCrmQuotationDTO), (req, res) => crmController.sendQuotation(req, res));

/** POST /api/v1/crm/quotations/resend — Resend quotation / reminder email */
router.post('/quotations/resend', validate(ResendCrmQuotationDTO), (req, res) => crmController.resendQuotation(req, res));

/** PATCH /api/v1/crm/quotations/:id/status — Mark quotation accepted / declined / expired */
router.patch('/quotations/:id/status', validate(UpdateQuotationStatusDTO), (req, res) => crmController.updateQuotationStatus(req, res));

/** GET /api/v1/crm/activities — Tenant-wide upcoming and overdue follow-up activities */
router.get('/activities', (req, res) => crmController.getUpcomingActivities(req, res));

/** GET /api/v1/crm/leads/:id/activities — Get activity history and follow-ups for a lead */
router.get('/leads/:id/activities', (req, res) => crmController.getActivities(req, res));

/** POST /api/v1/crm/leads/:id/activities — Log a new activity or schedule a follow-up for a lead */
router.post('/leads/:id/activities', validate(CreateLeadActivityDTO), (req, res) => crmController.logActivity(req, res));

/** PATCH /api/v1/crm/activities/:activityId — Update activity status or notes */
router.patch('/activities/:activityId', validate(UpdateLeadActivityDTO), (req, res) => crmController.updateActivity(req, res));

/** GET /api/v1/crm/leads/:id/quotations — Get quotations created for a lead */
router.get('/leads/:id/quotations', (req, res) => crmController.getQuotations(req, res));

/** POST /api/v1/crm/subscriptions/modify — Modify existing customer subscription (device count / tier) */
router.post('/subscriptions/modify', validate(ModifySubscriptionDTO), (req, res) => crmController.modifySubscription(req, res));

/** POST /api/v1/crm/subscriptions/cancel — Cancel customer subscription */
router.post('/subscriptions/cancel', validate(CancelSubscriptionDTO), (req, res) => crmController.cancelSubscription(req, res));

export default router;
