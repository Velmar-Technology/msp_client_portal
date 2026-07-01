import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DevicesPage } from './DevicesPage';
import { subscriptionService } from '@/services/subscriptionService';
import { equipmentService } from '@/services/equipmentService';

// Mock Services
vi.mock('@/services/subscriptionService', () => ({
  subscriptionService: {
    getAll: vi.fn(),
  },
}));

vi.mock('@/services/equipmentService', () => ({
  equipmentService: {
    getSlots: vi.fn(),
    generateOTP: vi.fn(),
    activateSlot: vi.fn(),
    deactivateSlot: vi.fn(),
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

const mockAddToast = vi.fn();
vi.mock('@/store/useNotificationStore', () => ({
  useNotificationStore: () => ({
    addToast: mockAddToast,
  }),
}));

let mockLanguage = 'en_US';
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'devices.tableActions') return 'Actions';
      if (key === 'devices.actionsLabel') return 'Actions';
      if (key === 'devices.searchPlaceholder') return 'Search by Device ID...';
      return key;
    },
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
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
    DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({ children, onClick, className }: any) => (
      <button onClick={onClick} className={className} role="menuitem">
        {children}
      </button>
    ),
  };
});

describe('DevicesPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('renders empty state when client has no active subscriptions', async () => {
    vi.mocked(subscriptionService.getAll).mockResolvedValue([]);

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

    vi.mocked(equipmentService.getSlots).mockImplementation(async () => {
      return [...mockSlots];
    });

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
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'OTP Generated',
        type: 'success',
      }));
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
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Device Activated',
        type: 'success',
      }));
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
      expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Slot Revoked',
        type: 'info',
      }));
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
    vi.mocked(equipmentService.getSlots).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    // Verify select dropdown is displayed
    await waitFor(() => {
      expect(screen.getByLabelText('Select Subscription to Manage Devices')).toBeInTheDocument();
    });

    // Verify both options are present
    const select = screen.getByLabelText('Select Subscription to Manage Devices') as HTMLSelectElement;
    expect(select.options.length).toBe(2);
    expect(select.options[0].text).toBe('Basic Support (1 Devices)');
    expect(select.options[1].text).toBe('Standard Support (2 Devices)');

    // Switch selection
    fireEvent.change(select, { target: { value: 'sub-standard' } });
    expect(select.value).toBe('sub-standard');
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
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      },
    ]);
    vi.mocked(equipmentService.getSlots).mockResolvedValue(mockSlots);

    render(
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    // Wait for the list to load and verify both are rendered
    await waitFor(() => {
      expect(screen.getByText('Workstation Alpha')).toBeInTheDocument();
      expect(screen.getByText('PENDING ACTIVATION')).toBeInTheDocument();
      expect(screen.getByText('ID: slot-uuid-1111')).toBeInTheDocument();
      expect(screen.getByText('ID: slot-uuid-2222')).toBeInTheDocument();
    });

    // Filter by '2222' using search bar
    const searchInput = screen.getByPlaceholderText('Search by Device ID...');
    fireEvent.change(searchInput, { target: { value: '2222' } });

    // Expect slot-1111 to be filtered out, and slot-2222 to remain
    expect(screen.queryByText('Workstation Alpha')).not.toBeInTheDocument();
    expect(screen.getByText('ID: slot-uuid-2222')).toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Workstation Alpha')).toBeInTheDocument();
    expect(screen.getByText('ID: slot-uuid-2222')).toBeInTheDocument();
  });
});
