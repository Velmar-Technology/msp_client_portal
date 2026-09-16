import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AgentClusterBroker } from './AgentClusterBroker';
import { RedisClientService } from '@shared/utils/cache/RedisClient';

describe('AgentClusterBroker', () => {
  let broker: AgentClusterBroker;
  let mockRedisService: RedisClientService;
  let fakePublisher: any;
  let fakeSubscriber: any;

  beforeEach(() => {
    vi.useFakeTimers();

    fakePublisher = {
      publish: vi.fn().mockResolvedValue(1),
      sadd: vi.fn().mockResolvedValue(1),
      srem: vi.fn().mockResolvedValue(1),
      sismember: vi.fn().mockResolvedValue(1),
    };

    fakeSubscriber = {
      status: 'wait',
      connect: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      psubscribe: vi.fn().mockResolvedValue(undefined),
      punsubscribe: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(),
    };

    mockRedisService = {
      getClient: vi.fn().mockReturnValue(fakePublisher),
      createSubscriberClient: vi.fn().mockReturnValue(fakeSubscriber),
      isReady: vi.fn().mockReturnValue(true),
    } as unknown as RedisClientService;

    broker = new AgentClusterBroker(mockRedisService, 'worker-test-1');
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  it('starts and subscribes to pattern channels', async () => {
    await broker.start();

    expect(mockRedisService.createSubscriberClient).toHaveBeenCalled();
    expect(fakeSubscriber.connect).toHaveBeenCalled();
    expect(fakeSubscriber.psubscribe).toHaveBeenCalledWith('agent:cmd:*', 'agent:res:*');
  });

  it('handles start gracefully when subscriber client is null', async () => {
    (mockRedisService.createSubscriberClient as any).mockReturnValue(null);

    await broker.start();
    expect(fakeSubscriber.connect).not.toHaveBeenCalled();
  });

  it('publishes command to Redis and resolves when correlated response is received', async () => {
    const cmdPromise = broker.publishCommand('eq-100', 'DIAGNOSE_PC', { fast: true }, 5000);

    expect(fakePublisher.publish).toHaveBeenCalled();
    const [channel, messageStr] = fakePublisher.publish.mock.calls[0];
    expect(channel).toBe('agent:cmd:eq-100');

    const envelope = JSON.parse(messageStr);
    expect(envelope.equipmentId).toBe('eq-100');
    expect(envelope.command).toBe('DIAGNOSE_PC');
    expect(envelope.sourceWorkerId).toBe('worker-test-1');
    expect(envelope.correlationId).toBeDefined();

    // Simulate incoming response on agent:res:<correlationId>
    await broker.handleMessage(`agent:res:${envelope.correlationId}`, JSON.stringify({
      correlationId: envelope.correlationId,
      equipmentId: 'eq-100',
      command: 'DIAGNOSE_PC',
      data: { status: 'healthy' },
      durationMs: 42,
      error: null,
    }));

    const result = await cmdPromise;
    expect(result.equipmentId).toBe('eq-100');
    expect(result.command).toBe('DIAGNOSE_PC');
    expect(result.data).toEqual({ status: 'healthy' });
  });

  it('rejects command if remote worker returns an error in response', async () => {
    const cmdPromise = broker.publishCommand('eq-101', 'RESTART_SERVICE', { name: 'spooler' });

    const [, messageStr] = fakePublisher.publish.mock.calls[0];
    const envelope = JSON.parse(messageStr);

    await broker.handleMessage(`agent:res:${envelope.correlationId}`, JSON.stringify({
      correlationId: envelope.correlationId,
      equipmentId: 'eq-101',
      command: 'RESTART_SERVICE',
      data: null,
      error: 'Service spooler not found',
    }));

    await expect(cmdPromise).rejects.toThrow('Service spooler not found');
  });

  it('rejects command on timeout if no response arrives', async () => {
    const cmdPromise = broker.publishCommand('eq-102', 'DIAGNOSE_PC', undefined, 3000);

    vi.advanceTimersByTime(3001);

    await expect(cmdPromise).rejects.toThrow(
      "Command 'DIAGNOSE_PC' to agent 'eq-102' timed out after 3000ms."
    );
  });

  it('throws immediately if Redis publisher is unavailable', async () => {
    (mockRedisService.getClient as any).mockReturnValue(null);

    await expect(broker.publishCommand('eq-offline', 'PING')).rejects.toThrow(
      "Agent for equipment 'eq-offline' is not connected (OFFLINE)."
    );
  });

  it('executes local command and publishes response when inbound command matches local socket', async () => {
    const mockExecutor = vi.fn().mockResolvedValue({
      equipmentId: 'eq-200',
      command: 'BATTERY_REPORT',
      data: { health: '98%' },
      durationMs: 120,
    });
    broker.registerLocalExecutor(mockExecutor);

    await broker.handleMessage('agent:cmd:eq-200', JSON.stringify({
      correlationId: 'corr-xyz-123',
      equipmentId: 'eq-200',
      command: 'BATTERY_REPORT',
      payload: null,
      timeoutMs: 5000,
      sourceWorkerId: 'worker-peer-2',
      publishedAt: Date.now(),
    }));

    expect(mockExecutor).toHaveBeenCalledWith('eq-200', 'BATTERY_REPORT', null, 'corr-xyz-123');
    expect(fakePublisher.publish).toHaveBeenCalledWith(
      'agent:res:corr-xyz-123',
      expect.stringContaining('"health":"98%"')
    );
  });

  it('publishes error response when local executor throws an error', async () => {
    const mockExecutor = vi.fn().mockRejectedValue(new Error('Agent socket terminated abruptly'));
    broker.registerLocalExecutor(mockExecutor);

    await broker.handleMessage('agent:cmd:eq-200', JSON.stringify({
      correlationId: 'corr-err-999',
      equipmentId: 'eq-200',
      command: 'CRASH_TEST',
      payload: null,
      timeoutMs: 5000,
      sourceWorkerId: 'worker-peer-2',
      publishedAt: Date.now(),
    }));

    expect(fakePublisher.publish).toHaveBeenCalledWith(
      'agent:res:corr-err-999',
      expect.stringContaining('Agent socket terminated abruptly')
    );
  });

  it('ignores inbound command if dispatched by this same worker', async () => {
    const mockExecutor = vi.fn();
    broker.registerLocalExecutor(mockExecutor);

    await broker.handleMessage('agent:cmd:eq-same', JSON.stringify({
      correlationId: 'corr-loopback',
      equipmentId: 'eq-same',
      command: 'PING',
      sourceWorkerId: 'worker-test-1', // Same as this broker's workerId
    }));

    expect(mockExecutor).not.toHaveBeenCalled();
  });

  it('registers and unregisters agent presence in Redis set', async () => {
    await broker.registerAgentPresence('eq-300');
    expect(fakePublisher.sadd).toHaveBeenCalledWith('agent:cluster:online', 'eq-300');

    await broker.unregisterAgentPresence('eq-300');
    expect(fakePublisher.srem).toHaveBeenCalledWith('agent:cluster:online', 'eq-300');

    const isPresent = await broker.isAgentPresent('eq-300');
    expect(isPresent).toBe(true);
    expect(fakePublisher.sismember).toHaveBeenCalledWith('agent:cluster:online', 'eq-300');
  });

  it('cleans up pending requests and unsubscribes on stop', async () => {
    await broker.start();

    const cmdPromise = broker.publishCommand('eq-pending', 'LONG_TASK', null, 10000);
    // Don't await yet

    await broker.stop();

    await expect(cmdPromise).rejects.toThrow('AgentClusterBroker stopped: request cancelled.');
    expect(fakeSubscriber.punsubscribe).toHaveBeenCalled();
    expect(fakeSubscriber.quit).toHaveBeenCalled();
  });
});
