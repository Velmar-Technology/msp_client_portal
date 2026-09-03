import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { invoiceService } from '../api/invoiceService';
import type { InvoiceContract } from '@shared/contracts';
import { useAuth } from '@/hooks/useAuth';
import { BillingPage } from './BillingPage';

import enTranslations from '@/locales/en_US.json';

let mockLanguage = 'en_US';

const mockT = (key: string, options?: Record<string, unknown>) => {
  const parts = key.split('.');
  let current: unknown = enTranslations;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../api/invoiceService', () => ({
  invoiceService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    downloadInvoice: vi.fn(),
    markAsPaid: vi.fn(),
    cancelInvoice: vi.fn(),
    capturePaypalOrder: vi.fn(),
    createPaypalOrder: vi.fn(),
    getFinancialStats: vi.fn(),
  },
}));

const mockInvoices: InvoiceContract[] = [
  {
    id: 'inv-001',
    invoice_number: 'INV-2026-001',
    client_id: 'client-1',
    amount: 100,
    tax_amount: 18,
    total: 118,
    status: 'PENDING',
    due_date: '2026-09-01',
    invoice_date: '2026-08-20',
    created_at: '2026-08-20',
    line_items: [
      {
        description: 'Monthly Managed IT Service',
        quantity: 1,
        unit_price: 100,
      },
    ],
  },
  {
    id: 'inv-002',
    invoice_number: 'INV-2026-002',
    client_id: 'client-1',
    amount: 200,
    tax_amount: 36,
    total: 236,
    status: 'PAID',
    due_date: '2026-08-01',
    invoice_date: '2026-07-20',
    created_at: '2026-07-20',
    line_items: [],
  },
];

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderPage(initialEntries: string[]) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <BillingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BillingPage & InvoiceDetailsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoiceService.getAll).mockResolvedValue({
      data: mockInvoices,
      pagination: {
        total: 2,
        totalPages: 1,
      },
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1', email: 'client@test.com', role: 'CLIENT', tenant_id: 'tenant-1' } as any,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    } as any);
  });

  test('renders invoices table with records', async () => {
    renderPage(['/billing']);

    expect(await screen.findByText('INV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-002')).toBeInTheDocument();
  });

  test('opens InvoiceDetailsModal when clicking invoice number', async () => {
    renderPage(['/billing']);

    const invBtn = await screen.findByText('INV-2026-001');
    fireEvent.click(invBtn);

    expect(await screen.findByText('Monthly Managed IT Service')).toBeInTheDocument();
    expect(screen.getAllByText('$118.00').length).toBeGreaterThanOrEqual(2);
  });

  test('clicking Pay Now inside InvoiceDetailsModal opens PayModal without collision', async () => {
    renderPage(['/billing']);

    const invBtn = await screen.findByText('INV-2026-001');
    fireEvent.click(invBtn);

    expect(await screen.findByText('Monthly Managed IT Service')).toBeInTheDocument();

    const payNowBtn = screen.getByRole('button', { name: /Pay Now/i });
    fireEvent.click(payNowBtn);

    // PayModal opens
    await waitFor(() => {
      expect(screen.queryByText('Monthly Managed IT Service')).not.toBeInTheDocument();
      expect(screen.getByText(/SSL security/i)).toBeInTheDocument();
    });
  });

  test('deep link with ?openModal=pay-invoice&invoiceId=inv-001 directly opens PayModal without opening InvoiceDetailsModal', async () => {
    renderPage(['/billing?openModal=pay-invoice&invoiceId=inv-001']);

    await waitFor(() => {
      expect(screen.getByText(/SSL security/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Monthly Managed IT Service')).not.toBeInTheDocument();
  });

  test('deep link with ?invoiceId=inv-001 directly opens InvoiceDetailsModal', async () => {
    renderPage(['/billing?invoiceId=inv-001']);

    expect(await screen.findByText('Monthly Managed IT Service')).toBeInTheDocument();
  });
});
