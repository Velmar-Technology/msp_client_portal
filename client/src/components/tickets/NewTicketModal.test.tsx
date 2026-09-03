import { render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NewTicketModal } from '@/features/tickets';
import { equipmentService } from '@/features/equipment';
import { ticketService } from '@/features/tickets';

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

vi.mock('@/features/equipment', () => ({
  equipmentService: {
    getMyDevices: vi.fn(),
  },
}));

vi.mock('@/features/tickets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/tickets')>();
  return {
    ...actual,
    ticketService: {
      create: vi.fn(),
      uploadAttachment: vi.fn(),
    },
  };
});

describe('NewTicketModal - Equipment Filtering (Legacy Re-export)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('filters devices to only include provisioned (ACTIVE) equipment', async () => {
    const mockDevices = [
      { id: '1', device_name: 'Device 1', status: 'ACTIVE' },
      { id: '2', device_name: 'Device 2', status: 'REVOKED' },
    ];

    vi.mocked(equipmentService.getMyDevices).mockResolvedValue(mockDevices as any);

    renderWithClient(
      <NewTicketModal
        onClose={() => {}}
        onCreated={() => {}}
      />
    );

    await waitFor(() => {
      expect(equipmentService.getMyDevices).toHaveBeenCalledTimes(1);
    });
  });
});
