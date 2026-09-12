import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { DeviceVaultModal } from './DeviceVaultModal';
import * as equipmentQueries from '../api/useEquipmentQueries';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../api/useEquipmentQueries', () => ({
  useDeviceVault: vi.fn(),
  useProvisionDeviceVault: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useRevokeDeviceVault: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useResetDeviceVault: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

describe('DeviceVaultModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders normal vault details when isLocked is false', () => {
    vi.mocked(equipmentQueries.useDeviceVault).mockReturnValue({
      data: {
        equipmentId: 'eq-123',
        status: 'ACTIVE',
        deviceEmail: 'device_01@tenant.local',
        collectionId: 'col-456',
        lastSyncedAt: '2026-09-01T12:00:00.000Z',
        deviceName: 'Reception-PC',
      },
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <DeviceVaultModal
          isOpen={true}
          onClose={vi.fn()}
          equipmentId="eq-123"
          deviceName="Reception-PC"
          isLocked={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Device Password Vault')).toBeInTheDocument();
    expect(screen.getByText('Active & Protected')).toBeInTheDocument();
    expect(screen.getByText('device_01@tenant.local')).toBeInTheDocument();
    expect(screen.getByText(/col-456/)).toBeInTheDocument();
    expect(screen.getByText('Revoke Device Vault')).toBeInTheDocument();
  });

  it('renders plan upgrade lock preview when isLocked is true', () => {
    vi.mocked(equipmentQueries.useDeviceVault).mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <DeviceVaultModal
          isOpen={true}
          onClose={onClose}
          equipmentId="eq-basic"
          deviceName="Basic-Workstation"
          isLocked={true}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Plan Upgrade Required')).toBeInTheDocument();
    expect(screen.getByText('Enterprise Password Manager')).toBeInTheDocument();
    expect(screen.getByText('What you unlock with this feature:')).toBeInTheDocument();
    expect(
      screen.getByText('Workstation credential autofill with zero plaintext exposure')
    ).toBeInTheDocument();

    const upgradeBtn = screen.getByRole('button', { name: /View Plans & Upgrade/i });
    expect(upgradeBtn).toBeInTheDocument();

    fireEvent.click(upgradeBtn);
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/plans?highlight=PL-003');
  });

  it('renders pending activation banner and Set Master Password button when activationUrl is present and isActivated is false', () => {
    vi.mocked(equipmentQueries.useDeviceVault).mockReturnValue({
      data: {
        equipmentId: 'eq-123',
        status: 'ACTIVE',
        deviceEmail: 'device_01@tenant.local',
        collectionId: 'col-456',
        lastSyncedAt: '2026-09-01T12:00:00.000Z',
        deviceName: 'Reception-PC',
        activationUrl: 'https://helpdesk.velmartech.com.do/vault/#/accept-organization/?token=mock',
        isActivated: false,
      },
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <DeviceVaultModal
          isOpen={true}
          onClose={vi.fn()}
          equipmentId="eq-123"
          deviceName="Reception-PC"
          isLocked={false}
        />
      </MemoryRouter>
    );

    expect(screen.getAllByText('Pending Activation').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText('Setup Required: Set Workstation Master Password')
    ).toBeInTheDocument();
    expect(screen.getAllByText('Set Master Password').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Copy Activation Link')).toBeInTheDocument();
  });

  it('renders enrolled & active confirmation when isActivated is true', () => {
    vi.mocked(equipmentQueries.useDeviceVault).mockReturnValue({
      data: {
        equipmentId: 'eq-123',
        status: 'ACTIVE',
        deviceEmail: 'device_01@tenant.local',
        collectionId: 'col-456',
        lastSyncedAt: '2026-09-01T12:00:00.000Z',
        deviceName: 'Reception-PC',
        isActivated: true,
      },
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    render(
      <MemoryRouter>
        <DeviceVaultModal
          isOpen={true}
          onClose={vi.fn()}
          equipmentId="eq-123"
          deviceName="Reception-PC"
          isLocked={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Active & Protected')).toBeInTheDocument();
    expect(
      screen.getByText('Workstation Vault Enrolled & Active')
    ).toBeInTheDocument();
  });
});
