import { Router } from 'express';
import { maintenanceController } from '../controllers/MaintenanceController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/maintenance — Get maintenance list / calendar items */
router.get('/', (req, res, next) => maintenanceController.getAll(req, res, next));

/** POST /api/v1/maintenance — Schedule new device maintenance */
router.post('/', (req, res, next) => maintenanceController.create(req, res, next));

/** GET /api/v1/maintenance/:id — Get maintenance details */
router.get('/:id', (req, res, next) => maintenanceController.getById(req, res, next));

/** PUT /api/v1/maintenance/:id — Update maintenance schedule or status */
router.put('/:id', (req, res, next) => maintenanceController.update(req, res, next));

/** DELETE /api/v1/maintenance/:id — Delete maintenance schedule */
router.delete('/:id', (req, res, next) => maintenanceController.delete(req, res, next));

export default router;
