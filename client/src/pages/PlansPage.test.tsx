import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlansPage } from './PlansPage';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { userService } from '@/services/userService';
import { subscriptionService } from '@/services/subscriptionService';
import { useAuth } from '@/hooks/useAuth';
import { usePlanStore } from '@/store/usePlanStore';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockAddToast = vi.fn();
vi.mock('../store/useNotificationStore', () => ({
  useNotificationStore: () => ({
    addToast: mockAddToast,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/store/usePlanStore', () => ({
  usePlanStore: vi.fn(),
}));

vi.mock('@/services/userService', () => ({
  userService: {
    getClients: vi.fn(),
  },
}));

vi.mock('@/services/subscriptionService', () => ({
  subscriptionService: {
    create: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
  },
}));

const mockPlans = [
  {
    id: 'BASIC',
    name: 'Basic Support',
    description: 'Basic plan description',
    price: 199,
    features: [{ text: 'Email support', included: true }],
    recommended: false,
    created_at: '2026-06-22',
    updated_at: '2026-06-22',
  },
  {
    id: 'STANDARD',
    name: 'Standard Support',
    description: 'Standard plan description',
    price: 499,
    features: [{ text: '24/7 Phone support', included: true }],
    recommended: true,
    created_at: '2026-06-22',
    updated_at: '2026-06-22',
  },
];

const mockClients = [
  { id: 'client-1', name: 'Alice Customer', email: 'alice@example.com' },
  { id: 'client-2', name: 'Bob Customer', email: 'bob@example.com' },
];

describe('PlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default usePlanStore mock implementation
    vi.mocked(usePlanStore).mockReturnValue({
      plans: mockPlans,
      loading: false,
      error: null,
      fetchPlans: vi.fn().mockResolvedValue(undefined),
      updatePlan: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof usePlanStore>);
  });

  describe('Client Flow', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-client', role: 'CLIENT', name: 'John Doe', email: 'john@example.com', tenantId: 'tenant-1' },
        isAuthenticated: true,
      } as unknown as ReturnType<typeof useAuth>);
      vi.mocked(subscriptionService.getAll).mockResolvedValue([]);
    });

    test('renders plans and payment method for Client', async () => {
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Basic Support')).toBeInTheDocument();
      expect(screen.getByText('Standard Support')).toBeInTheDocument();
      expect(screen.getByText('plans.paymentMethod')).toBeInTheDocument();
      expect(screen.queryByText('Apply Plan to Customer')).not.toBeInTheDocument();
    });

    test('submits client subscription on Process Payment click', async () => {
      vi.mocked(subscriptionService.create).mockResolvedValue({ id: 'sub-new' } as unknown as Awaited<ReturnType<typeof subscriptionService.create>>);
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      // Select Standard Support
      const selectButton = screen.getByText('plans.selected: Standard Support');
      expect(selectButton).toBeInTheDocument();

      const payButton = screen.getByText('plans.processPayment');
      fireEvent.click(payButton);

      await waitFor(() => {
        expect(subscriptionService.create).toHaveBeenCalledWith({
          serviceName: 'Standard Support',
          plan: 'STANDARD',
          equipmentCount: 1,
          clientId: undefined,
          billingCycle: 'monthly',
        });
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Subscribed Successfully',
            type: 'success',
          })
        );
      });
    });

    test('updates pricing and calculations when toggling to Annually', async () => {
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      // Verify default monthly pricing for Standard Support card
      expect(screen.getByText('$499')).toBeInTheDocument();

      // Click Annually button
      const annualButton = screen.getByRole('button', { name: /Annually/i });
      fireEvent.click(annualButton);

      // Verify discounted monthly equivalent price on Standard Support card
      expect(screen.getByText('$399.20')).toBeInTheDocument();
      expect(screen.getByText('Billed annually as $4790.40/yr')).toBeInTheDocument();

      // Verify Order Summary subtotal, tax, and total
      // subtotal = 499 * 12 * 0.8 = 4790.40
      // tax = 4790.40 * 0.16 = 766.46
      // total = 4790.40 + 766.46 = 5556.86
      expect(screen.getByText('$4790.40')).toBeInTheDocument();
      expect(screen.getByText('$766.46')).toBeInTheDocument();
      expect(screen.getByText('$5556.86')).toBeInTheDocument();
    });

    test('submits client subscription with billingCycle = annual when toggled', async () => {
      vi.mocked(subscriptionService.create).mockResolvedValue({ id: 'sub-new' } as unknown as Awaited<ReturnType<typeof subscriptionService.create>>);
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      // Toggle to Annually
      const annualButton = screen.getByRole('button', { name: /Annually/i });
      fireEvent.click(annualButton);

      const payButton = screen.getByText('plans.processPayment');
      fireEvent.click(payButton);

      await waitFor(() => {
        expect(subscriptionService.create).toHaveBeenCalledWith({
          serviceName: 'Standard Support',
          plan: 'STANDARD',
          equipmentCount: 1,
          clientId: undefined,
          billingCycle: 'annual',
        });
      });
    });

    test('renders Active badge and Cancel button when active subscription is present', async () => {
      const activeSub = {
        id: 'sub-active',
        client_id: 'user-client',
        service_name: 'Standard Support',
        plan: 'STANDARD',
        status: 'ACTIVE',
        renewal_date: '2026-07-22T00:00:00.000Z',
        equipment_count: 1,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      };
      vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub]);

      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Manage Active Subscription')).toBeInTheDocument();
        expect(screen.getByText('Cancel Subscription')).toBeInTheDocument();
      });
    });

    test('submits cancellation update on Cancel click', async () => {
      const activeSub = {
        id: 'sub-active',
        client_id: 'user-client',
        service_name: 'Standard Support',
        plan: 'STANDARD',
        status: 'ACTIVE',
        renewal_date: '2026-07-22T00:00:00.000Z',
        equipment_count: 1,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      };
      vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub]);
      vi.mocked(subscriptionService.update).mockResolvedValue({ ...activeSub, status: 'CANCELLED' });

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel Subscription')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel Subscription'));

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalled();
        expect(subscriptionService.update).toHaveBeenCalledWith('sub-active', {
          status: 'CANCELLED',
        });
      });
    });

    test('renders modification panel and submits updates on different plan select', async () => {
      const activeSub = {
        id: 'sub-active',
        client_id: 'user-client',
        service_name: 'Standard Support',
        plan: 'STANDARD',
        status: 'ACTIVE',
        renewal_date: '2026-07-22T00:00:00.000Z',
        equipment_count: 1,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      };
      vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub]);
      vi.mocked(subscriptionService.update).mockResolvedValue({ ...activeSub, plan: 'BASIC' });

      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });

      // Select Basic Support card
      fireEvent.click(screen.getByText('plans.select Basic Support'));

      await waitFor(() => {
        expect(screen.getByText('Subscription Modification')).toBeInTheDocument();
        expect(screen.getByText('Update Subscription')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Update Subscription'));

      await waitFor(() => {
        expect(subscriptionService.update).toHaveBeenCalledWith('sub-active', {
          plan: 'BASIC',
          equipmentCount: 1,
        });
      });
    });
  });

  describe('Admin Flow', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-admin', role: 'ADMIN', name: 'Admin User', email: 'admin@example.com', tenantId: 'tenant-1' },
        isAuthenticated: true,
      } as unknown as ReturnType<typeof useAuth>);

      vi.mocked(userService.getClients).mockResolvedValue(mockClients as unknown as Awaited<ReturnType<typeof userService.getClients>>);
    });

    test('renders admin customer assignment section instead of payment method', async () => {
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(userService.getClients).toHaveBeenCalled();
        expect(screen.getByRole('heading', { name: /Apply Plan to Customer/i })).toBeInTheDocument();
        expect(screen.getByLabelText('Select Customer')).toBeInTheDocument();
      });

      expect(screen.queryByText('plans.paymentMethod')).not.toBeInTheDocument();
    });

    test('submits admin client assignment with selected clientId', async () => {
      vi.mocked(subscriptionService.create).mockResolvedValue({ id: 'sub-new' } as unknown as Awaited<ReturnType<typeof subscriptionService.create>>);
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Select Customer')).toBeInTheDocument();
      });

      // Change customer dropdown
      const select = screen.getByLabelText('Select Customer');
      fireEvent.change(select, { target: { value: 'client-2' } });

      const applyButton = screen.getByRole('button', { name: /Apply Plan to Customer/i });
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(subscriptionService.create).toHaveBeenCalledWith({
          serviceName: 'Standard Support',
          plan: 'STANDARD',
          equipmentCount: 1,
          clientId: 'client-2',
          billingCycle: 'monthly',
        });
        expect(mockAddToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Plan Applied',
            type: 'success',
          })
        );
      });
    });
  });
});
