import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EscalationScheduler } from './EscalationScheduler';

describe('EscalationScheduler', () => {
  let mockEscalationSvc: {
    processPendingEscalations: ReturnType<typeof vi.fn>;
  };
  let mockLock: {
    acquireLock: ReturnType<typeof vi.fn>;
    releaseLock: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockEscalationSvc = {
      processPendingEscalations: vi.fn().mockResolvedValue({ evaluated: 2, escalated: 1 }),
    };
    mockLock = {
      acquireLock: vi.fn().mockResolvedValue('mock-token-uuid-456'),
      releaseLock: vi.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('acquires distributed lock, processes escalations, and releases the lock', async () => {
    const scheduler = new EscalationScheduler(mockEscalationSvc as any, mockLock as any);

    await scheduler.process();

    expect(mockLock.acquireLock).toHaveBeenCalledWith('cron:tickets:escalation_sweep', 50000);
    expect(mockEscalationSvc.processPendingEscalations).toHaveBeenCalled();
    expect(mockLock.releaseLock).toHaveBeenCalledWith('cron:tickets:escalation_sweep', 'mock-token-uuid-456');
  });

  it('skips processing if distributed lock is held by another cluster instance', async () => {
    mockLock.acquireLock.mockResolvedValue(null);
    const scheduler = new EscalationScheduler(mockEscalationSvc as any, mockLock as any);

    await scheduler.process();

    expect(mockLock.acquireLock).toHaveBeenCalledWith('cron:tickets:escalation_sweep', 50000);
    expect(mockEscalationSvc.processPendingEscalations).not.toHaveBeenCalled();
    expect(mockLock.releaseLock).not.toHaveBeenCalled();
  });

  it('always releases the lock even if processPendingEscalations throws an error', async () => {
    mockEscalationSvc.processPendingEscalations.mockRejectedValue(new Error('DB Connection Timeout'));
    const scheduler = new EscalationScheduler(mockEscalationSvc as any, mockLock as any);

    await expect(scheduler.process()).rejects.toThrow('DB Connection Timeout');

    expect(mockLock.acquireLock).toHaveBeenCalled();
    expect(mockLock.releaseLock).toHaveBeenCalledWith('cron:tickets:escalation_sweep', 'mock-token-uuid-456');
  });

  it('starts periodic timer and can be stopped cleanly', async () => {
    const scheduler = new EscalationScheduler(mockEscalationSvc as any, mockLock as any);

    scheduler.start(10000);

    // Initial immediate call
    expect(mockLock.acquireLock).toHaveBeenCalledTimes(1);

    // Advance 1 interval
    await vi.advanceTimersByTimeAsync(10000);
    expect(mockLock.acquireLock).toHaveBeenCalledTimes(2);

    // Stop scheduler
    scheduler.stop();

    // Advance more time - should not fire again
    await vi.advanceTimersByTimeAsync(20000);
    expect(mockLock.acquireLock).toHaveBeenCalledTimes(2);
  });
});
