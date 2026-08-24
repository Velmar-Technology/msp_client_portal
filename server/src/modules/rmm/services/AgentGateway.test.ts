import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentGateway } from './AgentGateway';
import { EventEmitter } from 'events';

// ── Mock WebSocket & WebSocketServer ──────────────────────────────────────────

class MockWebSocket extends EventEmitter {
  static readonly OPEN = 1;
  readyState = MockWebSocket.OPEN;

  send = vi.fn((_data: string, cb?: (err?: Error) => void) => {
    if (cb) cb();
  });

  close = vi.fn();
  ping = vi.fn();
}

class MockWebSocketServer extends EventEmitter {}

function createMockReq(agentId: string, token = 'test-token') {
  return {
    url: `/?agent_id=${agentId}&token=${token}`,
    headers: { host: 'localhost:3001' },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AgentGateway', () => {
  let gateway: AgentGateway;
  let wss: MockWebSocketServer;

  beforeEach(() => {
    gateway = new AgentGateway();
    wss = new MockWebSocketServer();
    gateway.init(wss as any);
  });

  afterEach(() => {
    wss.removeAllListeners();
  });

  it('should register an agent on connection', () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-001'));

    const status = gateway.getAgentStatus('eq-001');
    expect(status.online).toBe(true);
  });

  it('should reject connections without agent_id', () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, { url: '/', headers: { host: 'localhost' } });

    expect(ws.close).toHaveBeenCalledWith(4001, 'Missing agent_id');
  });

  it('should reject connections without token', () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, {
      url: '/?agent_id=eq-002',
      headers: { host: 'localhost' },
    });

    expect(ws.close).toHaveBeenCalledWith(4001, 'Missing token');
  });

  it('should report offline for unknown agent', () => {
    const status = gateway.getAgentStatus('nonexistent');
    expect(status.online).toBe(false);
  });

  it('should supersede existing connection for the same agent', () => {
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();

    wss.emit('connection', ws1, createMockReq('eq-003'));
    wss.emit('connection', ws2, createMockReq('eq-003'));

    expect(ws1.close).toHaveBeenCalledWith(4000, 'Superseded by new connection');
    expect(gateway.getAgentStatus('eq-003').online).toBe(true);
  });

  it('should send a command and resolve when agent responds', async () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-004'));

    // Intercept the send and simulate the agent responding
    ws.send = vi.fn((data: string, cb?: (err?: Error) => void) => {
      if (cb) cb();
      const envelope = JSON.parse(data);
      // Simulate the agent responding immediately
      setTimeout(() => {
        ws.emit('message', JSON.stringify({
          correlation_id: envelope.correlation_id,
          command: 'RESPONSE',
          payload: { hostname: 'TEST-PC', cpu_usage: 25 },
        }));
      }, 10);
    });

    const result = await gateway.sendCommand('eq-004', 'DIAGNOSE_PC');

    expect(result.equipmentId).toBe('eq-004');
    expect(result.command).toBe('DIAGNOSE_PC');
    expect(result.data).toEqual({ hostname: 'TEST-PC', cpu_usage: 25 });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should reject with timeout if agent does not respond', async () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-005'));

    // Agent does not respond — should timeout
    await expect(
      gateway.sendCommand('eq-005', 'DIAGNOSE_PC', undefined, 100)
    ).rejects.toThrow(/timed out/);
  });

  it('should throw if agent is offline', async () => {
    await expect(
      gateway.sendCommand('offline-agent', 'DIAGNOSE_PC')
    ).rejects.toThrow(/not connected/);
  });

  it('should track connected agents list', () => {
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    wss.emit('connection', ws1, createMockReq('eq-010'));
    wss.emit('connection', ws2, createMockReq('eq-011'));

    const agents = gateway.getConnectedAgents();
    expect(agents).toHaveLength(2);
    expect(agents.map(a => a.equipmentId).sort()).toEqual(['eq-010', 'eq-011']);
  });

  it('should remove agent from connected list on disconnect', () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-020'));
    expect(gateway.getAgentStatus('eq-020').online).toBe(true);

    ws.emit('close', 1000, Buffer.from('Normal closure'));
    expect(gateway.getAgentStatus('eq-020').online).toBe(false);
  });

  it('should handle AGENT_HELLO and store metadata', () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-030'));

    ws.emit('message', JSON.stringify({
      correlation_id: 'hello-1',
      command: 'AGENT_HELLO',
      payload: {
        agent_id: 'eq-030',
        agent_version: '1.0.0',
        hostname: 'WORKSTATION-42',
        os: 'Windows 11 Pro 26100',
        timestamp: new Date().toISOString(),
      },
    }));

    const status = gateway.getAgentStatus('eq-030');
    expect(status.online).toBe(true);
    expect(status.hostname).toBe('WORKSTATION-42');
    expect(status.agentVersion).toBe('1.0.0');
    expect(status.os).toBe('Windows 11 Pro 26100');
  });
});
