import { Router } from 'express';
import { ticketController } from '@modules/tickets/controllers/TicketController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { validate } from '@shared/middleware/validationMiddleware';
import { CreateTicketDTO, UpdateTicketStatusDTO, TicketQueryDTO, AssignTicketDTO, CreateTicketResponseDTO } from '@shared/dtos/ticket.dto';
import { upload } from '@shared/middleware/uploadMiddleware';
import { rbacMiddleware } from '@shared/middleware/rbacMiddleware';
import { UserRole } from '@shared/types';

const router = Router();

// All ticket routes require authentication
router.use(authMiddleware);

/** GET /api/v1/tickets — List tickets (filtered by role) */
router.get('/', validate(TicketQueryDTO, 'query'), (req, res) => ticketController.getAll(req, res));

/** GET /api/v1/tickets/summary — Get ticket count by status */
router.get('/summary', (req, res) => ticketController.getStatusSummary(req, res));

/** POST /api/v1/tickets — Create a new ticket */
router.post('/', validate(CreateTicketDTO), (req, res) => ticketController.create(req, res));

/** GET /api/v1/tickets/:id — Get ticket details */
router.get('/:id', (req, res) => ticketController.getById(req, res));

/** PATCH /api/v1/tickets/:id/status — Update ticket status */
router.patch('/:id/status', validate(UpdateTicketStatusDTO), (req, res) => ticketController.updateStatus(req, res));

/** PATCH /api/v1/tickets/:id/assign — Assign technician to a ticket */
router.patch('/:id/assign', rbacMiddleware(UserRole.ADMIN, UserRole.TECHNICIAN), validate(AssignTicketDTO), (req, res) => ticketController.assign(req, res));

/** GET /api/v1/tickets/:id/timeline — Get ticket event timeline */
router.get('/:id/timeline', (req, res) => ticketController.getTimeline(req, res));

/** GET /api/v1/tickets/:id/attachments — Get ticket attachments */
router.get('/:id/attachments', (req, res) => ticketController.getAttachments(req, res));

/** POST /api/v1/tickets/:id/attachments — Upload attachment */
router.post('/:id/attachments', upload.single('file'), (req, res) => ticketController.uploadAttachment(req, res));

/** GET /api/v1/tickets/:id/responses — Get ticket responses */
router.get('/:id/responses', (req, res) => ticketController.getResponses(req, res));

/** POST /api/v1/tickets/:id/responses — Add response to ticket */
router.post('/:id/responses', upload.array('files', 5), validate(CreateTicketResponseDTO), (req, res) => ticketController.createResponse(req, res));

export default router;
