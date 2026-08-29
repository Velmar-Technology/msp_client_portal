import { Request, Response } from 'express';
import { agentGateway } from '@modules/rmm/services/AgentGateway';
import { EquipmentService, equipmentService } from '@modules/equipment';
import { ValidationError } from '@shared/errors';

/**
 * REST controller exposing the Agent Gateway to technicians and the MCP server.
 * All endpoints require authentication and ADMIN or TECHNICIAN role.
 */
export class AgentGatewayController {
  /**
   * Initializes AgentGatewayController with EquipmentService dependency.
   *
   * @param equipmentSvc - Equipment domain service
   */
  constructor(private equipmentSvc: EquipmentService = equipmentService) {}

  /**
   * Resolves a technician-supplied slot UUID to the physical agent's install
   * UUID, so command routing works whether the caller knows the slot or the
   * agent instance.
   *
   * @param equipmentId - Equipment slot or agent UUID
   * @returns Resolved agent UUID
   */
  private async resolveTarget(equipmentId: string): Promise<string> {
    return this.equipmentSvc.resolveAgentIdForSlot(equipmentId);
  }

  /**
   * Returns whether the remote Rust agent is connected and its metadata.
   *
   * @param req - Express request with equipmentId in params
   * @param res - Express response returning agent status
   */
  async getAgentStatus(req: Request, res: Response): Promise<void> {
    const target = await this.resolveTarget(String(req.params.equipmentId));
    const status = agentGateway.getAgentStatus(target);
    res.json({ success: true, data: status });
  }

  /**
   * Returns a list of all currently connected agents.
   *
   * @param _req - Express request
   * @param res - Express response returning connected agents array
   */
  async getConnectedAgents(_req: Request, res: Response): Promise<void> {
    const agents = agentGateway.getConnectedAgents();
    res.json({ success: true, data: agents, count: agents.length });
  }

  /**
   * Dispatches an arbitrary command to a remote agent and returns the response.
   *
   * @param req - Express request with equipmentId in params and command, payload, timeoutMs in body
   * @param res - Express response returning command execution result
   * @throws {ValidationError} When command is missing or invalid
   */
  async execCommand(req: Request, res: Response): Promise<void> {
    const { command, payload, timeoutMs } = req.body;

    if (!command || typeof command !== 'string') {
      throw new ValidationError('Missing or invalid "command" in request body.');
    }

    const target = await this.resolveTarget(String(req.params.equipmentId));
    const result = await agentGateway.sendCommand(target, command, payload, timeoutMs);
    res.json({ success: true, data: result });
  }

  /**
   * Shorthand endpoint to run a full DIAGNOSE_PC on the remote agent.
   *
   * @param req - Express request with equipmentId in params
   * @param res - Express response returning diagnostics data
   */
  async getDiagnostics(req: Request, res: Response): Promise<void> {
    const target = await this.resolveTarget(String(req.params.equipmentId));
    const result = await agentGateway.sendCommand(target, 'DIAGNOSE_PC');
    res.json({ success: true, data: result });
  }

  /**
   * Queries Windows Event Logs on the remote endpoint.
   *
   * @param req - Express request with equipmentId in params and log filters in body
   * @param res - Express response returning event logs
   */
  async getEventLogs(req: Request, res: Response): Promise<void> {
    const { log_name, level, max_events } = req.body;
    const target = await this.resolveTarget(String(req.params.equipmentId));
    const result = await agentGateway.sendCommand(target, 'GET_EVENT_LOGS', {
      log_name: log_name || 'Application',
      level: level || 'Error',
      max_events: max_events || 5,
    });
    res.json({ success: true, data: result });
  }

  /**
   * Runs a security posture audit (BitLocker, Defender, Firewall) on the remote endpoint.
   *
   * @param req - Express request with equipmentId in params
   * @param res - Express response returning security audit results
   */
  async getSecurityAudit(req: Request, res: Response): Promise<void> {
    const target = await this.resolveTarget(String(req.params.equipmentId));
    const result = await agentGateway.sendCommand(target, 'SECURITY_AUDIT');
    res.json({ success: true, data: result });
  }
}

export const agentGatewayController = new AgentGatewayController();
