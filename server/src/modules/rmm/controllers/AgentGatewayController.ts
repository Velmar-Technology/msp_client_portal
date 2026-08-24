import { Request, Response } from 'express';
import { agentGateway } from '@modules/rmm/services/AgentGateway';

/**
 * REST controller exposing the Agent Gateway to technicians and the MCP server.
 * All endpoints require authentication and ADMIN or TECHNICIAN role.
 */
export class AgentGatewayController {
  /**
   * GET /api/v1/rmm/agent/:equipmentId/status
   * Returns whether the remote Rust agent is connected and its metadata.
   */
  async getAgentStatus(req: Request, res: Response): Promise<void> {
    const equipmentId = String(req.params.equipmentId);
    const status = agentGateway.getAgentStatus(equipmentId);
    res.json({ success: true, data: status });
  }

  /**
   * GET /api/v1/rmm/agent/connected
   * Returns a list of all currently connected agents.
   */
  async getConnectedAgents(_req: Request, res: Response): Promise<void> {
    const agents = agentGateway.getConnectedAgents();
    res.json({ success: true, data: agents, count: agents.length });
  }

  /**
   * POST /api/v1/rmm/agent/:equipmentId/exec
   * Dispatches an arbitrary command to a remote agent and returns the response.
   *
   * Body: { command: string, payload?: any, timeoutMs?: number }
   */
  async execCommand(req: Request, res: Response): Promise<void> {
    const equipmentId = String(req.params.equipmentId);
    const { command, payload, timeoutMs } = req.body;

    if (!command || typeof command !== 'string') {
      res.status(400).json({ success: false, error: 'Missing or invalid "command" in request body.' });
      return;
    }

    const result = await agentGateway.sendCommand(equipmentId, command, payload, timeoutMs);
    res.json({ success: true, data: result });
  }

  /**
   * POST /api/v1/rmm/agent/:equipmentId/diagnostics
   * Shorthand endpoint to run a full DIAGNOSE_PC on the remote agent.
   */
  async getDiagnostics(req: Request, res: Response): Promise<void> {
    const equipmentId = String(req.params.equipmentId);
    const result = await agentGateway.sendCommand(equipmentId, 'DIAGNOSE_PC');
    res.json({ success: true, data: result });
  }

  /**
   * POST /api/v1/rmm/agent/:equipmentId/event-logs
   * Queries Windows Event Logs on the remote endpoint.
   *
   * Body: { log_name?: string, level?: string, max_events?: number }
   */
  async getEventLogs(req: Request, res: Response): Promise<void> {
    const equipmentId = String(req.params.equipmentId);
    const { log_name, level, max_events } = req.body;
    const result = await agentGateway.sendCommand(equipmentId, 'GET_EVENT_LOGS', {
      log_name: log_name || 'Application',
      level: level || 'Error',
      max_events: max_events || 5,
    });
    res.json({ success: true, data: result });
  }

  /**
   * POST /api/v1/rmm/agent/:equipmentId/security-audit
   * Runs a security posture audit (BitLocker, Defender, Firewall) on the remote endpoint.
   */
  async getSecurityAudit(req: Request, res: Response): Promise<void> {
    const equipmentId = String(req.params.equipmentId);
    const result = await agentGateway.sendCommand(equipmentId, 'SECURITY_AUDIT');
    res.json({ success: true, data: result });
  }
}

export const agentGatewayController = new AgentGatewayController();
