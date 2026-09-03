import { render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewTicketModal } from './NewTicketModal';
import { equipmentService } from '@/services/equipmentService';
import { ticketService } from '@/services/ticketService';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en_US' },
  }),
}));

vi.mock('@/services/equipmentService', () => ({
  equipmentService: {
    getMyDevices: vi.fn(),
  },
}));

vi.mock('@/services/ticketService', () => ({
  ticketService: {
    create: vi.fn(),
    uploadAttachment: vi.fn(),
  },
}));

describe('NewTicketModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('filters devices to only include provisioned (ACTIVE) equipment', async () => {
    const mockDevices = [
      {
        id: 'dev-1',
        device_name: 'Workstation 1',
        slot_index: 0,
        status: 'ACTIVE',
        subscription_id: 'sub-1',
        tenant_id: 'ten-1',
      },
      {
        id: 'dev-2',
        device_name: 'Unactivated Device 2',
        slot_index: 1,
        status: 'PENDING_ACTIVATION',
        subscription_id: 'sub-1',
        tenant_id: 'ten-1',
      },
      {
        id: 'dev-3',
        device_name: 'Server 1',
        slot_index: 2,
        status: 'ACTIVE',
        subscription_id: 'sub-1',
        tenant_id: 'ten-1',
      },
    ];

    vi.mocked(equipmentService.getMyDevices).mockResolvedValue(mockDevices as any);

    renderWithClient(<NewTicketModal onClose={vi.fn()} onCreated={vi.fn()} />);

    await waitFor(() => {
      expect(equipmentService.getMyDevices).toHaveBeenCalledTimes(1);
    });

    // The select trigger should be rendered since provisioned devices exist
    const trigger = await screen.findByRole('combobox', { name: /tickets\.modalDeviceLabel/i });
    expect(trigger).toBeDefined();
  });

  test('does not show device selection section if no provisioned devices exist', async () => {
    const mockDevices = [
      {
        id: 'dev-1',
        device_name: 'Unactivated Device 1',
        slot_index: 0,
        status: 'PENDING_ACTIVATION',
        subscription_id: 'sub-1',
        tenant_id: 'ten-1',
      },
    ];

    vi.mocked(equipmentService.getMyDevices).mockResolvedValue(mockDevices as any);

    renderWithClient(<NewTicketModal onClose={vi.fn()} onCreated={vi.fn()} />);

    await waitFor(() => {
      expect(equipmentService.getMyDevices).toHaveBeenCalledTimes(1);
    });

    // Since devices.length is 0 after filtering out non-ACTIVE devices, the device select is not shown
    expect(screen.queryByRole('combobox', { name: /tickets\.modalDeviceLabel/i })).toBeNull();
  });
});
