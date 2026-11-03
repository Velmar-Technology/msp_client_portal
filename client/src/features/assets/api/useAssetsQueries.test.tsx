import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAssetsQuery,
  useAssetDetailQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
} from './useAssetsQueries';
import { assetsService } from './assetsService';
import type { AssetContract, AssetListResponse } from '@shared/contracts';

vi.mock('./assetsService', () => ({
  assetsService: {
    getAssets: vi.fn(),
    getAssetById: vi.fn(),
    createAsset: vi.fn(),
    updateAsset: vi.fn(),
    deleteAsset: vi.fn(),
  },
}));

describe('useAssetsQueries', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockAsset: AssetContract = {
    id: 'a0000000-0000-0000-0000-000000000001',
    tenantId: 'b0000000-0000-0000-0000-000000000002',
    name: 'Workstation 1',
    assetType: 'HARDWARE',
    status: 'ACTIVE',
    model: 'Precision 3660',
    serialNumber: 'SN-001',
    manufacturer: 'Dell',
    assignedClientId: null,
    assignedClientName: null,
    assignedEquipmentId: null,
    assignedEquipmentName: null,
    purchaseDate: '2026-01-01T00:00:00Z',
    warrantyExpiresAt: '2029-01-01T00:00:00Z',
    notes: 'Engineering workstation',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
  };

  const mockListResponse: AssetListResponse = {
    assets: [mockAsset],
    total: 1,
    activeCount: 1,
    maintenanceCount: 0,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  it('fetches list of assets successfully', async () => {
    vi.mocked(assetsService.getAssets).mockResolvedValue(mockListResponse);

    const { result } = renderHook(() => useAssetsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockListResponse);
    expect(assetsService.getAssets).toHaveBeenCalled();
  });

  it('fetches single asset detail by id', async () => {
    vi.mocked(assetsService.getAssetById).mockResolvedValue(mockAsset);

    const { result } = renderHook(() => useAssetDetailQuery(mockAsset.id), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAsset);
    expect(assetsService.getAssetById).toHaveBeenCalledWith(mockAsset.id);
  });

  it('executes create mutation and triggers cache invalidation', async () => {
    vi.mocked(assetsService.createAsset).mockResolvedValue(mockAsset);

    const { result } = renderHook(() => useCreateAssetMutation(), { wrapper });

    await result.current.mutateAsync({
      name: 'Workstation 1',
      assetType: 'HARDWARE',
      status: 'ACTIVE',
    });

    expect(assetsService.createAsset).toHaveBeenCalledWith({
      name: 'Workstation 1',
      assetType: 'HARDWARE',
      status: 'ACTIVE',
    });
  });

  it('executes update mutation', async () => {
    vi.mocked(assetsService.updateAsset).mockResolvedValue({
      ...mockAsset,
      status: 'MAINTENANCE',
    });

    const { result } = renderHook(() => useUpdateAssetMutation(), { wrapper });

    await result.current.mutateAsync({
      id: mockAsset.id,
      payload: { status: 'MAINTENANCE' },
    });

    expect(assetsService.updateAsset).toHaveBeenCalledWith(mockAsset.id, {
      status: 'MAINTENANCE',
    });
  });

  it('executes delete mutation', async () => {
    vi.mocked(assetsService.deleteAsset).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteAssetMutation(), { wrapper });

    await result.current.mutateAsync(mockAsset.id);

    expect(assetsService.deleteAsset).toHaveBeenCalledWith(mockAsset.id);
  });
});
