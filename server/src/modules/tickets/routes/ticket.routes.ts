import { Router } from 'express';
import { ticketController } from '@modules/tickets/controllers/TicketController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { validate } from '@shared/middleware/validationMiddleware';
import {
  CreateTicketInputSchema,
  UpdateTicketStatusInputSchema,
  TicketQuerySchema,
  AssignTicketInputSchema,
  TicketIdParamSchema,
} from '@shared/contracts';
import { CreateTicketResponseDTO } from '@shared/dtos/ticket.dto';
import { upload } from '@shared/middleware/uploadMiddleware';
import { rbacMiddleware } from '@shared/middleware/rbacMiddleware';
import { UserRole } from '@shared/types';

const router = Router();

// All ticket routes require authentication
router.use(authMiddleware);

/** GET /api/v1/tickets — List tickets (filtered by role) */
router.get('/', validate(TicketQuerySchema, 'query'), (req, res) => ticketController.getAll(req, res));

/** GET /api/v1/tickets/summary — Get ticket count by status */
router.get('/summary', (req, res) => ticketController.getStatusSummary(req, res));

/** POST /api/v1/tickets — Create a new ticket */
router.post('/', validate(CreateTicketInputSchema), (req, res) => ticketController.create(req, res));

/** GET /api/v1/tickets/:id — Get ticket details */
router.get('/:id', validate(TicketIdParamSchema, 'params'), (req, res) => ticketController.getById(req, res));

/** PATCH /api/v1/tickets/:id/status — Update ticket status */
router.patch(
  '/:id/status',
  validate(TicketIdParamSchema, 'params'),
  validate(UpdateTicketStatusInputSchema),
  (req, res) => ticketController.updateStatus(req, res)
);

/** PATCH /api/v1/tickets/:id/assign — Assign technician to a ticket */
router.patch(
  '/:id/assign',
  rbacMiddleware(UserRole.ADMIN, UserRole.TECHNICIAN),
  validate(TicketIdParamSchema, 'params'),
  validate(AssignTicketInputSchema),
  (req, res) => ticketController.assign(req, res)
);

/** GET /api/v1/tickets/:id/timeline — Get ticket event timeline */
router.get('/:id/timeline', validate(TicketIdParamSchema, 'params'), (req, res) => ticketController.getTimeline(req, res));

/** GET /api/v1/tickets/:id/attachments — Get ticket attachments */
router.get('/:id/attachments', validate(TicketIdParamSchema, 'params'), (req, res) => ticketController.getAttachments(req, res));

/** POST /api/v1/tickets/:id/attachments — Upload attachment */
router.post('/:id/attachments', validate(TicketIdParamSchema, 'params'), upload.single('file'), (req, res) => ticketController.uploadAttachment(req, res));

/** GET /api/v1/tickets/:id/responses — Get ticket responses */
router.get('/:id/responses', validate(TicketIdParamSchema, 'params'), (req, res) => ticketController.getResponses(req, res));

/** POST /api/v1/tickets/:id/responses — Add response to ticket */
router.post(
  '/:id/responses',
  validate(TicketIdParamSchema, 'params'),
  upload.array('files', 5),
  validate(CreateTicketResponseDTO),
  (req, res) => ticketController.createResponse(req, res)
);

export default router;
