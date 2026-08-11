import { Router } from 'express';
import { alertController } from '../controllers/AlertController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rbacMiddleware } from '../middleware/rbacMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { ProcessRmmAlertDTO } from '../dtos/alert.dto';
import { UserRole } from '../types';

const router = Router();

// All alert routes require authentication
router.use(authMiddleware);

/** POST /api/v1/alerts/rmm — Ingest an RMM alert for flapping/self-healing processing */
router.post('/rmm', rbacMiddleware(UserRole.ADMIN), validate(ProcessRmmAlertDTO), (req, res) => alertController.processRmmAlert(req, res));

export default router;
