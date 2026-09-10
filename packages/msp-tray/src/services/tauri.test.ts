import { describe, it, expect, vi, afterEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import {
  isTauriEnvironment,
  fetchSystemVitals,
  fetchAgentStatus,
  fetchActiveTicket,
  fetchTicketList,
  fetchTicketMessages,
  submitTicket,
  sendChatMessage,
  resolveTicket,
  hideWindow,
} from './tauri';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

const mockInvoke = vi.mocked(invoke);

const FALLBACK_VITALS = {
  cpuPercent: 14.5,
  memoryUsedMb: 6144,
  memoryTotalMb: 16384,
  memoryPercent: 37.5,
  diskUsedGb: 142.0,
  diskTotalGb: 512.0,
  diskPercent: 27.7,
  uptimeSeconds: 84200,
  osName: 'Windows 11 Pro',
  hostname: 'DEV-WORKSTATION-01',
};

const FALLBACK_STATUS = {
  agentOnline: true,
  cloudConnected: true,
  equipmentId: 'workstation-demo',
  hostname: 'DEV-WORKSTATION-01',
  tenantName: 'Acme Logistics SRL',
  activeTicketCount: 0,
};

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI__;
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe('isTauriEnvironment', () => {
  it('returns false when no Tauri globals are present', () => {
    expect(isTauriEnvironment()).toBe(false);
  });

  it('returns true when __TAURI__ is exposed', () => {
    (window as unknown as Record<string, unknown>).__TAURI__ = { core: {} };
    expect(isTauriEnvironment()).toBe(true);
  });

  it('returns true when only __TAURI_INTERNALS__ is exposed', () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = { invoke: mockInvoke };
    expect(isTauriEnvironment()).toBe(true);
  });
});

describe('fetchSystemVitals', () => {
  it('returns fallback vitals outside the Tauri runtime', async () => {
    await expect(fetchSystemVitals()).resolves.toEqual(FALLBACK_VITALS);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('returns the invoke result inside the Tauri runtime', async () => {
    (window as unknown as Record<string, unknown>).__TAURI__ = { core: {} };
    const vitals = { ...FALLBACK_VITALS, cpuPercent: 88.2 };
    mockInvoke.mockResolvedValue(vitals);
    await expect(fetchSystemVitals()).resolves.toEqual(vitals);
    expect(mockInvoke).toHaveBeenCalledWith('get_system_vitals');
  });

  it('falls back to dev vitals when invoke rejects', async () => {
    (window as unknown as Record<string, unknown>).__TAURI__ = { core: {} };
    mockInvoke.mockRejectedValue(new Error('ipc unavailable'));
    await expect(fetchSystemVitals()).resolves.toEqual(FALLBACK_VITALS);
  });
});

describe('fetchAgentStatus', () => {
  it('returns fallback status outside the Tauri runtime', async () => {
    await expect(fetchAgentStatus()).resolves.toEqual(FALLBACK_STATUS);
  });

  it('returns the invoke result inside the Tauri runtime', async () => {
    (window as unknown as Record<string, unknown>).__TAURI__ = { core: {} };
    const status = { ...FALLBACK_STATUS, activeTicketCount: 3 };
    mockInvoke.mockResolvedValue(status);
    await expect(fetchAgentStatus()).resolves.toEqual(status);
    expect(mockInvoke).toHaveBeenCalledWith('get_agent_status');
  });

  it('falls back to default status when invoke rejects', async () => {
    (window as unknown as Record<string, unknown>).__TAURI__ = { core: {} };
    mockInvoke.mockRejectedValue(new Error('ipc unavailable'));
    await expect(fetchAgentStatus()).resolves.toEqual(FALLBACK_STATUS);
  });
});

describe('fetchActiveTicket', () => {
  it('returns null outside the Tauri runtime', async () => {
    await expect(fetchActiveTicket()).resolves.toBeNull();
  });

  it('returns the active ticket inside the Tauri runtime', async () => {
    (window as unknown as Record<string, unknown>).__TAURI__ = { core: {} };
    const ticket = {
      id: 'tk-1',
      title: 'Monitor flickering',
      status: 'OPEN',
      priority: 'HIGH',
      createdAt: new Date().toISOString(),
    };
    mockInvoke.mockResolvedValue(ticket);
    await expect(fetchActiveTicket()).resolves.toEqual(ticket);
    expect(mockInvoke).toHaveBeenCalledWith('get_active_ticket');
  });

  it('returns null when invoke rejects', async () => {
    (window as unknown as Record<string, unknown>).__TAURI__ = { core: {} };
    mockInvoke.mockRejectedValue(new Error('ipc unavailable'));
    await expect(fetchActiveTicket()).resolves.toBeNull();
  });
});

describe('fetchTicketList', () => {
  it('returns an empty list outside the Tauri runtime', async () => {
    await expect(fetchTicketList()).resolves.toEqual([]);
  });

  it('returns tickets inside the Tauri runtime', async () => {
    (window as unknown as Record<string, unknown>).__TAURI__ = { core: {} };
    const tickets = [
      { id: 'tk-1', title: 'Printer offline', status: 'OPEN', createdAt: new Date().toISOString() },
    ];
    mockInvoke.mockResolvedValue(tickets);
    await expect(fetchTicketList()).resolves.toEqual(tickets);
    expect(mockInvoke).toHaveBeenCalledWith('get_ticket_list');
  });

  it('returns an empty list when invoke rejects', async () => {
    (window as unknown as Record<string, unknown>).__TAURI__ = { core: {} };
    mockInvoke.mockRejectedValue(new Error('ipc unavailable'));
    await expect(fetchTicketList()).resolves.toEqual([]);
  });
});

describe('fetchTicketMessages', () => {
  it('returns an empty list outside the Tauri runtime', async () => {
    await expect(fetchTicketMessages('tk-1')).resolves.toEqual([]);
  });

  it('forwards the ticket id to invoke', async () => {
    (window as unknown as Record<string, unknown>).__TAURI__ = { core: {} };
    const messages = [
      { id: 'm1', authorName: 'Jane', authorRole: 'CLIENT', message: 'Help!', createdAt: new Date().toISOString() },
    ];
    mockInvoke.mockResolvedValue(messages);
    await expect(fetchTicketMessages('tk-1')).resolves.toEqual(messages);
    expect(mockInvoke).toHaveBeenCalledWith('get_ticket_responses', { ticketId: 'tk-1' });
  });

  it('returns an empty list when invoke rejects', async () => {
    (window as unknown as Record<string, unknown>).__TAURI__ = { core: {} };
    mockInvoke.mockRejectedValue(new Error('ipc unavailable'));
    await expect(fetchTicketMessages('tk-1')).resolves.toEqual([]);
  });
});

describe('submitTicket', () => {
  const input = {
    reporterName: 'Jane Doe',
    reporterEmail: 'jane@example.com',
    title: 'VPN drops frequently',
    description: 'Drops every 15 minutes',
    category: 'SERVICE_OUTAGE',
    priority: 'HIGH',
  };

  it('returns the invoke result on success', async () => {
    const result = {
      success: true,
      ticketId: 'tk-42',
      title: input.title,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };
    mockInvoke.mockResolvedValue(result);
    await expect(submitTicket(input)).resolves.toEqual(result);
    expect(mockInvoke).toHaveBeenCalledWith('create_ticket', { payload: input });
  });

  it('returns a lightweight fallback confirmation when invoke rejects', async () => {
    mockInvoke.mockRejectedValue(new Error('ipc unavailable'));
    const result = await submitTicket(input);
    expect(result.success).toBe(true);
    expect(result.title).toBe(input.title);
    expect(result.status).toBe('OPEN');
    expect(result.ticketId).toMatch(/^t-\w{6}$/);
  });
});

describe('sendChatMessage', () => {
  it('acks true on invoke success', async () => {
    mockInvoke.mockResolvedValue(true);
    await expect(sendChatMessage('tk-1', 'Jane Doe', 'Follow up')).resolves.toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('send_chat_message', {
      payload: { ticketId: 'tk-1', reporterName: 'Jane Doe', message: 'Follow up' },
    });
  });

  it('acks true on invoke failure', async () => {
    mockInvoke.mockRejectedValue(new Error('ipc unavailable'));
    await expect(sendChatMessage('tk-1', 'Jane Doe', 'Follow up')).resolves.toBe(true);
  });
});

describe('resolveTicket', () => {
  it('resolves true when invoke succeeds', async () => {
    mockInvoke.mockResolvedValue(true);
    await expect(resolveTicket('tk-1')).resolves.toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('resolve_ticket', { ticketId: 'tk-1' });
  });

  it('resolves true when invoke fails', async () => {
    mockInvoke.mockRejectedValue(new Error('ipc unavailable'));
    await expect(resolveTicket('tk-1')).resolves.toBe(true);
  });
});

describe('hideWindow', () => {
  it('does not invoke outside the Tauri runtime', async () => {
    await hideWindow();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('invokes hide_window inside the Tauri runtime', async () => {
    (window as unknown as Record<string, unknown>).__TAURI__ = { core: {} };
    mockInvoke.mockResolvedValue(undefined);
    await hideWindow();
    expect(mockInvoke).toHaveBeenCalledWith('hide_window');
  });

  it('swallows invoke errors so the UI never blows up', async () => {
    (window as unknown as Record<string, unknown>).__TAURI__ = { core: {} };
    mockInvoke.mockRejectedValue(new Error('ipc unavailable'));
    await expect(hideWindow()).resolves.toBeUndefined();
  });
});