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

    vi.mocked(equipmentService.getSlots).mockResolvedValue([
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
    ]);

    vi.mocked(equipmentService.generateOTP).mockResolvedValue({
      id: 'slot-2',
      subscription_id: 'sub-basic',
      slot_index: 1,
      status: 'PENDING_ACTIVATION',
      device_name: null,
      device_serial: null,
      otp: '123456',
      otp_expires_at: new Date(Date.now() + 600000).toISOString(),
      nextcloud_username: null,
      nextcloud_password: null,
      tenant_id: 'tenant-1',
      created_at: '2026-06-22',
      updated_at: '2026-06-22',
    });

    vi.mocked(equipmentService.activateSlot).mockResolvedValue({
      id: 'slot-2',
      subscription_id: 'sub-basic',
      slot_index: 1,
      status: 'ACTIVE',
      device_name: 'Simulated Laptop',
      device_serial: 'SN-SIM-827461',
      otp: null,
      otp_expires_at: null,
      nextcloud_username: 'backup_user_2',
      nextcloud_password: 'backup_password_2',
      tenant_id: 'tenant-1',
      created_at: '2026-06-22',
      updated_at: '2026-06-22',
    });

    vi.mocked(equipmentService.deactivateSlot).mockResolvedValue({
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
    });

    render(
      <MemoryRouter>
        <DevicesPage />
      </MemoryRouter>
    );

    // Expect table and headers
    await waitFor(() => {
      expect(screen.getByText('Licensed Devices & Activation')).toBeInTheDocument();
      expect(screen.getByText(/Slot\s*#1/)).toBeInTheDocument();
      expect(screen.getByText('Workstation 1')).toBeInTheDocument();
      expect(screen.getByText(/Slot\s*#2/)).toBeInTheDocument();
      expect(screen.getByText('PENDING ACTIVATION')).toBeInTheDocument();
    });

    // Click Generate OTP on Slot #2
    const generateOtpBtn = screen.getByRole('button', { name: 'Generate Activation OTP' });
    fireEvent.click(generateOtpBtn);

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

    // Deactivate/revoke slot
    const deactivateBtn = screen.getAllByRole('button', { name: 'Deactivate' });
    // Slot #1 and Slot #2 are both ACTIVE now, click deactivate on Slot #2
    fireEvent.click(deactivateBtn[1]);

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
});
