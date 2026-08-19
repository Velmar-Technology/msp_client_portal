import { Router } from 'express';
import { alertController } from '@modules/rmm/controllers/AlertController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { rbacMiddleware } from '@shared/middleware/rbacMiddleware';
import { validate } from '@shared/middleware/validationMiddleware';
import { ProcessRmmAlertDTO } from '@shared/dtos/alert.dto';
import { UserRole } from '@shared/types';

const router = Router();

// All alert routes require authentication
router.use(authMiddleware);

/** POST /api/v1/alerts/rmm — Ingest an RMM alert for flapping/self-healing processing */
router.post('/rmm', rbacMiddleware(UserRole.ADMIN), validate(ProcessRmmAlertDTO), (req, res) => alertController.processRmmAlert(req, res));

/** POST /api/v1/alerts/zabbix-webhook — Ingest Zabbix webhook triggers */
router.post('/zabbix-webhook', (req, res) => alertController.processZabbixWebhook(req, res));

export default router;

