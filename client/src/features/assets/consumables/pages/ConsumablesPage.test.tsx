import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ConsumablesPage } from './ConsumablesPage';
import { consumablesService } from '../api/consumablesService';
import type { ConsumableContract, ConsumableListResponse } from '@shared/contracts';

vi.mock('../api/consumablesService', () => ({
  consumablesService: {
    getConsumables: vi.fn(),
    getConsumableById: vi.fn(),
    createConsumable: vi.fn(),
    updateConsumable: vi.fn(),
    deleteConsumable: vi.fn(),
    checkoutConsumable: vi.fn(),
    restockConsumable: vi.fn(),
    getConsumableCheckouts: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ConsumablesPage', () => {
  let queryClient: QueryClient;

  const mockConsumable: ConsumableContract = {
    id: 'c0000000-0000-0000-0000-000000000001',
    tenantId: 'b0000000-0000-0000-0000-000000000002',
    name: 'HP LaserJet Toner Black 58A',
    category: 'Toner / Ink',
    modelNumber: 'CF258A',
    manufacturer: 'HP',
    itemNumber: 'HP-CF258A',
    totalQuantity: 8,
    minQuantity: 3,
    location: 'Supply Closet B',
    purchaseCost: 115.0,
    alertState: 'NORMAL',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
    deletedAt: null,
  };

  const mockResponse: ConsumableListResponse = {
    consumables: [mockConsumable],
    total: 1,
    lowStockCount: 0,
    outOfStockCount: 0,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    vi.mocked(consumablesService.getConsumables).mockResolvedValue(mockResponse);
    vi.mocked(consumablesService.getConsumableCheckouts).mockResolvedValue([]);
  });

  const renderPage = () => {
    return render(
      <MemoryRouter initialEntries={['/assets/consumables']}>
        <QueryClientProvider client={queryClient}>
          <ConsumablesPage />
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it('renders page title and new consumable action button', async () => {
    renderPage();

    expect(screen.getByText(/Consumables & Supplies/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Consumable/i })).toBeInTheDocument();
  });

  it('renders KPI summary cards and table rows with fetched data', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('HP LaserJet Toner Black 58A')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/CF258A/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when no consumables are returned', async () => {
    vi.mocked(consumablesService.getConsumables).mockResolvedValue({
      consumables: [],
      total: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No consumable items found/i)).toBeInTheDocument();
    });
  });
});
