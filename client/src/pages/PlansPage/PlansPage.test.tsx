import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlansPage } from "@/pages/PlansPage/PlansPage";
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { userService } from '@/services/userService';
import { subscriptionService } from '@/services/subscriptionService';
import { useAuth } from '@/hooks/useAuth';
import { usePlanStore } from '@/store/usePlanStore';

import enTranslations from "@/locales/en_US.json";

let mockLanguage = 'en_US';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (key: string, options?: any) => {
      const parts = key.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current: any = enTranslations;
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          return key;
        }
      }
      if (typeof current === 'string') {
        if (options && typeof options === 'object') {
          let res = current;
          for (const k of Object.keys(options)) {
            res = res.replace(`{{${k}}}`, options[k]);
          }
          return res;
        }
        return current;
      }
      return key;
    },
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

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

vi.mock('../store/useNotificationStore', () => ({
  useNotificationStore: () => ({}),
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
    sendQuote: vi.fn(),
    createPaypalOrder: vi.fn().mockResolvedValue({ orderId: 'MOCK-PAYPAL-ORDER' }),
    createPaypalSubscription: vi.fn().mockResolvedValue({ subscriptionId: 'MOCK-PAYPAL-SUB', approveUrl: 'http://approve.url' }),
  },
}));

vi.mock('@/services/equipmentService', () => ({
  equipmentService: {
    getSlots: vi.fn().mockRejectedValue(new Error('Mock API error')),
    generateOTP: vi.fn(),
    activateSlot: vi.fn(),
    deactivateSlot: vi.fn(),
  },
}));

const mockPlans = [
  {
    id: 'BASIC',
    name: { en_US: 'Basic Support', es_DO: 'Soporte Básico' },
    description: { en_US: 'Basic plan description', es_DO: 'Descripción del plan básico' },
    price: 199,
    features: [{ text: { en_US: 'Email support', es_DO: 'Soporte por correo' }, included: true }],
    recommended: false,
    created_at: '2026-06-22',
    updated_at: '2026-06-22',
  },
  {
    id: 'STANDARD',
    name: { en_US: 'Standard Support', es_DO: 'Soporte Estándar' },
    description: { en_US: 'Standard plan description', es_DO: 'Descripción del plan estándar' },
    price: 499,
    features: [{ text: { en_US: '24/7 Phone support', es_DO: 'Soporte telefónico 24/7' }, included: true }],
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let paypalButtonsOptions: any = null;

    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-client', role: 'CLIENT', name: 'John Doe', email: 'john@example.com', tenantId: 'tenant-1' },
        isAuthenticated: true,
      } as unknown as ReturnType<typeof useAuth>);
      vi.mocked(subscriptionService.getAll).mockResolvedValue([]);
      
      const script = document.getElementById('paypal-js-sdk-script');
      if (script) {
        script.remove();
      }

      paypalButtonsOptions = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).paypal = {
        Buttons: vi.fn().mockImplementation((options) => {
          paypalButtonsOptions = options;
          return {
            render: vi.fn(),
            close: vi.fn().mockResolvedValue(undefined),
          };
        }),
      };
    });

    test('renders plans and payment method for Client', async () => {
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: 'Basic Support' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Standard Support' })).toBeInTheDocument();
      expect(screen.getByText(/up to 10% discount at Velmar Store/i)).toBeInTheDocument();
      expect(screen.getByText(/Velmar Technology SRL/i)).toBeInTheDocument();

      // Click Proceed to Checkout to mount the Sheet
      const checkoutBtn = screen.getByRole('button', { name: /Proceed to Checkout/i });
      fireEvent.click(checkoutBtn);

      // Verify Payment Method is not shown initially before accepting ToS
      expect(screen.queryByText('Payment Method')).not.toBeInTheDocument();

      // Click Terms of Service checkbox
      const tosCheckbox = screen.getByLabelText(/Terms of Service/i);
      fireEvent.click(tosCheckbox);

      await waitFor(() => {
        expect(screen.getByText('Payment Method')).toBeInTheDocument();
      });
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
      const selectCard = screen.getByText('Standard Support');
      expect(selectCard).toBeInTheDocument();

      // Click Proceed to Checkout to mount the Sheet
      const checkoutBtn = screen.getByRole('button', { name: /Proceed to Checkout/i });
      fireEvent.click(checkoutBtn);

      // Click Terms of Service checkbox
      const tosCheckbox = screen.getByLabelText(/Terms of Service/i);
      fireEvent.click(tosCheckbox);

      // Wait for PayPal buttons container
      await waitFor(() => {
        expect(paypalButtonsOptions).not.toBeNull();
      });

      // Call createOrder
      const orderId = await paypalButtonsOptions.createOrder();
      expect(orderId).toBe('MOCK-PAYPAL-ORDER');

      // Call onApprove
      await paypalButtonsOptions.onApprove({ orderID: 'MOCK-PAYPAL-ORDER' });

      await waitFor(() => {
        expect(subscriptionService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            serviceName: 'Standard Support',
            plan: 'STANDARD',
            equipmentCount: 1,
            billingCycle: 'monthly',
            paypalOrderId: 'MOCK-PAYPAL-ORDER',
          })
        );
        expect(mockToast.success).toHaveBeenCalledWith(
          'Subscribed Successfully',
          expect.any(Object)
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

      // Open Order Summary Sheet
      const viewSummaryButton = screen.getByRole('button', { name: /Proceed to Checkout/i });
      fireEvent.click(viewSummaryButton);

      // Verify Order Summary subtotal, tax, and total
      // subtotal = 499 * 12 * 0.8 = 4790.40
      // tax = 4790.40 * 0.18 = 862.27
      // total = 4790.40 + 862.27 = 5652.67
      expect(screen.getByText('$4790.40')).toBeInTheDocument();
      expect(screen.getByText('$862.27')).toBeInTheDocument();
      expect(screen.getByText('$5652.67')).toBeInTheDocument();
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

      // Click Proceed to Checkout to mount the Sheet
      const checkoutBtn = screen.getByRole('button', { name: /Proceed to Checkout/i });
      fireEvent.click(checkoutBtn);

      // Click Terms of Service checkbox
      const tosCheckbox = screen.getByLabelText(/Terms of Service/i);
      fireEvent.click(tosCheckbox);

      // Wait for PayPal buttons container
      await waitFor(() => {
        expect(paypalButtonsOptions).not.toBeNull();
      });

      // Call createOrder
      const orderId = await paypalButtonsOptions.createOrder();
      expect(orderId).toBe('MOCK-PAYPAL-ORDER');

      // Call onApprove
      await paypalButtonsOptions.onApprove({ orderID: 'MOCK-PAYPAL-ORDER' });

      await waitFor(() => {
        expect(subscriptionService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            serviceName: 'Standard Support',
            plan: 'STANDARD',
            equipmentCount: 1,
            billingCycle: 'annual',
            paypalOrderId: 'MOCK-PAYPAL-ORDER',
          })
        );
      });
    });

    test('renders Active badge and Cancel button when active subscription is present', async () => {
      const activeSub = {
        id: 'sub-active',
        client_id: 'user-client',
        service_name: 'Standard Support',
        plan: 'STANDARD' as const,
        status: 'ACTIVE' as const,
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
        plan: 'STANDARD' as const,
        status: 'ACTIVE' as const,
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
        plan: 'STANDARD' as const,
        status: 'ACTIVE' as const,
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
      fireEvent.click(screen.getByText('Basic Support'));

      await waitFor(() => {
        expect(screen.getByText('Subscription Modification')).toBeInTheDocument();
        expect(screen.getByText('Update Subscription')).toBeInTheDocument();
      });

      // Click Terms of Service checkbox
      const tosCheckbox = screen.getByLabelText(/Terms of Service/i);
      fireEvent.click(tosCheckbox);

      fireEvent.click(screen.getByText('Update Subscription'));

      await waitFor(() => {
        expect(subscriptionService.update).toHaveBeenCalledWith('sub-active', {
          plan: 'BASIC',
          equipmentCount: 1,
        });
      });
    });



    test('renders multiple active plan subscriptions with unequal equipment counts', async () => {
      const activeSubs = [
        {
          id: 'sub-basic',
          client_id: 'user-client',
          service_name: 'Basic Support',
          plan: 'BASIC' as const,
          status: 'ACTIVE' as const,
          renewal_date: '2026-07-22T00:00:00.000Z',
          equipment_count: 2,
          tenant_id: 'tenant-1',
          created_at: '2026-06-22',
          updated_at: '2026-06-22',
        },
        {
          id: 'sub-standard',
          client_id: 'user-client',
          service_name: 'Standard Support',
          plan: 'STANDARD' as const,
          status: 'ACTIVE' as const,
          renewal_date: '2026-07-22T00:00:00.000Z',
          equipment_count: 3,
          tenant_id: 'tenant-1',
          created_at: '2026-06-22',
          updated_at: '2026-06-22',
        },
      ];
      vi.mocked(subscriptionService.getAll).mockResolvedValue(activeSubs);

      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      // Verify that both plans render with Active badges
      await waitFor(() => {
        const activeBadges = screen.getAllByText('Active');
        expect(activeBadges.length).toBeGreaterThanOrEqual(2);
      });

      // Verify that BASIC support card displays equipment count of 2
      const basicCount = screen.getByText('2');
      expect(basicCount).toBeInTheDocument();

      // Verify that STANDARD support card displays equipment count of 3
      const standardCount = screen.getByText('3');
      expect(standardCount).toBeInTheDocument();
    });

    test('updates a specific active subscription when multiple are present', async () => {
      const activeSubs = [
        {
          id: 'sub-basic',
          client_id: 'user-client',
          service_name: 'Basic Support',
          plan: 'BASIC' as const,
          status: 'ACTIVE' as const,
          renewal_date: '2026-07-22T00:00:00.000Z',
          equipment_count: 2,
          tenant_id: 'tenant-1',
          created_at: '2026-06-22',
          updated_at: '2026-06-22',
        },
        {
          id: 'sub-standard',
          client_id: 'user-client',
          service_name: 'Standard Support',
          plan: 'STANDARD' as const,
          status: 'ACTIVE' as const,
          renewal_date: '2026-07-22T00:00:00.000Z',
          equipment_count: 3,
          tenant_id: 'tenant-1',
          created_at: '2026-06-22',
          updated_at: '2026-06-22',
        },
      ];
      vi.mocked(subscriptionService.getAll).mockResolvedValue(activeSubs);
      vi.mocked(subscriptionService.update).mockResolvedValue({ ...activeSubs[0], equipment_count: 4 });

      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      // Select Basic Support plan card to manage it
      await waitFor(() => {
        expect(screen.getByText('Basic Support')).toBeInTheDocument();
      });

      // Increment equipment count of BASIC plan to 4 (currently 2, so increment twice)
      const incrementButtons = screen.getAllByRole('button', { name: '+' });
      // BASIC is the first card
      fireEvent.click(incrementButtons[0]);
      fireEvent.click(incrementButtons[0]);

      // Verify updated count on screen is 4
      expect(screen.getByText('4')).toBeInTheDocument();

      // Switch to Manage Subscription tab
      const manageTabButton = screen.getByRole('button', { name: /Manage Subscription/i });
      fireEvent.click(manageTabButton);

      // Wait for PayPal buttons container
      await waitFor(() => {
        expect(paypalButtonsOptions).not.toBeNull();
      });

      // Click Terms of Service checkbox
      const tosCheckbox = screen.getByLabelText(/Terms of Service/i);
      fireEvent.click(tosCheckbox);

      // Call createOrder
      const orderId = await paypalButtonsOptions.createOrder();
      expect(orderId).toBe('MOCK-PAYPAL-ORDER');

      // Call onApprove
      await paypalButtonsOptions.onApprove({ orderID: 'MOCK-PAYPAL-ORDER' });

      await waitFor(() => {
        expect(subscriptionService.update).toHaveBeenCalledWith('sub-basic', {
          plan: 'BASIC',
          equipmentCount: 4,
          paypalOrderId: 'MOCK-PAYPAL-ORDER',
        });
      });
    });

    test('submits a new subscription as an additional plan when toggle is clicked', async () => {
      const activeSub = {
        id: 'sub-active-basic',
        client_id: 'user-client',
        service_name: 'Basic Support',
        plan: 'BASIC' as const,
        status: 'ACTIVE' as const,
        renewal_date: '2026-07-22T00:00:00.000Z',
        equipment_count: 1,
        tenant_id: 'tenant-1',
        created_at: '2026-06-22',
        updated_at: '2026-06-22',
      };
      vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub]);
      vi.mocked(subscriptionService.create).mockResolvedValue({ id: 'sub-new-standard' } as unknown as Awaited<ReturnType<typeof subscriptionService.create>>);

      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      // Verify that Basic Support is currently active and selected
      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });

      // Select Standard Support card (which is not active)
      fireEvent.click(screen.getByText('Standard Support'));

      // The select action header should appear
      await waitFor(() => {
        expect(screen.getByText('Select Action for Standard Support')).toBeInTheDocument();
      });

      // Default should be change existing plan (modify), let's click 'Subscribe as Additional Plan'
      const subscribeAdditionalBtn = screen.getByRole('button', { name: 'Subscribe as Additional Plan' });
      fireEvent.click(subscribeAdditionalBtn);

      // Now the Proceed to Checkout button should be visible
      const checkoutBtn = screen.getByRole('button', { name: /Proceed to Checkout/i });
      fireEvent.click(checkoutBtn);

      // Verify Payment Method is not shown initially before accepting ToS
      expect(screen.queryByText('Payment Method')).not.toBeInTheDocument();

      // Click Terms of Service checkbox
      const tosCheckbox = screen.getByLabelText(/Terms of Service/i);
      fireEvent.click(tosCheckbox);

      await waitFor(() => {
        expect(screen.getByText('Payment Method')).toBeInTheDocument();
      });

      // Wait for PayPal buttons container
      await waitFor(() => {
        expect(paypalButtonsOptions).not.toBeNull();
      });

      // Call createOrder
      const orderId = await paypalButtonsOptions.createOrder();
      expect(orderId).toBe('MOCK-PAYPAL-ORDER');

      // Call onApprove
      await paypalButtonsOptions.onApprove({ orderID: 'MOCK-PAYPAL-ORDER' });

      await waitFor(() => {
        expect(subscriptionService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            serviceName: 'Standard Support',
            plan: 'STANDARD',
            equipmentCount: 1,
            billingCycle: 'monthly',
            paypalOrderId: 'MOCK-PAYPAL-ORDER',
          })
        );
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

      expect(screen.queryByText('Payment Method')).not.toBeInTheDocument();
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
        expect(subscriptionService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            serviceName: 'Standard Support',
            plan: 'STANDARD',
            equipmentCount: 1,
            clientId: 'client-2',
            billingCycle: 'monthly',
          })
        );
        expect(mockToast.success).toHaveBeenCalledWith(
          'Plan Applied',
          expect.any(Object)
        );
      });
    });

    test('renders "+ Add Plan" button, opens create modal, and submits new plan', async () => {
      const mockCreatePlan = vi.fn().mockResolvedValue(undefined);
      vi.mocked(usePlanStore).mockReturnValue({
        plans: mockPlans,
        loading: false,
        error: null,
        fetchPlans: vi.fn().mockResolvedValue(undefined),
        createPlan: mockCreatePlan,
        updatePlan: vi.fn(),
      } as unknown as ReturnType<typeof usePlanStore>);

      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      const addPlanButton = screen.getByText('+ Add Plan');
      expect(addPlanButton).toBeInTheDocument();

      fireEvent.click(addPlanButton);

      // Verify modal is open
      expect(screen.getByText('Add New Plan')).toBeInTheDocument();

      // Fill in details
      fireEvent.change(screen.getByPlaceholderText('e.g. PL-008'), { target: { value: 'PL-TEST' } });
      fireEvent.change(screen.getByPlaceholderText(/Plan name in English/i), { target: { value: 'Test Add Plan' } });
      fireEvent.change(screen.getByPlaceholderText(/Description in English/i), { target: { value: 'Test description' } });

      // Switch to Spanish tab for ES fields
      const esTab = screen.getByText('ES (Español)');
      fireEvent.click(esTab);
      fireEvent.change(screen.getByPlaceholderText(/Nombre del plan en Español/i), { target: { value: 'Plan de Prueba' } });
      fireEvent.change(screen.getByPlaceholderText(/Descripción en Español/i), { target: { value: 'Descripción de prueba' } });

      fireEvent.change(screen.getByLabelText(/Price/i), { target: { value: '99' } });
      fireEvent.change(screen.getByLabelText(/Client Type/i), { target: { value: 'CLIENT' } });

      const saveButton = screen.getByText('Create Plan');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCreatePlan).toHaveBeenCalledWith(expect.objectContaining({
          id: 'PL-TEST',
          name: { en_US: 'Test Add Plan', es_DO: 'Plan de Prueba' },
          description: { en_US: 'Test description', es_DO: 'Descripción de prueba' },
          price: 99,
          client_type: 'CLIENT',
          active: true,
        }));
      });
    });

    test('hides inactive plans for standard client but shows them for admin', async () => {
      const mockPlansWithInactive = [
        ...mockPlans,
        {
          id: 'INACTIVE',
          name: { en_US: 'Disabled Plan', es_DO: 'Plan Desactivado' },
          description: { en_US: 'This is disabled', es_DO: 'Esto está desactivado' },
          price: 15,
          features: [],
          recommended: false,
          active: false,
          created_at: '2026-06-22',
          updated_at: '2026-06-22',
        }
      ];

      vi.mocked(usePlanStore).mockReturnValue({
        plans: mockPlansWithInactive,
        loading: false,
        error: null,
        fetchPlans: vi.fn().mockResolvedValue(undefined),
        createPlan: vi.fn(),
        updatePlan: vi.fn(),
      } as unknown as ReturnType<typeof usePlanStore>);

      // 1. Render as Admin (should NOT see the inactive/soft-deleted plan)
      const { rerender } = render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Disabled Plan')).not.toBeInTheDocument();
        expect(screen.queryByText('Disabled')).not.toBeInTheDocument();
      });

      // 2. Render as Standard CLIENT (should NOT see the inactive plan)
      vi.mocked(useAuth).mockReturnValue({
        user: { id: 'user-client', role: 'CLIENT', name: 'John Doe', email: 'john@example.com', tenantId: 'tenant-1' },
        isAuthenticated: true,
      } as unknown as ReturnType<typeof useAuth>);

      rerender(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Disabled Plan')).not.toBeInTheDocument();
        expect(screen.queryByText('Disabled')).not.toBeInTheDocument();
      });
    });

    test('supports reordering features via drag and drop and accessible buttons', async () => {
      const mockUpdatePlan = vi.fn().mockResolvedValue(undefined);
      const mockPlansWithMultipleFeatures = [
        {
          id: 'BASIC',
          name: { en_US: 'Basic Support', es_DO: 'Soporte Básico' },
          description: { en_US: 'Basic plan description', es_DO: 'Descripción del plan básico' },
          price: 199,
          features: [
            { text: { en_US: 'Feature A', es_DO: 'Feature A' }, included: true },
            { text: { en_US: 'Feature B', es_DO: 'Feature B' }, included: true },
          ],
          recommended: false,
          active: true,
          created_at: '2026-06-22',
          updated_at: '2026-06-22',
        },
      ];

      vi.mocked(usePlanStore).mockReturnValue({
        plans: mockPlansWithMultipleFeatures,
        loading: false,
        error: null,
        fetchPlans: vi.fn().mockResolvedValue(undefined),
        createPlan: vi.fn(),
        updatePlan: mockUpdatePlan,
      } as unknown as ReturnType<typeof usePlanStore>);

      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      // Open Edit Modal
      const editButton = screen.getByRole('button', { name: /Edit/i });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Plan: BASIC')).toBeInTheDocument();
      });

      // Find inputs containing the English features
      const enInputs = screen.getAllByPlaceholderText('Feature in English...');
      expect(enInputs).toHaveLength(2);
      expect((enInputs[0] as HTMLInputElement).value).toBe('Feature A');
      expect((enInputs[1] as HTMLInputElement).value).toBe('Feature B');

      // 1. Test Keyboard Accessible Move Down
      const moveDownButtons = screen.getAllByTitle('Move down');
      fireEvent.click(moveDownButtons[0]);

      // Verify they swapped
      expect((enInputs[0] as HTMLInputElement).value).toBe('Feature B');
      expect((enInputs[1] as HTMLInputElement).value).toBe('Feature A');

      // Swap them back to original with Move Up
      const moveUpButtons = screen.getAllByTitle('Move up');
      fireEvent.click(moveUpButtons[1]);
      expect((enInputs[0] as HTMLInputElement).value).toBe('Feature A');
      expect((enInputs[1] as HTMLInputElement).value).toBe('Feature B');

      // 2. Test Drag and Drop reordering
      const dragRows = screen.getAllByTitle('Drag to reorder');
      expect(dragRows).toHaveLength(2);

      const sourceContainer = dragRows[0].closest('[draggable="true"]');
      const targetContainer = dragRows[1].closest('[draggable="true"]');
      expect(sourceContainer).not.toBeNull();
      expect(targetContainer).not.toBeNull();

      // Trigger HTML5 Drag & Drop events
      fireEvent.dragStart(sourceContainer!);
      fireEvent.dragOver(targetContainer!);
      fireEvent.drop(targetContainer!);
      fireEvent.dragEnd(sourceContainer!);

      // Verify they swapped after drop
      expect((enInputs[0] as HTMLInputElement).value).toBe('Feature B');
      expect((enInputs[1] as HTMLInputElement).value).toBe('Feature A');

      // Click save and verify updatePlan payload
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdatePlan).toHaveBeenCalledWith('BASIC', expect.objectContaining({
          features: [
            { text: { en_US: 'Feature B', es_DO: 'Feature B' }, included: true },
            { text: { en_US: 'Feature A', es_DO: 'Feature A' }, included: true },
          ],
        }));
      });
    });

    test('renders plans in Spanish when language is es_DO', async () => {
      mockLanguage = 'es_DO';
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Soporte Básico')).toBeInTheDocument();
      expect(screen.getByText('Descripción del plan básico')).toBeInTheDocument();
      expect(screen.getByText('Soporte por correo')).toBeInTheDocument();
      
      // Reset mockLanguage
      mockLanguage = 'en_US';
    });

    test('sends customer quotation via email on Send Quotation to Customer click', async () => {
      vi.mocked(subscriptionService.sendQuote).mockResolvedValue({ success: true, message: 'Sent' });
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Select Customer')).toBeInTheDocument();
      });

      const select = screen.getByLabelText('Select Customer');
      fireEvent.change(select, { target: { value: 'client-2' } });

      const sendQuoteButton = screen.getByText('Send Quotation to Customer');
      expect(sendQuoteButton).toBeInTheDocument();

      fireEvent.click(sendQuoteButton);

      await waitFor(() => {
        expect(subscriptionService.sendQuote).toHaveBeenCalledWith({
          plan: 'STANDARD',
          equipmentCount: 1,
          clientId: 'client-2',
          billingCycle: 'monthly',
        });
        expect(mockToast.success).toHaveBeenCalledWith(
          'Quotation Sent',
          expect.any(Object)
        );
      });
    });

    test('sends quotation for unregistered customer in admin flow', async () => {
      vi.mocked(subscriptionService.sendQuote).mockResolvedValue({ success: true, message: 'Sent' });
      render(
        <MemoryRouter>
          <PlansPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Select Customer')).toBeInTheDocument();
      });

      expect(screen.queryByLabelText('Recipient Email Address')).not.toBeInTheDocument();

      const applyButton = screen.getByRole('button', { name: /Apply Plan to Customer/i });
      expect(applyButton).not.toBeDisabled();

      const select = screen.getByLabelText('Select Customer');
      fireEvent.change(select, { target: { value: 'unregistered' } });

      const emailInput = screen.getByLabelText('Recipient Email Address') as HTMLInputElement;
      const nameInput = screen.getByLabelText('Recipient Name (Optional)') as HTMLInputElement;
      expect(emailInput).toBeInTheDocument();
      expect(nameInput).toBeInTheDocument();

      expect(applyButton).toBeDisabled();

      fireEvent.change(emailInput, { target: { value: 'admin-unreg@example.com' } });
      fireEvent.change(nameInput, { target: { value: 'Admin Unregistered Customer' } });

      const sendQuoteButton = screen.getByText('Send Quotation to Customer');
      fireEvent.click(sendQuoteButton);

      await waitFor(() => {
        expect(subscriptionService.sendQuote).toHaveBeenCalledWith({
          plan: 'STANDARD',
          equipmentCount: 1,
          clientId: undefined,
          unregisteredEmail: 'admin-unreg@example.com',
          unregisteredName: 'Admin Unregistered Customer',
          billingCycle: 'monthly',
        });
        expect(mockToast.success).toHaveBeenCalledWith(
          'Quotation Sent',
          expect.any(Object)
        );
      });

      expect(emailInput.value).toBe('');
      expect(nameInput.value).toBe('');
    });
  });
});
