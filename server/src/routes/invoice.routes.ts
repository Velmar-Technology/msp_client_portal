import { Router } from 'express';
import { invoiceController } from '../controllers/InvoiceController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/invoices — List client invoices */
router.get('/', (req, res) => invoiceController.getAll(req, res));

/** GET /api/v1/invoices/:id — Get invoice details */
router.get('/:id', (req, res) => invoiceController.getById(req, res));

export default router;
