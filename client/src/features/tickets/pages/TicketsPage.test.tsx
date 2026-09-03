import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TicketsPage } from './TicketsPage';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ticketService } from '../api/ticketService';
import type { TicketItem as Ticket } from '../api/ticketService';
import { equipmentService } from '@/features/equipment';
import { useAuth } from '@/hooks/useAuth';

import enTranslations from "@/locales/en_US.json";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

let mockLanguage = 'en_US';

const mockT = (key: string, defaultValueOrOptions?: any, maybeOptions?: any) => {
  const options = typeof defaultValueOrOptions === 'object' ? defaultValueOrOptions : maybeOptions;
  const parts = key.split('.');
  let current: any = enTranslations;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      current = typeof defaultValueOrOptions === 'string' ? defaultValueOrOptions : key;
      break;
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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../api/ticketService', () => ({
  ticketService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    getResponses: vi.fn().mockResolvedValue([]),
    getTimeline: vi.fn().mockResolvedValue([]),
    getAttachments: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/features/equipment', () => ({
  equipmentService: {
    getMyDevices: vi.fn().mockResolvedValue([]),
  },
}));

const mockTickets: Ticket[] = Array.from({ length: 25 }, (_, i) => ({
  id: `ticket-uuid-${i + 1}`,
  title: `Support Ticket #${i + 1} - Network issue`,
  description: `Description for ticket ${i + 1}`,
  category: 'SERVICE_OUTAGE',
  status: 'OPEN',
  priority: 'HIGH',
  client_id: 'client-1',
  client_name: 'Acme Corp',
  client_email: 'admin@acme.com',
  assigned_tech_id: 'tech-1',
  assigned_tech_name: 'John Technician',
  assigned_tech_email: 'john@msp.com',
  equipment_id: 'equip-1',
  device_name: 'HQ-SRV-01',
  created_at: new Date('2026-08-25T10:00:00Z').toISOString(),
  updated_at: new Date('2026-08-25T10:00:00Z').toISOString(),
}));

describe('TicketsPage Pagination & Filter Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@msp.com',
        role: 'ADMIN',
        tenantId: 'tenant-1',
        language: 'en_US',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      loginWithGoogle: vi.fn(),
      verifyEmail: vi.fn(),
      updateUser: vi.fn(),
    });

    vi.mocked(ticketService.getAll).mockImplementation(async (params: any) => {
      const page = Number(params?.page || 1);
      const limit = Number(params?.limit || 10);
      const start = (page - 1) * limit;
      const end = start + limit;
      const filtered = mockTickets.slice(start, end);

      return {
        data: filtered,
        pagination: {
          page,
          limit,
          total: mockTickets.length,
          totalPages: Math.ceil(mockTickets.length / limit),
        },
      };
    });
  });

  const renderWithProviders = (ui: React.ReactElement, initialEntries = ['/tickets']) => {
    const queryClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  test('renders paginated tickets and displays correct page showing text', async () => {
    renderWithProviders(<TicketsPage />);

    await waitFor(() => {
      expect(ticketService.getAll).toHaveBeenCalled();
      expect(screen.getByText('Support Ticket #1 - Network issue')).toBeInTheDocument();
    });

    // Check pagination showing text
    expect(screen.getByText(/Showing 1.+10 of 25/i)).toBeInTheDocument();
  });

  test('handles page navigation to next and previous page', async () => {
    renderWithProviders(<TicketsPage />, ['/tickets?page=1&limit=10']);

    await waitFor(() => {
      expect(screen.getByText('Support Ticket #1 - Network issue')).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /next page/i });
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(ticketService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 10 })
      );
    });
  });

  test('resets page to 1 when search or filters change', async () => {
    renderWithProviders(<TicketsPage />, ['/tickets?page=3&limit=10']);

    await waitFor(() => {
      expect(ticketService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, limit: 10 })
      );
    });

    const searchInput = screen.getByPlaceholderText(/Search tickets\.\.\./i);
    fireEvent.change(searchInput, { target: { value: 'Exchange' } });

    await waitFor(() => {
      expect(ticketService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, search: 'Exchange' })
      );
    });
  });
});
