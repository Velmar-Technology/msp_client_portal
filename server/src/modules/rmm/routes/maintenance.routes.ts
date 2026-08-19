import { Router } from 'express';
import { maintenanceController } from '@modules/rmm/controllers/MaintenanceController';
import { authMiddleware } from '@shared/middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/maintenance — Get maintenance list / calendar items */
router.get('/', (req, res) => maintenanceController.getAll(req, res));

/** POST /api/v1/maintenance — Schedule new device maintenance */
router.post('/', (req, res) => maintenanceController.create(req, res));

/** GET /api/v1/maintenance/:id — Get maintenance details */
router.get('/:id', (req, res) => maintenanceController.getById(req, res));

/** PUT /api/v1/maintenance/:id — Update maintenance schedule or status */
router.put('/:id', (req, res) => maintenanceController.update(req, res));

/** DELETE /api/v1/maintenance/:id — Delete maintenance schedule */
router.delete('/:id', (req, res) => maintenanceController.delete(req, res));

export default router;
