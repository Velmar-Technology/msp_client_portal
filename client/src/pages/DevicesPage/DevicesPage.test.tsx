import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
    generateOTP: vi.fn(),
    activateSlot: vi.fn(),
    activateWithOtp: vi.fn(),
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
const mockT = (key: string, options?: Record<string, string | number>) => {
  const parts = key.split('.');
  let current: unknown = enTranslations;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
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
  return key;
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
    mockUser.role = 'CLIENT';
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
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No Active Subscriptions')).toBeInTheDocument();
      expect(screen.getByText('Browse Support Plans')).toBeInTheDocument();
    });
  });

  test('renders devices table and runs simulated activation wizard', async () => {
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

    vi.mocked(equipmentService.getMyDevices).mockResolvedValue([...mockSlots]);
    vi.mocked(equipmentService.getAllDevicesForAdmin).mockResolvedValue([...mockSlots]);

    vi.mocked(equipmentService.generateOTP).mockImplementation(async (subId, slotIndex) => {
      mockSlots[slotIndex].otp = '123456';
      mockSlots[slotIndex].otp_expires_at = new Date(Date.now() + 600000).toISOString();
      return mockSlots[slotIndex];
    });

    vi.mocked(equipmentService.activateSlot).mockImplementation(async (subId, slotIndex, name, serial) => {
      mockSlots[slotIndex].status = 'ACTIVE';
      mockSlots[slotIndex].device_name = name;
      mockSlots[slotIndex].device_serial = serial;
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
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    // Expect table and headers
    await waitFor(() => {
      expect(screen.getByText(/Slot\s*#1/)).toBeInTheDocument();
      expect(screen.getByText('Workstation 1')).toBeInTheDocument();
      expect(screen.getByText(/Slot\s*#2/)).toBeInTheDocument();
      expect(screen.getByText('PENDING ACTIVATION')).toBeInTheDocument();
    });

    // Open Actions dropdown on Slot #2 (index 1)
    const actionsButtons = screen.getAllByRole('button', { name: 'Actions' });
    fireEvent.click(actionsButtons[1]);

    // Click Generate OTP on Slot #2 from the menu
    const generateOtpMenuItem = screen.getByRole('menuitem', { name: 'Generate Activation OTP' });
    fireEvent.click(generateOtpMenuItem);

    // Verify toast is shown and OTP UI is rendered in Wizard Step 1
    await waitFor(() => {
      expect(screen.getByText('Device Activation Wizard')).toBeInTheDocument();
      expect(mockToast.success).toHaveBeenCalledWith('OTP Generated', expect.any(Object));
      expect(screen.getByText('123456')).toBeInTheDocument();
    });

    // Click next in wizard
    const nextBtn = screen.getByRole('button', { name: 'Next: Enter Device Info' });
    fireEvent.click(nextBtn);

    // Fill in Device Name and Serial in Step 2
    const nameInput = screen.getByLabelText('Device Name / Label');
    fireEvent.change(nameInput, { target: { value: 'Simulated Laptop' } });

    // Click activate
    const activateBtn = screen.getByRole('button', { name: 'Activate & Provision Backup' });
    fireEvent.click(activateBtn);

    // Expect Step 3 success screen
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Device Activated', expect.any(Object));
      expect(screen.getAllByText('Simulated Laptop')[0]).toBeInTheDocument();
    });

    // Close wizard
    const completeBtn = screen.getByRole('button', { name: 'Complete Activation' });
    fireEvent.click(completeBtn);

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

    await waitFor(() => {
      expect(mockToast.info).toHaveBeenCalledWith('Slot Revoked', expect.any(Object));
    });
  });

  test('blocks CLIENT role users from generating OTPs', async () => {
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
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PENDING ACTIVATION')).toBeInTheDocument();
    });

    const actionsBtn = screen.getByRole('button', { name: 'Actions' });
    fireEvent.click(actionsBtn);

    const generateBtn = screen.getByRole('menuitem', { name: 'Generate Activation OTP' });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Activation Code Required', expect.any(Object));
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
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    // Verify select dropdown is displayed
    await waitFor(() => {
      expect(screen.getByLabelText('Select Subscription to Manage Devices')).toBeInTheDocument();
    });

    const trigger = screen.getByLabelText('Select Subscription to Manage Devices');
    fireEvent.click(trigger);

    expect(await screen.findByRole('option', { name: 'Basic Support (1 Devices)' })).toBeInTheDocument();
    const secondOption = screen.getByRole('option', { name: 'Standard Support (2 Devices)' });
    expect(secondOption).toBeInTheDocument();

    // Switch selection
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
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    // Both should be visible initially
    await waitFor(() => {
      expect(screen.getByText('Workstation Alpha')).toBeInTheDocument();
      expect(screen.getByText('PENDING ACTIVATION')).toBeInTheDocument();
    });

    // Search by partial/full UUID of the active slot
    const searchInput = screen.getByPlaceholderText('Search by Device ID...');
    fireEvent.change(searchInput, { target: { value: '1111' } });

    // Assert only matching slot is present
    await waitFor(() => {
      expect(screen.getByText('Workstation Alpha')).toBeInTheDocument();
      expect(screen.queryByText('PENDING ACTIVATION')).toBeNull();
    });

    // Clear search and ensure all return
    fireEvent.change(searchInput, { target: { value: '' } });
    await waitFor(() => {
      expect(screen.getByText('Workstation Alpha')).toBeInTheDocument();
      expect(screen.getByText('PENDING ACTIVATION')).toBeInTheDocument();
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
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
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
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
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

    fireEvent.click(limitSelectEl);
    const option5 = await screen.findByRole('option', { name: '5' });
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
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
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

  test('supports bulk OTP generation on pending devices', async () => {
    mockUser.role = 'ADMIN';
    const mockAdminDevices = [
      {
        id: 'slot-bulk-1',
        subscription_id: 'sub-bulk',
        slot_index: 0,
        status: 'PENDING_ACTIVATION' as const,
        device_name: null,
        device_serial: null,
        tenant_id: 'tenant-1',
        tenant_name: 'Acme Corp',
        client_name: 'John Mitchell',
        client_email: 'john@example.com',
        plan: 'BASIC',
      },
    ];

    vi.mocked(equipmentService.getAllDevicesForAdmin).mockResolvedValue(mockAdminDevices as any);
    vi.mocked(equipmentService.generateOTP).mockResolvedValue({
      ...mockAdminDevices[0],
      otp: '654321',
      otp_expires_at: new Date().toISOString(),
    } as any);

    render(
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PENDING ACTIVATION')).toBeInTheDocument();
    });

    const selectAllCheckbox = screen.getByLabelText('Select all');
    fireEvent.click(selectAllCheckbox);

    await waitFor(() => {
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    const generateOtpsBtn = screen.getByRole('button', { name: 'Generate OTPs' });
    fireEvent.click(generateOtpsBtn);

    await waitFor(() => {
      expect(equipmentService.generateOTP).toHaveBeenCalledWith('sub-bulk', 0);
      expect(mockToast.success).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          description: expect.stringContaining('Generated OTPs for 1 pending slot(s).'),
        })
      );
    });
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
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
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

  test('activates a device with a standalone OTP code', async () => {
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
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PENDING ACTIVATION')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Activate with Code' }));

    await waitFor(() => {
      expect(screen.getByText('Activate with Activation Code')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Activation Code'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('Device Name / Label'), { target: { value: 'OTP Laptop' } });
    fireEvent.change(screen.getByLabelText('Device Serial Number'), { target: { value: 'SN-OTP-01' } });

    fireEvent.click(screen.getByRole('button', { name: 'Activate Device' }));

    await waitFor(() => {
      expect(equipmentService.activateWithOtp).toHaveBeenCalledWith('123456', 'OTP Laptop', 'SN-OTP-01');
      expect(mockToast.success).toHaveBeenCalledWith('Device Activated', expect.any(Object));
    });
  });

  test('hides bulk Generate OTP action for CLIENT role but displays it for ADMIN role', async () => {
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

    const { rerender } = render(
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PENDING ACTIVATION')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox', { name: 'Select row' });
    fireEvent.click(checkbox);

    expect(screen.queryByRole('button', { name: 'Generate OTPs' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Deactivate Devices' })).toBeInTheDocument();

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

    rerender(
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('PENDING ACTIVATION')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox', { name: 'Select row' });
    fireEvent.click(checkboxes[0]);

    expect(screen.getByRole('button', { name: 'Generate OTPs' })).toBeInTheDocument();
  });

  test('copies OTP code to clipboard when copy button is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    mockUser.role = 'ADMIN';
    const mockSlots: any[] = [
      {
        id: 'slot-otp-1',
        subscription_id: 'sub-basic',
        slot_index: 0,
        status: 'PENDING_ACTIVATION',
        device_name: null,
        device_serial: null,
        otp: '987654',
        otp_expires_at: new Date(Date.now() + 600000).toISOString(),
        tenant_id: 'tenant-1',
        client_name: 'John Doe',
        tenant_name: 'Tenant 1',
        plan: 'BASIC',
        service_name: 'Basic Plan',
      },
    ];

    vi.mocked(subscriptionService.getAll).mockResolvedValue([]);
    vi.mocked(equipmentService.getAllDevicesForAdmin).mockResolvedValue(mockSlots);

    render(
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('OTP: 987654')).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: 'Copy OTP' });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('987654');
    expect(mockToast.success).toHaveBeenCalledWith('OTP copied to clipboard!');
  });

  test('renders Add Device button for ADMIN and submits new device', async () => {
    mockUser.role = 'ADMIN';

    vi.mocked(subscriptionService.getAll).mockResolvedValue([]);
    vi.mocked(equipmentService.getAllDevicesForAdmin).mockResolvedValue([]);
    vi.mocked(equipmentService.addAdminDevice).mockResolvedValue({
      id: 'dev-new-admin',
      subscription_id: 'sub-admin',
      slot_index: 0,
      status: 'ACTIVE',
      device_name: 'Core Server',
      device_serial: 'SN-ADM-999999',
      otp: null,
      otp_expires_at: null,
      nextcloud_username: 'admin_slot_1',
      nextcloud_password: 'pass',
      tenant_id: 'tenant-admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    render(
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add device/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add device/i }));

    await waitFor(() => {
      expect(screen.getByText('Add Managed Device')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/device name \/ label/i);
    fireEvent.change(nameInput, { target: { value: 'Core Server' } });

    const submitBtn = screen.getByRole('button', { name: /add & provision device/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(equipmentService.addAdminDevice).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceName: 'Core Server',
        })
      );
    });
  });

  test('allows ADMIN to delete admin-owned device from actions menu', async () => {
    mockUser.role = 'ADMIN';

    const mockAdminDevice: SubscriptionEquipment = {
      id: 'admin-dev-to-delete',
      subscription_id: 'sub-admin',
      slot_index: 0,
      status: 'ACTIVE',
      device_name: 'Core Server',
      device_serial: 'SN-ADM-999',
      otp: null,
      otp_expires_at: null,
      nextcloud_username: 'admin_slot_1',
      nextcloud_password: 'pass',
      tenant_id: 'tenant-admin',
      client_role: 'ADMIN',
      client_name: 'Admin User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    vi.mocked(subscriptionService.getAll).mockResolvedValue([]);
    vi.mocked(equipmentService.getAllDevicesForAdmin).mockResolvedValue([mockAdminDevice]);
    vi.mocked(equipmentService.deleteAdminDevice).mockResolvedValue({ success: true, id: 'admin-dev-to-delete' });

    render(
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Core Server')).toBeInTheDocument();
    });

    const actionsBtn = screen.getByRole('button', { name: /actions/i });
    fireEvent.click(actionsBtn);

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /delete device/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('menuitem', { name: /delete device/i }));

    await waitFor(() => {
      expect(screen.getByText('Delete Managed Device')).toBeInTheDocument();
    });

    // Click confirm Delete Device button in modal
    const confirmBtn = screen.getByRole('button', { name: /delete device/i, hidden: false });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(equipmentService.deleteAdminDevice).toHaveBeenCalledWith('admin-dev-to-delete');
    });
  });
});
