import { Router } from 'express';
import { rmmController } from '../controllers/RmmController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

/** GET /api/rmm/overview — Get global/tenant RMM monitoring telemetry and SLA KPI stats */
router.get('/overview', (req, res) => rmmController.getOverview(req, res));

/** GET /api/rmm/devices/:equipmentId/patches — List patch inventory for device */
router.get('/devices/:equipmentId/patches', (req, res) => rmmController.getEquipmentPatches(req, res));

/** POST /api/rmm/devices/:equipmentId/patches/scan — Trigger Zabbix patch scan for device */
router.post('/devices/:equipmentId/patches/scan', (req, res) => rmmController.triggerScan(req, res));

/** POST /api/rmm/devices/:equipmentId/patches/apply — Execute patch installation job */
router.post('/devices/:equipmentId/patches/apply', (req, res) => rmmController.applyPatches(req, res));

export default router;
