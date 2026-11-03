import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainEventBus } from './DomainEventBus';

describe('DomainEventBus (ADR-018)', () => {
  let bus: DomainEventBus;

  beforeEach(() => {
    bus = new DomainEventBus();
  });

  it('dispatches typed events to registered listeners', () => {
    const handler = vi.fn();
    bus.on('user:created', handler);

    bus.emit('user:created', {
      userId: 'usr-1',
      tenantId: 'tnt-1',
      email: 'test@example.com',
      role: 'CLIENT',
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      userId: 'usr-1',
      tenantId: 'tnt-1',
      email: 'test@example.com',
      role: 'CLIENT',
    });
  });

  it('unsubscribes listeners when invoking returned unbind function', () => {
    const handler = vi.fn();
    const unsubscribe = bus.on('user:deleted', handler);

    bus.emit('user:deleted', { userId: 'usr-1', tenantId: 'tnt-1' });
    expect(handler).toHaveBeenCalledTimes(1);

    unsubscribe();
    bus.emit('user:deleted', { userId: 'usr-2', tenantId: 'tnt-1' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('handles once listeners exactly one time', () => {
    const handler = vi.fn();
    bus.once('tenant:created', handler);

    bus.emit('tenant:created', { tenantId: 'tnt-1', name: 'Acme Corp' });
    bus.emit('tenant:created', { tenantId: 'tnt-2', name: 'Beta LLC' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ tenantId: 'tnt-1', name: 'Acme Corp' });
  });

  it('isolates sync and async errors without throwing to caller', async () => {
    const syncThrower = () => {
      throw new Error('Sync fault');
    };
    const asyncRejecter = async () => {
      throw new Error('Async fault');
    };
    const healthyHandler = vi.fn();

    bus.on('auth:login', syncThrower);
    bus.on('auth:login', asyncRejecter);
    bus.on('auth:login', healthyHandler);

    expect(() => {
      bus.emit('auth:login', { userId: 'usr-1', tenantId: 'tnt-1' });
    }).not.toThrow();

    expect(healthyHandler).toHaveBeenCalledTimes(1);
  });
});
