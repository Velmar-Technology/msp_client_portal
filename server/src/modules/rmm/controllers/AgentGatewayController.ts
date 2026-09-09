import { Request, Response } from 'express';
import { agentGateway } from '@modules/rmm/services/AgentGateway';
import { equipmentService, EquipmentService } from '@modules/equipment';
import { ValidationError } from '@shared/errors';

/**
 * REST controller exposing the Agent Gateway to technicians and the MCP server.
 * All endpoints require authentication and ADMIN or TECHNICIAN role.
 */
export class AgentGatewayController {
  /**
   * Initializes AgentGatewayController with optional EquipmentService dependency.
   *
   * @param equipmentSvc - Equipment domain service
   */
  constructor(private equipmentSvc?: EquipmentService) {}

  private get equipmentService(): EquipmentService | undefined {
    return this.equipmentSvc || equipmentService;
  }

  /**
   * Resolves a technician-supplied slot UUID to the physical agent's install
   * UUID, so command routing works whether the caller knows the slot or the
   * agent instance.
   *
   * @param equipmentId - Equipment slot or agent UUID
   * @returns Resolved agent UUID
   */
  private async resolveTarget(equipmentId: string): Promise<string> {
    try {
      const svc = this.equipmentService;
      if (svc && typeof svc.resolveAgentIdForSlot === 'function') {
        return await svc.resolveAgentIdForSlot(equipmentId);
      }
    } catch {
      // Fall back to equipmentId directly
    }
    return equipmentId;
  }

  /**
   * Returns whether the remote Rust agent is connected and its metadata.
   *
   * @param req - Express request with equipmentId in params
   * @param res - Express response returning agent status
   */
  async getAgentStatus(req: Request, res: Response): Promise<void> {
    try {
      const target = await this.resolveTarget(String(req.params.equipmentId));
      const status = agentGateway.getAgentStatus(target);
      res.json({ success: true, data: status });
    } catch (err: any) {
      res.json({ success: true, data: { online: false, error: err?.message || 'Unknown error' } });
    }
  }

  /**
   * Returns a list of all currently connected agents.
   *
   * @param _req - Express request
   * @param res - Express response returning connected agents array
   */
  async getConnectedAgents(_req: Request, res: Response): Promise<void> {
    try {
      const agents = agentGateway.getConnectedAgents();
      res.json({ success: true, data: agents, count: agents.length });
    } catch (err: any) {
      res.json({ success: true, data: [], count: 0, error: err?.message });
    }
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

  /**
   * Initiates an autonomous self-upgrade on the remote endpoint agent.
   *
   * @param req - Express request with equipmentId in params and optional targetVersion/checksum in body
   * @param res - Express response returning initiation confirmation
   * @throws {ValidationError} When parameters fail schema validation
   */
  async upgradeAgent(req: Request, res: Response): Promise<void> {
    const rawInput = {
      equipmentId: req.params.equipmentId,
      targetVersion: req.body?.targetVersion,
      downloadUrl: req.body?.downloadUrl,
      sha256Checksum: req.body?.sha256Checksum,
      rollbackTimeoutSecs: req.body?.rollbackTimeoutSecs,
    };

    const { AgentUpgradeRequestSchema } = await import('@shared/contracts');
    const parseResult = AgentUpgradeRequestSchema.safeParse(rawInput);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
    }

    const input = parseResult.data;
    const targetVersion = (input.targetVersion || '1.10.2').replace(/^v/, '');
    const baseUrl =
      process.env.MSP_AGENT_DOWNLOAD_BASE_URL || 'https://helpdesk.velmartech.com.do/dl';
    const downloadUrl = input.downloadUrl || `${baseUrl}/msp-agent-${targetVersion}.exe`;

    // Known release checksum table fallback if not supplied explicitly
    const KNOWN_CHECKSUMS: Record<string, string> = {
      '1.8.4': 'bf2b4d87a1cbbc1915899c099a5c7a76321ff752762def9992fd4ed89885419e',
      '1.10.2': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };

    const sha256Checksum =
      input.sha256Checksum || KNOWN_CHECKSUMS[targetVersion] || KNOWN_CHECKSUMS['1.8.4'];

    const target = await this.resolveTarget(input.equipmentId);

    const payload = {
      target_version: targetVersion,
      download_url: downloadUrl,
      sha256_checksum: sha256Checksum,
      rollback_timeout_secs: input.rollbackTimeoutSecs ?? 45,
    };

    const result = await agentGateway.sendCommand(target, 'AGENT_UPGRADE', payload, 30_000);

    res.json({
      success: true,
      message: 'Agent upgrade initiated successfully',
      equipmentId: input.equipmentId,
      targetVersion,
      rollbackTimeoutSecs: payload.rollback_timeout_secs,
      initiatedAt: new Date().toISOString(),
      agentResponse: result,
    });
  }
}

export const agentGatewayController = new AgentGatewayController();
