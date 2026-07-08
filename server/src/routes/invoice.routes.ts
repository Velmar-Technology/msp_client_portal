import { Router } from 'express';
import { invoiceController } from '../controllers/InvoiceController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/invoices — List client invoices */
router.get('/', (req, res) => invoiceController.getAll(req, res));

/** GET /api/v1/invoices/financial-stats — Get financial dashboard stats */
router.get('/financial-stats', (req, res) => invoiceController.getFinancialStats(req, res));

/** GET /api/v1/invoices/:id — Get invoice details */
router.get('/:id', (req, res) => invoiceController.getById(req, res));

/** POST /api/v1/invoices/:id/create-paypal-order — Create PayPal order */
router.post('/:id/create-paypal-order', (req, res) => invoiceController.createPaypalOrder(req, res));

/** POST /api/v1/invoices/:id/capture-paypal-order — Capture PayPal order */
router.post('/:id/capture-paypal-order', (req, res) => invoiceController.capturePaypalOrder(req, res));

/** GET /api/v1/invoices/:id/download — Download invoice PDF */
router.get('/:id/download', (req, res) => invoiceController.download(req, res));

export default router;

