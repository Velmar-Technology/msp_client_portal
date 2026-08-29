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
        serial_number: 'CN-9XYZ123',
        manufacturer: 'Dell Inc.',
        system_model: 'XPS 15',
        os: 'Windows 11 Pro 26100',
        timestamp: new Date().toISOString(),
      },
    }));

    const status = gateway.getAgentStatus('eq-030');
    expect(status.online).toBe(true);
    expect(status.hostname).toBe('WORKSTATION-42');
    expect(status.serialNumber).toBe('CN-9XYZ123');
    expect(status.manufacturer).toBe('Dell Inc.');
    expect(status.systemModel).toBe('XPS 15');
    expect(status.agentVersion).toBe('1.0.0');
    expect(status.os).toBe('Windows 11 Pro 26100');
  });

  it('should invoke the onAgentHello handler with identity + token', async () => {
    const handler = vi.fn();
    gateway.onAgentHello(handler);

    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-031', 'device-secret-42'));

    ws.emit('message', JSON.stringify({
      correlation_id: 'hello-2',
      command: 'AGENT_HELLO',
      payload: {
        agent_id: 'eq-031',
        hostname: 'SRV-0421',
        serial_number: 'CN-555',
        system_model: 'OptiPlex 3080',
      },
    }));

    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));

    expect(handler).toHaveBeenCalledWith(
      'eq-031',
      expect.objectContaining({ hostname: 'SRV-0421', serial_number: 'CN-555' }),
      'device-secret-42'
    );
  });

  it('should not invoke the hello handler when none is registered', async () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-032'));

    ws.emit('message', JSON.stringify({
      correlation_id: 'hello-3',
      command: 'AGENT_HELLO',
      payload: { agent_id: 'eq-032', hostname: 'LONELY-PC' },
    }));

    await vi.waitFor(() => expect(gateway.getAgentStatus('eq-032').hostname).toBe('LONELY-PC'));
  });

  it('should contain errors thrown by the hello handler', async () => {
    const handler = vi.fn(() => Promise.reject(new Error('boom')));
    gateway.onAgentHello(handler);

    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-033'));

    ws.emit('message', JSON.stringify({
      correlation_id: 'hello-4',
      command: 'AGENT_HELLO',
      payload: { agent_id: 'eq-033', hostname: 'ERR-PC' },
    }));

    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    expect(gateway.getAgentStatus('eq-033').hostname).toBe('ERR-PC');
  });

  // ── Agent-Issued Pairing Codes ───────────────────────────────────────────────

  it('should register an agent-issued pairing code on hello', () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-040'));

    ws.emit('message', JSON.stringify({
      correlation_id: 'hello-pair',
      command: 'AGENT_HELLO',
      payload: {
        agent_id: 'eq-040',
        hostname: 'UNBOUND-PC',
        serial_number: 'CN-PAIR-11',
        pairing_code: '483920',
        pairing_code_expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    }));

    const entry = gateway.getPairingByCode('483920');
    expect(entry).not.toBeNull();
    expect(entry!.agentId).toBe('eq-040');
    expect(entry!.hello.hostname).toBe('UNBOUND-PC');
  });

  it('should return null for an unknown pairing code', () => {
    expect(gateway.getPairingByCode('123456')).toBeNull();
  });

  it('should ignore malformed or expired pairing codes', () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-041'));

    ws.emit('message', JSON.stringify({
      correlation_id: 'hello-bad-pair',
      command: 'AGENT_HELLO',
      payload: {
        agent_id: 'eq-041',
        pairing_code: 'not-a-code',
        pairing_code_expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    }));
    expect(gateway.getPairingByCode('not-a-code')).toBeNull();

    ws.emit('message', JSON.stringify({
      correlation_id: 'hello-expired-pair',
      command: 'AGENT_HELLO',
      payload: {
        agent_id: 'eq-041',
        pairing_code: '654321',
        pairing_code_expires_at: new Date(Date.now() - 60_000).toISOString(),
      },
    }));
    expect(gateway.getPairingByCode('654321')).toBeNull();
  });

  it('should supersede previous pairing code when an agent issues a new one', () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-042'));

    const sendHello = (code: string) =>
      ws.emit('message', JSON.stringify({
        correlation_id: `hello-${code}`,
        command: 'AGENT_HELLO',
        payload: {
          agent_id: 'eq-042',
          pairing_code: code,
          pairing_code_expires_at: new Date(Date.now() + 60_000).toISOString(),
        },
      }));

    sendHello('111111');
    sendHello('222222');

    expect(gateway.getPairingByCode('111111')).toBeNull();
    expect(gateway.getPairingByCode('222222')).not.toBeNull();
  });

  it('should purge pairing code when the issuing agent disconnects', () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-043'));

    ws.emit('message', JSON.stringify({
      correlation_id: 'hello-pair-2',
      command: 'AGENT_HELLO',
      payload: {
        agent_id: 'eq-043',
        pairing_code: '777777',
        pairing_code_expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    }));
    expect(gateway.getPairingByCode('777777')).not.toBeNull();

    ws.emit('close', 1000, Buffer.from('Normal closure'));
    expect(gateway.getPairingByCode('777777')).toBeNull();
  });

  it('should return null for a code whose agent is offline', () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-044'));

    ws.emit('message', JSON.stringify({
      correlation_id: 'hello-pair-3',
      command: 'AGENT_HELLO',
      payload: {
        agent_id: 'eq-044',
        pairing_code: '888888',
        pairing_code_expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    }));
    expect(gateway.getPairingByCode('888888')).not.toBeNull();

    // Force the agent socket to appear disconnected
    ws.readyState = 3;
    expect(gateway.getPairingByCode('888888')).toBeNull();
  });

  it('should push BIND to an online agent and mark the socket bound', () => {
    const ws = new MockWebSocket();
    let sentEnvelope: any = null;
    ws.send = vi.fn((data: string, cb?: (err?: Error) => void) => {
      sentEnvelope = JSON.parse(data);
      if (cb) cb();
    });

    wss.emit('connection', ws, createMockReq('eq-045'));

    const sent = gateway.bindAgent('eq-045', 'slot-0001', 'provisioned-secret');
    expect(sent).toBe(true);
    expect(sentEnvelope.command).toBe('BIND');
    expect(sentEnvelope.payload).toEqual({
      slot_id: 'slot-0001',
      agent_token: 'provisioned-secret',
      agent_instance_id: 'eq-045',
    });
    expect(gateway.getAgentStatus('eq-045').slotId).toBe('slot-0001');
  });

  it('should fail BIND for an offline agent and purge its pairing code', () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-046'));

    ws.emit('message', JSON.stringify({
      correlation_id: 'hello-pair-4',
      command: 'AGENT_HELLO',
      payload: {
        agent_id: 'eq-046',
        pairing_code: '999999',
        pairing_code_expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    }));

    ws.readyState = 3;
    expect(gateway.bindAgent('eq-046', 'slot-0002', 'secret')).toBe(false);
    expect(gateway.getPairingByCode('999999')).toBeNull();
  });

  it('should detect direct TLS / WSS connections and report secure transport', () => {
    const ws = new MockWebSocket();
    const req = {
      url: '/?agent_id=eq-wss-01&token=secure-token',
      headers: { host: 'localhost:3001' },
      socket: { encrypted: true },
    };
    wss.emit('connection', ws, req);

    const status = gateway.getAgentStatus('eq-wss-01');
    expect(status.online).toBe(true);
    expect(status.isSecure).toBe(true);
    expect(status.transport).toBe('wss');

    const connectedList = gateway.getConnectedAgents();
    const agentEntry = connectedList.find((a) => a.equipmentId === 'eq-wss-01');
    expect(agentEntry).toBeDefined();
    expect(agentEntry?.isSecure).toBe(true);
    expect(agentEntry?.transport).toBe('wss');
  });

  it('should detect reverse proxy TLS / WSS headers (x-forwarded-proto)', () => {
    const ws = new MockWebSocket();
    const req = {
      url: '/?agent_id=eq-wss-02&token=secure-token',
      headers: {
        host: 'helpdesk.velmartech.com.do',
        'x-forwarded-proto': 'https',
      },
    };
    wss.emit('connection', ws, req);

    const status = gateway.getAgentStatus('eq-wss-02');
    expect(status.online).toBe(true);
    expect(status.isSecure).toBe(true);
    expect(status.transport).toBe('wss');
  });

  it('should set agent slotId via setAgentSlotId upon reconciliation', () => {
    const ws = new MockWebSocket();
    wss.emit('connection', ws, createMockReq('eq-slot-link'));

    expect(gateway.getAgentStatus('eq-slot-link').slotId).toBeUndefined();
    gateway.setAgentSlotId('eq-slot-link', 'slot-reconciled-99');
    expect(gateway.getAgentStatus('eq-slot-link').slotId).toBe('slot-reconciled-99');
  });

  it('should send UNBIND command to connected agent and clear slotId', () => {
    const ws = new MockWebSocket();
    let sentEnvelope: any = null;
    ws.send = vi.fn((data: string, cb?: (err?: Error) => void) => {
      sentEnvelope = JSON.parse(data);
      if (cb) cb();
    });

    wss.emit('connection', ws, createMockReq('eq-unbind-01'));
    gateway.setAgentSlotId('eq-unbind-01', 'slot-100');
    expect(gateway.getAgentStatus('eq-unbind-01').slotId).toBe('slot-100');

    const result = gateway.unbindAgent('eq-unbind-01', 'slot-100');
    expect(result).toBe(true);
    expect(sentEnvelope.command).toBe('UNBIND');
    expect(sentEnvelope.payload).toEqual({
      slot_id: 'slot-100',
      reason: 'Unbound by client',
    });
    expect(gateway.getAgentStatus('eq-unbind-01').slotId).toBeUndefined();
  });

  it('should return false when unbindAgent is called for an offline agent', () => {
    const result = gateway.unbindAgent('non-existent-agent', 'slot-999');
    expect(result).toBe(false);
  });
});
