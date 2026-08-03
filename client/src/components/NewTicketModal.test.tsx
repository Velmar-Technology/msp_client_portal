import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { NewTicketModal } from '@/components/NewTicketModal';
import { ticketService, type Ticket } from '@/services/ticketService';
import { equipmentService, type SubscriptionEquipment } from '@/services/equipmentService';
import enTranslations from "@/locales/en_US.json";

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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string | number>) => {
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
    },
    i18n: {
      language: 'en_US',
      changeLanguage: () => Promise.resolve(),
    },
  }),
}));

const expiringPlanDevice: SubscriptionEquipment = {
  id: '11111111-1111-1111-1111-111111111111',
  subscription_id: '22222222-2222-2222-2222-222222222222',
  slot_index: 0,
  status: 'ACTIVE',
  device_name: 'Workstation Alpha',
  device_serial: 'SN-001',
  tenant_id: 'tenant-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function renderModal(onCreated = vi.fn()) {
  return {
    onCreated,
    ...render(<NewTicketModal onClose={() => {}} onCreated={onCreated} />),
  };
}

function getDeviceSelect(): HTMLSelectElement {
  const deviceSelect = screen.getAllByRole('combobox').find((s) =>
    Array.from(s.querySelectorAll('option')).some((o) => o.textContent === expiringPlanDevice.device_name)
  );
  if (!deviceSelect) throw new Error('Device select not found');
  return deviceSelect as HTMLSelectElement;
}

describe('NewTicketModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(ticketService.uploadAttachment).mockResolvedValue({} as unknown as Awaited<ReturnType<typeof ticketService.uploadAttachment>>);
  });

  test('renders a device dropdown with devices from an expiring plan subscription', async () => {
    vi.mocked(equipmentService.getMyDevices).mockResolvedValue([expiringPlanDevice]);

    renderModal();

    await waitFor(() => {
      expect(getDeviceSelect()).toBeInTheDocument();
    });
    expect(screen.getByRole('option', { name: 'Select a device...' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Workstation Alpha' })).toBeInTheDocument();
  });

  test('shows a loading indicator while devices are being fetched', () => {
    vi.mocked(equipmentService.getMyDevices).mockReturnValue(new Promise(() => {}));

    renderModal();

    expect(screen.getByText('Loading devices...')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Workstation Alpha' })).not.toBeInTheDocument();
  });

  test('shows an error note instead of the dropdown when device loading fails', async () => {
    vi.mocked(equipmentService.getMyDevices).mockRejectedValue(new Error('network down'));

    renderModal();

    await waitFor(() => {
      expect(screen.getByText("Couldn't load your devices. Try refreshing the page.")).toBeInTheDocument();
    });
    expect(screen.queryByRole('option', { name: 'Workstation Alpha' })).not.toBeInTheDocument();
  });

  test('hides the device section when the client has no devices', async () => {
    vi.mocked(equipmentService.getMyDevices).mockResolvedValue([]);

    renderModal();

    await waitFor(() => {
      expect(screen.queryByText('Device (Optional)')).not.toBeInTheDocument();
    });
  });

  test('creates a ticket bound to the selected device', async () => {
    vi.mocked(equipmentService.getMyDevices).mockResolvedValue([expiringPlanDevice]);
    vi.mocked(ticketService.create).mockResolvedValue({ id: 'ticket-1' } as unknown as Ticket);

    const { onCreated } = renderModal();

    await waitFor(() => {
      expect(getDeviceSelect()).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Broken screen on laptop' } });
    fireEvent.change(screen.getByPlaceholderText('Detailed description of the problem...'), {
      target: { value: 'The screen is cracked and keeps flickering when opened.' },
    });
    fireEvent.change(getDeviceSelect(), { target: { value: expiringPlanDevice.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }));

    await waitFor(() => {
      expect(ticketService.create).toHaveBeenCalledWith(
        expect.objectContaining({ equipmentId: expiringPlanDevice.id })
      );
    });
    expect(onCreated).toHaveBeenCalled();
  });
});
