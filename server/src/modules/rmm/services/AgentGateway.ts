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
  serialNumber?: string;
  manufacturer?: string;
  systemModel?: string;
  agentVersion?: string;
  os?: string;
  token?: string;
  /** Portal slot id this agent has been bound to (set after BIND). */
  slotId?: string;
  /** Whether the connection is secured via TLS/HTTPS/WSS. */
  isSecure?: boolean;
  /** Protocol scheme used ('wss' or 'ws'). */
  transport?: 'wss' | 'ws';
}

/** Identity/registration payload forwarded by the Rust endpoint agent on connect. */
export interface AgentHelloPayload {
  agent_id?: string;
  agent_version?: string;
  hostname?: string;
  serial_number?: string;
  manufacturer?: string;
  system_model?: string;
  os?: string;
  timestamp?: string;
  /** Agent-issued 6-digit pairing code (present only while the device is unbound). */
  pairing_code?: string;
  /** RFC3339 expiry of the pairing code (present only while unbound). */
  pairing_code_expires_at?: string;
  /** "BOUND" when the device has been linked to a subscription slot. */
  binding_state?: string;
}

/** Ephemeral entry for an agent-issued pairing code awaiting slot linkage. */
export interface PairingEntry {
  agentId: string;
  hello: AgentHelloPayload;
  expiresAt: Date;
}

/** Callback signature invoked once per registered agent connection. */
export type AgentHelloHandler = (
  equipmentId: string,
  hello: AgentHelloPayload,
  token: string | null
) => void | Promise<void>;

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
  private pairingRegistry = new Map<string, PairingEntry>();
  private static readonly DEFAULT_TIMEOUT_MS = 15_000;
  private static readonly PAIRING_CODE_REGEX = /^\d{6}$/;
  private onAgentHelloHandler: AgentHelloHandler | null = null;

  /**
   * Registers a listener that is invoked (fire-and-forget) whenever an agent
   * completes its registration handshake. Used by the equipment module to
   * reconcile agent-discovered identity against the stored device record.
   */
  /**
   * Registers a listener that is invoked (fire-and-forget) whenever an agent
   * completes its registration handshake. Used by the equipment module to
   * reconcile agent-discovered identity against the stored device record.
   *
   * @param handler - Callback function receiving equipmentId, hello payload, and token
   */
  onAgentHello(handler: AgentHelloHandler): void {
    this.onAgentHelloHandler = handler;
  }

  /**
   * Invokes the registered hello handler without ever breaking the WS loop.
   *
   * @param equipmentId - Unique equipment identifier
   * @param hello - AgentHelloPayload metadata
   * @param token - Optional auth token
   */
  private async invokeAgentHelloHandler(
    equipmentId: string,
    hello: AgentHelloPayload,
    token: string | null
  ): Promise<void> {
    if (!this.onAgentHelloHandler) return;
    try {
      await this.onAgentHelloHandler(equipmentId, hello, token);
    } catch (err) {
      logger.error(`[AgentGateway] onAgentHello handler failed for ${equipmentId}:`, err);
    }
  }

  /**
   * Initializes the WebSocket server and binds connection lifecycle handlers.
   * Should be called once during server startup with the shared WSS instance.
   *
   * @param wss - WebSocketServer instance
   */
  init(wss: WebSocketServer): void {
    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    // Garbage-collect expired agent-issued pairing codes.
    const sweep = setInterval(() => this.sweepExpiredPairings(), 60_000);
    sweep.unref?.();

    logger.info('[AgentGateway] Initialized and listening for agent connections.');
  }

  /**
   * Processes a new inbound WebSocket connection from a Rust endpoint agent.
   * Validates agent_id and token from query parameters.
   *
   * @param ws - Inbound WebSocket
   * @param req - Incoming HTTP upgrade message
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const isEncrypted = Boolean((req.socket as any)?.encrypted);
    const forwardedProto = req.headers['x-forwarded-proto'];
    const isForwardedSecure = typeof forwardedProto === 'string'
      ? forwardedProto.includes('https') || forwardedProto.includes('wss')
      : false;
    const isSecure = isEncrypted || isForwardedSecure;
    const protocol = isSecure ? 'https' : 'http';
    const transport: 'wss' | 'ws' = isSecure ? 'wss' : 'ws';

    const url = new URL(req.url || '', `${protocol}://${req.headers.host || 'localhost'}`);
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
      token,
      isSecure,
      transport,
    };

    this.activeSockets.set(equipmentId, agent);
    metricsService.incWsConnection('agent-ws');
    logger.info(
      `[AgentGateway] Agent connected over ${transport.toUpperCase()}: ${equipmentId}. Total active: ${this.activeSockets.size}`
    );

    // ── Message Handler ──
    ws.on('message', (raw: RawData) => {
      try {
        const data = JSON.parse(raw.toString());

        // Handle AGENT_HELLO registration payload
        if (data.command === 'AGENT_HELLO' && data.payload) {
          agent.hostname = data.payload.hostname;
          agent.serialNumber = data.payload.serial_number;
          agent.manufacturer = data.payload.manufacturer;
          agent.systemModel = data.payload.system_model;
          agent.agentVersion = data.payload.agent_version;
          agent.os = data.payload.os;
          agent.lastHeartbeat = new Date();
          logger.info(
            `[AgentGateway] Agent ${equipmentId} registered: ${agent.hostname} (v${agent.agentVersion}, ${agent.os})`
          );
          this.registerPairing(equipmentId, data.payload);
          this.invokeAgentHelloHandler(equipmentId, data.payload, agent.token ?? null);
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
      this.purgePairingForAgent(equipmentId);
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
   *
   * @param equipmentId - Equipment UUID
   * @returns Agent status metadata
   */
  getAgentStatus(equipmentId: string): {
    online: boolean;
    hostname?: string;
    serialNumber?: string;
    manufacturer?: string;
    systemModel?: string;
    agentVersion?: string;
    os?: string;
    slotId?: string;
    connectedAt?: string;
    lastHeartbeat?: string;
    isSecure?: boolean;
    transport?: 'wss' | 'ws';
  } {
    const agent = this.activeSockets.get(equipmentId);
    if (!agent || agent.ws.readyState !== WebSocket.OPEN) {
      return { online: false };
    }
    return {
      online: true,
      hostname: agent.hostname,
      serialNumber: agent.serialNumber,
      manufacturer: agent.manufacturer,
      systemModel: agent.systemModel,
      agentVersion: agent.agentVersion,
      os: agent.os,
      slotId: agent.slotId,
      connectedAt: agent.connectedAt.toISOString(),
      lastHeartbeat: agent.lastHeartbeat.toISOString(),
      isSecure: agent.isSecure ?? false,
      transport: agent.transport ?? 'ws',
    };
  }

  /**
   * Returns a list of all currently connected agents with metadata.
   *
   * @returns Array of connected agent records
   */
  getConnectedAgents(): Array<{
    equipmentId: string;
    hostname?: string;
    serialNumber?: string;
    manufacturer?: string;
    systemModel?: string;
    agentVersion?: string;
    os?: string;
    slotId?: string;
    connectedAt: string;
    lastHeartbeat: string;
    isSecure: boolean;
    transport: 'wss' | 'ws';
  }> {
    const agents: Array<any> = [];
    for (const [eqId, agent] of this.activeSockets.entries()) {
      if (agent.ws.readyState === WebSocket.OPEN) {
        agents.push({
          equipmentId: eqId,
          hostname: agent.hostname,
          serialNumber: agent.serialNumber,
          manufacturer: agent.manufacturer,
          systemModel: agent.systemModel,
          agentVersion: agent.agentVersion,
          os: agent.os,
          slotId: agent.slotId,
          connectedAt: agent.connectedAt.toISOString(),
          lastHeartbeat: agent.lastHeartbeat.toISOString(),
          isSecure: agent.isSecure ?? false,
          transport: agent.transport ?? 'ws',
        });
      }
    }
    return agents;
  }

  // ── Agent-Issued Pairing Codes ───────────────────────────────────────────────

  /**
   * Registers or replaces the pairing code announced by an unbound agent.
   * Codes must be 6 digits and carry a future RFC3339 expiry; otherwise the
   * announcement is ignored. A new code supersedes any previous one for the
   * same agent.
   *
   * @param agentId - Agent instance UUID
   * @param hello - AgentHelloPayload containing pairing code and expiration
   */
  registerPairing(agentId: string, hello: AgentHelloPayload): void {
    const code = hello.pairing_code;
    const expiry = hello.pairing_code_expires_at;
    if (!code || !AgentGateway.PAIRING_CODE_REGEX.test(code) || !expiry) {
      return;
    }
    const expiresAt = new Date(expiry);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      logger.warn(`[AgentGateway] Ignoring expired/invalid pairing code from ${agentId}.`);
      return;
    }
    this.purgePairingForAgent(agentId);
    this.pairingRegistry.set(code, { agentId, hello, expiresAt });
    logger.info(
      `[AgentGateway] Agent ${agentId} issued pairing code ${code} (expires ${expiresAt.toISOString()}).`
    );
  }

  /**
   * Resolves an agent-issued pairing code to its connected agent and identity.
   * Returns null when the code is unknown, expired, or its agent is offline.
   *
   * @param code - 6-digit pairing code
   * @returns PairingEntry or null
   */
  getPairingByCode(code: string): PairingEntry | null {
    const entry = this.pairingRegistry.get(code);
    if (!entry) return null;
    if (entry.expiresAt.getTime() <= Date.now()) {
      this.pairingRegistry.delete(code);
      return null;
    }
    const agent = this.activeSockets.get(entry.agentId);
    if (!agent || agent.ws.readyState !== WebSocket.OPEN) {
      this.pairingRegistry.delete(code);
      return null;
    }
    return entry;
  }

  /**
   * Confirms a slot binding with the agent: purges its pairing code, marks the
   * connection as bound, and pushes a BIND command carrying the slot id and the
   * freshly provisioned per-device secret. Returns false when the agent is
   * offline (caller should abort the binding).
   *
   * @param agentId - Agent instance UUID
   * @param slotId - Equipment slot UUID
   * @param agentToken - Device authentication secret
   * @returns True if BIND command successfully sent to agent
   */
  bindAgent(agentId: string, slotId: string, agentToken: string): boolean {
    this.purgePairingForAgent(agentId);
    const agent = this.activeSockets.get(agentId);
    if (!agent || agent.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    agent.slotId = slotId;
    const envelope = JSON.stringify({
      correlation_id: crypto.randomUUID(),
      command: 'BIND',
      payload: {
        slot_id: slotId,
        agent_token: agentToken,
        agent_instance_id: agentId,
      },
    });
    try {
      agent.ws.send(envelope, (err) => {
        if (err) logger.error(`[AgentGateway] Failed to send BIND to ${agentId}:`, err);
      });
      logger.info(`[AgentGateway] Sent BIND to agent ${agentId} for slot ${slotId}.`);
      return true;
    } catch (err) {
      logger.error(`[AgentGateway] Error sending BIND to ${agentId}:`, err);
      return false;
    }
  }

  /**
   * Drops every pairing entry that belongs to the given agent.
   *
   * @param agentId - Agent instance UUID
   */
  private purgePairingForAgent(agentId: string): void {
    for (const [code, entry] of this.pairingRegistry) {
      if (entry.agentId === agentId) {
        this.pairingRegistry.delete(code);
      }
    }
  }

  /**
   * Removes pairing codes that have passed their TTL.
   */
  private sweepExpiredPairings(): void {
    const now = Date.now();
    for (const [code, entry] of this.pairingRegistry) {
      if (entry.expiresAt.getTime() <= now) {
        this.pairingRegistry.delete(code);
      }
    }
  }
}

export const agentGateway = new AgentGateway();
