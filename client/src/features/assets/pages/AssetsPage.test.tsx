import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AssetsPage } from './AssetsPage';
import { assetsService } from '../api/assetsService';
import type { AssetContract, AssetListResponse, ConsumableListResponse } from '@shared/contracts';

vi.mock('../api/assetsService', () => ({
  assetsService: {
    getAssets: vi.fn(),
    createAsset: vi.fn(),
    updateAsset: vi.fn(),
    deleteAsset: vi.fn(),
    getConsumables: vi.fn(),
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

describe('AssetsPage', () => {
  let queryClient: QueryClient;

  const mockAsset: AssetContract = {
    id: 'a0000000-0000-0000-0000-000000000001',
    tenantId: 'b0000000-0000-0000-0000-000000000002',
    name: 'Main Gateway Fortigate 60F',
    assetType: 'NETWORK',
    status: 'ACTIVE',
    model: 'FG-60F',
    serialNumber: 'FGT60FTK21000123',
    manufacturer: 'Fortinet',
    assignedClientId: null,
    assignedClientName: null,
    assignedEquipmentId: null,
    assignedEquipmentName: null,
    purchaseDate: '2026-02-01T00:00:00Z',
    warrantyExpiresAt: '2028-02-01T00:00:00Z',
    notes: 'Gateway appliance rack 1',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
    deletedAt: null,
  };

  const mockResponse: AssetListResponse = {
    assets: [mockAsset],
    total: 1,
    activeCount: 1,
    maintenanceCount: 0,
  };

  const mockConsumableResponse: ConsumableListResponse = {
    consumables: [],
    total: 0,
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
    vi.mocked(assetsService.getConsumables).mockResolvedValue(mockConsumableResponse);
  });

  const renderPage = () => {
    return render(
      <MemoryRouter initialEntries={['/assets']}>
        <QueryClientProvider client={queryClient}>
          <AssetsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it('renders page header and action buttons', async () => {
    vi.mocked(assetsService.getAssets).mockResolvedValue(mockResponse);

    renderPage();

    expect(screen.getByText(/Asset & Inventory Management/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Asset/i })).toBeInTheDocument();
  });

  it('renders KPI summary cards and table rows with fetched data', async () => {
    vi.mocked(assetsService.getAssets).mockResolvedValue(mockResponse);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Main Gateway Fortigate 60F')).toBeInTheDocument();
    });

    expect(screen.getByText('Fortinet FG-60F')).toBeInTheDocument();
    expect(screen.getByText('FGT60FTK21000123')).toBeInTheDocument();
  });

  it('renders empty state when no assets are returned', async () => {
    vi.mocked(assetsService.getAssets).mockResolvedValue({
      assets: [],
      total: 0,
      activeCount: 0,
      maintenanceCount: 0,
    });
    vi.mocked(assetsService.getConsumables).mockResolvedValue({
      consumables: [],
      total: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No IT assets found/i)).toBeInTheDocument();
    });
  });

  it('renders consumables tab when clicked', async () => {
    vi.mocked(assetsService.getAssets).mockResolvedValue(mockResponse);
    vi.mocked(assetsService.getConsumables).mockResolvedValue({
      consumables: [
        {
          id: 'c0000000-0000-0000-0000-000000000001',
          tenantId: 'b0000000-0000-0000-0000-000000000002',
          name: 'HP 58A Black Toner',
          category: 'Toner / Ink',
          modelNumber: 'CF258A',
          itemNumber: 'SKU-58A',
          manufacturer: 'HP',
          totalQuantity: 2,
          minQuantity: 5,
          location: 'Supply Closet B',
          purchaseCost: 89.99,
          alertState: 'LOW_STOCK_NOTIFIED',
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-02-01T00:00:00Z',
          deletedAt: null,
        },
      ],
      total: 1,
      lowStockCount: 1,
      outOfStockCount: 0,
    });

    renderPage();

    const consumablesTab = screen.getByRole('tab', { name: /Consumables/i });
    fireEvent.click(consumablesTab);

    await waitFor(() => {
      expect(screen.getByText('HP 58A Black Toner')).toBeInTheDocument();
      expect(screen.getAllByText(/Low Stock/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders consumables tab directly when ?tab=consumables URL query parameter is present', async () => {
    vi.mocked(assetsService.getAssets).mockResolvedValue(mockResponse);
    vi.mocked(assetsService.getConsumables).mockResolvedValue({
      consumables: [
        {
          id: 'c0000000-0000-0000-0000-000000000001',
          tenantId: 'b0000000-0000-0000-0000-000000000002',
          name: 'Direct URL Toner',
          category: 'Toner / Ink',
          modelNumber: 'CF258A',
          itemNumber: 'SKU-58A',
          manufacturer: 'HP',
          totalQuantity: 5,
          minQuantity: 5,
          location: 'Supply Closet B',
          purchaseCost: 89.99,
          alertState: 'NORMAL',
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-02-01T00:00:00Z',
          deletedAt: null,
        },
      ],
      total: 1,
      lowStockCount: 0,
      outOfStockCount: 0,
    });

    render(
      <MemoryRouter initialEntries={['/assets?tab=consumables']}>
        <QueryClientProvider client={queryClient}>
          <AssetsPage />
        </QueryClientProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Direct URL Toner')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Add Consumable/i })).toBeInTheDocument();
  });
});
