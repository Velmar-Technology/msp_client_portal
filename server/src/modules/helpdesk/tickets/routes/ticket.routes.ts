import { Router } from 'express';
import { ticketController } from '@modules/helpdesk/tickets/controllers/TicketController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { agentAuthMiddleware } from '@shared/middleware/agentAuthMiddleware';
import { validate } from '@shared/middleware/validationMiddleware';
import {
  CreateTicketInputSchema,
  UpdateTicketStatusInputSchema,
  TicketQuerySchema,
  AssignTicketInputSchema,
  TicketIdParamSchema,
  CreateAgentTicketInputSchema,
  AddAgentTicketResponseInputSchema,
  AgentUpdateTicketStatusInputSchema,
} from '@shared/contracts';
import { CreateTicketResponseDTO } from '@shared/dtos/ticket.dto';
import { upload } from '@shared/middleware/uploadMiddleware';
import { requireAnyPermission } from '@shared/middleware/requirePermission';

const router = Router();

// ── Agent-Authenticated Endpoints (Machine Token) ───────────────────────────

/** POST /api/v1/helpdesk/tickets/agent — Create ticket from machine-authenticated endpoint agent */
router.post(
  '/agent',
  agentAuthMiddleware,
  validate(CreateAgentTicketInputSchema),
  (req, res) => ticketController.createFromAgent(req, res)
);

/** GET /api/v1/helpdesk/tickets/agent/active — Query active open ticket for machine-authenticated endpoint agent */
router.get(
  '/agent/active',
  agentAuthMiddleware,
  (req, res) => ticketController.getActiveTicketForAgent(req, res)
);

/** GET /api/v1/helpdesk/tickets/agent/list — Query list of tickets for machine-authenticated endpoint agent */
router.get(
  '/agent/list',
  agentAuthMiddleware,
  (req, res) => ticketController.getTicketsForAgent(req, res)
);

/** GET /api/v1/helpdesk/tickets/:id/responses/agent — Get responses for ticket from machine-authenticated endpoint agent */
router.get(
  '/:id/responses/agent',
  agentAuthMiddleware,
  validate(TicketIdParamSchema, 'params'),
  (req, res) => ticketController.getResponsesForAgent(req, res)
);

/** POST /api/v1/helpdesk/tickets/:id/responses/agent — Add response from machine-authenticated endpoint agent */
router.post(
  '/:id/responses/agent',
  agentAuthMiddleware,
  validate(TicketIdParamSchema, 'params'),
  validate(AddAgentTicketResponseInputSchema),
  (req, res) => ticketController.addResponseFromAgent(req, res)
);

/** PATCH /api/v1/helpdesk/tickets/:id/status/agent — Update ticket status from machine-authenticated endpoint agent */
router.patch(
  '/:id/status/agent',
  agentAuthMiddleware,
  validate(TicketIdParamSchema, 'params'),
  validate(AgentUpdateTicketStatusInputSchema),
  (req, res) => ticketController.updateStatusFromAgent(req, res)
);

// ── User-Authenticated Endpoints (JWT Session + Dynamic RBAC BL-302) ────────
router.use(authMiddleware);

/** GET /api/v1/helpdesk/tickets — List tickets */
router.get(
  '/',
  requireAnyPermission(['helpdesk:tickets:read', 'tickets:read']),
  validate(TicketQuerySchema, 'query'),
  (req, res) => ticketController.getAll(req, res)
);

/** GET /api/v1/helpdesk/tickets/summary — Get ticket count by status */
router.get(
  '/summary',
  requireAnyPermission(['helpdesk:tickets:read', 'tickets:read']),
  (req, res) => ticketController.getStatusSummary(req, res)
);

/** POST /api/v1/helpdesk/tickets — Create a new ticket */
router.post(
  '/',
  requireAnyPermission(['helpdesk:tickets:create', 'tickets:create']),
  validate(CreateTicketInputSchema),
  (req, res) => ticketController.create(req, res)
);

/** GET /api/v1/helpdesk/tickets/:id — Get ticket details */
router.get(
  '/:id',
  requireAnyPermission(['helpdesk:tickets:read', 'tickets:read']),
  validate(TicketIdParamSchema, 'params'),
  (req, res) => ticketController.getById(req, res)
);

/** PATCH /api/v1/helpdesk/tickets/:id/status — Update ticket status */
router.patch(
  '/:id/status',
  requireAnyPermission(['helpdesk:tickets:update', 'helpdesk:tickets:create', 'tickets:manage', 'tickets:create']),
  validate(TicketIdParamSchema, 'params'),
  validate(UpdateTicketStatusInputSchema),
  (req, res) => ticketController.updateStatus(req, res)
);

/** PATCH /api/v1/helpdesk/tickets/:id/assign — Assign technician to a ticket */
router.patch(
  '/:id/assign',
  requireAnyPermission(['helpdesk:tickets:update', 'helpdesk:tickets:manage', 'tickets:manage']),
  validate(TicketIdParamSchema, 'params'),
  validate(AssignTicketInputSchema),
  (req, res) => ticketController.assign(req, res)
);

/** GET /api/v1/helpdesk/tickets/:id/timeline — Get ticket event timeline */
router.get(
  '/:id/timeline',
  requireAnyPermission(['helpdesk:tickets:read', 'tickets:read']),
  validate(TicketIdParamSchema, 'params'),
  (req, res) => ticketController.getTimeline(req, res)
);

/** GET /api/v1/helpdesk/tickets/:id/attachments — Get ticket attachments */
router.get(
  '/:id/attachments',
  requireAnyPermission(['helpdesk:tickets:read', 'tickets:read']),
  validate(TicketIdParamSchema, 'params'),
  (req, res) => ticketController.getAttachments(req, res)
);

/** POST /api/v1/helpdesk/tickets/:id/attachments — Upload attachment */
router.post(
  '/:id/attachments',
  requireAnyPermission(['helpdesk:tickets:create', 'helpdesk:tickets:update', 'tickets:create', 'tickets:manage']),
  validate(TicketIdParamSchema, 'params'),
  upload.single('file'),
  (req, res) => ticketController.uploadAttachment(req, res)
);

/** GET /api/v1/helpdesk/tickets/:id/responses — Get ticket responses */
router.get(
  '/:id/responses',
  requireAnyPermission(['helpdesk:tickets:read', 'tickets:read']),
  validate(TicketIdParamSchema, 'params'),
  (req, res) => ticketController.getResponses(req, res)
);

/** POST /api/v1/helpdesk/tickets/:id/responses — Add response to ticket */
router.post(
  '/:id/responses',
  requireAnyPermission(['helpdesk:tickets:create', 'helpdesk:tickets:update', 'tickets:create', 'tickets:manage']),
  validate(TicketIdParamSchema, 'params'),
  upload.array('files', 5),
  validate(CreateTicketResponseDTO),
  (req, res) => ticketController.createResponse(req, res)
);

export default router;
