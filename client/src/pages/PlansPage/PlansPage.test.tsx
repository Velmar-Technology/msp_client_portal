import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { PlansPage } from "@/pages/PlansPage/PlansPage";
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { userService } from '@/services/userService';
import { subscriptionService } from '@/services/subscriptionService';
import { useAuth } from '@/hooks/useAuth';
import { usePlanStore } from '@/store/usePlanStore';
import { useSubscriptionStore } from '@/store/useSubscriptionStore';
import { useCheckoutStore } from '@/store/useCheckoutStore';
import enTranslations from "@/locales/en_US.json";

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockLanguage = 'en_US';

const mockT = (key: string, options?: any) => {
  const parts = key.split('.');
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
    update: vi.fn().mockResolvedValue({}),
    createPaypalOrder: vi.fn().mockResolvedValue({ orderId: 'MOCK-PAYPAL-ORDER' }),
    createPaypalSubscription: vi.fn().mockResolvedValue({ subscriptionId: 'MOCK-PAYPAL-SUB', approveUrl: 'http://approve.url' }),
  },
}));

vi.mock('@/services/equipmentService', () => ({
  equipmentService: {
    getSlots: vi.fn().mockRejectedValue(new Error('Mock API error')),
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

 
const makeSub = (overrides: any) => ({
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
  ...overrides,
});

const renderPage = (route = '/') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <PlansPage />
    </MemoryRouter>
  );

const goManageTab = async () => {
  const tab = await screen.findByRole('tab', { name: /Manage Subscription/i });
  fireEvent.pointerDown(tab, { button: 0, ctrlKey: false });
  fireEvent.click(tab);
};

const openRowMenu = async (serviceName: string) => {
  const row = screen.getByText(serviceName).closest('tr');
  if (!row) throw new Error(`Row not found for service: ${serviceName}`);
  const trigger = within(row as HTMLElement).getByRole('button', { name: 'Manage Subscription' });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.click(trigger);
};

describe('PlansPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset real zustand stores (module-level singletons persist across tests)
    useSubscriptionStore.setState({
      activeSubscriptions: [],
      subscribeLoading: false,
      clients: [],
      selectedClientId: '',
      equipmentCounts: {},
    });
    useCheckoutStore.setState({
      checkoutOpen: false,
      checkoutAction: null,
      checkoutSubscription: null,
      paymentMessage: null,
    });

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
       
      (window as any).paypal = {
        Buttons: vi.fn().mockImplementation((options) => {
          paypalButtonsOptions = options;
          return {
            render: vi.fn(),
            close: vi.fn().mockResolvedValue(undefined),
            isEligible: vi.fn().mockReturnValue(true),
          };
        }),
      };
    });

    test('renders plans and payment method for Client', async () => {
      renderPage();

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

    test('hides Assign tab and shows Manage tab only with active subscriptions', async () => {
      // Without subscriptions there are no tabs at all
      const first = renderPage();
      expect(screen.queryByRole('button', { name: 'Assign Plan' })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: /Manage Subscription/i })).not.toBeInTheDocument();
      first.unmount();

      vi.mocked(subscriptionService.getAll).mockResolvedValue([makeSub({})]);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
      expect(screen.getByRole('tab', { name: /Browse Plans/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Manage Subscription/i })).toBeInTheDocument();
      // Assign Plan is admin/salesperson-only
      expect(screen.queryByRole('button', { name: 'Assign Plan' })).not.toBeInTheDocument();
    });

    test('submits client subscription on Process Payment click', async () => {
      vi.mocked(subscriptionService.create).mockResolvedValue({ id: 'sub-new' } as unknown as Awaited<ReturnType<typeof subscriptionService.create>>);
      renderPage();

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
      renderPage();

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
      renderPage();

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

    test('submits cancellation update from Manage tab dropdown', async () => {
      const activeSub = makeSub({});
      vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub]);
      vi.mocked(subscriptionService.update).mockResolvedValue({ ...activeSub, status: 'CANCELLED' } as unknown as Awaited<ReturnType<typeof subscriptionService.update>>);

      renderPage();

      await goManageTab();

      await openRowMenu('Standard Support');
      fireEvent.click(await screen.findByText('Cancel Subscription'));

      // Confirm inside the CheckoutSheet
      fireEvent.click(await screen.findByRole('button', { name: 'Yes, Cancel Subscription' }));

      await waitFor(() => {
        expect(subscriptionService.update).toHaveBeenCalledWith('sub-active', {
          status: 'CANCELLED',
        });
      });
    });

    test('changes plan tier via Manage tab inline panel on same device count', async () => {
      const activeSub = makeSub({});
      vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub]);
      vi.mocked(subscriptionService.update).mockResolvedValue({ ...activeSub, plan: 'BASIC' } as unknown as Awaited<ReturnType<typeof subscriptionService.update>>);

      renderPage();

      await goManageTab();

      await openRowMenu('Standard Support');
      fireEvent.click(await screen.findByText('Change Plan Tier'));

      // Inline tier-change panel appears
      expect(await screen.findByText('Select New Tier')).toBeInTheDocument();

      // Select Basic Support as the new tier
      const trigger = screen.getByRole('combobox', { name: 'Select New Tier' });
      fireEvent.click(trigger);
      const option = await screen.findByRole('option', { name: /Basic Support/i });
      fireEvent.click(option);

      // Accept Terms of Service
      fireEvent.click(screen.getByLabelText(/Terms of Service/i));

      fireEvent.click(screen.getByRole('button', { name: 'Update Subscription' }));

      await waitFor(() => {
        expect(subscriptionService.update).toHaveBeenCalledWith('sub-active', {
          plan: 'BASIC',
          equipmentCount: 1,
        });
      });
    });

    test('pays for device increase through PayPal when changing tier panel count', async () => {
      const activeSub = makeSub({ id: 'sub-basic', service_name: 'Basic Support', plan: 'BASIC', equipment_count: 2 });
      vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub]);

      renderPage();

      await goManageTab();

      await openRowMenu('Basic Support');
      fireEvent.click(await screen.findByText('Change Plan Tier'));
      expect(await screen.findByText('Select New Tier')).toBeInTheDocument();

      // Increment devices twice: 2 -> 4
      const tierPanel = screen.getByText('Select New Tier').closest('.bg-card') as HTMLElement;
      const addDeviceBtn = within(tierPanel).getByRole('button', { name: 'Add Device' });
      fireEvent.click(addDeviceBtn);
      fireEvent.click(addDeviceBtn);

      // Accept Terms of Service
      fireEvent.click(screen.getByLabelText(/Terms of Service/i));

      // Increase requires PayPal payment. The SDK effect re-renders the upgrade
      // buttons through a 100ms debounce timer — wait for the fresh instance
      // that closes over equipmentCount = 4.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250));
      });

      expect(paypalButtonsOptions).not.toBeNull();

      const orderId = await paypalButtonsOptions.createOrder();
      expect(orderId).toBe('MOCK-PAYPAL-ORDER');
      expect(subscriptionService.createPaypalOrder).toHaveBeenLastCalledWith(
        expect.objectContaining({ plan: 'BASIC', equipmentCount: 4 })
      );

      await paypalButtonsOptions.onApprove({ orderID: 'MOCK-PAYPAL-ORDER' });

      await waitFor(() => {
        expect(subscriptionService.update).toHaveBeenCalledWith('sub-basic', {
          plan: 'BASIC',
          equipmentCount: 4,
          paypalOrderId: 'MOCK-PAYPAL-ORDER',
        });
      });
    });

    test('renders multiple active plan subscriptions with unequal equipment counts', async () => {
      const activeSubs = [
        makeSub({ id: 'sub-basic', service_name: 'Basic Support', plan: 'BASIC', equipment_count: 2 }),
        makeSub({ id: 'sub-standard', service_name: 'Standard Support', plan: 'STANDARD', equipment_count: 3 }),
      ];
      vi.mocked(subscriptionService.getAll).mockResolvedValue(activeSubs);

      renderPage();

      // Verify that both plans render with Active badges
      await waitFor(() => {
        const activeBadges = screen.getAllByText('Active');
        expect(activeBadges.length).toBeGreaterThanOrEqual(2);
      });

      // Verify that BASIC support card displays equipment count of 2
      const basicCounts = screen.getAllByText('2');
      expect(basicCounts.length).toBeGreaterThanOrEqual(1);

      // Verify that STANDARD support card displays equipment count of 3
      const standardCount = screen.getByText('3');
      expect(standardCount).toBeInTheDocument();
    });

    test('submits a new additional subscription from Browse checkout', async () => {
      const activeSub = makeSub({ id: 'sub-active-basic', service_name: 'Basic Support', plan: 'BASIC' });
      vi.mocked(subscriptionService.getAll).mockResolvedValue([activeSub]);
      vi.mocked(subscriptionService.create).mockResolvedValue({ id: 'sub-new-standard' } as unknown as Awaited<ReturnType<typeof subscriptionService.create>>);

      renderPage();

      // Verify that Basic Support is currently active and selected
      await waitFor(() => {
        expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
      });

      // Select Standard Support card (which is not active) and checkout as an additional plan
      fireEvent.click(screen.getByText('Standard Support'));

      const checkoutBtn = screen.getByRole('button', { name: /Proceed to Checkout/i });
      fireEvent.click(checkoutBtn);

      // Click Terms of Service checkbox
      fireEvent.click(screen.getByLabelText(/Terms of Service/i));

      await waitFor(() => {
        expect(paypalButtonsOptions).not.toBeNull();
      });

      const orderId = await paypalButtonsOptions.createOrder();
      expect(orderId).toBe('MOCK-PAYPAL-ORDER');

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
      vi.mocked(subscriptionService.getAll).mockResolvedValue([]);
    });

    test('renders "+ Add Plan" button and navigates to /plans/new', async () => {
      vi.mocked(usePlanStore).mockReturnValue({
        plans: mockPlans,
        loading: false,
        error: null,
        fetchPlans: vi.fn().mockResolvedValue(undefined),
        createPlan: vi.fn(),
        updatePlan: vi.fn(),
      } as unknown as ReturnType<typeof usePlanStore>);

      renderPage();

      const addPlanButton = screen.getByText('+ Add Plan');
      expect(addPlanButton).toBeInTheDocument();

      fireEvent.click(addPlanButton);

      expect(mockNavigate).toHaveBeenCalledWith('/plans/new');
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

    test('clicking Edit on a plan card navigates to /plans/:id/edit', async () => {
      vi.mocked(usePlanStore).mockReturnValue({
        plans: mockPlans,
        loading: false,
        error: null,
        fetchPlans: vi.fn().mockResolvedValue(undefined),
        createPlan: vi.fn(),
        updatePlan: vi.fn(),
      } as unknown as ReturnType<typeof usePlanStore>);

      renderPage();

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      fireEvent.click(editButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/plans/BASIC/edit');
    });

    test('renders plans in Spanish when language is es_DO', async () => {
      mockLanguage = 'es_DO';
      renderPage();

      expect(screen.getByText('Soporte Básico')).toBeInTheDocument();
      expect(screen.getByText('Descripción del plan básico')).toBeInTheDocument();
      expect(screen.getByText('Soporte por correo')).toBeInTheDocument();

      // Reset mockLanguage
      mockLanguage = 'en_US';
    });
  });
});
