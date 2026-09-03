import { Router } from 'express';
import { invoiceController } from '@modules/billing/controllers/InvoiceController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { rbacMiddleware } from '@shared/middleware/rbacMiddleware';
import { validate } from '@shared/middleware/validationMiddleware';
import { UserRole } from '@shared/types';
import { CapturePaypalOrderDTO, CancelInvoiceDTO, InvoiceIdParamDTO } from '@shared/dtos/billing.dto';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/invoices — List client invoices */
router.get('/', (req, res) => invoiceController.getAll(req, res));

/** GET /api/v1/invoices/financial-stats — Get financial dashboard stats */
router.get('/financial-stats', (req, res) => invoiceController.getFinancialStats(req, res));

/** GET /api/v1/invoices/:id — Get invoice details */
router.get('/:id', validate(InvoiceIdParamDTO, 'params'), (req, res) => invoiceController.getById(req, res));

/** POST /api/v1/invoices/:id/create-paypal-order — Create PayPal order */
router.post('/:id/create-paypal-order', validate(InvoiceIdParamDTO, 'params'), (req, res) => invoiceController.createPaypalOrder(req, res));

/** POST /api/v1/invoices/:id/capture-paypal-order — Capture PayPal order */
router.post('/:id/capture-paypal-order', validate(InvoiceIdParamDTO, 'params'), validate(CapturePaypalOrderDTO, 'body'), (req, res) => invoiceController.capturePaypalOrder(req, res));

/** PATCH /api/v1/invoices/:id/mark-paid — Mark invoice as paid (Admin only) */
router.patch('/:id/mark-paid', rbacMiddleware(UserRole.ADMIN), validate(InvoiceIdParamDTO, 'params'), (req, res) => invoiceController.markAsPaid(req, res));

/** PATCH /api/v1/invoices/:id/cancel — Cancel a pending invoice */
router.patch('/:id/cancel', validate(InvoiceIdParamDTO, 'params'), validate(CancelInvoiceDTO, 'body'), (req, res) => invoiceController.cancel(req, res));

/** GET /api/v1/invoices/:id/download — Download invoice PDF */
router.get('/:id/download', validate(InvoiceIdParamDTO, 'params'), (req, res) => invoiceController.download(req, res));

export default router;

