import { EventEmitter } from 'node:events';
import { logger } from '@shared/utils/logger';

/**
 * Standard typed domain events dispatched across modular monolith boundaries.
 */
export interface DomainEventsMap {
  'user:created': {
    userId: string;
    tenantId: string;
    email: string;
    role: string;
    createdAt?: Date;
  };
  'user:updated': {
    userId: string;
    tenantId: string;
    changes: Record<string, unknown>;
  };
  'user:deleted': {
    userId: string;
    tenantId: string;
  };
  'tenant:created': {
    tenantId: string;
    name: string;
    subdomain?: string;
  };
  'tenant:status_changed': {
    tenantId: string;
    status: string;
    previousStatus: string;
  };
  'auth:login': {
    userId: string;
    tenantId: string;
    ipAddress?: string;
  };
  'auth:logout': {
    userId: string;
    tenantId: string;
  };
  [customEvent: string]: unknown;
}

export type DomainEventHandler<T = unknown> = (payload: T) => void | Promise<void>;

/**
 * In-process typed Domain Event Bus for decoupled cross-module communication (ADR-018).
 * Replaces direct circular imports between modules with reactive domain lifecycle events.
 *
 * @see ADR-017
 * @see ADR-018
 */
export class DomainEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  /**
   * Dispatches a domain event asynchronously to all registered listeners.
   * Listener exceptions are caught and logged without disrupting callers.
   *
   * @param event - Event name key
   * @param payload - Typed event payload
   */
  emit<K extends keyof DomainEventsMap>(event: K, payload: DomainEventsMap[K]): void {
    const listeners = this.emitter.rawListeners(event as string);
    for (const listener of listeners) {
      try {
        const result = (listener as DomainEventHandler<DomainEventsMap[K]>)(payload);
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch((err) => {
            logger.error(`[DomainEventBus] Async listener failure on event '${String(event)}':`, {
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      } catch (err) {
        logger.error(`[DomainEventBus] Sync listener failure on event '${String(event)}':`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * Subscribes a listener to a domain event.
   *
   * @param event - Event name key
   * @param handler - Listener function (sync or async)
   * @returns Unsubscribe function
   */
  on<K extends keyof DomainEventsMap>(
    event: K,
    handler: DomainEventHandler<DomainEventsMap[K]>
  ): () => void {
    const wrapped = (payload: DomainEventsMap[K]) => handler(payload);
    this.emitter.on(event as string, wrapped);
    return () => {
      this.emitter.off(event as string, wrapped);
    };
  }

  /**
   * Subscribes a one-time listener to a domain event.
   *
   * @param event - Event name key
   * @param handler - One-time listener function
   * @returns Unsubscribe function
   */
  once<K extends keyof DomainEventsMap>(
    event: K,
    handler: DomainEventHandler<DomainEventsMap[K]>
  ): () => void {
    const wrapped = (payload: DomainEventsMap[K]) => handler(payload);
    this.emitter.once(event as string, wrapped);
    return () => {
      this.emitter.off(event as string, wrapped);
    };
  }

  /**
   * Removes all listeners for all events or a specific event (primarily for test teardown).
   *
   * @param event - Optional event name to clear
   */
  clear(event?: keyof DomainEventsMap): void {
    if (event) {
      this.emitter.removeAllListeners(event as string);
    } else {
      this.emitter.removeAllListeners();
    }
  }

  /**
   * Returns the count of registered listeners for an event.
   *
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount(event: keyof DomainEventsMap): number {
    return this.emitter.listenerCount(event as string);
  }
}

/**
 * Singleton instance of the application-wide Domain Event Bus.
 */
export const domainEventBus = new DomainEventBus();
