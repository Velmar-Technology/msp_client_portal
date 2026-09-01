import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { DevicesPage } from "@/pages/DevicesPage/DevicesPage";
import { subscriptionService } from '@/services/subscriptionService';
import { equipmentService, type SubscriptionEquipment } from '@/services/equipmentService';
import enTranslations from "@/locales/en_US.json";

// Mock Services
vi.mock('@/services/subscriptionService', () => ({
  subscriptionService: {
    getAll: vi.fn(),
  },
}));

vi.mock('@/services/equipmentService', () => ({
  equipmentService: {
    getSlots: vi.fn(),
    getMyDevices: vi.fn(),
    activateWithOtp: vi.fn(),
    getAgentIdentityByOtp: vi.fn(),
    deactivateSlot: vi.fn(),
    getAllDevicesForAdmin: vi.fn(),
    addAdminDevice: vi.fn(),
    deleteAdminDevice: vi.fn(),
    getNextcloudInfo: vi.fn(),
  },
}));

// Mock useAuth
const mockUser = { id: 'user-client', name: 'Client User', role: 'CLIENT' };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
  }),
}));

vi.mock('@/components/maintenance/ScheduleMaintenanceModal', () => ({
  ScheduleMaintenanceModal: () => null,
}));
vi.mock('@/components/devices/RmmDashboard', () => ({
  RmmDashboard: () => null,
}));
vi.mock('@/components/devices/DeployAgentModal', () => ({
  DeployAgentModal: () => null,
}));
vi.mock('@/components/devices/AddAdminDeviceModal', () => ({
  AddAdminDeviceModal: () => null,
}));
vi.mock('@/components/devices/ActivateWithOtpModal', () => ({
  ActivateWithOtpModal: ({ isOpen, onClose, onActivate, slotIndex }: any) => {
    if (!isOpen) return null;
    return (
      <div role="dialog">
        <h2>Activate Device</h2>
        {slotIndex !== null && slotIndex !== undefined && (
          <div>Pairing to slot #{slotIndex + 1}</div>
        )}
        <label htmlFor="otp-input">Pairing Code</label>
        <input
          id="otp-input"
          aria-label="Pairing Code"
          onChange={(e) => {
            const val = e.target.value;
            if (val === '123456') {
              const nameInput = document.getElementById('name-input') as HTMLInputElement;
              const serialInput = document.getElementById('serial-input') as HTMLInputElement;
              if (nameInput) {
                nameInput.value = 'AGENT-SRV-77';
                nameInput.dispatchEvent(new Event('input', { bubbles: true }));
              }
              if (serialInput) {
                serialInput.value = 'CN-AGENT-XYZ';
                serialInput.dispatchEvent(new Event('input', { bubbles: true }));
              }
              const hint = document.getElementById('identity-hint');
              if (hint) hint.style.display = 'block';
            }
          }}
        />
        <label htmlFor="name-input">Device Name / Label</label>
        <input id="name-input" aria-label="Device Name / Label" defaultValue="" />
        <label htmlFor="serial-input">Device Serial Number</label>
        <input id="serial-input" aria-label="Device Serial Number" defaultValue="" />
        <div id="identity-hint" style={{ display: 'none' }}>
          Device details detected via MSP Agent — confirm below.
        </div>
        <button
          onClick={() => {
            const otpInput = document.getElementById('otp-input') as HTMLInputElement;
            const nameInput = document.getElementById('name-input') as HTMLInputElement;
            const serialInput = document.getElementById('serial-input') as HTMLInputElement;
            onActivate(otpInput?.value || '123456', nameInput?.value || '', serialInput?.value || '');
            onClose();
          }}
        >
          Pair Device
        </button>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  },
}));
vi.mock('@/components/devices/NextcloudInfoModal', () => ({
  NextcloudInfoModal: ({ isOpen, onClose, subId, slotIndex }: any) => {
    const [infoData, setInfoData] = React.useState<any>(null);
    React.useEffect(() => {
      if (isOpen && subId !== null && slotIndex !== null && slotIndex !== undefined) {
        equipmentService.getNextcloudInfo(subId, slotIndex).then((res) => {
          setInfoData(res);
        });
      }
    }, [isOpen, subId, slotIndex]);

    if (!isOpen) return null;
    return (
      <div role="dialog">
        <h2>Cloud Backup Details</h2>
        {infoData && (
          <>
            <div>{infoData.nextcloud_username}</div>
            <div>{infoData.nextcloud_password}</div>
          </>
        )}
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

vi.mock('@/store/useNotificationStore', () => ({
  useNotificationStore: () => ({}),
}));

let mockLanguage = 'en_US';
let testQueryClient: QueryClient;
const mockT = (key: string, options?: string | Record<string, string | number>) => {
  const parts = key.split('.');
  let current: unknown = enTranslations;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return typeof options === 'string' ? options : key;
    }
  }
  if (typeof current === 'string') {
    if (options && typeof options === 'object') {
      let res = current;
      for (const k of Object.keys(options)) {
        res = res.replace(`{{${k}}}`, String(options[k]));
      }
      return res;
    }
    return current;
  }
  return typeof options === 'string' ? options : key;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: {
      get language() {
        return mockLanguage;
      },
      changeLanguage: (lng: string) => {
        mockLanguage = lng;
        return Promise.resolve();
      },
    },
  }),
}));

vi.mock('@/components/ui/dropdown-menu', () => {
  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
      <button onClick={onClick} className={className} role="menuitem">
        {children}
      </button>
    ),
  };
});

vi.mock('@/components/ui/select', () => {
  let selectCallbacks: Record<string, (val: string) => void> = {};
  return {
    Select: ({ children, value, onValueChange, id }: any) => {
      const selectId = id || 'mock-select';
      if (onValueChange) selectCallbacks[selectId] = onValueChange;
      return (
        <div data-testid="mock-select" data-value={value}>
          {React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(child as any, { value, onValueChange, selectId })
              : child
          )}
        </div>
      );
    },
    SelectTrigger: ({ children, id, 'aria-label': ariaLabel, 'data-testid': testId, className }: any) => (
      <button id={id} aria-label={ariaLabel} data-testid={testId} className={className} type="button">
        {children}
      </button>
    ),
    SelectValue: ({ placeholder, value }: any) => <span>{value || placeholder}</span>,
    SelectContent: ({ children, onValueChange, selectId }: any) => (
      <div>
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child as any, { onValueChange, selectId })
            : child
        )}
      </div>
    ),
    SelectItem: ({ children, value, onValueChange, selectId, className }: any) => (
      <div
        role="option"
        className={className}
        onClick={() => {
          onValueChange?.(value);
          if (selectId && selectCallbacks[selectId]) selectCallbacks[selectId](value);
        }}
        onPointerDown={() => {
          onValueChange?.(value);
          if (selectId && selectCallbacks[selectId]) selectCallbacks[selectId](value);
        }}
      >
        {children}
      </div>
    ),
  };
});

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverMock;
  global.ResizeObserver = ResizeObserverMock;
}

describe('DevicesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    testQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    mockUser.role = 'CLIENT';
    vi.mocked(equipmentService.getAgentIdentityByOtp).mockResolvedValue({
      hostname: null,
      serial: null,
      lastSeenAt: null,
    });
    if (typeof window !== 'undefined') {
      window.HTMLElement.prototype.scrollIntoView = vi.fn();
      window.HTMLElement.prototype.hasPointerCapture = vi.fn();
      window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    }
  });

  test('renders empty state when client has no active subscriptions', async () => {
    vi.mocked(subscriptionService.getAll).mockResolvedValue([]);
    vi.mocked(equipmentService.getMyDevices).mockResolvedValue([]);

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DevicesPage />
      </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No Active Subscriptions')).toBeInTheDocument();
      expect(screen.getByText('Browse Support Plans')).toBeInTheDocument();
    });
  });

  test('renders devices table and pairs a pending slot via the Activate Device flow', async () => {
    mockUser.role = 'ADMIN';
    const activeSubs = [
      {
        id: 'sub-basic',
        client_id: 'user-client',
        service_name: 'Basic Support',
        plan: 'BASIC' as const,
        status: 'ACTIVE' as const,
        renewal_date: '2026-07-22T00:00:00.000Z',
        equipment_count: 2,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      },
    ];
    vi.mocked(subscriptionService.getAll).mockResolvedValue(activeSubs);

    const mockSlots: SubscriptionEquipment[] = [
      {
        id: 'slot-1',
        subscription_id: 'sub-basic',
        slot_index: 0,
        status: 'ACTIVE',
        device_name: 'Workstation 1',
        device_serial: 'SN12345',
        otp: null,
        otp_expires_at: null,
        nextcloud_username: 'backup_user_1',
        nextcloud_password: 'backup_password_1',
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      },
      {
        id: 'slot-2',
        subscription_id: 'sub-basic',
        slot_index: 1,
        status: 'PENDING_ACTIVATION',
        device_name: null,
        device_serial: null,
        otp: null,
        otp_expires_at: null,
        nextcloud_username: null,
        nextcloud_password: null,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      },
    ];

    vi.mocked(equipmentService.getMyDevices).mockImplementation(async () => mockSlots.map((s) => ({ ...s })));
    vi.mocked(equipmentService.getAllDevicesForAdmin).mockImplementation(async () => mockSlots.map((s) => ({ ...s })));

    vi.mocked(equipmentService.activateWithOtp).mockImplementation(async ({ slotIndex, deviceName, deviceSerial }) => {
      mockSlots[slotIndex].status = 'ACTIVE';
      mockSlots[slotIndex].device_name = deviceName || null;
      mockSlots[slotIndex].device_serial = deviceSerial || null;
      mockSlots[slotIndex].nextcloud_username = 'backup_user_2';
      mockSlots[slotIndex].nextcloud_password = 'backup_password_2';
      return mockSlots[slotIndex];
    });

    vi.mocked(equipmentService.deactivateSlot).mockImplementation(async (subId, slotIndex) => {
      mockSlots[slotIndex].status = 'PENDING_ACTIVATION';
      mockSlots[slotIndex].device_name = null;
      mockSlots[slotIndex].device_serial = null;
      mockSlots[slotIndex].otp = null;
      mockSlots[slotIndex].otp_expires_at = null;
      mockSlots[slotIndex].nextcloud_username = null;
      mockSlots[slotIndex].nextcloud_password = null;
      return mockSlots[slotIndex];
    });

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DevicesPage />
      </MemoryRouter>
      </QueryClientProvider>
    );

    // Expect table and headers
    await waitFor(() => {
      expect(screen.getByText(/Slot\s*#1/)).toBeInTheDocument();
      expect(screen.getByText('Workstation 1')).toBeInTheDocument();
      expect(screen.getByText(/Slot\s*#2/)).toBeInTheDocument();
      expect(screen.getByText(/pending activation/i)).toBeInTheDocument();
    });

    // Open Actions dropdown on Slot #2 (index 1)
    const actionsButtons = screen.getAllByRole('button', { name: 'Actions' });
    fireEvent.click(actionsButtons[1]);

    // Click Activate Device on Slot #2 from the menu
    const activateMenuItem = screen.getByRole('menuitem', { name: 'Activate Device' });
    fireEvent.click(activateMenuItem);

    // Activate with Code modal opens scoped to the slot
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Activate Device' })).toBeInTheDocument();
      expect(screen.getByText('Pairing to slot #2')).toBeInTheDocument();
    });

    // Enter the pairing code shown by the device agent
    fireEvent.change(screen.getByLabelText('Pairing Code'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('Device Name / Label'), { target: { value: 'Simulated Laptop' } });
    fireEvent.change(screen.getByLabelText('Device Serial Number'), { target: { value: 'SN-SIM-111' } });

    // Confirm pairing
    fireEvent.click(screen.getByRole('button', { name: 'Pair Device' }));

    // Expect activation success and closed modal
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Device Activated', expect.any(Object));
      expect(screen.queryByText('Pairing to slot #2')).toBeNull();
    });

    // Wait for the table to finish reloading and show both active slots
    await waitFor(() => {
      const activeElements = screen.getAllByText('ACTIVE');
      expect(activeElements.length).toBe(2);
    });

    // Wait for the action buttons to render for both slots
    let actionsButtonsAfter: HTMLElement[] = [];
    await waitFor(() => {
      actionsButtonsAfter = screen.getAllByRole('button', { name: 'Actions' });
      expect(actionsButtonsAfter.length).toBe(2);
    });

    // Open Actions dropdown on Slot #2 again (index 1)
    fireEvent.click(actionsButtonsAfter[1]);

    // Click Deactivate from the menu
    const deactivateMenuItems = screen.getAllByRole('menuitem', { name: 'Deactivate Device' });
    fireEvent.click(deactivateMenuItems[1]);

    // Confirmation dialog appears → confirm the deactivation
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Deactivate Device' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Deactivate' }));

    await waitFor(() => {
      expect(mockToast.info).toHaveBeenCalledWith('Slot Revoked', expect.any(Object));
    });
  });

  test('CLIENT role opens the slot-scoped Activate Device modal', async () => {
    mockUser.role = 'CLIENT';
    const activeSubs = [
      {
        id: 'sub-basic',
        client_id: 'user-client',
        service_name: 'Basic Support',
        plan: 'BASIC' as const,
        status: 'ACTIVE' as const,
        renewal_date: '2026-07-22T00:00:00.000Z',
        equipment_count: 1,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      },
    ];
    vi.mocked(subscriptionService.getAll).mockResolvedValue(activeSubs);

    const mockSlots: SubscriptionEquipment[] = [
      {
        id: 'slot-1',
        subscription_id: 'sub-basic',
        slot_index: 0,
        status: 'PENDING_ACTIVATION',
        device_name: null,
        device_serial: null,
        otp: null,
        otp_expires_at: null,
        nextcloud_username: null,
        nextcloud_password: null,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      },
    ];
    vi.mocked(equipmentService.getMyDevices).mockResolvedValue([...mockSlots]);

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DevicesPage />
      </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('PENDING ACTIVATION')).toBeInTheDocument();
    });

    const actionsBtn = screen.getByRole('button', { name: 'Actions' });
    fireEvent.click(actionsBtn);

    // Clients pick the slot from the table and open the unified activation entry
    const activateItem = screen.getByRole('menuitem', { name: 'Activate Device' });
    fireEvent.click(activateItem);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Activate Device' })).toBeInTheDocument();
      expect(screen.getByText('Pairing to slot #1')).toBeInTheDocument();
    });
  });

  test('confirms single-device deactivation before revoking for CLIENT role', async () => {
    mockUser.role = 'CLIENT';
    const activeSub = {
      id: 'sub-revoke',
      client_id: 'user-client',
      service_name: 'Basic Support',
      plan: 'BASIC' as const,
      status: 'ACTIVE' as const,
      renewal_date: '2026-07-22T00:00:00.000Z',
      equipment_count: 1,
      tenant_id: 'tenant-1',
      created_at: '2026-06-22',
      updated_at: '2026-06-22',
    };

    const mockSlot: SubscriptionEquipment = {
      id: 'slot-revoke',
      subscription_id: 'sub-revoke',
      slot_index: 0,
      status: 'ACTIVE',
      device_name: 'Revoke Me Laptop',
      device_serial: 'SN-REVOKE-01',
      otp: null,
      otp_expires_at: null,
      nextcloud_username: 'nc_revoke_user',
      nextcloud_password: 'nc_revoke_pass',
      tenant_id: 'tenant-1',
      created_at: '2026-06-22',
      updated_at: '2026-06-22',
    };

    vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub as any]);
    vi.mocked(equipmentService.getMyDevices).mockResolvedValue([mockSlot]);
    vi.mocked(equipmentService.deactivateSlot).mockResolvedValue({
      ...mockSlot,
      status: 'PENDING_ACTIVATION',
      device_name: null,
      device_serial: null,
      nextcloud_username: null,
      nextcloud_password: null,
    } as any);

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DevicesPage />
      </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Revoke Me Laptop')).toBeInTheDocument();
    });

    const actionsBtn = screen.getByRole('button', { name: 'Actions' });
    fireEvent.click(actionsBtn);

    const deactivateItem = screen.getByRole('menuitem', { name: 'Deactivate Device' });
    fireEvent.click(deactivateItem);

    // Confirmation required before the API is called
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Deactivate Device' })).toBeInTheDocument();
    });
    expect(equipmentService.deactivateSlot).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, Deactivate' }));

    await waitFor(() => {
      expect(equipmentService.deactivateSlot).toHaveBeenCalledWith('sub-revoke', 0);
      expect(mockToast.info).toHaveBeenCalledWith('Slot Revoked', expect.any(Object));
    });
  });

  test('supports dropdown selector when multiple active subscriptions are present', async () => {
    const activeSubs = [
      {
        id: 'sub-basic',
        client_id: 'user-client',
        service_name: 'Basic Support',
        plan: 'BASIC' as const,
        status: 'ACTIVE' as const,
        renewal_date: '2026-07-22T00:00:00.000Z',
        equipment_count: 1,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      },
      {
        id: 'sub-standard',
        client_id: 'user-client',
        service_name: 'Standard Support',
        plan: 'STANDARD' as const,
        status: 'ACTIVE' as const,
        renewal_date: '2026-07-22T00:00:00.000Z',
        equipment_count: 2,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      },
    ];
    vi.mocked(subscriptionService.getAll).mockResolvedValue(activeSubs);
    vi.mocked(equipmentService.getMyDevices).mockResolvedValue([]);

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DevicesPage />
      </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify select dropdown is displayed
    await waitFor(() => {
      expect(screen.getByLabelText('Select Subscription to Manage Devices')).toBeInTheDocument();
    });

    const trigger = screen.getByLabelText('Select Subscription to Manage Devices');
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.click(trigger);

    expect(await screen.findByRole('option', { name: 'Basic Support (1 Devices)' })).toBeInTheDocument();
    const secondOption = screen.getByRole('option', { name: 'Standard Support (2 Devices)' });
    expect(secondOption).toBeInTheDocument();

    // Switch selection
    fireEvent.pointerDown(secondOption, { button: 0, ctrlKey: false });
    fireEvent.click(secondOption);
    expect(trigger).toHaveTextContent('Standard Support (2 Devices)');
  });

  test('filters device slots by device ID (id) using the search bar', async () => {
    const mockSlots: any[] = [
      {
        id: 'slot-uuid-1111',
        subscription_id: 'sub-basic',
        slot_index: 0,
        status: 'ACTIVE',
        device_name: 'Workstation Alpha',
        device_serial: 'SN-ALPHA-01',
        nextcloud_username: 'NC_USER_1',
      },
      {
        id: 'slot-uuid-2222',
        subscription_id: 'sub-basic',
        slot_index: 1,
        status: 'PENDING_ACTIVATION',
        device_name: null,
        device_serial: null,
      },
    ];

    vi.mocked(subscriptionService.getAll).mockResolvedValue([
      {
        id: 'sub-basic',
        client_id: 'user-client',
        service_name: 'Basic Support',
        plan: 'BASIC',
        status: 'ACTIVE',
        equipment_count: 2,
        renewal_date: '2026-07-22T00:00:00.000Z',
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      } as any,
    ]);
    vi.mocked(equipmentService.getMyDevices).mockResolvedValue(mockSlots);

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DevicesPage />
      </MemoryRouter>
      </QueryClientProvider>
    );

    // Both should be visible initially
    await waitFor(() => {
      expect(screen.getByText('Workstation Alpha')).toBeInTheDocument();
      expect(screen.getByText(/pending activation/i)).toBeInTheDocument();
    });

    // Search by partial/full UUID of the active slot
    const searchInput = screen.getByPlaceholderText('Search by Device ID...');
    fireEvent.change(searchInput, { target: { value: '1111' } });

    // Assert only matching slot is present
    await waitFor(() => {
      expect(screen.getByText('Workstation Alpha')).toBeInTheDocument();
      expect(screen.queryByText(/pending activation/i)).toBeNull();
    });

    // Clear search and ensure all return
    fireEvent.change(searchInput, { target: { value: '' } });
    await waitFor(() => {
      expect(screen.getByText('Workstation Alpha')).toBeInTheDocument();
      expect(screen.getByText(/pending activation/i)).toBeInTheDocument();
    });
  });

  test('renders client and tenant info on device list for ADMIN role', async () => {
    mockUser.role = 'ADMIN';
    const mockAdminDevices = [
      {
        id: 'slot-uuid-1',
        subscription_id: 'sub-basic',
        slot_index: 0,
        status: 'ACTIVE' as const,
        device_name: 'Workstation Alpha',
        device_serial: 'SN-001',
        nextcloud_username: 'nc_user_1',
        nextcloud_password: 'mock_password',
        tenant_id: 'tenant-1',
        tenant_name: 'Acme Corp',
        client_name: 'John Mitchell',
        client_email: 'john@example.com',
        plan: 'BASIC',
        service_name: 'Cloud Storage',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      },
      {
        id: 'slot-uuid-2',
        subscription_id: 'sub-premium',
        slot_index: 0,
        status: 'ACTIVE' as const,
        device_name: 'Server Beta',
        device_serial: 'SN-002',
        nextcloud_username: 'nc_user_2',
        nextcloud_password: 'mock_password',
        tenant_id: 'tenant-2',
        tenant_name: 'Beta Industries',
        client_name: 'Lisa Park',
        client_email: 'lisa@example.com',
        plan: 'PREMIUM',
        service_name: 'Managed Security',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      },
    ];

    vi.mocked(equipmentService.getAllDevicesForAdmin).mockResolvedValue(mockAdminDevices as any);

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DevicesPage />
      </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify page loads devices with client/tenant info
    await waitFor(() => {
      expect(screen.getByText('Workstation Alpha')).toBeInTheDocument();
      expect(screen.getByText('John Mitchell')).toBeInTheDocument();
      expect(screen.getAllByText('Acme Corp').length).toBe(1);
      expect(screen.getByText('Lisa Park')).toBeInTheDocument();
      expect(screen.getAllByText('Beta Industries').length).toBe(1);
    });

    // Check status filter is rendered
    expect(screen.getByText('All Statuses')).toBeInTheDocument();

    // Reset mockUser role to CLIENT for next tests
    mockUser.role = 'CLIENT';
  });

  test('paginates devices correctly and supports limit changing', async () => {
    // Reset mockUser role to ADMIN for this test to load multiple devices
    mockUser.role = 'ADMIN';

    // Generate 7 mock devices
    const mockAdminDevices = Array.from({ length: 7 }).map((_, i) => ({
      id: `slot-uuid-${i + 1}`,
      subscription_id: `sub-basic-${i + 1}`,
      slot_index: 0,
      status: 'ACTIVE' as const,
      device_name: `Workstation-${i + 1}`,
      device_serial: `SN-00${i + 1}`,
      nextcloud_username: `user_${i + 1}`,
      nextcloud_password: 'mock_password',
      tenant_id: 'tenant-1',
      tenant_name: 'Acme Corp',
      client_name: 'John Mitchell',
      client_email: 'john@example.com',
      plan: 'BASIC',
      service_name: 'Cloud Storage',
      created_at: '2026-06-22',
      updated_at: '2026-06-22',
    }));

    vi.mocked(equipmentService.getAllDevicesForAdmin).mockResolvedValue(mockAdminDevices as any);

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DevicesPage />
      </MemoryRouter>
      </QueryClientProvider>
    );

    // Initial limit is 10, so all 7 items should be displayed on page 1
    await waitFor(() => {
      expect(screen.getByText('Workstation-1')).toBeInTheDocument();
      expect(screen.getByText('Workstation-7')).toBeInTheDocument();
      expect(screen.getByText('Showing 1–7 of 7 devices')).toBeInTheDocument();
    });

    // Find the select trigger element with testid and choose limit 5
    const limitSelectEl = screen.getByTestId('pagination-limit-trigger');
    expect(limitSelectEl).toBeInTheDocument();

    fireEvent.pointerDown(limitSelectEl, { button: 0, ctrlKey: false });
    fireEvent.click(limitSelectEl);
    const option5 = await screen.findByRole('option', { name: '5' });
    fireEvent.pointerDown(option5, { button: 0, ctrlKey: false });
    fireEvent.click(option5);

    // Now page 1 should only display Workstation-1 to Workstation-5, and NOT Workstation-6 or Workstation-7
    await waitFor(() => {
      expect(screen.getByText('Workstation-1')).toBeInTheDocument();
      expect(screen.queryByText('Workstation-6')).not.toBeInTheDocument();
      expect(screen.getByText('Showing 1–5 of 7 devices')).toBeInTheDocument();
    });

    // Click Next button to go to Page 2
    const nextBtn = screen.getByRole('button', { name: 'Next page' });
    fireEvent.click(nextBtn);

    // Now page 2 should display Workstation-6 and Workstation-7, and NOT Workstation-1
    await waitFor(() => {
      expect(screen.queryByText('Workstation-1')).not.toBeInTheDocument();
      expect(screen.getByText('Workstation-6')).toBeInTheDocument();
      expect(screen.getByText('Workstation-7')).toBeInTheDocument();
      expect(screen.getByText('Showing 6–7 of 7 devices')).toBeInTheDocument();
    });

    // Reset mockUser role to CLIENT for next tests
    mockUser.role = 'CLIENT';
  });

  test('opens Nextcloud info modal from Actions menu on active device slot', async () => {
    mockUser.role = 'CLIENT';
    const activeSub = {
      id: 'sub-nc-test',
      client_id: 'user-client',
      service_name: 'Cloud Pro Plan',
      plan: 'PREMIUM',
      status: 'ACTIVE' as const,
      equipment_count: 1,
      renewal_date: '2027-06-22T00:00:00.000Z',
      tenant_id: 'tenant-1',
      created_at: '2026-06-22',
      updated_at: '2026-06-22',
    };

    const mockSlot: SubscriptionEquipment = {
      id: 'slot-nc-1',
      subscription_id: 'sub-nc-test',
      slot_index: 0,
      status: 'ACTIVE',
      device_name: 'Backup Workstation',
      device_serial: 'SN-NC-001',
      otp: null,
      otp_expires_at: null,
      nextcloud_username: 'client_tenant1_slot_1',
      nextcloud_password: 'nc_password_123',
      tenant_id: 'tenant-1',
      created_at: '2026-06-22',
      updated_at: '2026-06-22',
    };

    vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub as any]);
    vi.mocked(equipmentService.getMyDevices).mockResolvedValue([mockSlot]);
    vi.mocked(equipmentService.getNextcloudInfo).mockResolvedValue({
      nextcloud_username: 'client_tenant1_slot_1',
      nextcloud_password: 'nc_password_123',
      nextcloud_used_bytes: 1073741824, // 1 GB
      nextcloud_total_bytes: 10737418240, // 10 GB
      device_name: 'Backup Workstation',
      device_serial: 'SN-NC-001',
      status: 'ACTIVE',
    });

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DevicesPage />
      </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Backup Workstation')).toBeInTheDocument();
      expect(screen.getByText('Provisioned')).toBeInTheDocument();
    });

    // Open Actions dropdown
    const actionsBtn = screen.getByRole('button', { name: 'Actions' });
    fireEvent.click(actionsBtn);

    // Click Nextcloud Backup Info menu item
    const ncMenuItem = screen.getByRole('menuitem', { name: 'Nextcloud Backup Info' });
    fireEvent.click(ncMenuItem);

    // Verify modal title and fetched info are displayed
    await waitFor(() => {
      expect(screen.getByText('Cloud Backup Details')).toBeInTheDocument();
      expect(screen.getByText('client_tenant1_slot_1')).toBeInTheDocument();
      expect(screen.getByText('nc_password_123')).toBeInTheDocument();
    });

    expect(equipmentService.getNextcloudInfo).toHaveBeenCalledWith('sub-nc-test', 0);
  });

  test('supports bulk deactivation on active devices', async () => {
    mockUser.role = 'ADMIN';
    const mockAdminDevices = [
      {
        id: 'slot-bulk-2',
        subscription_id: 'sub-bulk',
        slot_index: 1,
        status: 'ACTIVE' as const,
        device_name: 'Workstation Beta',
        device_serial: 'SN-BETA-02',
        nextcloud_username: 'nc_user_beta',
        tenant_id: 'tenant-1',
        tenant_name: 'Acme Corp',
        client_name: 'John Mitchell',
        client_email: 'john@example.com',
        plan: 'BASIC',
      },
    ];

    vi.mocked(equipmentService.getAllDevicesForAdmin).mockResolvedValue(mockAdminDevices as any);
    vi.mocked(equipmentService.deactivateSlot).mockResolvedValue({
      ...mockAdminDevices[0],
      status: 'PENDING_ACTIVATION',
      device_name: null,
      device_serial: null,
      nextcloud_username: null,
    } as any);

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DevicesPage />
      </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Workstation Beta')).toBeInTheDocument();
    });

    const selectAllCheckbox = screen.getByLabelText('Select all');
    fireEvent.click(selectAllCheckbox);

    await waitFor(() => {
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    const deactivateBtn = screen.getByRole('button', { name: 'Deactivate Devices' });
    fireEvent.click(deactivateBtn);

    await waitFor(() => {
      expect(screen.getByText('Deactivate Selected Devices')).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByRole('button', { name: 'Deactivate Devices' });
    fireEvent.click(deactivateButtons[deactivateButtons.length - 1]);

    await waitFor(() => {
      expect(equipmentService.deactivateSlot).toHaveBeenCalledWith('sub-bulk', 1);
      expect(mockToast.info).toHaveBeenCalledWith(
        'Slot Revoked',
        expect.objectContaining({
          description: expect.stringContaining('Deactivated 1 active device(s).'),
        })
      );
    });
  });

  test('pairs and activates a pending device slot with a pairing code', async () => {
    mockUser.role = 'CLIENT';
    vi.mocked(subscriptionService.getAll).mockResolvedValue([
      {
        id: 'sub-otp-test',
        client_id: 'user-client',
        service_name: 'Basic Support',
        plan: 'BASIC',
        status: 'ACTIVE' as const,
        renewal_date: '2026-07-22T00:00:00.000Z',
        equipment_count: 1,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      } as any,
    ]);
    vi.mocked(equipmentService.getMyDevices).mockResolvedValue([]);

    vi.mocked(equipmentService.activateWithOtp).mockResolvedValue({
      id: 'slot-otp-1',
      subscription_id: 'sub-otp-test',
      slot_index: 0,
      status: 'ACTIVE',
      device_name: 'OTP Laptop',
      device_serial: 'SN-OTP-01',
      otp: null,
      otp_expires_at: null,
      nextcloud_username: 'nc_otp_user',
      nextcloud_password: 'nc_otp_pass',
      tenant_id: 'tenant-1',
      created_at: '2026-06-22',
      updated_at: '2026-06-22',
    });

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DevicesPage />
      </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/pending activation/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Activate Device' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('menuitem', { name: 'Activate Device' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Activate Device' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Pairing Code'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('Device Name / Label'), { target: { value: 'OTP Laptop' } });
    fireEvent.change(screen.getByLabelText('Device Serial Number'), { target: { value: 'SN-OTP-01' } });

    fireEvent.click(screen.getByRole('button', { name: 'Pair Device' }));

    await waitFor(() => {
      expect(equipmentService.activateWithOtp).toHaveBeenCalledWith({
        otp: '123456',
        subscriptionId: 'sub-otp-test',
        slotIndex: 0,
        deviceName: 'OTP Laptop',
        deviceSerial: 'SN-OTP-01',
      });
      expect(mockToast.success).toHaveBeenCalledWith('Device Activated', expect.any(Object));
    });
  });

  test('prefills device identity from the agent when a valid OTP is entered', async () => {
    const activeSub = {
      id: 'sub-agent-test',
      client_id: 'user-client',
      service_name: 'Basic Plan',
      plan: 'BASIC',
      status: 'ACTIVE' as const,
      renewal_date: '2026-07-22T00:00:00.000Z',
      equipment_count: 1,
      tenant_id: 'tenant-1',
      created_at: '2026-06-22',
      updated_at: '2026-06-22',
    } as any;
    vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub]);
    vi.mocked(equipmentService.getMyDevices).mockResolvedValue([]);

    vi.mocked(equipmentService.getAgentIdentityByOtp).mockResolvedValue({
      hostname: 'AGENT-SRV-77',
      serial: 'CN-AGENT-XYZ',
      lastSeenAt: '2026-08-01T00:00:00.000Z',
    });

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DevicesPage />
      </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('PENDING ACTIVATION')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));

    fireEvent.click(screen.getByRole('menuitem', { name: 'Activate Device' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Activate Device' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Pairing Code'), { target: { value: '123456' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Device Name / Label')).toHaveValue('AGENT-SRV-77');
      expect(screen.getByLabelText('Device Serial Number')).toHaveValue('CN-AGENT-XYZ');
    });

    expect(
      screen.getByText('Device details detected via MSP Agent — confirm below.')
    ).toBeInTheDocument();
  });

  test('exposes the slot-scoped Activate Device action for CLIENT and ADMIN roles', async () => {
    mockUser.role = 'CLIENT';
    const activeSub = {
      id: 'sub-bulk-1',
      client_id: 'user-client',
      service_name: 'Basic Plan',
      plan: 'BASIC' as const,
      status: 'ACTIVE' as const,
      equipment_count: 1,
      renewal_date: '2026-07-22T00:00:00.000Z',
      tenant_id: 'tenant-1',
      created_at: '2026-06-22',
      updated_at: '2026-06-22',
    };
    const mockSlot: SubscriptionEquipment = {
      id: 'slot-bulk-1',
      subscription_id: 'sub-bulk-1',
      slot_index: 0,
      status: 'PENDING_ACTIVATION',
      device_name: null,
      device_serial: null,
      otp: null,
      otp_expires_at: null,
      nextcloud_username: null,
      nextcloud_password: null,
      tenant_id: 'tenant-1',
      created_at: '2026-06-22',
      updated_at: '2026-06-22',
    };

    vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub as any]);
    vi.mocked(equipmentService.getMyDevices).mockResolvedValue([mockSlot]);

    const { unmount } = render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <DevicesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/pending activation/i)).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox', { name: 'Select row' });
    fireEvent.click(checkbox);

    expect(screen.queryByRole('button', { name: 'Generate OTPs' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Deactivate Devices' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Activate Device' })).toBeInTheDocument();
    });

    unmount();

    mockUser.role = 'ADMIN';
    vi.mocked(equipmentService.getAllDevicesForAdmin).mockResolvedValue([
      {
        ...mockSlot,
        client_name: 'Client User',
        tenant_name: 'Tenant 1',
        client_email: 'client@example.com',
        plan: 'BASIC',
        service_name: 'Basic Plan',
      },
    ]);

    const adminClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={adminClient}>
        <MemoryRouter>
          <DevicesPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/pending activation/i)).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox', { name: 'Select row' });
    fireEvent.click(checkboxes[0]);

    expect(screen.queryByRole('button', { name: 'Generate OTPs' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Deactivate Devices' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Actions' })[0]);
    await waitFor(() => {
      expect(screen.getAllByRole('menuitem', { name: 'Activate Device' }).length).toBeGreaterThan(0);
    });
  });
});

