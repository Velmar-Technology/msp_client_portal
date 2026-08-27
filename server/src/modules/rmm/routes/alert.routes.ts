import { Router } from 'express';
import { alertController } from '@modules/rmm/controllers/AlertController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { rbacMiddleware } from '@shared/middleware/rbacMiddleware';
import { validate } from '@shared/middleware/validationMiddleware';
import { zabbixWebhookAuth } from '@shared/middleware/zabbixWebhookAuth';
import { ProcessRmmAlertDTO } from '@shared/dtos/alert.dto';
import { UserRole } from '@shared/types';

const router = Router();

/** POST /api/v1/alerts/rmm — Ingest an RMM alert for flapping/self-healing processing */
router.post('/rmm', authMiddleware, rbacMiddleware(UserRole.ADMIN), validate(ProcessRmmAlertDTO), (req, res) => alertController.processRmmAlert(req, res));

/** POST /api/v1/alerts/zabbix-webhook — Ingest Zabbix webhook triggers (secret-only auth, no JWT) */
router.post('/zabbix-webhook', zabbixWebhookAuth, (req, res) => alertController.processZabbixWebhook(req, res));

export default router;

