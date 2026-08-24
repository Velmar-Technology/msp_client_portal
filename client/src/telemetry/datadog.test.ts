import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initDatadogRum, setDatadogUser, resetDatadogUser, trackDatadogError, trackDatadogAction } from './datadog';
import { datadogRum } from '@datadog/browser-rum';

vi.mock('@datadog/browser-rum', () => ({
  datadogRum: {
    init: vi.fn(),
    startSessionReplayRecording: vi.fn(),
    setUser: vi.fn(),
    clearUser: vi.fn(),
    addError: vi.fn(),
    addAction: vi.fn(),
  },
}));

describe('Datadog RUM Telemetry & Visual Session Replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should standby gracefully when credentials are not configured', () => {
    const result = initDatadogRum();
    expect(result).toBe(false);
  });

  it('should set user context with id, email, role, and tenantId', () => {
    setDatadogUser({
      id: 'usr-123',
      email: 'test@example.com',
      username: 'Test User',
      role: 'ADMIN',
      tenantId: 'tenant-456',
    });

    expect(datadogRum.setUser).toHaveBeenCalledWith({
      id: 'usr-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN',
      tenantId: 'tenant-456',
    });
  });

  it('should clear user context on logout', () => {
    resetDatadogUser();
    expect(datadogRum.clearUser).toHaveBeenCalledTimes(1);
  });

  it('should track application errors', () => {
    const err = new Error('Test crash');
    trackDatadogError(err, { component: 'TicketsTable' });
    expect(datadogRum.addError).toHaveBeenCalledWith(err, { component: 'TicketsTable' });
  });

  it('should track custom user actions and domain events', () => {
    trackDatadogAction('ticket_created', { category: 'WARRANTY' });
    expect(datadogRum.addAction).toHaveBeenCalledWith('ticket_created', { category: 'WARRANTY' });
  });
});
