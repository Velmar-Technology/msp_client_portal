import crypto from 'crypto';
import type Redis from 'ioredis';
import { RedisClientService, redisClientService } from '@shared/utils/cache/RedisClient';
import { logger } from '@shared/utils/logger';

export interface ClusterCommandEnvelope {
  correlationId: string;
  equipmentId: string;
  command: string;
  payload?: any;
  timeoutMs: number;
  sourceWorkerId: string;
  publishedAt: number;
}

export interface ClusterResponseEnvelope {
  correlationId: string;
  equipmentId?: string;
  command?: string;
  data?: any;
  durationMs?: number;
  error?: string | null;
}

export interface ClusterCommandResult {
  equipmentId: string;
  command: string;
  data: any;
  durationMs: number;
}

interface PendingClusterRequest {
  resolve: (result: ClusterCommandResult) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export type LocalCommandExecutor = (
  equipmentId: string,
  command: string,
  payload?: any,
  correlationId?: string
) => Promise<ClusterCommandResult | null>;

/**
 * Service managing cross-worker command brokering via Redis Pub/Sub.
 *
 * In a clustered or multi-worker Node.js deployment, endpoint agent WebSockets
 * are terminated across separate worker processes. When an administrative command
 * (e.g. DIAGNOSE_PC, RESTART_SERVICE) is dispatched on Worker A for a workstation
 * connected to Worker B, AgentClusterBroker routes the command over Redis Pub/Sub
 * channels (`agent:cmd:<equipmentId>`) and awaits correlated responses (`agent:res:<correlationId>`).
 */
export class AgentClusterBroker {
  private readonly workerId: string;
  private subClient: Redis | null = null;
  private pendingRequests = new Map<string, PendingClusterRequest>();
  private localExecutor: LocalCommandExecutor | null = null;
  private isStarted = false;

  private static readonly CMD_CHANNEL_PATTERN = 'agent:cmd:*';
  private static readonly RES_CHANNEL_PATTERN = 'agent:res:*';
  private static readonly CMD_PREFIX = 'agent:cmd:';
  private static readonly RES_PREFIX = 'agent:res:';
  private static readonly ONLINE_SET_KEY = 'agent:cluster:online';

  /**
   * Initializes AgentClusterBroker with Redis client service and unique worker ID.
   *
   * @param redisService - Shared Redis client management service
   * @param workerId - Optional explicit worker identifier for logging and loopback prevention
   */
  constructor(
    private readonly redisService: RedisClientService = redisClientService,
    workerId?: string
  ) {
    this.workerId = workerId || process.env.WORKER_ID || `worker-${crypto.randomUUID()}`;
  }

  /**
   * Returns this worker's unique cluster identifier.
   */
  getWorkerId(): string {
    return this.workerId;
  }

  /**
   * Starts the cluster broker: creates a dedicated Redis subscriber connection,
   * listens to pattern-based command and response channels, and binds lifecycle handlers.
   */
  async start(): Promise<void> {
    if (this.isStarted) return;

    const sub = this.redisService.createSubscriberClient();
    if (!sub) {
      logger.info(
        `[AgentClusterBroker] Worker ${this.workerId} running in standalone mode (Redis not enabled/ready).`
      );
      return;
    }

    this.subClient = sub;

    this.subClient.on('error', (err) => {
      logger.warn(`[AgentClusterBroker] Subscriber Redis error on ${this.workerId}:`, {
        error: err?.message || String(err),
      });
    });

    try {
      if (this.subClient.status === 'wait') {
        await this.subClient.connect();
      }

      this.subClient.on('pmessage', (_pattern: string, channel: string, message: string) => {
        this.handleMessage(channel, message);
      });

      await this.subClient.psubscribe(
        AgentClusterBroker.CMD_CHANNEL_PATTERN,
        AgentClusterBroker.RES_CHANNEL_PATTERN
      );

      this.isStarted = true;
      logger.info(
        `[AgentClusterBroker] Worker ${this.workerId} subscribed to cluster channels (${AgentClusterBroker.CMD_CHANNEL_PATTERN}, ${AgentClusterBroker.RES_CHANNEL_PATTERN}).`
      );
    } catch (err) {
      logger.warn(`[AgentClusterBroker] Failed to start Redis Pub/Sub subscription on ${this.workerId}:`, err);
    }
  }

  /**
   * Registers a callback invoked when a command arrives from a remote worker over Redis.
   * If this worker holds the target socket, the executor runs the command and returns the result.
   *
   * @param executor - Local execution delegate
   */
  registerLocalExecutor(executor: LocalCommandExecutor): void {
    this.localExecutor = executor;
  }

  /**
   * Publishes a command across the Redis cluster and waits for the correlated response.
   *
   * @param equipmentId - Target equipment UUID
   * @param command - Command name (e.g. DIAGNOSE_PC)
   * @param payload - Command parameters
   * @param timeoutMs - Maximum wait time before rejection
   * @returns Correlated command result from the remote worker holding the agent connection
   * @throws Error if Redis is offline or command times out
   */
  async publishCommand(
    equipmentId: string,
    command: string,
    payload?: any,
    timeoutMs = 15000
  ): Promise<ClusterCommandResult> {
    const pub = this.redisService.getClient();
    if (!pub) {
      throw new Error(`Agent for equipment '${equipmentId}' is not connected (OFFLINE).`);
    }

    const correlationId = crypto.randomUUID();
    const startTime = Date.now();

    return new Promise<ClusterCommandResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(
          new Error(
            `Command '${command}' to agent '${equipmentId}' timed out after ${timeoutMs}ms.`
          )
        );
      }, timeoutMs);

      this.pendingRequests.set(correlationId, {
        resolve: (result) => {
          resolve({
            ...result,
            durationMs: Date.now() - startTime,
          });
        },
        reject,
        timer,
      });

      const envelope: ClusterCommandEnvelope = {
        correlationId,
        equipmentId,
        command,
        payload: payload ?? null,
        timeoutMs,
        sourceWorkerId: this.workerId,
        publishedAt: Date.now(),
      };

      pub.publish(`${AgentClusterBroker.CMD_PREFIX}${equipmentId}`, JSON.stringify(envelope)).catch(
        (err) => {
          clearTimeout(timer);
          this.pendingRequests.delete(correlationId);
          reject(new Error(`Failed to publish cluster command: ${err.message}`));
        }
      );
    });
  }

  /**
   * Publishes an execution response back to the requesting worker via Redis.
   *
   * @param correlationId - Unique correlation ID matching the original command
   * @param envelope - Response payload including data or error
   */
  async publishResponse(
    correlationId: string,
    envelope: Omit<ClusterResponseEnvelope, 'correlationId'>
  ): Promise<void> {
    const pub = this.redisService.getClient();
    if (!pub) return;

    const payload: ClusterResponseEnvelope = {
      correlationId,
      ...envelope,
    };

    try {
      await pub.publish(`${AgentClusterBroker.RES_PREFIX}${correlationId}`, JSON.stringify(payload));
    } catch (err) {
      logger.error(`[AgentClusterBroker] Failed to publish response for ${correlationId}:`, err);
    }
  }

  /**
   * Marks an agent as connected in the cluster-wide Redis presence set.
   *
   * @param equipmentId - Equipment UUID
   */
  async registerAgentPresence(equipmentId: string): Promise<void> {
    const pub = this.redisService.getClient();
    if (!pub) return;
    try {
      await pub.sadd(AgentClusterBroker.ONLINE_SET_KEY, equipmentId);
    } catch (err) {
      logger.debug(`[AgentClusterBroker] Failed to update presence for ${equipmentId}:`, err);
    }
  }

  /**
   * Removes an agent from the cluster-wide Redis presence set.
   *
   * @param equipmentId - Equipment UUID
   */
  async unregisterAgentPresence(equipmentId: string): Promise<void> {
    const pub = this.redisService.getClient();
    if (!pub) return;
    try {
      await pub.srem(AgentClusterBroker.ONLINE_SET_KEY, equipmentId);
    } catch (err) {
      logger.debug(`[AgentClusterBroker] Failed to clear presence for ${equipmentId}:`, err);
    }
  }

  /**
   * Checks whether an agent is connected anywhere across the cluster.
   *
   * @param equipmentId - Equipment UUID
   * @returns True if present in Redis online set
   */
  async isAgentPresent(equipmentId: string): Promise<boolean> {
    const pub = this.redisService.getClient();
    if (!pub) return false;
    try {
      const isMember = await pub.sismember(AgentClusterBroker.ONLINE_SET_KEY, equipmentId);
      return Boolean(isMember);
    } catch {
      return false;
    }
  }

  /**
   * Routes incoming pattern-matched Redis Pub/Sub messages to either the command executor
   * or correlated response resolver.
   *
   * @param channel - Channel on which message was published
   * @param message - Serialized JSON string payload
   */
  async handleMessage(channel: string, message: string): Promise<void> {
    try {
      if (channel.startsWith(AgentClusterBroker.CMD_PREFIX)) {
        await this.handleInboundCommand(JSON.parse(message) as ClusterCommandEnvelope);
        return;
      }

      if (channel.startsWith(AgentClusterBroker.RES_PREFIX)) {
        this.handleInboundResponse(JSON.parse(message) as ClusterResponseEnvelope);
        return;
      }
    } catch (err) {
      logger.warn(`[AgentClusterBroker] Failed to process message from channel ${channel}:`, err);
    }
  }

  /**
   * Handles an inbound command from a peer worker.
   */
  private async handleInboundCommand(envelope: ClusterCommandEnvelope): Promise<void> {
    // Ignore commands dispatched by ourselves
    if (envelope.sourceWorkerId === this.workerId) {
      return;
    }

    if (!this.localExecutor) {
      return;
    }

    try {
      const result = await this.localExecutor(
        envelope.equipmentId,
        envelope.command,
        envelope.payload,
        envelope.correlationId
      );

      // If local executor returned a result, this worker owns the active socket!
      if (result) {
        await this.publishResponse(envelope.correlationId, {
          equipmentId: envelope.equipmentId,
          command: envelope.command,
          data: result.data,
          durationMs: result.durationMs,
          error: null,
        });
      }
    } catch (err: any) {
      // Local execution failed while attempting to communicate with agent
      await this.publishResponse(envelope.correlationId, {
        equipmentId: envelope.equipmentId,
        command: envelope.command,
        data: null,
        durationMs: 0,
        error: err?.message || String(err),
      });
    }
  }

  /**
   * Handles an inbound response message from a remote worker.
   */
  private handleInboundResponse(envelope: ClusterResponseEnvelope): void {
    const pending = this.pendingRequests.get(envelope.correlationId);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pendingRequests.delete(envelope.correlationId);

    if (envelope.error) {
      pending.reject(new Error(envelope.error));
    } else {
      pending.resolve({
        equipmentId: envelope.equipmentId || '',
        command: envelope.command || '',
        data: envelope.data,
        durationMs: envelope.durationMs || 0,
      });
    }
  }

  /**
   * Shuts down the cluster broker, clears pending timeouts, and closes Redis subscriber connection.
   */
  async stop(): Promise<void> {
    for (const [correlationId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('AgentClusterBroker stopped: request cancelled.'));
      this.pendingRequests.delete(correlationId);
    }

    if (this.subClient) {
      try {
        await this.subClient.punsubscribe(
          AgentClusterBroker.CMD_CHANNEL_PATTERN,
          AgentClusterBroker.RES_CHANNEL_PATTERN
        );
        await this.subClient.quit();
      } catch {
        this.subClient.disconnect();
      } finally {
        this.subClient = null;
        this.isStarted = false;
      }
    }
  }
}

export const agentClusterBroker = new AgentClusterBroker();
