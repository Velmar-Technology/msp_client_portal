import { WebSocketServer, WebSocket, RawData } from 'ws';
import { IncomingMessage } from 'http';
import crypto from 'crypto';
import { logger } from '@shared/utils/logger';
import { metricsService } from '@shared/metrics/metricsService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingRequest {
  resolve: (data: any) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

interface ConnectedAgent {
  equipmentId: string;
  ws: WebSocket;
  connectedAt: Date;
  lastHeartbeat: Date;
  hostname?: string;
  agentVersion?: string;
  os?: string;
}

export interface AgentCommandResult {
  equipmentId: string;
  command: string;
  data: any;
  durationMs: number;
}

// ── AgentGateway ──────────────────────────────────────────────────────────────

/**
 * Central WebSocket relay gateway that manages persistent connections from
 * remote Rust endpoint agents. Technicians and the MCP server dispatch
 * commands via `sendCommand()`, which are proxied to the target agent over
 * its active WebSocket and correlated back by `correlation_id`.
 */
export class AgentGateway {
  private activeSockets = new Map<string, ConnectedAgent>();
  private pendingRequests = new Map<string, PendingRequest>();
  private static readonly DEFAULT_TIMEOUT_MS = 15_000;

  /**
   * Initializes the WebSocket server and binds connection lifecycle handlers.
   * Should be called once during server startup with the shared WSS instance.
   */
  init(wss: WebSocketServer): void {
    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    logger.info('[AgentGateway] Initialized and listening for agent connections.');
  }

  /**
   * Processes a new inbound WebSocket connection from a Rust endpoint agent.
   * Validates agent_id and token from query parameters.
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const equipmentId = url.searchParams.get('agent_id');
    const token = url.searchParams.get('token');

    if (!equipmentId) {
      logger.warn('[AgentGateway] Connection rejected: missing agent_id.');
      ws.close(4001, 'Missing agent_id');
      return;
    }

    // TODO: Validate token against equipment record's stored agent secret
    if (!token) {
      logger.warn(`[AgentGateway] Connection rejected for ${equipmentId}: missing token.`);
      ws.close(4001, 'Missing token');
      return;
    }

    // Close any existing connection for this equipment (supersede)
    const existing = this.activeSockets.get(equipmentId);
    if (existing) {
      logger.info(`[AgentGateway] Superseding existing connection for ${equipmentId}.`);
      existing.ws.close(4000, 'Superseded by new connection');
    }

    const agent: ConnectedAgent = {
      equipmentId,
      ws,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    };

    this.activeSockets.set(equipmentId, agent);
    metricsService.incWsConnection('agent-ws');
    logger.info(`[AgentGateway] Agent connected: ${equipmentId}. Total active: ${this.activeSockets.size}`);

    // ── Message Handler ──
    ws.on('message', (raw: RawData) => {
      try {
        const data = JSON.parse(raw.toString());

        // Handle AGENT_HELLO registration payload
        if (data.command === 'AGENT_HELLO' && data.payload) {
          agent.hostname = data.payload.hostname;
          agent.agentVersion = data.payload.agent_version;
          agent.os = data.payload.os;
          agent.lastHeartbeat = new Date();
          logger.info(
            `[AgentGateway] Agent ${equipmentId} registered: ${agent.hostname} (v${agent.agentVersion}, ${agent.os})`
          );
          return;
        }

        // Handle RESPONSE correlation
        if (data.correlation_id && this.pendingRequests.has(data.correlation_id)) {
          const pending = this.pendingRequests.get(data.correlation_id)!;
          clearTimeout(pending.timer);
          this.pendingRequests.delete(data.correlation_id);
          pending.resolve(data.payload);
          return;
        }
      } catch (e) {
        logger.warn(`[AgentGateway] Failed to parse message from ${equipmentId}:`, e);
      }
    });

    // ── Disconnect Handler ──
    ws.on('close', (code: number, reason: Buffer) => {
      this.activeSockets.delete(equipmentId);
      metricsService.decWsConnection('agent-ws');
      logger.info(
        `[AgentGateway] Agent disconnected: ${equipmentId} (code=${code}, reason=${reason.toString()}). Active: ${this.activeSockets.size}`
      );

      // Timeout will handle cleanup of pending requests for this agent
    });

    ws.on('error', (err: Error) => {
      logger.error(`[AgentGateway] WebSocket error for ${equipmentId}:`, err);
    });

    // ── Keepalive Pings ──
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
        agent.lastHeartbeat = new Date();
      } else {
        clearInterval(pingInterval);
      }
    }, 30_000);

    ws.on('close', () => clearInterval(pingInterval));
  }

  /**
   * Dispatches a command to a remote agent and waits for the correlated response.
   *
   * @param equipmentId - Target equipment UUID
   * @param command     - Command name (DIAGNOSE_PC, GET_EVENT_LOGS, etc.)
   * @param payload     - Optional command parameters
   * @param timeoutMs   - Maximum wait time before rejecting (default: 15s)
   * @returns           - The agent's response payload
   * @throws            - If the agent is offline or the command times out
   */
  async sendCommand(
    equipmentId: string,
    command: string,
    payload?: any,
    timeoutMs: number = AgentGateway.DEFAULT_TIMEOUT_MS
  ): Promise<AgentCommandResult> {
    const agent = this.activeSockets.get(equipmentId);
    if (!agent || agent.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Agent for equipment '${equipmentId}' is not connected (OFFLINE).`);
    }

    const correlationId = crypto.randomUUID();
    const startTime = Date.now();

    return new Promise<AgentCommandResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(
          new Error(
            `Command '${command}' to agent '${equipmentId}' timed out after ${timeoutMs}ms.`
          )
        );
      }, timeoutMs);

      this.pendingRequests.set(correlationId, {
        resolve: (data: any) => {
          resolve({
            equipmentId,
            command,
            data,
            durationMs: Date.now() - startTime,
          });
        },
        reject,
        timer,
      });

      const envelope = JSON.stringify({
        correlation_id: correlationId,
        command,
        payload: payload || null,
      });

      agent.ws.send(envelope, (err) => {
        if (err) {
          clearTimeout(timer);
          this.pendingRequests.delete(correlationId);
          reject(new Error(`Failed to send command to agent: ${err.message}`));
        }
      });
    });
  }

  /**
   * Returns the online/offline status and metadata for a specific agent.
   */
  getAgentStatus(equipmentId: string): {
    online: boolean;
    hostname?: string;
    agentVersion?: string;
    os?: string;
    connectedAt?: string;
    lastHeartbeat?: string;
  } {
    const agent = this.activeSockets.get(equipmentId);
    if (!agent || agent.ws.readyState !== WebSocket.OPEN) {
      return { online: false };
    }
    return {
      online: true,
      hostname: agent.hostname,
      agentVersion: agent.agentVersion,
      os: agent.os,
      connectedAt: agent.connectedAt.toISOString(),
      lastHeartbeat: agent.lastHeartbeat.toISOString(),
    };
  }

  /**
   * Returns a list of all currently connected agents with metadata.
   */
  getConnectedAgents(): Array<{
    equipmentId: string;
    hostname?: string;
    agentVersion?: string;
    os?: string;
    connectedAt: string;
    lastHeartbeat: string;
  }> {
    const agents: Array<any> = [];
    for (const [eqId, agent] of this.activeSockets.entries()) {
      if (agent.ws.readyState === WebSocket.OPEN) {
        agents.push({
          equipmentId: eqId,
          hostname: agent.hostname,
          agentVersion: agent.agentVersion,
          os: agent.os,
          connectedAt: agent.connectedAt.toISOString(),
          lastHeartbeat: agent.lastHeartbeat.toISOString(),
        });
      }
    }
    return agents;
  }
}

export const agentGateway = new AgentGateway();
