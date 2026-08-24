import { Router } from 'express';
import { rmmController } from '@modules/rmm/controllers/RmmController';
import { agentGatewayController } from '@modules/rmm/controllers/AgentGatewayController';
import { authMiddleware } from '@shared/middleware/authMiddleware';

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

// ── Remote Agent Gateway Endpoints ────────────────────────────────────────────

/** GET /api/rmm/agent/connected — List all online remote agents */
router.get('/agent/connected', (req, res) => agentGatewayController.getConnectedAgents(req, res));

/** GET /api/rmm/agent/:equipmentId/status — Check if a specific agent is connected */
router.get('/agent/:equipmentId/status', (req, res) => agentGatewayController.getAgentStatus(req, res));

/** POST /api/rmm/agent/:equipmentId/exec — Execute an arbitrary command on remote agent */
router.post('/agent/:equipmentId/exec', (req, res) => agentGatewayController.execCommand(req, res));

/** POST /api/rmm/agent/:equipmentId/diagnostics — Full system diagnostics on remote endpoint */
router.post('/agent/:equipmentId/diagnostics', (req, res) => agentGatewayController.getDiagnostics(req, res));

/** POST /api/rmm/agent/:equipmentId/event-logs — Query Windows Event Logs on remote endpoint */
router.post('/agent/:equipmentId/event-logs', (req, res) => agentGatewayController.getEventLogs(req, res));

/** POST /api/rmm/agent/:equipmentId/security-audit — Security posture audit on remote endpoint */
router.post('/agent/:equipmentId/security-audit', (req, res) => agentGatewayController.getSecurityAudit(req, res));

export default router;
